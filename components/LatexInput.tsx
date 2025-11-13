
import React from 'react';

interface LatexInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LatexInput: React.FC<LatexInputProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="w-full">
      <label htmlFor="latex-input" className="block text-lg font-medium text-[#2f2e2a] mb-2">
        Paste Existing LaTeX Script
      </label>
      <textarea
        id="latex-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-64 p-4 bg-[#fdfbf5] border border-[#d8d2c4] rounded-2xl text-[#2f2e2a] placeholder:text-[#9b958a] font-mono text-sm resize-y focus:ring-2 focus:ring-[#c15f3c] focus:border-[#c15f3c] outline-none transition-colors"
        spellCheck="false"
      />
    </div>
  );
};

export default LatexInput;
