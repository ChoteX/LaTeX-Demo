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
  aspectRatio?: string;
}

const LatexPreview: React.FC<LatexPreviewProps> = ({
  latex,
  title,
  emptyMessage = 'Add some LaTeX to see the live preview.',
  isLoading = false,
  height = 384,
  variant = 'default',
  aspectRatio = '210 / 297',
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
        <div className="flex items-center justify-center h-full py-10 text-muted">
          <Loader />
          <span className="ml-3">Preparing preview…</span>
        </div>
      );
    }

    if (shouldShowPlaceholderMessage) {
      return (
        <div className="h-full flex items-center justify-center text-center text-sm text-muted px-6 py-12">
          {emptyMessage}
        </div>
      );
    }

    if (!isLoading && !showPlaceholder && error) {
      return (
        <div className="p-4 text-sm" style={{ color: '#b04a2c' }}>
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

  const stageStyle: React.CSSProperties = {
    aspectRatio,
    maxHeight: height,
    width: '100%',
  };

  if (variant === 'embedded') {
    return (
      <div className="rounded-2xl canvas-surface overflow-auto" style={stageStyle}>
        {renderStageContent()}
      </div>
    );
  }

  return (
    <section className="latex-preview surface-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
          <p className="text-xs text-muted">
            Rendered locally. Complex packages may not be fully supported.
          </p>
        </div>
      </div>

      <div
        className="latex-preview-stage canvas-surface text-[#2f2e2a] rounded-2xl overflow-auto"
        style={stageStyle}
      >
        {renderStageContent()}
      </div>
    </section>
  );
};

export default LatexPreview;
