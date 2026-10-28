import React from 'react';
import { Card } from '../atoms/Card';

export interface MetricStatCardProps {
  title: string;
  value: number | string;
  sublabel: string;
  icon: React.ReactNode;
  variant?: 'default' | 'alert' | 'muted';
  valueColor?: string;
}

export const MetricStatCard: React.FC<MetricStatCardProps> = ({
  title,
  value,
  sublabel,
  icon,
  variant = 'default',
  valueColor = 'text-slate-900',
}) => {
  return (
    <Card variant={variant} padding="md" className="shadow-2xs">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span className="font-medium">{title}</span>
        <span className="shrink-0">{icon}</span>
      </div>
      <div className={`text-2xl font-bold font-mono tabular-nums ${valueColor}`}>
        {value}
      </div>
      <p className="text-[11px] text-slate-500 mt-1">{sublabel}</p>
    </Card>
  );
};
