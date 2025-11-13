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
  variant?: 'default' | 'embedded';
}

const LatexPreview: React.FC<LatexPreviewProps> = ({
  latex,
  title,
  emptyMessage = 'Add some LaTeX to see the live preview.',
  isLoading = false,
  height = 384,
  variant = 'default',
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
  const shouldShowPlaceholderMessage = showPlaceholder && variant === 'default';

  const renderStageContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full py-10 text-[#908a80]">
          <Loader />
          <span className="ml-3">Preparing preview…</span>
        </div>
      );
    }

    if (shouldShowPlaceholderMessage) {
      return (
        <div className="h-full flex items-center justify-center text-center text-sm text-[#908a80] px-6 py-12">
          {emptyMessage}
        </div>
      );
    }

    if (!isLoading && !showPlaceholder && error) {
      return (
        <div className="p-4 text-sm text-[#b04a2c]">
          <p className="font-medium mb-1">Preview unavailable</p>
          <p>{error}</p>
        </div>
      );
    }

    if (!isLoading && !showPlaceholder && !error && renderedHtml) {
      return (
        <div
          className="latex-preview-stage-content px-6 py-5 latex-preview-stage-inner"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      );
    }

    return null;
  };

  if (variant === 'embedded') {
    return (
      <div
        className="rounded-xl bg-white text-[#2f2e2a] border border-[#e4ddcf] overflow-auto"
        style={{ minHeight: `${height / 2}px`, maxHeight: `${height}px` }}
      >
        {renderStageContent()}
      </div>
    );
  }

  return (
    <section className="latex-preview bg-white border border-[#e6e0d4] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-[#2f2e2a]">{title}</h3>
          <p className="text-xs text-[#8a867c]">
            Rendered locally. Complex packages may not be fully supported.
          </p>
        </div>
      </div>

      <div
        className="latex-preview-stage bg-[#fdfbf5] text-[#2f2e2a] rounded-2xl border border-[#ebe4d6] overflow-auto"
        style={{ minHeight: `${height / 2}px`, maxHeight: `${height}px` }}
      >
        {renderStageContent()}
      </div>
    </section>
  );
};

export default LatexPreview;
