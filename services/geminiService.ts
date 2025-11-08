
import { GoogleGenAI } from "@google/genai";

export async function generateTestSamples(
  existingTestLatex: string,
  numExercises: number,
  difficulty: string,
  language: string
): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error("API key is not configured. Please set the API_KEY environment variable.");
  }
  
  if (!existingTestLatex.trim()) {
    throw new Error("Input LaTeX script cannot be empty.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const difficultyInstruction = {
    easier: 'noticeably easier than',
    medium: 'of a similar difficulty to',
    harder: 'noticeably harder than'
  }[difficulty] || 'of a similar difficulty to';

  const prompt = `
    You are an expert math test generator. Your output must be valid LaTeX code.

    Based on the following LaTeX script of a math test, generate a new LaTeX script containing ${numExercises} new, unique math problems.

    The new problems must:
    1.  Be ${difficultyInstruction} the examples provided.
    2.  Be written in the ${language} language.
    3.  Be formatted correctly within a valid LaTeX document structure. The structure of your response should mirror the input's structure (e.g., if it uses \\begin{document}, \\section, \\item, etc., your output should too).
    4.  Do not include the original problems in your response. Only generate the new problems.

    Existing LaTeX Test Script:
    ---
    ${existingTestLatex}
    ---

    Provide only the complete, new LaTeX script as your output. Do not include any extra explanations, markdown formatting like \`\`\`latex, or introductory text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    });
    
    let latexOutput = response.text.trim();
    if (latexOutput.startsWith("```latex")) {
        latexOutput = latexOutput.substring(7);
    }
    if (latexOutput.endsWith("```")) {
        latexOutput = latexOutput.substring(0, latexOutput.length - 3);
    }

    return latexOutput.trim();
  } catch (error) {
    console.error("Error generating test samples:", error);
    if (error instanceof Error) {
        return `Error: ${error.message}`;
    }
    return "An unknown error occurred while generating the test.";
  }
}
