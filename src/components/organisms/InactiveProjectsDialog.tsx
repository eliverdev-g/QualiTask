import React, { useEffect, useState } from 'react';
import { Project } from '../../types';
import { AuthService } from '../../services/authService';
import { ProjectService } from '../../services/projectService';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';

type InactiveProject = Pick<Project, 'id' | 'name' | 'key'>;
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onActivated: (projects: Project[], id: string) => void;
}

export const InactiveProjectsDialog: React.FC<Props> = ({ isOpen, onClose, onActivated }) => {
  const [projects, setProjects] = useState<InactiveProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true); setError(''); setMessage(''); setProjects([]);
    AuthService.request('projects/inactive', undefined, 'GET')
      .then(data => { if (!cancelled) setProjects(data); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const activate = async (project: InactiveProject) => {
    setBusyId(project.id); setError(''); setMessage('');
    try {
      await AuthService.request('projects/' + encodeURIComponent(project.id) + '/status', { status: 'active' }, 'PUT');
      const fresh: Project[] = await AuthService.request('projects', undefined, 'GET');
      ProjectService.saveProjects(fresh);
      setProjects(previous => previous.filter(p => p.id !== project.id));
      setMessage(`Proyecto «${project.name}» activado.`);
      onActivated(fresh, project.id);
    } catch (e) { setError((e as Error).message); }
    finally { setBusyId(null); }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!busyId) onClose(); }} title="Proyectos inactivos" size="md">
      {error && <p role="alert" className="mb-3 text-sm text-rose-600">{error}</p>}
      {message && <p role="status" className="mb-3 text-sm text-emerald-700">{message}</p>}
      {loading ? <p className="text-sm text-slate-500">Cargando…</p> : !projects.length && !error ? <p className="text-sm text-slate-500">No hay proyectos inactivos.</p> : null}
      <div className="divide-y divide-slate-100">
        {projects.map(project => (
          <div key={project.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
              <p className="text-xs text-slate-500">{project.key}</p>
            </div>
            <Button size="sm" disabled={!!busyId} onClick={() => activate(project)}>{busyId === project.id ? 'Activando…' : 'Activar'}</Button>
          </div>
        ))}
      </div>
    </Modal>
  );
};
