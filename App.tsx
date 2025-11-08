
import React, { useState, useCallback } from 'react';
import { generateTestSamples } from './services/geminiService';
import LatexInput from './components/LatexInput';
import LatexOutput from './components/LatexOutput';
import Button from './components/Button';
import Loader from './components/Loader';

const DEFAULT_LATEX_SAMPLE = `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{მათემატიკის ტესტი}
\\author{სკოლა}
\\date{\\today}

\\begin{document}

\\maketitle

\\section*{ამოცანები}

\\begin{enumerate}
    \\item იპოვეთ \\(x\\) თუ \\(2x + 5 = 15\\).
    \\item გამოთვალეთ სამკუთხედის ფართობი, რომლის ფუძეა 10 სმ და სიმაღლე 5 სმ.
    \\item რა არის \\( \\sqrt{144} \\)?
\\end{enumerate}

\\end{document}`;

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>(DEFAULT_LATEX_SAMPLE);
  const [outputText, setOutputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [numExercises, setNumExercises] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [language, setLanguage] = useState<string>('Georgian');

  const handleGenerate = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setOutputText('');

    try {
      const result = await generateTestSamples(inputText, numExercises, difficulty, language);
      if (result.startsWith('Error:')) {
        setError(result);
      } else {
        setOutputText(result);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(`Failed to generate test: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, numExercises, difficulty, language]);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Math Test Generator
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Generate new LaTeX math problems based on your existing test script with customizable options.
          </p>
        </header>

        <main className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-700">
          <LatexInput
            value={inputText}
            onChange={setInputText}
            placeholder={DEFAULT_LATEX_SAMPLE}
          />
          
          <div className="mt-8 p-6 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-gray-200 mb-6 text-center">Generation Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="num-exercises" className="block text-sm font-medium text-gray-400 mb-2">Number of Exercises</label>
                <input
                  type="number"
                  id="num-exercises"
                  value={numExercises}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                    setNumExercises(Math.max(1, Math.min(30, val || 1)));
                  }}
                  min="1"
                  max="30"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  aria-describedby="num-exercises-description"
                />
                <p className="text-xs text-gray-500 mt-1" id="num-exercises-description">Max: 30</p>
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-400 mb-2">Difficulty</label>
                <div className="relative">
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none pr-8"
                  >
                    <option value="easier">Easier</option>
                    <option value="medium">Medium (Similar)</option>
                    <option value="harder">Harder</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                <div className="relative">
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none pr-8"
                  >
                    <option value="Georgian">Georgian</option>
                    <option value="English">English</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Ukrainian">Ukrainian</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader />
                  <span className="ml-2">Generating...</span>
                </div>
              ) : (
                'Generate New Test'
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg text-center">
              {error}
            </div>
          )}

          {(outputText || isLoading) && (
             <div className="mt-8">
                {isLoading && !outputText ? (
                    <div className="w-full h-96 p-4 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <Loader />
                            <p className="mt-4 text-gray-400">Generating your new LaTeX script...</p>
                            <p className="text-sm text-gray-500">This might take a moment.</p>
                        </div>
                    </div>
                ) : (
                    <LatexOutput latexScript={outputText} />
                )}
             </div>
          )}
        </main>
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} ExpoV. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
