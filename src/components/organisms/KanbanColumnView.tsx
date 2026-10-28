import React, { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { BoardColumn, Task, TaskStatus } from '../../types';
import { KanbanCard } from './KanbanCard';
import { Button } from '../atoms/Button';

export interface KanbanColumnViewProps {
  column: BoardColumn;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAdvanceTask: (task: Task) => void;
  onRetrocedeTask: (task: Task) => void;
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void;
  onQuickAddTask?: () => void;
}

export const KanbanColumnView: React.FC<KanbanColumnViewProps> = ({
  column,
  tasks,
  onTaskClick,
  onAdvanceTask,
  onRetrocedeTask,
  onDropTask,
  onQuickAddTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDropTask(taskId, column.id);
    }
  };

  const handleCardDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col rounded-xl bg-slate-100/90 border transition-all duration-200 min-w-[280px] w-full max-w-[340px] shrink-0 h-full max-h-full ${
        isDragOver
          ? 'border-blue-500 ring-2 ring-blue-400/30 bg-blue-50/30'
          : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-200 bg-white/70 rounded-t-xl shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight truncate">
              {column.title}
            </h3>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${column.badgeBg}`}>
              {tasks.length}
            </span>
          </div>

          {column.id === 'backlog' && onQuickAddTask && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onQuickAddTask}
              title="Añadir tarea en Backlog"
              className="p-1 h-6 w-6 text-slate-400 hover:text-blue-600"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Drop Zone Task List */}
      <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onAdvance={() => onAdvanceTask(task)}
            onRetrocede={() => onRetrocedeTask(task)}
            onDragStart={handleCardDragStart}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-28 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs font-medium text-slate-400">No hay tareas</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Arrastre tarjetas a esta columna</p>
          </div>
        )}
      </div>
    </div>
  );
};
