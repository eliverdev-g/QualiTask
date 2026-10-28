import React, { useState } from 'react';
import {
  FolderKanban,
  ChevronDown,
  Plus,
  Kanban,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { User, Project, Board } from '../../types';
import { Button } from '../atoms/Button';
import { Avatar } from '../atoms/Avatar';

export interface TopNavigationProps {
  currentUser: User;
  activeProject?: Project | null;
  activeBoard?: Board | null;
  allProjects: Project[];
  activeView: 'board' | 'dashboard';
  setActiveView: (view: 'board' | 'dashboard') => void;
  onSelectProject: (projectId: string) => void;
  onSelectBoard: (boardId: string) => void;
  onOpenCreateProject: () => void;
  onOpenCreateBoard: () => void;
  onOpenCreateTask: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
  onInactivateProject: () => void;
  onOpenInactiveProjects: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentUser,
  activeProject,
  activeBoard,
  allProjects,
  activeView,
  setActiveView,
  onSelectProject,
  onSelectBoard,
  onOpenCreateProject,
  onOpenCreateBoard,
  onOpenCreateTask,
  onOpenUserManagement,
  onLogout,
  onInactivateProject,
  onOpenInactiveProjects,
}) => {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Zone 1: Brand & Project Hierarchy Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            QT
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-sm hidden sm:inline">
            QualiTask
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
        </div>

        {/* Project Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProjectDropdown(!showProjectDropdown);
              setShowUserDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors max-w-[200px] md:max-w-[260px] truncate cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              {activeProject ? activeProject.name : 'Sin proyectos'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showProjectDropdown && (
            <div className="absolute left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Espacios de trabajo
              </div>
              {allProjects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 italic">
                  No hay proyectos registrados aún.
                </div>
              ) : (
                allProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj.id);
                      setShowProjectDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      activeProject?.id === proj.id
                        ? 'bg-blue-50/70 text-blue-700 font-medium'
                        : 'text-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate font-semibold">{proj.name}</p>
                      <p className="text-[10px] text-slate-400">{proj.key} · {proj.boards.length} tableros</p>
                    </div>
                    {activeProject?.id === proj.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </button>
                ))
              )}

              {isAdmin && <button type="button" onClick={() => { setShowProjectDropdown(false); onOpenInactiveProjects(); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Proyectos inactivos</button>}
              {isAdmin && activeProject && <button type="button" onClick={() => { setShowProjectDropdown(false); onInactivateProject(); }} className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50">Inactivar proyecto</button>}
              <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                {isAdmin ? (
                  <button
                    onClick={() => {
                      setShowProjectDropdown(false);
                      onOpenCreateProject();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1.5 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Crear nuevo proyecto
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Board Selector if boards exist */}
        {activeProject && activeProject.boards.length > 0 && activeBoard && (
          <div className="hidden lg:flex items-center gap-1 text-xs">
            <span className="text-slate-300">/</span>
            <select
              value={activeBoard.id}
              onChange={(e) => onSelectBoard(e.target.value)}
              className="bg-transparent text-slate-700 font-medium border-0 py-1 pl-1 pr-6 focus:ring-0 text-xs cursor-pointer hover:text-slate-900"
            >
              {activeProject.boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {isAdmin && (
              <button
                onClick={onOpenCreateBoard}
                className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                title="Añadir nuevo tablero al proyecto"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Zone 2: Navigation Views Switcher (Tablero y Dashboard) */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
        <Button
          variant={activeView === 'board' ? 'outline' : 'ghost'}
          size="sm"
          icon={<Kanban className="w-3.5 h-3.5 text-blue-600" />}
          onClick={() => setActiveView('board')}
          className={activeView === 'board' ? 'bg-white font-bold text-slate-900 shadow-xs' : ''}
        >
          Tablero
        </Button>

        <Button
          variant={activeView === 'dashboard' ? 'outline' : 'ghost'}
          size="sm"
          icon={<LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />}
          onClick={() => setActiveView('dashboard')}
          className={activeView === 'dashboard' ? 'bg-white font-bold text-slate-900 shadow-xs' : ''}
        >
          Resumen
        </Button>
      </nav>

      {/* Zone 3: Action Buttons & User Menu */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => {
            if (!activeProject) {
              if (isAdmin) {
                onOpenCreateProject();
              } else {
                alert('No hay proyectos registrados. Debe solicitar a un Administrador crear un proyecto primero.');
              }
            } else {
              onOpenCreateTask();
            }
          }}
        >
          <span className="hidden sm:inline">Nueva Tarea</span>
          <span className="sm:hidden">Crear</span>
        </Button>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowProjectDropdown(false);
            }}
            className="flex items-center gap-2 p-1 pl-2 pr-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer"
          >
            <div className="hidden xl:block text-right">
              <p className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[130px]">
                {currentUser.fullName}
              </p>
              <span className="text-[10px] text-slate-400 uppercase font-medium">
                {currentUser.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
            <Avatar
              name={currentUser.fullName}
              role={currentUser.role}
              size="md"
              avatarUrl={currentUser.avatarUrl}
            />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-indigo-700">
                  <ShieldCheck className="w-3 h-3" />
                  Rol: {currentUser.role === 'admin' ? 'Administrador' : 'Colaborador'}
                </div>
              </div>

              <div className="border-t border-slate-100 mt-1.5 pt-1 px-1">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenUserManagement();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded flex items-center gap-2 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Gestión de usuarios y roles
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
