import React, { useEffect, useRef, useState } from 'react';
import { PaperclipIcon } from './icons';

interface LatexInputProps {
  latexValue: string;
  promptValue: string;
  onLatexChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  mode: 'prompt' | 'latex';
  onModeChange: (mode: 'prompt' | 'latex') => void;
  placeholder?: string;
}

const LatexInput: React.FC<LatexInputProps> = ({
  latexValue,
  promptValue,
  onLatexChange,
  onPromptChange,
  mode,
  onModeChange,
  placeholder,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragCounter = useRef(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  const isPromptMode = mode === 'prompt';

  useEffect(() => {
    if (!isPromptMode || !promptTextareaRef.current) {
      setIsPromptExpanded(false);
      return;
    }
    const textarea = promptTextareaRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    const multilineThreshold = 96;
    const hasManualBreak = textarea.value.includes('\n');
    setIsPromptExpanded(hasManualBreak || textarea.scrollHeight > multilineThreshold);
  }, [promptValue, isPromptMode]);

  useEffect(() => {
    if (mode === 'latex') return;
    dragCounter.current = 0;
    setIsDraggingFile(false);
  }, [mode]);

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const loadTexFile = (file: File | undefined | null) => {
    if (!file) return;
    const isTexFile =
      file.name.toLowerCase().endsWith('.tex') ||
      file.type === 'application/x-tex' ||
      file.type === 'text/x-tex' ||
      file.type === 'application/x-latex';

    if (!isTexFile) {
      window.alert('Please attach a .tex file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLatexChange(reader.result);
      }
    };
    reader.onerror = () => {
      window.alert('Unable to read the provided file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    loadTexFile(file ?? null);
    event.target.value = '';
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDraggingFile(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingFile(false);
    const [file] = event.dataTransfer.files ?? [];
    loadTexFile(file ?? null);
  };

  const toggleButtonClass = (targetMode: 'prompt' | 'latex') => {
    const isActive = mode === targetMode;
    return [
      'px-3',
      'py-1.5',
      'text-sm',
      'font-semibold',
      'rounded-full',
      'transition-colors',
      isActive ? 'bg-[#c15f3c] text-white shadow-sm' : 'text-muted hover:text-[var(--color-text-primary)]',
    ].join(' ');
  };

  const promptWrapperStyle: React.CSSProperties = isPromptExpanded
    ? {}
    : {
        maxWidth: '520px',
      };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col">
          <label
            htmlFor={isPromptMode ? 'guidance-prompt' : 'latex-input'}
            className="block text-lg font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {isPromptMode ? 'Guidance Prompt' : 'Paste Existing LaTeX Script'}
          </label>
          <span className="text-xs italic text-muted">
            {isPromptMode
              ? 'Write a quick note so Gemini can personalize the test further.'
              : 'Leave the default prompt for quick results or replace it with your own.'}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-1 rounded-full border px-1 py-1"
            style={{ borderColor: 'var(--color-border-muted)', backgroundColor: 'var(--color-surface-muted)' }}
            role="group"
            aria-label="Switch between prompt and LaTeX input modes"
          >
            <button
              type="button"
              className={toggleButtonClass('prompt')}
              onClick={() => onModeChange('prompt')}
              aria-pressed={isPromptMode}
            >
              Prompt
            </button>
            <button
              type="button"
              className={toggleButtonClass('latex')}
              onClick={() => onModeChange('latex')}
              aria-pressed={!isPromptMode}
            >
              LaTeX
            </button>
          </div>
          {mode === 'latex' && (
            <button
              type="button"
              onClick={handlePaperclipClick}
              className="icon-button"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label="Attach a .tex file"
              title="Attach a .tex file"
            >
              <PaperclipIcon aria-hidden="true" size={20} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".tex,application/x-tex,text/x-tex,application/x-latex"
            className="sr-only"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {isPromptMode ? (
        <div
          className={`w-full transition-all duration-300 ${isPromptExpanded ? 'max-w-full' : 'md:max-w-3xl'}`}
          style={promptWrapperStyle}
        >
          <textarea
            id="guidance-prompt"
            ref={promptTextareaRef}
            value={promptValue}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="How can I help you today?"
            className="input-field w-full resize-none rounded-2xl p-4 text-base leading-relaxed focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition-colors prompt-textarea"
            style={{
              backgroundColor: 'var(--color-input-bg)',
              minHeight: isPromptExpanded ? '140px' : '72px',
            }}
          />
        </div>
      ) : (
        <div
          className="relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <textarea
            id="latex-input"
            value={latexValue}
            onChange={(e) => onLatexChange(e.target.value)}
            placeholder={placeholder}
            className="input-field w-full h-64 p-4 rounded-2xl font-mono text-sm resize-none focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition-colors"
            style={{ backgroundColor: 'var(--color-input-bg)' }}
            spellCheck="false"
          />
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl transition-opacity duration-200 ${
              isDraggingFile ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              color: '#ffffff',
              backdropFilter: 'blur(2px)',
              pointerEvents: 'none',
            }}
          >
            <PaperclipIcon aria-hidden="true" size={36} />
            <p className="text-sm font-semibold uppercase tracking-wide text-center mt-3">
              Hover your .tex file to attach
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LatexInput;
