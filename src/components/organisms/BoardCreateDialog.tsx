import React, { useState } from 'react';
import { Kanban } from 'lucide-react';
import { ProjectService } from '../../services/projectService';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';

export interface BoardCreateDialogProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}

export const BoardCreateDialog: React.FC<BoardCreateDialogProps> = ({
  isOpen,
  projectId,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del tablero es requerido.');
      return;
    }

    const res = ProjectService.createBoard(projectId, {
      name: name.trim(),
      description: description.trim(),
    });

    if (res.success && res.board) {
      onCreated(res.board.id);
      onClose();
    } else {
      setError(res.error || 'Error al crear el tablero');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Crear Nuevo Tablero"
      icon={<Kanban className="w-5 h-5 text-blue-600" />}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Nombre del Tablero"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Equipo de desarrollo"
        />

        <Textarea
          label="Descripción del Tablero"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción del tablero"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Crear Tablero
          </Button>
        </div>
      </form>
    </Modal>
  );
};
