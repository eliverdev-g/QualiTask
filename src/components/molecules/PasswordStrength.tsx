import React from 'react';
import { Check, X } from 'lucide-react';
import { evaluatePasswordStrength } from '../../services/authService';
import { ProgressBar } from '../atoms/ProgressBar';

export interface PasswordStrengthProps {
  password?: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = '' }) => {
  if (!password) return null;

  const evaluation = evaluatePasswordStrength(password);
  const percent = (evaluation.score / 4) * 100;

  const colorMap: Record<number, 'rose' | 'amber' | 'amber' | 'blue' | 'emerald'> = {
    0: 'rose',
    1: 'amber',
    2: 'amber',
    3: 'blue',
    4: 'emerald',
  };

  const criteria = [
    { label: 'Mínimo 8 caracteres', met: evaluation.hasMinLength },
    { label: 'Al menos una mayúscula (A-Z)', met: evaluation.hasUpper },
    { label: 'Al menos una minúscula (a-z)', met: evaluation.hasLower },
    { label: 'Al menos un número (0-9)', met: evaluation.hasNumber },
    { label: 'Al menos un caracter especial (!@#$...)', met: evaluation.hasSpecial },
  ];

  return (
    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
      <div className="flex justify-between items-center text-[11px]">
        <span className="font-semibold text-slate-700">Fortaleza de contraseña:</span>
        <span className={`font-bold ${evaluation.color}`}>{evaluation.label}</span>
      </div>

      <ProgressBar value={percent} color={colorMap[evaluation.score]} size="sm" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] pt-1">
        {criteria.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              item.met ? 'text-emerald-700 font-medium' : 'text-slate-500'
            }`}
          >
            {item.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
