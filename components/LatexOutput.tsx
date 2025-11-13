
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
        <h2 className="text-lg font-semibold text-[#2f2e2a]">Generated LaTeX Script</h2>
        <Button onClick={handleCopy} variant="secondary" disabled={!latexScript}>
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>
      </div>
      <div className="w-full h-96 p-4 bg-[#fdfbf5] border border-[#d8d2c4] rounded-2xl text-[#2f2e2a] font-mono text-sm overflow-auto">
        <pre>
          <code>{latexScript}</code>
        </pre>
      </div>
    </div>
  );
};

export default LatexOutput;
