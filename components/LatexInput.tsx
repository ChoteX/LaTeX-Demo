import React, { useLayoutEffect, useRef, useState } from 'react';
import { PaperclipIcon, PaperAirplaneIcon } from './icons';

interface LatexInputProps {
  latexValue: string;
  promptValue: string;
  onLatexChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  mode: 'prompt' | 'latex';
  onModeChange: (mode: 'prompt' | 'latex') => void;
  placeholder?: string;
  chatStatusLabel: string;
  chatSubtitle: string;
  isSubmitting: boolean;
  disableSubmit: boolean;
  onSubmit: () => void;
  attachedFileName: string | null;
  onAttachmentChange?: (name: string | null) => void;
  showSubmitButton: boolean;
}

const PROMPT_COLLAPSED_MAX_WIDTH = 920;
const PROMPT_EXPANDED_MAX_WIDTH = 980;
const PROMPT_BASE_MIN_HEIGHT = 120;
const PROMPT_EXPANDED_MIN_HEIGHT = 260;
const PROMPT_GROW_TRIGGER_HEIGHT = 180;
const PROMPT_EXPAND_CHAR_THRESHOLD = 120;
const LATEX_FIXED_MIN_HEIGHT = PROMPT_EXPANDED_MIN_HEIGHT;
const TRANSITION_TIMING = 'cubic-bezier(0.33, 1, 0.68, 1)';

const LatexInput: React.FC<LatexInputProps> = ({
  latexValue,
  promptValue,
  onLatexChange,
  onPromptChange,
  mode,
  onModeChange,
  placeholder,
  chatStatusLabel,
  chatSubtitle,
  isSubmitting,
  disableSubmit,
  onSubmit,
  attachedFileName,
  onAttachmentChange,
  showSubmitButton,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragCounter = useRef(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  const isPromptMode = mode === 'prompt';

  useLayoutEffect(() => {
    const textarea = promptTextareaRef.current;
    const trimmed = promptValue.trim();

    if (textarea) {
      textarea.style.height = 'auto';
      const nextHeight = trimmed.length === 0 ? PROMPT_BASE_MIN_HEIGHT : textarea.scrollHeight;
      textarea.style.height = `${nextHeight}px`;
    }

    if (!isPromptMode) {
      setIsPromptExpanded(false);
      return;
    }

    const hasManualBreak = promptValue.includes('\n');
    const charTrigger = trimmed.length > PROMPT_EXPAND_CHAR_THRESHOLD;
    const heightTrigger = textarea ? textarea.scrollHeight > PROMPT_GROW_TRIGGER_HEIGHT : false;
    const shouldExpand = trimmed.length > 0 && (hasManualBreak || charTrigger || heightTrigger);
    setIsPromptExpanded(shouldExpand);
  }, [promptValue, isPromptMode]);

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const loadTexFile = (file: File | undefined | null) => {
    if (!file) {
      onAttachmentChange?.(null);
      return;
    }
    const isTexFile =
      file.name.toLowerCase().endsWith('.tex') ||
      file.type === 'application/x-tex' ||
      file.type === 'text/x-tex' ||
      file.type === 'application/x-latex';

    if (!isTexFile) {
      window.alert('Please attach a .tex file.');
      return;
    }

    onAttachmentChange?.(file.name);
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

  const handleAttachmentClear = () => {
    onAttachmentChange?.(null);
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

  const promptWrapperStyle: React.CSSProperties = {
    maxWidth: `${isPromptExpanded ? PROMPT_EXPANDED_MAX_WIDTH : PROMPT_COLLAPSED_MAX_WIDTH}px`,
    marginLeft: 'auto',
    marginRight: 'auto',
    transition: `max-width 420ms ${TRANSITION_TIMING}`,
  };
  const promptTextareaStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input-bg)',
    minHeight: `${isPromptExpanded ? PROMPT_EXPANDED_MIN_HEIGHT : PROMPT_BASE_MIN_HEIGHT}px`,
    maxHeight: `${PROMPT_EXPANDED_MIN_HEIGHT}px`,
    overflowY: isPromptExpanded ? 'auto' : 'hidden',
    transition: `min-height 360ms ${TRANSITION_TIMING}`,
    paddingBottom: attachedFileName ? '3.25rem' : undefined,
  };

  const renderDropOverlay = () => (
    <div
      className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl transition-opacity duration-300 ${
        isDraggingFile ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        color: '#ffffff',
        backdropFilter: 'blur(3px)',
      }}
    >
      <PaperclipIcon aria-hidden="true" size={36} />
      <p className="text-sm font-semibold uppercase tracking-wide text-center mt-3 px-4">
        Drop your .tex file anywhere to update the LaTeX input
      </p>
    </div>
  );

  return (
    <div
      className="w-full relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col">
          <label
            htmlFor={isPromptMode ? 'guidance-prompt' : 'latex-input'}
            className="block text-lg font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {isPromptMode ? chatStatusLabel : 'Paste Existing LaTeX Script'}
          </label>
          <span className="text-xs italic text-muted">
            {isPromptMode
              ? chatSubtitle
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
              Chat
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".tex,application/x-tex,text/x-tex,application/x-latex"
              className="sr-only"
              onChange={handleFileInputChange}
            />
        </div>
      </div>

      <div className="relative w-full">
        {isPromptMode ? (
          <div className="w-full transition-all duration-500 relative" style={promptWrapperStyle}>
            <textarea
              id="guidance-prompt"
              ref={promptTextareaRef}
              value={promptValue}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="How can I help you today?"
              className="input-field w-full resize-none rounded-2xl p-4 text-base leading-relaxed focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition-colors prompt-textarea"
              style={promptTextareaStyle}
            />
            {attachedFileName && (
              <div className="attachment-pill attachment-pill--inline">
                <span className="attachment-pill__text">{attachedFileName}</span>
                <button type="button" onClick={handleAttachmentClear} aria-label="Remove attached file">
                  &times;
                </button>
              </div>
            )}
            {renderDropOverlay()}
          </div>
        ) : (
          <div className="relative">
            <textarea
              id="latex-input"
              value={latexValue}
              onChange={(e) => onLatexChange(e.target.value)}
              placeholder={placeholder}
              className="input-field w-full p-4 rounded-2xl font-mono text-sm resize-none focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition-colors"
              style={{ backgroundColor: 'var(--color-input-bg)', minHeight: `${LATEX_FIXED_MIN_HEIGHT}px` }}
              spellCheck="false"
            />
            {renderDropOverlay()}
          </div>
        )}
      </div>
      {showSubmitButton && (
        <div className="mt-4 flex w-full justify-end">
          <button
            type="button"
            className="chat-send-button"
            onClick={onSubmit}
            disabled={disableSubmit || isSubmitting}
          >
            {isSubmitting ? 'Sending…' : 'Send'}
            <PaperAirplaneIcon aria-hidden="true" size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LatexInput;
