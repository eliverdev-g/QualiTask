import React, { useState } from 'react';
import { UserCheck, RotateCcw, AlertTriangle, Bug } from 'lucide-react';
import { Task, User } from '../../types';
import { AuthService } from '../../services/authService';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';

export interface AssigneeDialogProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onAssignAndAdvance: (taskId: string, assigneeId: string) => void;
}

export const AssigneeRequiredDialog: React.FC<AssigneeDialogProps> = ({
  isOpen,
  task,
  onClose,
  onAssignAndAdvance,
}) => {
  const users = AuthService.getAllUsers();
  const [selectedUserId, setSelectedUserId] = useState<string>(users[1]?.id || users[0]?.id || '');

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    onAssignAndAdvance(task.id, selectedUserId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Asignar responsable"
      icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
      headerBg="bg-amber-50/70"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800 mb-1">
            Selecciona un responsable para continuar.
          </p>
        </div>

        <Select
          label="Responsable"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          options={users.map((u) => ({
            value: u.id,
            label: `${u.fullName} (${u.department} · ${u.role === 'admin' ? 'Admin' : 'Colaborador'})`,
          }))}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<UserCheck className="w-4 h-4" />}
          >
            Asignar y continuar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export interface RejectionDialogProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirmRejection: (taskId: string, reason: string) => void;
}

export const RejectionReasonDialog: React.FC<RejectionDialogProps> = ({
  isOpen,
  task,
  onClose,
  onConfirmRejection,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Debe detallar el defecto u observación técnica de QA.');
      return;
    }
    onConfirmRejection(task.id, reason.trim());
    setReason('');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Devolver a En progreso"
      icon={<RotateCcw className="w-5 h-5 text-rose-600" />}
      headerBg="bg-rose-50/70"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        <Textarea
          label="Motivo"
          required
          rows={4}
          error={error || undefined}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          placeholder="Describe qué se debe corregir"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Devolver tarea
          </Button>
        </div>
      </form>
    </Modal>
  );
};
