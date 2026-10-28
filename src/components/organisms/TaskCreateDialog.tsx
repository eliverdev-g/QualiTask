import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { TaskType, TaskPriority, User } from '../../types';
import { TaskService } from '../../services/taskService';
import { AuthService } from '../../services/authService';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Select } from '../atoms/Select';

export interface TaskCreateDialogProps {
  isOpen: boolean;
  projectId: string;
  boardId: string;
  currentUser: User;
  onClose: () => void;
  onCreated: () => void;
}

export const TaskCreateDialog: React.FC<TaskCreateDialogProps> = ({
  isOpen,
  projectId,
  boardId,
  currentUser,
  onClose,
  onCreated,
}) => {
  const users = AuthService.getAllUsers();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('task');
  const [priority, setPriority] = useState<TaskPriority>('media');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState(defaultDue);

  const [subtasks, setSubtasks] = useState<string[]>([
    'Diseño de pruebas unitarias y de integración',
    'Revisión de criterios de aceptación con QA',
  ]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskInput.trim()) return;
    setSubtasks([...subtasks, newSubtaskInput.trim()]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('El título de la tarea es obligatorio.');
      return;
    }
    if (!dueDate) {
      setError('La fecha límite de entrega (due date) es obligatoria.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const res = TaskService.createTask(
      {
        projectId,
        boardId,
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        assigneeId: assigneeId || null,
        tags,
        startDate,
        dueDate,
        subtasksTitles: subtasks,
      },
      currentUser
    );

    if (res.success) {
      onCreated();
      onClose();
    } else {
      setError(res.error || 'Error al crear la tarea');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Crear Nueva Tarea / Requerimiento"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Tipo de Tarea"
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            options={[
              { value: 'task', label: 'Tarea Estándar' },
              { value: 'bug', label: 'Defecto QA / Bug' },
              { value: 'story', label: 'Historia de Usuario' },
            ]}
          />

          <Select
            label="Nivel de Prioridad"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={[
              { value: 'baja', label: 'Baja' },
              { value: 'media', label: 'Media' },
              { value: 'alta', label: 'Alta' },
              { value: 'critica', label: 'Crítica (Bloqueante)' },
            ]}
          />
        </div>

        <Input
          label="Título de la Tarea / Defecto"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Validación de fondos en transferencias interbancarias ACH"
        />

        <Textarea
          label="Descripción y Criterios de Aceptación"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción de la tarea"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Responsable Asignado"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            options={[
              { value: '', label: '(Sin asignar - permanecerá en Backlog)' },
              ...users.map((u) => ({
                value: u.id,
                label: `${u.fullName} (${u.role === 'admin' ? 'Admin' : 'Colaborador'})`,
              })),
            ]}
          />

          <Input
            label="Etiquetas (separadas por coma)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Diseño, Desarrollo"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Fecha de Inicio"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            type="date"
            label="Fecha Límite (Due Date)"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Subtasks */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <span className="text-xs font-semibold text-slate-800 block">
            Subtareas y Descomposición ({subtasks.length}):
          </span>

          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {subtasks.map((st, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 p-1.5 bg-white rounded border border-slate-200 text-xs"
              >
                <span className="text-slate-700 truncate">{i + 1}. {st}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSubtask(i)}
                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              value={newSubtaskInput}
              onChange={(e) => setNewSubtaskInput(e.target.value)}
              placeholder="Añadir subtarea..."
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleAddSubtask}>
              + Añadir
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Crear Requerimiento / Tarea
          </Button>
        </div>
      </form>
    </Modal>
  );
};
