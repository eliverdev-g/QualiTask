import React, { InputHTMLAttributes, forwardRef } from 'react';
import PropTypes from 'prop-types';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, iconRight, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full text-xs py-2 bg-white border rounded-lg focus:outline-none transition-colors text-slate-800 placeholder:text-slate-400 ${
              icon ? 'pl-9' : 'pl-3'
            } ${iconRight ? 'pr-9' : 'pr-3'} ${
              error
                ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/30'
                : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            } ${className}`}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3 flex items-center justify-center text-slate-400">
              {iconRight}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[11px] text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  icon: PropTypes.node,
  iconRight: PropTypes.node,
  className: PropTypes.string,
  id: PropTypes.string,
  required: PropTypes.bool,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
