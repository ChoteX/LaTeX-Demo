import React from 'react';

const CliSpinner: React.FC = () => (
  <span className="cli-spinner" aria-hidden="true">
    {Array.from({ length: 9 }).map((_, index) => {
      if (index === 4) {
        return <span key="center" className="cli-spinner__dot cli-spinner__dot--empty" />;
      }
      return <span key={index} className="cli-spinner__dot" />;
    })}
  </span>
);

export default CliSpinner;
