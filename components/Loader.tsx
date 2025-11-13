import React from 'react';
import CliSpinner from './CliSpinner';

interface LoaderProps {
  label?: string;
}

const Loader: React.FC<LoaderProps> = ({ label = 'Preparing preview…' }) => (
  <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
    <CliSpinner />
    {label && <span className="text-xs uppercase tracking-[0.25em] text-muted">{label}</span>}
  </div>
);

export default Loader;
