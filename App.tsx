
import React, { useState, useCallback } from 'react';
import { generateTestSamples } from './services/geminiService';
import LatexInput from './components/LatexInput';
import Button from './components/Button';
import Loader from './components/Loader';
import LatexOutput from './components/LatexOutput';
import LatexPreview from './components/LatexPreview';

const FRIENDLY_RETRY_MESSAGES: Record<string, string> = {
  georgian: 'გენერატორი ახლა გადატვირთულია. გთხოვთ სცადოთ კვლავ დაახლოებით ერთ წუთში.',
  english: 'The generator is busy right now. Please try again in about a minute.',
  portuguese: 'O gerador está ocupado no momento. Tente novamente em cerca de um minuto.',
  ukrainian: 'Генератор зараз зайнятий. Спробуйте ще раз приблизно за хвилину.',
};

const FRIENDLY_ERROR_PATTERNS = [
  /failed to generate test/i,
  /request failed/i,
  /failed to contact/i,
  /load failed/i,
  /network/i,
  /timeout/i,
  /unavailable/i,
  /overload/i,
  /try again later/i,
  /503/,
  /429/,
];

const getFriendlyRetryMessage = (language: string): string => {
  const normalized = (language || '').trim().toLowerCase();
  return FRIENDLY_RETRY_MESSAGES[normalized] || FRIENDLY_RETRY_MESSAGES.english;
};

