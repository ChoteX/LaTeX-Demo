
import React from 'react';

interface LatexInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LatexInput: React.FC<LatexInputProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="w-full">
      <label htmlFor="latex-input" className="block text-lg font-medium text-[#FDDDC9] mb-2">
        Paste Existing LaTeX Script
      </label>
      <textarea
        id="latex-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-64 p-4 bg-[#0A0D1D] border border-[#2F3250] rounded-2xl text-[#F5F5FF] placeholder:text-[#6F749F] font-mono text-sm resize-y focus:ring-2 focus:ring-[#FF8F70] focus:border-[#FFB547] outline-none transition-colors"
        spellCheck="false"
      />
    </div>
  );
};

export default LatexInput;
