import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerBg?: string;
  hideCloseButton?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer,
  headerBg = 'bg-slate-50',
  hideCloseButton = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        className={`bg-white rounded-xl shadow-2xl border border-slate-200 w-full ${sizeStyles[size]} max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 ${headerBg}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {!hideCloseButton && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onClose}
              aria-label="Cerrar ventana modal"
              className="p-1 hover:bg-slate-200/80 rounded-md text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Body content */}
        <div className="p-5 flex-1 overflow-y-auto">{children}</div>

        {/* Optional Footer */}
        {footer && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
