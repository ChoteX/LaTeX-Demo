
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'px-6 py-3 font-semibold rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#c15f3c] focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed';
  
  const variantStyles: Record<'primary' | 'secondary', React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-accent)',
      color: '#fff',
    },
    secondary: {
      backgroundColor: 'var(--color-secondary)',
      color: '#fff',
    },
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${className}`}
      style={variantStyles[variant]}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
