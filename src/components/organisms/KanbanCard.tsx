import React from 'react';
import {
  Calendar,
  CheckSquare,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Bug,
  BookOpen,
} from 'lucide-react';
import { Task, TaskPriority, TaskType } from '../../types';
import { TaskService } from '../../services/taskService';
import { Card } from '../atoms/Card';
import { Badge, BadgeVariant } from '../atoms/Badge';
import { ProgressBar } from '../atoms/ProgressBar';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';

export interface KanbanCardProps {
  task: Task;
  onClick: () => void;
  onAdvance: () => void;
  onRetrocede: () => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  onClick,
  onAdvance,
  onRetrocede,
  onDragStart,
}) => {
  const isOverdue = TaskService.isTaskOverdue(task);
  const overdueDays = TaskService.getOverdueDays(task);

  const subtasksTotal = task.subtasks.length;
  const subtasksDone = task.subtasks.filter((s) => s.completed).length;
  const progressPercent = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const priorityBadgeVariant: Record<TaskPriority, BadgeVariant> = {
    baja: 'neutral',
    media: 'primary',
    alta: 'warning',
    critica: 'danger',
  };

  const priorityLabel: Record<TaskPriority, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    critica: 'Crítica',
  };

  const typeConfig: Record<TaskType, { label: string; icon: React.ReactNode }> = {
    task: { label: 'Tarea', icon: <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> },
    bug: { label: 'Defecto QA', icon: <Bug className="w-3.5 h-3.5 text-rose-600" /> },
    story: { label: 'Historia', icon: <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> },
  };

  const tConfig = typeConfig[task.type] || typeConfig.task;

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={onClick}
      variant={isOverdue ? 'alert' : 'interactive'}
      padding="sm"
      className="group relative cursor-grab active:cursor-grabbing select-none"
    >
      {/* Header: ID, Type and Priority */}
      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0">{tConfig.icon}</span>
          <span className="font-mono text-[11px] font-bold text-slate-700">
            {task.id}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] text-slate-500 truncate">{tConfig.label}</span>
        </div>

        <Badge variant={priorityBadgeVariant[task.priority]} size="xs">
          {priorityLabel[task.priority]}
        </Badge>
      </div>

      {/* Title */}
      <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-2 mb-2 transition-colors">
        {task.title}
      </h4>

      {/* Subtasks Progress */}
      {subtasksTotal > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-slate-400" />
              Subtareas ({subtasksDone}/{subtasksTotal})
            </span>
            <span className="font-mono font-medium">{progressPercent}%</span>
          </div>
          <ProgressBar
            value={progressPercent}
            color={progressPercent === 100 ? 'emerald' : 'blue'}
            size="sm"
          />
        </div>
      )}

      {/* Overdue Alert Banner */}
      {isOverdue && (
        <div className="mb-2 px-2 py-1 bg-rose-100/90 border border-rose-300 rounded text-[11px] font-bold text-rose-800 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            ¡Vencida!
          </span>
          <span className="font-mono text-[10px]">+{overdueDays}d atraso</span>
        </div>
      )}

      {/* Footer: Due date & Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 font-mono text-[10px] ${
              isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
            }`}
            title={`Fecha límite: ${task.dueDate}`}
          >
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{task.dueDate}</span>
          </div>

          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <MessageSquare className="w-3 h-3" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>

        {task.assignee ? (
          <Avatar
            name={task.assignee.fullName}
            role={task.assignee.role}
            size="xs"
            avatarUrl={task.assignee.avatarUrl}
            title={`Responsable: ${task.assignee.fullName}`}
          />
        ) : (
          <span className="text-[10px] text-amber-600 font-medium italic">Sin asignar</span>
        )}
      </div>

      {/* Quick Move Hover Buttons */}
      <div
        className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-white/95 backdrop-blur-xs p-0.5 rounded shadow-sm border border-slate-200 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {task.status !== 'backlog' && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onRetrocede}
            title="Retroceder tarea"
            className="p-1 h-6 w-6 text-slate-500 hover:text-amber-700 hover:bg-amber-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        )}
        {task.status !== 'completed' && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onAdvance}
            title="Avanzar tarea"
            className="p-1 h-6 w-6 text-slate-500 hover:text-blue-700 hover:bg-blue-50"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
};
