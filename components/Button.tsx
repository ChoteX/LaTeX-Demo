
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyles =
    'px-6 py-3 font-semibold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#05060F] transition-transform transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#FFB547] via-[#FF7F6A] to-[#F15483] text-[#1B0F22] hover:brightness-110 focus:ring-[#F15483]',
    secondary:
      'border border-[#FF9F7F] text-[#FFD9C8] bg-transparent hover:bg-[#FF9F7F]/10 focus:ring-[#FF9F7F]',
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
