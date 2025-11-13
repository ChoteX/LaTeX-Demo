
import React from 'react';

interface LatexInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LatexInput: React.FC<LatexInputProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="w-full">
      <label
        htmlFor="latex-input"
        className="block text-lg font-medium mb-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Paste Existing LaTeX Script
      </label>
      <textarea
        id="latex-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field w-full h-64 p-4 rounded-2xl font-mono text-sm resize-none focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition-colors"
        style={{ backgroundColor: 'var(--color-input-bg)' }}
        spellCheck="false"
      />
    </div>
  );
};

export default LatexInput;
