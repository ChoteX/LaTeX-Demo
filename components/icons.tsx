import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

const baseStrokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const SunIcon: React.FC<IconProps> = ({ size = 22, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
    <circle cx="12" cy="12" r="4.5" {...baseStrokeProps} />
    <path d="M12 2v2.5M12 19.5V22M4.5 12H2M22 12h-2.5M18.5 5.5l-1.75 1.75M7.25 16.75 5.5 18.5M5.5 5.5l1.75 1.75M18.5 18.5l-1.75-1.75" {...baseStrokeProps} />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ size = 22, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
    <path
      {...baseStrokeProps}
      d="M20 15.2A8.7 8.7 0 0 1 9.3 4a6.2 6.2 0 1 0 10.7 11.2Z"
    />
  </svg>
);

export const PaperclipIcon: React.FC<IconProps> = ({ size = 22, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
    <path
      {...baseStrokeProps}
      d="M17 8.5 9.5 16a2.5 2.5 0 1 1-3.5-3.5l8.25-8.25a4.5 4.5 0 1 1 6.36 6.36l-8.5 8.5a6 6 0 0 1-8.5-8.5L11 3"
    />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
    <path {...baseStrokeProps} d="M12 4v10" />
    <path {...baseStrokeProps} d="m8.5 11.5 3.5 3.5 3.5-3.5" />
    <path {...baseStrokeProps} d="M5 19h14" />
  </svg>
);

export const PaperAirplaneIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
    <path
      {...baseStrokeProps}
      d="m4 10.5 15-7-4.5 16-4-5.5-6.5-1.5 6.5-1.5 4 5.5"
    />
  </svg>
);

export const ResetIcon: React.FC<IconProps> = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
    <path {...baseStrokeProps} d="M8 4H4v4" />
    <path {...baseStrokeProps} d="M4 4 9 9" />
    <path {...baseStrokeProps} d="M16 20h4v-4" />
    <path {...baseStrokeProps} d="m20 20-5-5" />
    <path {...baseStrokeProps} d="M7 12a5 5 0 0 1 5-5h5" />
    <path {...baseStrokeProps} d="M17 12a5 5 0 0 1-5 5H7" />
  </svg>
);
