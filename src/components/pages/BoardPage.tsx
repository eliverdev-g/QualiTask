import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Plus } from 'lucide-react';
import { Board, Task, TaskStatus, User } from '../../types';
import { TaskService, BOARD_COLUMNS } from '../../services/taskService';
import { AuthService } from '../../services/authService';
import { KanbanColumnView } from '../organisms/KanbanColumnView';
import { TaskDetailDialog } from '../organisms/TaskDetailDialog';
import {
  AssigneeRequiredDialog,
  RejectionReasonDialog,
} from '../organisms/TransitionValidationDialog';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';

export interface BoardPageProps {
  board: Board;
  currentUser: User;
  onOpenCreateTask: () => void;
}

export const BoardPage: React.FC<BoardPageProps> = ({
  board,
  currentUser,
  onOpenCreateTask,
}) => {
  const [tasksVersion, setTasksVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // Modals
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [assigneeModalTask, setAssigneeModalTask] = useState<Task | null>(null);
  const [rejectionModalTask, setRejectionModalTask] = useState<Task | null>(null);

  const reloadTasks = () => setTasksVersion((v) => v + 1);

  useEffect(() => {
    TaskService.syncWithApi(board.id).then(() => {
      reloadTasks();
    });
  }, [board.id]);

  const allBoardTasks = TaskService.getTasksByBoard(board.id);
  const allUsers = AuthService.getAllUsers();

  const filteredTasks = allBoardTasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchId = task.id.toLowerCase().includes(q);
      const matchTags = task.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchId && !matchTags) return false;
    }
    if (filterType !== 'all' && task.type !== filterType) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned') {
        if (task.assigneeId) return false;
      } else if (task.assigneeId !== filterAssignee) {
        return false;
      }
    }
    return true;
  });

  const totalTasks = allBoardTasks.length;
  const inProgressTasks = allBoardTasks.filter((t) => t.status === 'in_progress').length;
  const inQaTasks = allBoardTasks.filter((t) => t.status === 'in_qa').length;
  const completedTasks = allBoardTasks.filter((t) => t.status === 'completed').length;
  const overdueTasks = allBoardTasks.filter((t) => TaskService.isTaskOverdue(t)).length;

  const handleDropTask = (taskId: string, targetStatus: TaskStatus) => {
    const task = TaskService.getTaskById(taskId);
    if (!task || task.status === targetStatus) return;

    if (targetStatus === 'in_progress' && !task.assigneeId) {
      setAssigneeModalTask(task);
      return;
    }

    if (task.status === 'in_qa' && targetStatus === 'in_progress') {
      setRejectionModalTask(task);
      return;
    }

    const res = TaskService.transitionTask(taskId, targetStatus, currentUser);
    if (!res.success) {
      if (res.requiresAssignee) {
        setAssigneeModalTask(task);
      } else if (res.requiresRejectionReason) {
        setRejectionModalTask(task);
      } else {
        alert(res.error);
      }
    } else {
      reloadTasks();
    }
  };

  const handleAdvanceTask = (task: Task) => {
    const transitions: Record<TaskStatus, TaskStatus | null> = {
      backlog: 'in_progress',
      in_progress: 'in_qa',
      in_qa: 'completed',
      completed: null,
    };
    const next = transitions[task.status];
    if (next) handleDropTask(task.id, next);
  };

  const handleRetrocedeTask = (task: Task) => {
    const reverseTransitions: Record<TaskStatus, TaskStatus | null> = {
      backlog: null,
      in_progress: 'backlog',
      in_qa: 'in_progress',
      completed: 'in_qa',
    };
    const prev = reverseTransitions[task.status];
    if (prev) {
      if (task.status === 'in_qa' && prev === 'in_progress') {
        setRejectionModalTask(task);
      } else {
        TaskService.transitionTask(task.id, prev, currentUser);
        reloadTasks();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Bar: Title, Description & Stats */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">{board.name}</h1>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Kanban
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{board.description}</p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
            <div className="px-2.5 py-1 bg-slate-100 rounded-lg flex items-center gap-1.5 shrink-0">
              <span className="text-slate-500">Total:</span>
              <span className="font-mono font-bold text-slate-900">{totalTasks}</span>
            </div>
            <div className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg flex items-center gap-1.5 shrink-0">
              <span className="text-blue-600">En desarrollo:</span>
              <span className="font-mono font-bold">{inProgressTasks}</span>
            </div>
            <div className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg flex items-center gap-1.5 shrink-0">
              <span className="text-amber-600">En QA:</span>
              <span className="font-mono font-bold">{inQaTasks}</span>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-1.5 shrink-0">
              <span className="text-emerald-600">Completadas:</span>
              <span className="font-mono font-bold">{completedTasks}</span>
            </div>
            {overdueTasks > 0 && (
              <div className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg flex items-center gap-1.5 shrink-0 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>{overdueTasks} vencidas</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1 min-w-[180px]">
              <Input
                icon={<Search className="w-3.5 h-3.5" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por ID, título o etiqueta..."
              />
            </div>

            <div className="w-36">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: 'all', label: 'Todos los tipos' },
                  { value: 'task', label: 'Solo Tareas' },
                  { value: 'bug', label: 'Solo Defectos' },
                  { value: 'story', label: 'Solo Historias' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                options={[
                  { value: 'all', label: 'Todas prioridades' },
                  { value: 'critica', label: 'Crítica' },
                  { value: 'alta', label: 'Alta' },
                  { value: 'media', label: 'Media' },
                  { value: 'baja', label: 'Baja' },
                ]}
              />
            </div>

            <div className="w-40">
              <Select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                options={[
                  { value: 'all', label: 'Todos responsables' },
                  { value: 'unassigned', label: 'Sin asignar' },
                  ...allUsers.map((u) => ({ value: u.id, label: u.fullName })),
                ]}
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onOpenCreateTask}
          >
            Añadir Tarea
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-start">
        {BOARD_COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);
          return (
            <KanbanColumnView
              key={column.id}
              column={column}
              tasks={colTasks}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
              onAdvanceTask={handleAdvanceTask}
              onRetrocedeTask={handleRetrocedeTask}
              onDropTask={handleDropTask}
              onQuickAddTask={onOpenCreateTask}
            />
          );
        })}
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        isOpen={Boolean(selectedTaskId)}
        taskId={selectedTaskId}
        currentUser={currentUser}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={reloadTasks}
        onRequestRetrocede={(task) => {
          setSelectedTaskId(null);
          setRejectionModalTask(task);
        }}
      />

      {/* Assignee Validation Dialog */}
      <AssigneeRequiredDialog
        isOpen={Boolean(assigneeModalTask)}
        task={assigneeModalTask}
        onClose={() => setAssigneeModalTask(null)}
        onAssignAndAdvance={(taskId, assigneeId) => {
          const res = TaskService.transitionTask(taskId, 'in_progress', currentUser, { assigneeId });
          if (res.success) {
            setAssigneeModalTask(null);
            reloadTasks();
          } else {
            alert(res.error);
          }
        }}
      />

      {/* QA Rejection Reason Dialog */}
      <RejectionReasonDialog
        isOpen={Boolean(rejectionModalTask)}
        task={rejectionModalTask}
        onClose={() => setRejectionModalTask(null)}
        onConfirmRejection={(taskId, reason) => {
          const res = TaskService.transitionTask(taskId, 'in_progress', currentUser, {
            rejectionReason: reason,
          });
          if (res.success) {
            setRejectionModalTask(null);
            reloadTasks();
          } else {
            alert(res.error);
          }
        }}
      />
    </div>
  );
};
