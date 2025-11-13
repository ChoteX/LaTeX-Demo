import React, { useState, useCallback, useEffect } from 'react';
import { generateTestSamples } from './services/geminiService';
import LatexInput from './components/LatexInput';
import Button from './components/Button';
import LatexPreview from './components/LatexPreview';
import CliSpinner from './components/CliSpinner';
import { SunIcon, MoonIcon, DownloadIcon } from './components/icons';
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

\begin{document}

\section*{Math Test - 2}

\begin{enumerate}

\item Calculate the value of $2.25 - \frac{3}{4}$.\\
a) $1$ \quad b) $1.5$ \quad c) $2$ \quad d) $0.5$

\item Evaluate the expression $\frac{5}{2} \div \frac{1}{4} - 3$.\\
a) $7$ \quad b) $1$ \quad c) $-2$ \quad d) $4$

\item If $x = \frac{1}{2}$ and $y = \frac{2}{3}$, what is the value of $x^2 + y$?\\
a) $\frac{7}{6}$ \quad b) $\frac{3}{5}$ \quad c) $\frac{11}{12}$ \quad d) $1$

\item Simplify the expression $\frac{1.2 \times 0.5}{0.03}$.\\
a) $2$ \quad b) $20$ \quad c) $0.2$ \quad d) $200$

\item A recipe calls for $1\frac{1}{2}$ cups of flour to make 12 cookies. How many cups of flour are needed to make 30 cookies?\\
a) $2\frac{1}{2}$ \quad b) $3$ \quad c) $3\frac{1}{4}$ \quad d) $3\frac{3}{4}$

\item How many integers are there between $-4.2$ and $3.8$?\\
a) $6$ \quad b) $7$ \quad c) $8$ \quad d) $9$

\item What is the product of the opposite of $-\frac{4}{5}$ and the reciprocal of $2$?\\
a) $-\frac{2}{5}$ \quad b) $\frac{8}{5}$ \quad c) $-\frac{5}{8}$ \quad d) $\frac{2}{5}$

\item Which of the following fractions is the largest?\\
a) $\frac{4}{7}$ \quad b) $\frac{1}{2}$ \quad c) $\frac{5}{9}$ \quad d) $\frac{3}{5}$

\item Calculate $\left(2\frac{1}{3} - 1\frac{1}{2}\right) \div \frac{5}{6}$.\\
a) $\frac{5}{6}$ \quad b) $1$ \quad c) $\frac{6}{5}$ \quad d) $\frac{25}{36}$

\item What is $25\%$ of the sum of $\frac{1}{2}$ and $\frac{3}{4}$?\\
a) $\frac{5}{8}$ \quad b) $\frac{1}{4}$ \quad c) $\frac{5}{16}$ \quad d) $\frac{1}{2}$

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
  const [artifactCopied, setArtifactCopied] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isEditingCanvas, setIsEditingCanvas] = useState<boolean>(false);
  const [shouldRenderCanvas, setShouldRenderCanvas] = useState<boolean>(false);

  const isCanvasVisible = Boolean(outputText) && isArtifactOpen;

  useEffect(() => {
    if (!outputText) {
      setIsArtifactOpen(false);
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
      return next;
    });
  };

  const handleCopyArtifact = () => {
    if (!editableLatex.trim()) return;
    navigator.clipboard.writeText(editableLatex);
    setArtifactCopied(true);
    setTimeout(() => setArtifactCopied(false), 2000);
  };

  const handleDownloadArtifact = () => {
    if (!editableLatex.trim()) return;
    const blob = new Blob([editableLatex], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'math-test.tex';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleEditToggle = () => {
    setIsEditingCanvas((prev) => !prev);
  };

  const disableGenerate = isLoading || !inputText.trim();

  const mainPanelStyle: React.CSSProperties = {
    flexBasis: isCanvasVisible ? '34%' : '100%',
    maxWidth: isCanvasVisible ? '34%' : '100%',
    marginRight: isCanvasVisible ? '8px' : '0',
  };

  const canvasPanelStyle: React.CSSProperties = {
    flexBasis: isCanvasVisible ? '66%' : '0%',
    maxWidth: isCanvasVisible ? '66%' : '0%',
    opacity: isCanvasVisible ? 1 : 0,
    transform: isCanvasVisible ? 'translateX(0)' : 'translateX(60px)',
    pointerEvents: isCanvasVisible ? 'auto' : 'none',
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-10">
        {isLoading && (
          <div className="app-loading-overlay" role="status" aria-live="polite">
            <CliSpinner />
            <p className="mt-4 text-sm tracking-wide uppercase" style={{ color: 'var(--color-text-primary)' }}>
              Generating output…
            </p>
          </div>
        )}
        <div className="flex justify-end mb-4 relative z-10">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-4 py-2 rounded-full text-sm font-semibold border transition"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
            }}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
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

        <div
          className={`flex flex-col ${isCanvasVisible ? 'gap-4' : 'gap-6'} lg:flex-row ${
            isCanvasVisible ? 'lg:gap-2' : 'lg:gap-6'
          }`}
        >
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
              <div
                className="mt-6 grid gap-6"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
              >
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
                  <div>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      LaTeX Output
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-secondary)' }}>
                      {isEditingCanvas ? 'Editing source' : 'Previewing document'}
                    </p>
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
                    <button
                      type="button"
                      onClick={handleDownloadArtifact}
                      className="icon-button"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      aria-label="Download LaTeX output"
                      title="Download LaTeX output"
                    >
                      <DownloadIcon aria-hidden="true" size={18} />
                    </button>
                  </div>
                </div>

                <div className="canvas-surface rounded-2xl flex-1 overflow-hidden min-h-[420px] flex flex-col">
                  {isEditingCanvas ? (
                    <textarea
                      value={editableLatex}
                      onChange={(e) => setEditableLatex(e.target.value)}
                      className="input-field flex-1 w-full h-full min-h-[420px] p-4 rounded-2xl font-mono text-sm resize-none focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition"
                      spellCheck="false"
                    />
                  ) : (
                    <div className="flex-1 min-h-0">
                      <LatexPreview latex={editableLatex} variant="embedded" />
                    </div>
                  )}
                </div>
                <div className="surface-muted rounded-2xl p-4 text-sm flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Exercises</p>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {numExercises}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Difficulty</p>
                    <p className="font-semibold capitalize" style={{ color: 'var(--color-text-primary)' }}>
                      {difficulty}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Language</p>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {language}
                    </p>
                  </div>
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
