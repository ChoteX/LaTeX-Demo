import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HtmlGenerator, parse } from 'latex.js';
import Loader from './Loader';
import 'katex/dist/katex.min.css';
import '../styles/latex-preview.css';

interface LatexPreviewProps {
  latex: string;
  title: string;
  emptyMessage?: string;
  isLoading?: boolean;
  height?: number;
}

const ensureDocumentWrapper = (latex: string) => {
  if (!latex?.trim()) return '';

  const hasDocumentEnv =
    latex.includes('\\begin{document}') && latex.includes('\\end{document}');

  if (hasDocumentEnv) {
    return latex;
  }

  return `\\documentclass{article}
\\begin{document}
${latex}
\\end{document}`;
};

const LatexPreview: React.FC<LatexPreviewProps> = ({
  latex,
  title,
  emptyMessage = 'Add some LaTeX to see the live preview.',
  isLoading = false,
  height = 384,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRender = typeof document !== 'undefined';

  const normalizedInput = useMemo(() => ensureDocumentWrapper(latex), [latex]);

  useEffect(() => {
    const mountNode = containerRef.current;
    if (!mountNode) return;

    mountNode.textContent = '';

    if (!normalizedInput.trim() || !canRender) {
      setError(null);
      return;
    }

    try {
      const generator = new HtmlGenerator({
        hyphenate: false,
      });

      parse(normalizedInput, { generator });

      const fragment = generator.domFragment();
      const previewRoot = document.createElement('div');
      previewRoot.className = 'latex-preview-stage-inner';
      previewRoot.appendChild(fragment);

      mountNode.appendChild(previewRoot);
      setError(null);
    } catch (err) {
      console.error('Failed to render LaTeX preview', err);
      const message =
        err instanceof Error ? err.message : 'Unable to render LaTeX preview.';
      setError(message);
    }
  }, [normalizedInput, canRender]);

  const showPlaceholder = !latex.trim();

  return (
    <section className="latex-preview bg-gray-900/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
          <p className="text-xs text-gray-500">
            Rendered locally. Complex packages may not be fully supported.
          </p>
        </div>
      </div>

      <div
        className="latex-preview-stage bg-white text-gray-900 rounded-lg overflow-auto"
        style={{ minHeight: `${height / 2}px`, maxHeight: `${height}px` }}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full py-10 text-gray-500">
            <Loader />
            <span className="ml-3">Preparing preview…</span>
          </div>
        )}

        {!isLoading && showPlaceholder && (
          <div className="h-full flex items-center justify-center text-center text-sm text-gray-500 px-6 py-12">
            {emptyMessage}
          </div>
        )}

        {!isLoading && !showPlaceholder && error && (
          <div className="p-4 text-sm text-red-500">
            <p className="font-medium mb-1">Preview unavailable</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !showPlaceholder && !error && (
          <div
            ref={containerRef}
            className="latex-preview-stage-content px-6 py-5"
          />
        )}
      </div>
    </section>
  );
};

export default LatexPreview;
