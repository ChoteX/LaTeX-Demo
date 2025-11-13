
import React, { useState } from 'react';
import Button from './Button';

interface LatexOutputProps {
  latexScript: string;
}

const LatexOutput: React.FC<LatexOutputProps> = ({ latexScript }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!latexScript) return;
    navigator.clipboard.writeText(latexScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-[#FDDDC9]">Generated LaTeX Script</h2>
        <Button onClick={handleCopy} variant="secondary" disabled={!latexScript}>
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>
      </div>
      <div className="w-full h-96 p-4 bg-[#0B0E1F] border border-[#2F3250] rounded-2xl text-[#E4E7FF] font-mono text-sm overflow-auto">
        <pre>
          <code>{latexScript}</code>
        </pre>
      </div>
    </div>
  );
};

export default LatexOutput;
