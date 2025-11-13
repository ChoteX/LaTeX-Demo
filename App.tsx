import React, { useState, useCallback, useEffect } from 'react';
import { generateTestSamples } from './services/geminiService';
import LatexInput from './components/LatexInput';
import Button from './components/Button';
import LatexPreview from './components/LatexPreview';
import CliSpinner from './components/CliSpinner';
import './styles/app.css';

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

const CLIENT_RETRYABLE_PATTERNS = [/overloaded/i, /try again later/i, /unavailable/i, /503/, /429/];
const CLIENT_RETRY_DELAY_MS = 60000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ThemeMode = 'light' | 'dark';

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
  const [editableLatex, setEditableLatex] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [numExercises, setNumExercises] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [language, setLanguage] = useState<string>('Georgian');
  const [isArtifactOpen, setIsArtifactOpen] = useState<boolean>(false);
  const [activeArtifactTab, setActiveArtifactTab] = useState<'code' | 'preview'>('code');
  const [artifactCopied, setArtifactCopied] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isEditingCanvas, setIsEditingCanvas] = useState<boolean>(false);
  const [shouldRenderCanvas, setShouldRenderCanvas] = useState<boolean>(false);

  const isCanvasVisible = Boolean(outputText) && isArtifactOpen;

  useEffect(() => {
    if (!outputText) {
      setIsArtifactOpen(false);
      setActiveArtifactTab('code');
      setArtifactCopied(false);
      setIsEditingCanvas(false);
    }
  }, [outputText]);

  useEffect(() => {
    if (outputText) {
      setEditableLatex(outputText);
    }
  }, [outputText]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem('mtg-theme') as ThemeMode | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const initial = storedTheme ?? (prefersDark.matches ? 'dark' : 'light');
    setTheme(initial);
    const listener = (event: MediaQueryListEvent) => {
      if (!window.localStorage.getItem('mtg-theme')) {
        setTheme(event.matches ? 'dark' : 'light');
      }
    };
    prefersDark.addEventListener('change', listener);
    return () => prefersDark.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('mtg-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isCanvasVisible) {
      setShouldRenderCanvas(true);
      return;
    }
    const timer = window.setTimeout(() => setShouldRenderCanvas(false), 500);
    return () => window.clearTimeout(timer);
  }, [isCanvasVisible]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleGenerate = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setOutputText('');
    setEditableLatex('');
    setIsArtifactOpen(false);
    setActiveArtifactTab('code');
    setArtifactCopied(false);
    setIsEditingCanvas(false);

    try {
      const maxAttempts = 2;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const result = await generateTestSamples(inputText, numExercises, difficulty, language);
          setOutputText(result);
          setEditableLatex(result);
          setIsArtifactOpen(true);
          setActiveArtifactTab('code');
          setError(null);
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const shouldRetry = CLIENT_RETRYABLE_PATTERNS.some((pattern) => pattern.test(message));
          if (!shouldRetry || attempt === maxAttempts - 1) {
            throw error;
          }
          setError('Generator is busy. Retrying automatically in 60 seconds…');
          await sleep(CLIENT_RETRY_DELAY_MS);
        }
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

  const handleArtifactCardClick = () => {
    if (!outputText) return;
    setIsArtifactOpen((prev) => {
      const next = !prev;
      if (next) {
        setActiveArtifactTab('code');
      }
      return next;
    });
  };

  const handleCopyArtifact = () => {
    if (!editableLatex.trim()) return;
    navigator.clipboard.writeText(editableLatex);
    setArtifactCopied(true);
    setTimeout(() => setArtifactCopied(false), 2000);
  };

  const handleEditToggle = () => {
    setIsEditingCanvas((prev) => !prev);
  };

  const disableGenerate = isLoading || !inputText.trim();

  const mainPanelStyle: React.CSSProperties = {
    flexBasis: isCanvasVisible ? '45%' : '100%',
    maxWidth: isCanvasVisible ? '45%' : '100%',
    transform: isCanvasVisible ? 'translateX(-12px)' : 'translateX(0)',
  };

  const canvasPanelStyle: React.CSSProperties = {
    flexBasis: isCanvasVisible ? '55%' : '0%',
    maxWidth: isCanvasVisible ? '55%' : '0%',
    opacity: isCanvasVisible ? 1 : 0,
    transform: isCanvasVisible ? 'translateX(0)' : 'translateX(60px)',
    pointerEvents: isCanvasVisible ? 'auto' : 'none',
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-4 py-2 rounded-full text-sm font-semibold border transition"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <header className="text-center mb-10">
          <p className="text-sm uppercase tracking-[0.3em]" style={{ color: 'var(--color-secondary)' }}>
            ExpoV
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>
            Math Test Generator
          </h1>
          <p className="mt-3 text-lg text-muted">
            Generate fresh LaTeX math problems styled exactly like your original script.
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <main
            className="surface-card rounded-3xl shadow-sm p-6 sm:p-8 transition-all duration-500 ease-out"
            style={mainPanelStyle}
          >
            <LatexInput value={inputText} onChange={setInputText} placeholder={DEFAULT_LATEX_SAMPLE} />

            {outputText && (
              <button
                type="button"
                onClick={handleArtifactCardClick}
                className="surface-muted mt-6 w-full text-left rounded-2xl p-5 flex items-center justify-between transition"
                style={{ borderColor: 'var(--color-border-muted)' }}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--color-secondary)' }}>
                    Canvas
                  </p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
                    {isArtifactOpen ? 'Hide canvas view' : 'Click to open the canvas'}
                  </p>
                </div>
                <span
                  className="text-3xl transition-transform"
                  style={{ color: 'var(--color-accent)', transform: isArtifactOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  &rsaquo;
                </span>
              </button>
            )}

            <div className="surface-muted mt-8 p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-center" style={{ color: 'var(--color-text-primary)' }}>
                Generation Options
              </h3>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label
                    htmlFor="num-exercises"
                    className="block text-sm font-medium text-muted mb-2 whitespace-nowrap leading-tight"
                  >
                    Number of Exercises
                  </label>
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
                    className="input-field w-full rounded-xl p-2.5 focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition"
                    aria-describedby="num-exercises-description"
                  />
                  <p className="text-xs text-muted mt-1" id="num-exercises-description">
                    Max: 30
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="difficulty"
                    className="block text-sm font-medium text-muted mb-2 whitespace-nowrap leading-tight"
                  >
                    Difficulty
                  </label>
                  <div className="relative">
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="input-field w-full rounded-xl p-2.5 appearance-none focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition"
                    >
                      <option value="easier">Easier</option>
                      <option value="medium">Medium (Similar)</option>
                      <option value="harder">Harder</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-muted mb-2 whitespace-nowrap leading-tight"
                  >
                    Language
                  </label>
                  <div className="relative">
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="input-field w-full rounded-xl p-2.5 appearance-none focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition"
                    >
                      <option value="Georgian">Georgian</option>
                      <option value="English">English</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Ukrainian">Ukrainian</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button onClick={handleGenerate} disabled={disableGenerate}>
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <span style={{ color: '#fff' }}>
                      <CliSpinner />
                    </span>
                    <span className="font-semibold tracking-wide">Generating…</span>
                  </div>
                ) : (
                  'Generate Test'
                )}
              </Button>
            </div>

            {error && (
              <div
                className="mt-6 rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: 'var(--color-surface-muted)', border: '1px solid var(--color-border-muted)' }}
              >
                {error}
              </div>
            )}

          </main>

          {shouldRenderCanvas && (
            <div className="transition-all duration-500 ease-out w-full" style={canvasPanelStyle}>
              <aside className="surface-card rounded-3xl shadow-sm w-full h-full p-6 space-y-5 slide-in-right">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--color-secondary)' }}>
                    Canvas
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="inline-flex surface-muted rounded-full p-1 border border-[var(--color-border-muted)]">
                    {(['code', 'preview'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveArtifactTab(tab)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
                          activeArtifactTab === tab ? 'shadow-sm' : ''
                        }`}
                        style={{
                          backgroundColor:
                            activeArtifactTab === tab ? 'var(--color-surface)' : 'transparent',
                          color:
                            activeArtifactTab === tab
                              ? 'var(--color-accent)'
                              : 'var(--color-text-muted)',
                        }}
                      >
                        {tab === 'code' ? 'LaTeX' : 'Preview'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      className="px-4 py-2 rounded-full text-sm font-semibold border transition"
                      style={{
                        borderColor: 'var(--color-accent)',
                        color: 'var(--color-accent)',
                        backgroundColor: isEditingCanvas ? 'var(--color-surface-muted)' : 'transparent',
                      }}
                    >
                      {isEditingCanvas ? 'Done' : 'Edit'}
                    </button>
                    <Button
                      variant="secondary"
                      onClick={handleCopyArtifact}
                      className="px-4 py-2 text-sm font-semibold rounded-full"
                    >
                      {artifactCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <div className="canvas-surface rounded-2xl h-[520px] overflow-hidden">
                  {activeArtifactTab === 'code' ? (
                    isEditingCanvas ? (
                      <textarea
                        value={editableLatex}
                        onChange={(e) => setEditableLatex(e.target.value)}
                        className="input-field w-full h-full p-4 rounded-2xl font-mono text-sm resize-none focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition"
                        spellCheck="false"
                      />
                    ) : (
                      <pre className="h-full overflow-auto p-4 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                        <code>{editableLatex}</code>
                      </pre>
                    )
                  ) : (
                    <div className="h-full p-4">
                      <LatexPreview
                        latex={editableLatex}
                        title="Canvas Preview"
                        variant="embedded"
                        height={500}
                      />
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>

        <footer className="text-center mt-10 text-muted text-sm">
          <p>© {new Date().getFullYear()} ExpoV. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
