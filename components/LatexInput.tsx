
import React from 'react';

interface LatexInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LatexInput: React.FC<LatexInputProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="w-full">
      <label htmlFor="latex-input" className="block text-lg font-medium text-gray-300 mb-2">
        Paste Existing LaTeX Script
      </label>
      <textarea
        id="latex-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-64 p-4 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        spellCheck="false"
      />
    </div>
  );
};

export default LatexInput;
