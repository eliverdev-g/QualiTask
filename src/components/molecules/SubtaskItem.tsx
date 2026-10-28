import React from 'react';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Subtask } from '../../types';
import { Button } from '../atoms/Button';

export interface SubtaskItemProps {
  subtask: Subtask;
  index: number;
  totalCount: number;
  onToggle: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (id: string) => void;
}

export const SubtaskItem: React.FC<SubtaskItemProps> = ({
  subtask,
  index,
  totalCount,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 border border-slate-100 hover:border-slate-200 group transition-all text-xs">
      <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={subtask.completed}
          onChange={() => onToggle(subtask.id)}
          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
        />
        <span
          className={`truncate ${
            subtask.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
          }`}
        >
          {subtask.title}
        </span>
      </label>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="xs"
          disabled={index === 0}
          onClick={() => onMoveUp(index)}
          title="Mover subtarea arriba"
          className="p-1 h-6 w-6 text-slate-400 hover:text-slate-700"
        >
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          disabled={index === totalCount - 1}
          onClick={() => onMoveDown(index)}
          title="Mover subtarea abajo"
          className="p-1 h-6 w-6 text-slate-400 hover:text-slate-700"
        >
          <ArrowDown className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onDelete(subtask.id)}
          title="Eliminar subtarea"
          className="p-1 h-6 w-6 text-slate-400 hover:text-rose-600"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
