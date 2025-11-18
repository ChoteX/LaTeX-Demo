import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const maxExercises = Number(process.env.MAX_EXERCISES || 30);
const DEFAULT_CHOICE_LABEL_CONFIG = {
  displayName: 'English',
  labels: ['a)', 'b)', 'c)', 'd)'],
};
const CHOICE_LABELS_BY_LANGUAGE = {
  georgian: {
    displayName: 'Georgian',
    labels: ['ა)', 'ბ)', 'გ)', 'დ)'],
  },
  english: DEFAULT_CHOICE_LABEL_CONFIG,
  portuguese: {
    displayName: 'Portuguese',
    labels: ['a)', 'b)', 'c)', 'd)'],
  },
  ukrainian: {
    displayName: 'Ukrainian',
    labels: ['а)', 'б)', 'в)', 'г)'],
  },
  arabic: {
    displayName: 'Arabic',
    labels: ['أ)', 'ب)', 'ج)', 'د)'],
  },
};
const MAX_MODEL_RETRIES = Math.max(1, Number(process.env.GEMINI_MAX_RETRIES || 3));
const BASE_RETRY_DELAY_MS = Math.max(250, Number(process.env.GEMINI_RETRY_BASE_DELAY_MS || 1000));
const MAX_REQUESTS_PER_INTERVAL = Math.max(1, Number(process.env.GEMINI_MAX_REQUESTS_PER_MINUTE || 2));
const REQUEST_INTERVAL_MS = Math.max(1000, Number(process.env.GEMINI_REQUEST_INTERVAL_MS || 60000));