const shouldShowFriendlyMessage = (message: string | null | undefined): boolean => {
  if (!message) {
    return false;
  }
  return FRIENDLY_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

const DEFAULT_LATEX_SAMPLE = String.raw`
\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[margin=2cm]{geometry}
\usepackage{amsmath,amssymb}
\usepackage{multicol}
\usepackage[inline]{enumitem}

% One-line multiple-choice list environment
\newlist{choices}{enumerate*}{1}
\setlist[choices]{label=ა), itemjoin=\hspace{1.5em}, itemsep=0pt, topsep=0pt}
\begin{document}

\section*{საკონტროლო ტესტი N 2 (ა)}

\begin{enumerate}
\item $0{,}5+\dfrac{1}{3}=$

\begin{choices}
  \item $\dfrac{1}{6}$ \item $\dfrac{5}{6}$ \item $\dfrac{1}{4}$ \item $\dfrac{2}{3}$
\end{choices}\vspace{1em}

\item $\dfrac{3}{7} \cdot \dfrac{7}{3}=$

\begin{choices}
  \item $19$ \item $2$ \item $10$ \item $2$
\end{choices}\vspace{1em}

\item $\left(3\dfrac{1}{3}\right)^2=$

\begin{choices}
  \item $9\dfrac{1}{9}$ \item $6\dfrac{1}{9}$ \item $10\dfrac{1}{9}$ \item $11\dfrac{1}{9}$
\end{choices}\vspace{1em}

\item $\dfrac{0{,}09-0{,}02}{0{,}003} =$

\begin{choices}
  \item $0,6$ \item $0,06$ \item $0,006$ \item $6$
\end{choices}\vspace{1em}

\item $\dfrac{0{,}04 \cdot 0{,}28}{0{,}4 \cdot 0{,}7} =$

\begin{choices}
  \item $0,04$ \item $0,004$ \item $0,7$ \item $0,4$
\end{choices}\vspace{1em}

\item $\dfrac{\dfrac{1}{5}-\dfrac{4}{5}}{4-1} =$

\begin{choices}
\item $\dfrac{4}{5}$ \item $1$ \item $\dfrac{5}{4}$ \item $\dfrac{1}{20}$
\end{choices}
\end{enumerate}



\begin{enumerate}[start=7]
    \item რამდენი მთელი რიცხვია $-3\frac{1}{10}$-სა და $2\frac{5}{7}$-ს შორის?\\
    ა) 6 \quad ბ) 5 \quad გ) 4 \quad დ) 8

\item იპოვეთ $a$-ს შებრუნებული რიცხვი, თუ $a=3\cdot (1\frac{1}{3} - \frac{1}{2})$\\
    ა) $\frac{5}{2}$ \quad ბ) $\frac{2}{5}$ \quad გ) $-\frac{5}{2}$ \quad დ) $-\frac{2}{5}$

\item იპოვეთ $b$-ს მოპირდაპირე რიცხვი, თუ $b=5\cdot (1\frac{1}{3} - \frac{1}{2})$\\
    ა) $\frac{5}{6}$ \quad ბ) $-\frac{5}{6}$ \quad გ) $\frac{6}{5}$ \quad დ) $-\frac{6}{5}$

    \item გამოთვალეთ $\frac{a+1}{a-1}$, თუ $a=\frac{2}{3}$\\
    ა) $-3$ \quad ბ) $3$ \quad გ) $5$ \quad დ) $-5$

    \item $\frac{0,15 \cdot 60}{4,5}=$\\
    ა) 20 \quad ბ) 200 \quad გ) 2 \quad დ) 1,25

    \item მიუთითეთ ყველაზე დიდი რიცხვი\\
    ა) 0,00132 \quad ბ) 0,01799 \quad გ) 0,12505 \quad დ) 0,12601

    \item $\frac{421}{27}$ წილადის მთელი ნაწილი რამდენითაა მეტი $\frac{273}{27}$ წილადის მთელ ნაწილზე?\\
    ა) 2-ით \quad ბ) 3-ით \quad გ) 4-ით \quad დ) 5-ით

    \item მიუთითეთ უმცირესი წილადი\\
    ა) $\frac{15}{40}$ \quad ბ) $\frac{225}{300}$ \quad გ) $\frac{48}{64}$ \quad დ) $\frac{5}{45}$

    \item იპოვეთ ყველა მთელი რიცხვის ჯამი, რომელიც მოთავსებულია $-7,5$-სა და $5,2$-ს შორის\\
    ა) $-13$ \quad ბ) $-12$ \quad გ) $-11$ \quad დ) $-10$

    \item ქვემოთ ჩამოთვლილაგან რომელი წილადია $\frac{1}{6}$-ზე მეტი და $\frac{2}{5}$-ზე ნაკლები?\\
    ა) $\frac{2}{3}$ \quad ბ) $\frac{1}{7}$ \quad გ) $\frac{1}{5}$ \quad დ) $\frac{1}{2}$
\end{enumerate}


\begin{enumerate}[start=17]
    \item დადექით $a = \frac{7}{20};\ b = \frac{11}{21};\ c = \frac{11}{30}$ ჩაწერეთ ზრდადობის მიხედვით\\[0.2em]
    ა) $a,\ c,\ b$ \quad ბ) $a,\ b,\ c$ \quad გ) $c,\ b,\ a$ \quad დ) $b,\ c,\ a$

    \item შედარეთ $A_1 = \frac{1}{2}+\frac{2}{3}+\frac{3}{4}$ და $A_2 = \frac{1}{3}+\frac{4}{5}+\frac{5}{6}$\\[0.2em]
    ა) $A_1 > A_2$ \quad ბ) $A_1 < A_2$ \quad გ) $A_1 = A_2$ \quad დ) შედარება შეუძლებელია

    \item $AB$ მოღრძო. $BC$ მოღრძოზე $\frac{2}{3}\cdot\frac{3}{10}$-ით მეტია. $BC$ მოღრძოს სიგრძე $7\frac{3}{5}$. რამდენი ზომაა $AB$ მოღრძომ $BC$ მოღრძოზე?\\[0.2em]
    ა) $\frac{76}{53}$-ჯერ \quad ბ) 2-ჯერ \quad გ) $1\frac{1}{2}$-ჯერ \quad დ) შედარება შეუძლებელია

    \item $A,\ B$ და $C$ წრფეზე რომელი წერტილებია მიჩილდუებული. $B$ წერტილი $A$ და $C$ წერტილებს შორისაა. $AB$ მოღრძოს სიგრძე $2\frac{3}{5}$ მხარით მეტია $BC$ მოღრძოს სიგრძეზე. რამდენი ზომაა $AC$ მოღრძომ სიგრძე $BC$ მოღრძოს სიგრძეზე?\\[0.2em]
    ა) $1\frac{3}{5}$-ჯერ \quad ბ) 2-ჯერ \quad გ) $\frac{5}{3}$-ჯერ \quad დ) შედარება შეუძლებელია
\end{enumerate}

\end{document}
`;

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
        setError(getFriendlyRetryMessage(language));
      } else {
        setOutputText(result);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      const displayMessage = shouldShowFriendlyMessage(errorMessage)
        ? getFriendlyRetryMessage(language)
        : errorMessage;
      setError(displayMessage);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, numExercises, difficulty, language]);

  return (
    <div className="min-h-screen bg-[#05060F] text-[#F5F5FF] font-sans flex flex-col items-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFB547] via-[#FF7F6A] to-[#F15483]">
            Math Test Generator
          </h1>
          <p className="mt-4 text-lg text-[#C3C7F5]">
            Generate new LaTeX math problems based on your existing test script with customizable options.
          </p>
        </header>

        <main className="bg-[#0F1424]/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl border border-[#2F3250]">
          <LatexInput
            value={inputText}
            onChange={setInputText}
            placeholder={DEFAULT_LATEX_SAMPLE}
          />

          
          <div className="mt-8 p-6 bg-[#131833]/80 rounded-2xl border border-[#2F3250]">
            <h3 className="text-xl font-semibold text-[#FDDDC9] mb-6 text-center">Generation Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="num-exercises" className="block text-sm font-medium text-[#F3BFA6] mb-2">Number of Exercises</label>
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
                  className="w-full bg-[#0C0F23] border border-[#2E2F4F] rounded-xl p-2.5 text-[#F5F5FF] focus:ring-2 focus:ring-[#FF8F70] focus:border-[#FFB547] outline-none transition"
                  aria-describedby="num-exercises-description"
                />
                <p className="text-xs text-[#B2B7E6] mt-1" id="num-exercises-description">Max: 30</p>
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-[#F3BFA6] mb-2">Difficulty</label>
                <div className="relative">
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-[#0C0F23] border border-[#2E2F4F] rounded-xl p-2.5 text-[#F5F5FF] focus:ring-2 focus:ring-[#FF8F70] focus:border-[#FFB547] outline-none appearance-none pr-8 transition"
                  >
                    <option value="easier">Easier</option>
                    <option value="medium">Medium (Similar)</option>
                    <option value="harder">Harder</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#FFB547]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-[#F3BFA6] mb-2">Language</label>
                <div className="relative">
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#0C0F23] border border-[#2E2F4F] rounded-xl p-2.5 text-[#F5F5FF] focus:ring-2 focus:ring-[#FF8F70] focus:border-[#FFB547] outline-none appearance-none pr-8 transition"
                  >
                    <option value="Georgian">Georgian</option>
                    <option value="English">English</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Ukrainian">Ukrainian</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#FFB547]">
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
            <div className="mt-6 p-4 bg-[#32111F] border border-[#FF7C6E]/70 text-[#FFC9D5] rounded-xl text-center">
              {error}
            </div>
          )}

          {(outputText || isLoading) && (
            <div className="mt-8 space-y-6">
              {isLoading && !outputText ? (
                <div className="w-full h-96 p-4 bg-[#151932] border border-[#2F3250] rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Loader />
                    <p className="mt-4 text-[#C3C7F5]">Generating your new LaTeX script...</p>
                    <p className="text-sm text-[#9AA1DB]">This might take a moment.</p>
                  </div>
                </div>
              ) : (
                <LatexOutput latexScript={outputText} />
              )}

              <LatexPreview
                latex={outputText}
                title="Generated Preview"
                emptyMessage="Run the generator to see a rendered preview."
                isLoading={isLoading && !outputText}
                height={480}
              />
            </div>
          )}
        </main>
        <footer className="text-center mt-8 text-[#8B90C9] text-sm">
          <p>© {new Date().getFullYear()} ExpoV. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
