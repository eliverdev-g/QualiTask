import React, { useState } from 'react';
import { FolderPlus, AlertCircle } from 'lucide-react';
import { User } from '../../types';
import { ProjectService } from '../../services/projectService';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';

export interface ProjectCreateDialogProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

export const ProjectCreateDialog: React.FC<ProjectCreateDialogProps> = ({
  isOpen,
  currentUser,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (currentUser.role !== 'admin') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="sm"
        title="Acceso restringido"
        icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
        footer={
          <Button variant="primary" size="sm" onClick={onClose}>
            Entendido
          </Button>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Solo el administrador puede crear proyectos.
        </p>
      </Modal>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }
    if (!description.trim()) {
      setError('La descripción del proyecto es obligatoria.');
      return;
    }

    const res = ProjectService.createProject({
      name: name.trim(),
      description: description.trim(),
      key: key.trim().toUpperCase() || undefined,
      userId: currentUser.id,
    });

    if (res.success && res.project) {
      onCreated(res.project.id);
      onClose();
    } else {
      setError(res.error || 'Error al crear el proyecto');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Crear Nuevo Proyecto"
      icon={<FolderPlus className="w-5 h-5 text-blue-600" />}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Nombre del Proyecto"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!key && e.target.value.length >= 3) {
              setKey(e.target.value.substring(0, 4).toUpperCase());
            }
          }}
          placeholder="Ej. Sitio web"
        />

        <Input
          label="Clave"
          maxLength={6}
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          placeholder="BANK"
        />

        <Textarea
          label="Descripción del Proyecto"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción del proyecto"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Crear Proyecto
          </Button>
        </div>
      </form>
    </Modal>
  );
};
