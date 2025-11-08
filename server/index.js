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

if (!process.env.API_KEY) {
  console.warn('Warning: API_KEY is not set. Gemini requests will fail until you add it.');
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
  const { existingTestLatex, numExercises, difficulty, language } = req.body || {};

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

  const prompt = `
    You are an expert math test generator. Your output must be valid LaTeX code.

    Based on the following LaTeX script of a math test, generate a new LaTeX script containing ${numExercises} new, unique math problems.

    The new problems must:
    1. Be ${difficultyInstruction} the examples provided.
    2. Be written in the ${language} language.
    3. Be formatted correctly within a valid LaTeX document structure. The structure of your response should mirror the input's structure (e.g., if it uses \\begin{document}, \\section, \\item, etc., your output should too).
    4. Do not include the original problems in your response. Only generate the new problems.

    Existing LaTeX Test Script:
    ---
    ${existingTestLatex}
    ---

    Provide only the complete, new LaTeX script as your output. Do not include any extra explanations, markdown formatting like \`\`\`latex, or introductory text.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

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

    res.json({ latex: latexOutput.trim() });
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
