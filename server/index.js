import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import Redis from 'ioredis';

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

const collectApiKeys = () => {
  const values = new Set();
  const pushKey = (value) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) {
      values.add(trimmed);
    }
  };
  pushKey(process.env.API_KEY);
  const csvKeys = process.env.API_KEYS;
  if (csvKeys) {
    csvKeys
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach(pushKey);
  }
  Object.keys(process.env)
    .filter((name) => /^API_KEY_\d+$/i.test(name))
    .forEach((name) => pushKey(process.env[name]));
  return Array.from(values);
};

const API_KEYS = collectApiKeys();
let apiKeyCursor = 0;
const nextApiKeySequence = () => {
  if (!API_KEYS.length) {
    return [];
  }
  const sequence = API_KEYS.map((_, idx) => API_KEYS[(apiKeyCursor + idx) % API_KEYS.length]);
  apiKeyCursor = (apiKeyCursor + 1) % API_KEYS.length;
  return sequence;
};

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

// Redis setup for shared rate limiting across workers
let redisClient = null;
let useRedis = false;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
      useRedis = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully for shared rate limiting');
      useRedis = true;
    });

    // Attempt to connect asynchronously
    (async () => {
      try {
        await redisClient.connect();
      } catch (err) {
        console.warn('Failed to connect to Redis, falling back to in-memory rate limiting:', err.message);
        useRedis = false;
      }
    })();
  } catch (err) {
    console.warn('Redis initialization failed, using in-memory rate limiting:', err.message);
    redisClient = null;
    useRedis = false;
  }
} else {
  console.log('REDIS_URL not configured, using in-memory rate limiting');
}

// Fallback in-memory rate limiting
let requestTimestamps = [];

const waitForRateLimitSlot = async () => {
  if (useRedis && redisClient) {
    // Redis-based rate limiting (shared across all workers)
    const RATE_LIMIT_KEY = 'gemini:rate_limit:timestamps';

    while (true) {
      const now = Date.now();
      const cutoff = now - REQUEST_INTERVAL_MS;

      try {
        // Remove old timestamps and get current count atomically
        const multi = redisClient.multi();
        multi.zremrangebyscore(RATE_LIMIT_KEY, '-inf', cutoff);
        multi.zcard(RATE_LIMIT_KEY);
        multi.expire(RATE_LIMIT_KEY, Math.ceil(REQUEST_INTERVAL_MS / 1000) + 10);
        const results = await multi.exec();

        const currentCount = results[1][1];

        if (currentCount < MAX_REQUESTS_PER_INTERVAL) {
          // Add this request timestamp
          await redisClient.zadd(RATE_LIMIT_KEY, now, `${now}-${Math.random()}`);
          return;
        }

        // Need to wait - get oldest timestamp
        const oldestEntries = await redisClient.zrange(RATE_LIMIT_KEY, 0, 0, 'WITHSCORES');
        if (oldestEntries.length >= 2) {
          const oldest = parseInt(oldestEntries[1]);
          const waitMs = Math.max(REQUEST_INTERVAL_MS - (now - oldest), 50);
          console.warn(
            `Gemini rate limit reached (${MAX_REQUESTS_PER_INTERVAL}/${REQUEST_INTERVAL_MS}ms) [shared across workers]. Waiting ${waitMs}ms...`
          );
          await sleep(waitMs);
        } else {
          await sleep(100);
        }
      } catch (err) {
        console.error('Redis rate limiting error, falling back to in-memory:', err.message);
        useRedis = false;
        // Fall through to in-memory implementation below
        break;
      }
    }
  }

  // In-memory rate limiting (per-worker)
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
      `Gemini rate limit reached (${MAX_REQUESTS_PER_INTERVAL}/${REQUEST_INTERVAL_MS}ms) [per-worker]. Waiting ${waitMs}ms...`
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

if (!API_KEYS.length) {
  console.warn('Warning: No Gemini API keys configured. Set API_KEY or API_KEYS to enable generation.');
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

  const apiKeySequence = nextApiKeySequence();
  if (!apiKeySequence.length) {
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

    IMPORTANT: After generating the complete LaTeX document, provide an answer key in JSON format on a separate line.
    The answer key should be in this exact format:
    ANSWER_KEY: [{"questionNumber": 1, "correctAnswer": "a"}, {"questionNumber": 2, "correctAnswer": "b"}, ...]
    
    For each multiple-choice question in your generated test, include an entry with the question number and the correct answer letter.
    If a problem is not multiple-choice, you can omit it from the answer key.
    
    Provide only the complete, new LaTeX script followed by the answer key line. Do not include any extra explanations, markdown formatting like \`\`\`latex, or introductory text.
  `;

  try {
    const sendRequestWithRetry = async () => {
      let lastError;
      for (let keyIndex = 0; keyIndex < apiKeySequence.length; keyIndex += 1) {
        const apiKey = apiKeySequence[keyIndex];
        const ai = new GoogleGenAI({ apiKey });
        for (let attempt = 1; attempt <= MAX_MODEL_RETRIES; attempt += 1) {
          try {
            await waitForRateLimitSlot();
            return await ai.models.generateContent({
              model: modelName,
              contents: prompt,
            });
          } catch (error) {
            lastError = error;
            if (!isRetriableModelError(error)) {
              throw error;
            }
            if (attempt === MAX_MODEL_RETRIES) {
              break;
            }
            const delayMs = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
            const reason = error?.status || error?.code || error?.message || 'unknown error';
            console.warn(
              `Gemini request failed on attempt ${attempt}/${MAX_MODEL_RETRIES} with key #${keyIndex + 1} (${reason}). Retrying in ${delayMs}ms...`
            );
            await sleep(delayMs);
          }
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

    // Extract answer key if present
    let answerKey = [];
    const answerKeyMatch = latexOutput.match(/ANSWER_KEY:\s*(\[.*?\])/s);
    if (answerKeyMatch) {
      try {
        answerKey = JSON.parse(answerKeyMatch[1]);
        // Remove the answer key line from the LaTeX output
        latexOutput = latexOutput.replace(/ANSWER_KEY:\s*\[.*?\]/s, '').trim();
      } catch (parseError) {
        console.warn('Failed to parse answer key from response:', parseError.message);
        // Continue without answer key
      }
    }

    const safeLatex = ensureLatexDocument(latexOutput.trim());
    res.json({ latex: safeLatex, answerKey });
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
