import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck } from 'lucide-react';
import { User, UserRole } from '../../types';
import { AuthService } from '../../services/authService';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Avatar } from '../atoms/Avatar';

export interface UserManagementDialogProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onUpdated: () => void;
}

export const UserManagementDialog: React.FC<UserManagementDialogProps> = ({
  isOpen,
  currentUser,
  onClose,
  onUpdated,
}) => {
  const [users, setUsers] = useState<User[]>(AuthService.getAllUsers());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen || currentUser.role !== 'admin') return;
    const refresh = () => setUsers(AuthService.getAllUsers());
    window.addEventListener('users-updated', refresh);
    AuthService.request('users', undefined, 'GET').then((data) => { AuthService.cacheUsers(data); }).catch(e => setError(e.message));
    return () => window.removeEventListener('users-updated', refresh);
  }, [isOpen, currentUser.role]);
  if (!isOpen || currentUser.role !== 'admin') return null;
  const change = async (id: string, role?: UserRole) => {
    setLoadingId(id); setError('');
    try {
      const updated = role ? await AuthService.updateUserRole(id, role) : await AuthService.toggleUserStatus(id);
      const fresh = users.map(u => u.id === id ? { ...u, ...updated } : u);
      setUsers(fresh); AuthService.cacheUsers(fresh); onUpdated();
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingId(null); }
  };
  const handleRoleChange = (id: string, role: UserRole) => change(id, role);
  const handleToggleStatus = (id: string) => change(id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Usuarios"
      icon={<Users className="w-5 h-5 text-indigo-600" />}
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="divide-y divide-slate-100">
        {error && <p role="alert" className="text-rose-600 text-sm py-3">{error}</p>}
        {users.map((u) => (
          <div key={u.id} className="py-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={u.fullName}
                role={u.role}
                size="md"
                avatarUrl={u.avatarUrl}
              />
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                  <span>{u.fullName}</span>
                  {u.id === currentUser.id && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                      (Usted)
                    </span>
                  )}
                  {u.role === 'admin' && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded border border-indigo-200">
                      Admin
                    </span>
                  )}
                </p>
                <p className="text-slate-500 truncate text-[11px]">{u.email} · {u.department}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={u.role}
                disabled={u.id === currentUser.id || loadingId === u.id}
                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
              >
                <option value="collaborator">Colaborador</option>
                <option value="admin">Administrador</option>
              </select>

              <Button
                variant={u.status === 'active' ? 'outline' : 'danger'}
                size="xs"
                disabled={u.id === currentUser.id || loadingId === u.id}
                onClick={() => handleToggleStatus(u.id)}
              >
                {u.status === 'active' ? 'Activo' : 'Inactivo'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
