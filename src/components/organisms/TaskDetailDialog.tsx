import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  History,
  MessageSquare,
  Plus,
  AlertCircle,
  RotateCcw,
  Send,
} from 'lucide-react';
import { Task, TaskPriority, TaskType, TaskStatus, User } from '../../types';
import { TaskService, BOARD_COLUMNS } from '../../services/taskService';
import { AuthService } from '../../services/authService';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Select } from '../atoms/Select';
import { ProgressBar } from '../atoms/ProgressBar';
import { SubtaskItem } from '../molecules/SubtaskItem';
import { ActivityLogItem } from '../molecules/ActivityLogItem';
import { CommentItem } from '../molecules/CommentItem';

export interface TaskDetailDialogProps {
  isOpen: boolean;
  taskId: string | null;
  currentUser: User;
  onClose: () => void;
  onUpdate: () => void;
  onRequestRetrocede: (task: Task) => void;
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  isOpen,
  taskId,
  currentUser,
  onClose,
  onUpdate,
  onRequestRetrocede,
}) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'comments'>('activity');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isQaFeedback, setIsQaFeedback] = useState(currentUser.role === 'collaborator');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');

  const users = AuthService.getAllUsers();
  const task = taskId ? TaskService.getTaskById(taskId) : null;

  if (!isOpen || !task) return null;

  const isOverdue = TaskService.isTaskOverdue(task);
  const overdueDays = TaskService.getOverdueDays(task);

  const subtasksTotal = task.subtasks.length;
  const subtasksDone = task.subtasks.filter((s) => s.completed).length;
  const progressPercent = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (task.status === 'in_qa' && newStatus === 'in_progress') {
      onRequestRetrocede(task);
      return;
    }

    const res = TaskService.transitionTask(task.id, newStatus, currentUser);
    if (!res.success && res.requiresAssignee) {
      alert(res.error);
    } else {
      onUpdate();
    }
  };

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      TaskService.updateTaskDetails(task.id, { title: titleInput.trim() }, currentUser);
      setEditingTitle(false);
      onUpdate();
    }
  };

  const handleSaveDesc = () => {
    TaskService.updateTaskDetails(task.id, { description: descInput.trim() }, currentUser);
    setEditingDesc(false);
    onUpdate();
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    TaskService.addSubtask(task.id, newSubtaskTitle.trim(), currentUser);
    setNewSubtaskTitle('');
    onUpdate();
  };

  const handleMoveSubtask = (index: number, direction: 'up' | 'down') => {
    const list = [...task.subtasks];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    TaskService.reorderSubtasks(task.id, list, currentUser);
    onUpdate();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    TaskService.addComment(task.id, newCommentText.trim(), currentUser, isQaFeedback);
    setNewCommentText('');
    onUpdate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded">
            {task.id}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-sm font-bold text-slate-800 truncate">
            {task.type === 'bug' ? 'Defecto QA' : task.type === 'story' ? 'Historia' : 'Tarea'}
          </span>
        </div>
      }
      subtitle={
        task.status === 'in_qa' ? (
          <Button
            variant="danger"
            size="xs"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => onRequestRetrocede(task)}
            className="mt-1"
          >
            Retroceder Tarea (Observación QA)
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div>
            {editingTitle ? (
              <div className="space-y-2">
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="xs" variant="primary" onClick={handleSaveTitle}>
                    Guardar
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setEditingTitle(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <h2
                onClick={() => {
                  setTitleInput(task.title);
                  setEditingTitle(true);
                }}
                className="text-base font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                title="Haga clic para editar título"
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">Descripción del Requerimiento</span>
              {!editingDesc && (
                <button
                  onClick={() => {
                    setDescInput(task.description);
                    setEditingDesc(true);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Editar
                </button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea
                  rows={4}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="xs" variant="primary" onClick={handleSaveDesc}>
                    Guardar
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setEditingDesc(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setDescInput(task.description);
                  setEditingDesc(true);
                }}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed cursor-pointer hover:border-slate-300 transition-colors whitespace-pre-wrap"
              >
                {task.description || <span className="text-slate-400 italic">Sin descripción detallada</span>}
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  Subtareas y Descomposición ({subtasksDone}/{subtasksTotal})
                </h4>
              </div>
              <span className="font-mono text-xs font-bold text-blue-600">
                {progressPercent}% Completado
              </span>
            </div>

            <ProgressBar
              value={progressPercent}
              color={progressPercent === 100 ? 'emerald' : 'blue'}
              size="sm"
            />

            <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
              {task.subtasks.map((sub, idx) => (
                <SubtaskItem
                  key={sub.id}
                  subtask={sub}
                  index={idx}
                  totalCount={task.subtasks.length}
                  onToggle={(id) => {
                    TaskService.toggleSubtask(task.id, id, currentUser);
                    onUpdate();
                  }}
                  onMoveUp={(i) => handleMoveSubtask(i, 'up')}
                  onMoveDown={(i) => handleMoveSubtask(i, 'down')}
                  onDelete={(id) => {
                    TaskService.deleteSubtask(task.id, id, currentUser);
                    onUpdate();
                  }}
                />
              ))}
            </div>

            <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Añadir subtarea..."
              />
              <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                Añadir
              </Button>
            </form>
          </div>

          {/* Activity Log (Trazabilidad) & Comments */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'activity'
                    ? 'border-blue-600 text-blue-600 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Actividad ({task.activities.length})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'comments'
                    ? 'border-blue-600 text-blue-600 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Comentarios y QA ({task.comments.length})
              </button>
            </div>

            <div className="p-4 max-h-64 overflow-y-auto">
              {activeTab === 'activity' ? (
                <div className="space-y-2 divide-y divide-slate-100">
                  {task.activities.map((act) => (
                    <ActivityLogItem key={act.id} activity={act} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {task.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">
                      No hay observaciones registradas aún.
                    </p>
                  ) : (
                    task.comments.map((comm) => (
                      <CommentItem key={comm.id} comment={comm} />
                    ))
                  )}

                  <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-100 space-y-2">
                    <Textarea
                      rows={2}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Escribir retroalimentación o nota técnica de QA..."
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isQaFeedback}
                          onChange={(e) => setIsQaFeedback(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        <span>Marcar como observación oficial de QA</span>
                      </label>
                      <Button type="submit" variant="primary" size="xs" icon={<Send className="w-3 h-3" />}>
                        Publicar
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 h-fit">
          {isOverdue && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Tarea Vencida
              </div>
              <p className="text-[11px]">
                Atraso de <strong>{overdueDays} días</strong> respecto a su fecha límite.
              </p>
            </div>
          )}

          <Select
            label="Estado Kanban"
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            options={BOARD_COLUMNS.map((col) => ({
              value: col.id,
              label: col.title,
            }))}
          />

          <Select
            label="Tipo de Tarea"
            value={task.type}
            onChange={(e) => {
              TaskService.updateTaskDetails(task.id, { type: e.target.value as TaskType }, currentUser);
              onUpdate();
            }}
            options={[
              { value: 'task', label: 'Tarea Estándar' },
              { value: 'bug', label: 'Defecto QA / Bug' },
              { value: 'story', label: 'Historia de Usuario' },
            ]}
          />

          <Select
            label="Nivel de Prioridad"
            value={task.priority}
            onChange={(e) => {
              TaskService.updateTaskDetails(task.id, { priority: e.target.value as TaskPriority }, currentUser);
              onUpdate();
            }}
            options={[
              { value: 'baja', label: 'Baja' },
              { value: 'media', label: 'Media' },
              { value: 'alta', label: 'Alta' },
              { value: 'critica', label: 'Crítica' },
            ]}
          />

          <Select
            label="Responsable Asignado"
            value={task.assigneeId || ''}
            onChange={(e) => {
              TaskService.updateTaskDetails(task.id, { assigneeId: e.target.value || null }, currentUser);
              onUpdate();
            }}
            options={[
              { value: '', label: '(Sin asignar)' },
              ...users.map((u) => ({
                value: u.id,
                label: `${u.fullName} (${u.department})`,
              })),
            ]}
          />

          <Input
            type="date"
            label="Fecha de Inicio"
            value={task.startDate}
            onChange={(e) => {
              TaskService.updateTaskDetails(task.id, { startDate: e.target.value }, currentUser);
              onUpdate();
            }}
          />

          <Input
            type="date"
            label="Fecha Límite (Due Date)"
            value={task.dueDate}
            onChange={(e) => {
              TaskService.updateTaskDetails(task.id, { dueDate: e.target.value }, currentUser);
              onUpdate();
            }}
            className={isOverdue ? 'border-rose-400 font-bold text-rose-700' : ''}
          />

          <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Creación:</span>
              <span className="font-mono text-slate-700">
                {new Date(task.createdAt).toLocaleDateString('es-GT')}
              </span>
            </div>
            {task.completedAt && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Completada:</span>
                <span className="font-mono">
                  {new Date(task.completedAt).toLocaleDateString('es-GT')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
