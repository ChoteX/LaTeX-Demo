import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HtmlGenerator, parse } from 'latex.js';
import Loader from './Loader';
import { prepareForPreview } from '../utils/latex';
import 'katex/dist/katex.min.css';
import '../styles/latex-preview.css';

interface LatexPreviewProps {
  latex: string;
  title: string;
  emptyMessage?: string;
  isLoading?: boolean;
  height?: number;
}

const LatexPreview: React.FC<LatexPreviewProps> = ({
  latex,
  title,
  emptyMessage = 'Add some LaTeX to see the live preview.',
  isLoading = false,
  height = 384,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const retryTimerRef = useRef<number | null>(null);
  const lastInputChangeAtRef = useRef<number>(Date.now());

  const canRender = typeof document !== 'undefined';

  const normalizedInput = useMemo(() => {
    lastInputChangeAtRef.current = Date.now();
    return prepareForPreview(latex);
  }, [latex]);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    if (!normalizedInput.trim()) {
      setRenderedHtml('');
      setError(null);
      return;
    }

    try {
      const generator = new HtmlGenerator({
        hyphenate: false,
      });

      parse(normalizedInput, { generator });

      const fragment = generator.domFragment();
      const wrapper = document.createElement('div');
      wrapper.appendChild(fragment);
      setRenderedHtml(wrapper.innerHTML);
      setError(null);
    } catch (err) {
      console.error('Failed to render LaTeX preview', err);
      const message =
        err instanceof Error ? err.message : 'Unable to render LaTeX preview.';
      setRenderedHtml('');
      setError(message);
    }
  }, [normalizedInput, canRender]);

  // Retry rendering after 5s of inactivity if an error occurred
  useEffect(() => {
    if (!error) return;

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    retryTimerRef.current = window.setTimeout(() => {
      const now = Date.now();
      const inactiveFor = now - lastInputChangeAtRef.current;
      if (inactiveFor < 5000) return; // user is still editing

      try {
        const generator = new HtmlGenerator({ hyphenate: false });
        parse(normalizedInput, { generator });
        const fragment = generator.domFragment();
        const wrapper = document.createElement('div');
        wrapper.appendChild(fragment);
        setRenderedHtml(wrapper.innerHTML);
        setError(null);
      } catch (e) {
        // keep error, try again only if user edits
      }
    }, 5000);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [error, normalizedInput]);

  const showPlaceholder = !latex.trim();

  return (
    <section className="latex-preview bg-[#0F1424]/80 border border-[#2F3250] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-[#FDDDC9]">{title}</h3>
          <p className="text-xs text-[#9DA3DC]">
            Rendered locally. Complex packages may not be fully supported.
          </p>
        </div>
      </div>

      <div
        className="latex-preview-stage bg-white text-gray-900 rounded-lg overflow-auto"
        style={{ minHeight: `${height / 2}px`, maxHeight: `${height}px` }}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full py-10 text-[#7B82C9]">
            <Loader />
            <span className="ml-3">Preparing preview…</span>
          </div>
        )}

        {!isLoading && showPlaceholder && (
          <div className="h-full flex items-center justify-center text-center text-sm text-[#7B82C9] px-6 py-12">
            {emptyMessage}
          </div>
        )}

        {!isLoading && !showPlaceholder && error && (
          <div className="p-4 text-sm text-[#D86586]">
            <p className="font-medium mb-1">Preview unavailable</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !showPlaceholder && !error && renderedHtml && (
          <div
            className="latex-preview-stage-content px-6 py-5 latex-preview-stage-inner"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </section>
  );
};

export default LatexPreview;
