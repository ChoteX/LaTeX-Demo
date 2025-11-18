import { ensureLatexDocument } from "../utils/latex";

const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS ?? 120000);
const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

interface Answer {
  questionNumber: number;
  correctAnswer: string;
}

interface GenerateResponse {
  latex: string;
  answerKey?: Answer[];
  error?: string;
}

export async function generateTestSamples(
  existingTestLatex: string,
  numExercises: number,
  difficulty: string,
  language: string,
  guidancePrompt?: string
): Promise<{ latex: string; answerKey: Answer[] }> {
  if (!existingTestLatex.trim()) {
    throw new Error("Input LaTeX script cannot be empty.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        existingTestLatex,
        numExercises,
        difficulty,
        language,
        guidancePrompt,
      }),
      signal: controller.signal,
    });

    let payload: GenerateResponse | undefined;
    try {
      payload = await response.json();
    } catch {
      // Ignore JSON parse errors here; we'll surface a better message below.
    }

    if (!response.ok) {
      throw new Error(payload?.error || `Request failed with status ${response.status}`);
    }

    if (!payload?.latex || typeof payload.latex !== "string") {
      throw new Error("Malformed response from the server.");
    }

    return {
      latex: ensureLatexDocument(payload.latex.trim()),
      answerKey: payload.answerKey || [],
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }

    if (error instanceof Error) {
      const msg = error.message || "Failed to contact the generation server.";
      // Surface friendlier hint for network transport failures
      if (/load failed|failed to fetch/i.test(msg)) {
        throw new Error(
          "Load failed: please verify your network and VITE_API_BASE_URL points to your Render backend (HTTPS)."
        );
      }
      throw new Error(msg);
    }

    throw new Error("An unknown error occurred while contacting the server.");
  } finally {
    clearTimeout(timeoutId);
  }
}
