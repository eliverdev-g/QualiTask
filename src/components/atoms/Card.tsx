import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'interactive' | 'alert';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-white border-slate-200 text-slate-900',
  muted: 'bg-slate-50 border-slate-200 text-slate-800',
  interactive: 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer transition-all',
  alert: 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200/50 text-slate-900',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
