
import React, { useRef, useState } from 'react';
import { PaperclipIcon } from './icons';

interface LatexInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LatexInput: React.FC<LatexInputProps> = ({ value, onChange, placeholder }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

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
        onChange(reader.result);
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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 gap-3">
        <label
          htmlFor="latex-input"
          className="block text-lg font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Paste Existing LaTeX Script
        </label>
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
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <textarea
          id="latex-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
    </div>
  );
};

export default LatexInput;