const resolveChoiceLabelConfig = (language) => {
  if (!language || typeof language !== 'string') {
    return DEFAULT_CHOICE_LABEL_CONFIG;
  }
  const normalized = language.trim().toLowerCase();
  return CHOICE_LABELS_BY_LANGUAGE[normalized] || DEFAULT_CHOICE_LABEL_CONFIG;
};
const normalizeOrigin = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed === '*') return '*';

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
};

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let requestTimestamps = [];
const waitForRateLimitSlot = async () => {
  while (true) {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((ts) => now - ts < REQUEST_INTERVAL_MS);
    if (requestTimestamps.length < MAX_REQUESTS_PER_INTERVAL) {
      requestTimestamps.push(now);
      return;
    }
    const oldest = requestTimestamps[0];
    const waitMs = Math.max(REQUEST_INTERVAL_MS - (now - oldest), 50);
    console.warn(
      `Gemini rate limit reached (${MAX_REQUESTS_PER_INTERVAL}/${REQUEST_INTERVAL_MS}ms). Waiting ${waitMs}ms before next request...`
    );
    await sleep(waitMs);
  }
};
const isRetriableModelError = (error) => {
  if (!error) return false;
  const status = typeof error.status === 'number' ? error.status : undefined;
  const code = typeof error.code === 'string' ? error.code.toUpperCase() : undefined;
  const message = typeof error.message === 'string' ? error.message : '';
  if (status && (status === 429 || status >= 500)) {
    return true;
  }
  if (code && ['UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'ABORTED'].includes(code)) {
    return true;
  }
  if (/overloaded|try again later|temporarily unavailable|timeout/i.test(message)) {
    return true;
  }
  return false;
};

if (!process.env.API_KEY) {
  console.warn('Warning: API_KEY is not set. Gemini requests will fail until you add it.');
}

function ensureLatexDocument(input) {
  if (typeof input !== 'string') return '';
  let result = input.replace(/^\ufeff/, '').replace(/\r/g, '');
  const hasDocClass = /\\documentclass/.test(result);
  const hasBegin = /\\begin\{document\}/.test(result);
  const hasEnd = /\\end\{document\}/.test(result);

  if (!hasBegin) {
    result = result.replace(/^(.*?)(?=\\section|\\maketitle|\\begin|\\title|\\author|\\date|$)/s, (m) => `${m}\\begin{document}\n`);
    if (!/\\begin\{document\}/.test(result)) {
      result = `\\begin{document}\n${result}`;
    }
  }
  if (!hasEnd) {
    result = `${result}\n\\end{document}`;
  }
  if (!hasDocClass) {
    result = `\\documentclass{article}\n${result}`;
  }
  return result;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS policy'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/generate', async (req, res) => {
  const { existingTestLatex, numExercises, difficulty, language, guidancePrompt } = req.body || {};

  if (!process.env.API_KEY) {
    return res.status(500).json({ error: 'Server is missing the Gemini API key.' });
  }

  if (!existingTestLatex || typeof existingTestLatex !== 'string' || !existingTestLatex.trim()) {
    return res.status(400).json({ error: 'existingTestLatex must be a non-empty string.' });
  }

  if (!numExercises || typeof numExercises !== 'number' || numExercises < 1 || numExercises > maxExercises) {
    return res.status(400).json({ error: `numExercises must be between 1 and ${maxExercises}.` });
  }

  if (!difficulty || typeof difficulty !== 'string') {
    return res.status(400).json({ error: 'difficulty must be provided.' });
  }

  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'language must be provided.' });
  }

  const difficultyInstruction = {
    easier: 'noticeably easier than',
    medium: 'of a similar difficulty to',
    harder: 'noticeably harder than',
  }[difficulty] || 'of a similar difficulty to';
  const choiceLabelConfig = resolveChoiceLabelConfig(language);
  const choiceLabelLine = choiceLabelConfig.labels
    .map((label, index) => `${label} Option ${index + 1}`)
    .join(' \\quad ');
  const choiceLabelExample = `\\item Sample question text?\\\\
${choiceLabelLine}`;

  const trimmedGuidance = typeof guidancePrompt === 'string' ? guidancePrompt.trim() : '';
  const customGuidanceSection = trimmedGuidance
    ? `
    Additional instructor guidance (follow every detail precisely):
    """
    ${trimmedGuidance}
    """
  `
    : '';

  const prompt = `
    You are an expert math test generator. Your output must be valid LaTeX code.

    Based on the following LaTeX script of a math test, generate a new LaTeX script containing ${numExercises} new, unique math problems.

    The new problems must:
    1. Be ${difficultyInstruction} the examples provided.
    2. Be written in the ${language} language.
    3. Be formatted correctly within a valid LaTeX document structure. The structure of your response should mirror the input's structure (e.g., if it uses \\begin{document}, \\section, \\item, etc., your output should too).
    4. Do not include the original problems in your response. Only generate the new problems.
    5. When you include multiple-choice options, render them inline on one line using ${choiceLabelConfig.displayName} letters (${choiceLabelConfig.labels.join(', ')}) as labels.
       Always place the choice line on its own line immediately after the question using a LaTeX line break (e.g., end the question with \\\\).
       For example:
       ${choiceLabelExample}
       Do not rely on custom environments or enumitem; write them directly as inline text with math in $...$ where needed. If you need additional options, continue with the next letters of the same alphabet.
    6. Keep every enumerated problem statement on the same line as its number (e.g., "\\item Describe ..."). Do not insert a manual line break before the statement; only add \\\\ once the sentence is complete.
    ${customGuidanceSection}

    Existing LaTeX Test Script:
    ---
    ${existingTestLatex}
    ---

    Provide only the complete, new LaTeX script as your output. Do not include any extra explanations, markdown formatting like \`\`\`latex, or introductory text.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    await waitForRateLimitSlot();
    const sendRequestWithRetry = async () => {
      let lastError;
      for (let attempt = 1; attempt <= MAX_MODEL_RETRIES; attempt += 1) {
        try {
          return await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
        } catch (error) {
          lastError = error;
          if (attempt === MAX_MODEL_RETRIES || !isRetriableModelError(error)) {
            throw error;
          }
          const delayMs = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
          const reason = error?.status || error?.code || error?.message || 'unknown error';
          console.warn(
            `Gemini request failed on attempt ${attempt}/${MAX_MODEL_RETRIES} (${reason}). Retrying in ${delayMs}ms...`
          );
          await sleep(delayMs);
        }
      }
      throw lastError;
    };
    const response = await sendRequestWithRetry();

    if (!response.text) {
      throw new Error('Gemini did not return any text.');
    }

    let latexOutput = response.text.trim();
    if (latexOutput.startsWith('```latex')) {
      latexOutput = latexOutput.substring(7);
    }
    if (latexOutput.endsWith('```')) {
      latexOutput = latexOutput.substring(0, latexOutput.length - 3);
    }

    const safeLatex = ensureLatexDocument(latexOutput.trim());
    res.json({ latex: safeLatex });
  } catch (error) {
    console.error('Error generating test samples:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ error: `Failed to generate test: ${message}` });
  }
});

app.use((err, _req, res, next) => {
  if (err?.message === 'Origin not allowed by CORS policy') {
    return res.status(403).json({ error: err.message });
  }
  return next(err);
});

app.listen(port, () => {
  console.log(`Math Test Generator API listening on port ${port}`);
});
