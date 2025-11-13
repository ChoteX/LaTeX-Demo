import React from 'react';

interface CliSpinnerProps {
  color?: string;
}

const CliSpinner: React.FC<CliSpinnerProps> = ({ color }) => (
  <span
    className="cli-spinner"
    aria-hidden="true"
    style={{ color: color ?? 'var(--spinner-color, var(--color-accent))' }}
  >
    {Array.from({ length: 9 }).map((_, index) => {
      if (index === 4) {
        return <span key="center" className="cli-spinner__dot cli-spinner__dot--empty" />;
      }
      return <span key={index} className="cli-spinner__dot" />;
    })}
  </span>
);

export default CliSpinner;
