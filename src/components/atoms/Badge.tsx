import React from 'react';
import PropTypes from 'prop-types';

export type BadgeVariant =
  | 'default'
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  primary: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'text-[10px] py-0.5 px-1.5 gap-1',
  sm: 'text-[11px] py-0.5 px-2 gap-1.5 font-medium',
  md: 'text-xs py-1 px-2.5 gap-1.5 font-semibold',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'xs',
  icon,
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center font-medium border rounded select-none shrink-0 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

Badge.propTypes = {
  variant: PropTypes.oneOf(['default', 'neutral', 'primary', 'success', 'warning', 'danger', 'info']),
  size: PropTypes.oneOf(['xs', 'sm', 'md']),
  icon: PropTypes.node,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
