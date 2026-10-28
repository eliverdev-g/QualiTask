import React, { useState, useEffect } from 'react';
import { Kanban, LayoutDashboard, FolderPlus, Plus, ShieldAlert } from 'lucide-react';
import { User, Project, Board } from '../../types';
import { ProjectService } from '../../services/projectService';
import { AuthService } from '../../services/authService';
import { TopNavigation } from '../organisms/TopNavigation';
import { BoardPage } from '../pages/BoardPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TaskCreateDialog } from '../organisms/TaskCreateDialog';
import { ProjectCreateDialog } from '../organisms/ProjectCreateDialog';
import { BoardCreateDialog } from '../organisms/BoardCreateDialog';
import { UserManagementDialog } from '../organisms/UserManagementDialog';
import { AuthDialog } from '../organisms/AuthDialog';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Modal } from '../atoms/Modal';
import { InactiveProjectsDialog } from '../organisms/InactiveProjectsDialog';

export interface MainLayoutProps {
  currentUser: User | null;
  onAuthSuccess: (user: User) => void;
  onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentUser,
  onAuthSuccess,
  onLogout,
}) => {
  const [projects, setProjects] = useState<Project[]>(ProjectService.getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(ProjectService.getActiveProjectId());
  const [activeBoardId, setActiveBoardId] = useState<string>(
    ProjectService.getActiveBoardId(activeProjectId)
  );

  const [activeView, setActiveView] = useState<'board' | 'dashboard'>('board');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) || (projects.length > 0 ? projects[0] : null);
  const activeBoard =
    activeProject?.boards.find((b) => b.id === activeBoardId) || (activeProject && activeProject.boards.length > 0 ? activeProject.boards[0] : null);

  const [inactivateId, setInactivateId] = useState<string | null>(null);
  const [inactivating, setInactivating] = useState(false);
  const [isInactiveProjectsOpen, setIsInactiveProjectsOpen] = useState(false);
  const [projectError, setProjectError] = useState('');
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) { setIsProjectModalOpen(false); setIsBoardModalOpen(false); setIsUserModalOpen(false); setInactivateId(null); setIsInactiveProjectsOpen(false); }
  }, [isAdmin]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const sync = async () => {
      const fresh = await ProjectService.syncWithApi();
      if (!cancelled) setProjects(fresh);
    };
    void sync();
    const timer = setInterval(sync, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [currentUser?.id]);
  useEffect(() => {
    if (projects.some(p => p.id === activeProjectId)) return;
    const next = projects[0];
    setActiveProjectId(next?.id || '');
    setActiveBoardId(next?.boards[0]?.id || '');
    ProjectService.setActiveProjectId(next?.id || '');
    ProjectService.setActiveBoardId(next?.boards[0]?.id || '');
    setIsTaskModalOpen(false); setIsBoardModalOpen(false); setInactivateId(null);
  }, [projects, activeProjectId]);
  const inactivateProject = async () => {
    if (!inactivateId || !isAdmin) return;
    setInactivating(true); setProjectError('');
    try { setProjects(await ProjectService.inactivateProject(inactivateId)); setInactivateId(null); }
    catch (error) { setProjectError((error as Error).message); }
    finally { setInactivating(false); }
  };

  const handleSelectProject = (projId: string) => {
    setActiveProjectId(projId);
    ProjectService.setActiveProjectId(projId);
    const p = ProjectService.getProjectById(projId);
    if (p && p.boards.length > 0) {
      setActiveBoardId(p.boards[0].id);
      ProjectService.setActiveBoardId(p.boards[0].id);
    }
  };

  const handleSelectBoard = (bId: string) => {
    setActiveBoardId(bId);
    ProjectService.setActiveBoardId(bId);
  };

  const handleProjectCreated = (newProjId: string) => {
    const fresh = ProjectService.getProjects();
    setProjects(fresh);
    handleSelectProject(newProjId);
  };

  const handleBoardCreated = (newBoardId: string) => {
    const fresh = ProjectService.getProjects();
    setProjects(fresh);
    setActiveBoardId(newBoardId);
  };

  if (!currentUser) {
    return (
      <div className="h-full w-full bg-slate-900 flex items-center justify-center p-4">
        <AuthDialog isOpen={true} onSuccess={onAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 select-none overflow-hidden">
      {/* Top Bar Organism */}
      <TopNavigation
        currentUser={currentUser}
        activeProject={activeProject}
        activeBoard={activeBoard}
        allProjects={projects}
        activeView={activeView}
        setActiveView={setActiveView}
        onSelectProject={handleSelectProject}
        onSelectBoard={handleSelectBoard}
        onOpenCreateProject={() => setIsProjectModalOpen(true)}
        onOpenCreateBoard={() => setIsBoardModalOpen(true)}
        onOpenCreateTask={() => setIsTaskModalOpen(true)}
        onOpenUserManagement={() => setIsUserModalOpen(true)}
        onLogout={onLogout}
        onOpenInactiveProjects={() => setIsInactiveProjectsOpen(true)}
        onInactivateProject={() => { setProjectError(''); setInactivateId(activeProject?.id || null); }}
      />

      {/* Main Page Viewport */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {!activeProject ? (
          /* Empty State: No Projects Created Yet */
          <div className="flex-1 flex items-center justify-center p-6">
            <Card className="max-w-md w-full text-center p-8 space-y-4 shadow-sm border border-slate-200">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                <FolderPlus className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isAdmin ? 'Bienvenido a QualiTask' : 'Sin proyectos disponibles'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isAdmin
                    ? 'Crea tu primer proyecto.'
                    : 'Aún no hay proyectos activos.'}
                </p>
              </div>

              {isAdmin ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsProjectModalOpen(true)}
                  fullWidth
                >
                  Crear Primer Proyecto
                </Button>
              ) : null}
            </Card>
          </div>
        ) : !activeBoard ? (
          /* Empty State: Project has no boards */
          <div className="flex-1 flex items-center justify-center p-6">
            <Card className="max-w-md w-full text-center p-8 space-y-4 shadow-sm border border-slate-200">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                <Kanban className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tablero Kanban requerido
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  El proyecto <strong>{activeProject.name}</strong> aún no cuenta con un tablero para organizar las tareas.
                </p>
              </div>

              {isAdmin && (
                <Button
                  variant="primary"
                  size="md"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsBoardModalOpen(true)}
                  fullWidth
                >
                  Crear Tablero Kanban
                </Button>
              )}
            </Card>
          </div>
        ) : activeView === 'board' ? (
          <BoardPage
            key={activeBoard.id}
            board={activeBoard}
            currentUser={currentUser}
            onOpenCreateTask={() => setIsTaskModalOpen(true)}
          />
        ) : (
          <DashboardPage
            project={activeProject}
            board={activeBoard}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden h-14 bg-white border-t border-slate-200 px-6 flex items-center justify-around shrink-0 z-20">
        <button
          onClick={() => setActiveView('board')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
            activeView === 'board' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Kanban className="w-4 h-4" />
          <span>Tablero</span>
        </button>

        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
            activeView === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
      </nav>

      <Modal isOpen={!!inactivateId && isAdmin} onClose={() => { if (!inactivating) setInactivateId(null); }} title="Inactivar proyecto" size="sm">
        <p className="text-sm text-slate-600">¿Inactivar <strong>{projects.find(p => p.id === inactivateId)?.name}</strong>? Sus tareas y tableros se conservarán.</p>
        {projectError && <p role="alert" className="mt-3 text-sm text-rose-600">{projectError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" disabled={inactivating} onClick={() => setInactivateId(null)}>Cancelar</Button>
          <Button variant="danger" disabled={inactivating} onClick={inactivateProject}>{inactivating ? 'Inactivando…' : 'Inactivar proyecto'}</Button>
        </div>
      </Modal>
      <InactiveProjectsDialog
        isOpen={isInactiveProjectsOpen && isAdmin}
        onClose={() => setIsInactiveProjectsOpen(false)}
        onActivated={(fresh, id) => {
          setProjects(fresh);
          setActiveProjectId(id);
          const boardId = fresh.find(p => p.id === id)?.boards[0]?.id || '';
          setActiveBoardId(boardId);
          ProjectService.setActiveProjectId(id);
          ProjectService.setActiveBoardId(boardId);
        }}
      />
      {/* Dialog Modals */}
      {activeProject && activeBoard && (
        <TaskCreateDialog
          isOpen={isTaskModalOpen}
          projectId={activeProject.id}
          boardId={activeBoard.id}
          currentUser={currentUser}
          onClose={() => setIsTaskModalOpen(false)}
          onCreated={() => setIsTaskModalOpen(false)}
        />
      )}

      <ProjectCreateDialog
        isOpen={isAdmin && isProjectModalOpen}
        currentUser={currentUser}
        onClose={() => setIsProjectModalOpen(false)}
        onCreated={handleProjectCreated}
      />

      {activeProject && (
        <BoardCreateDialog
          isOpen={isAdmin && isBoardModalOpen}
          projectId={activeProject.id}
          onClose={() => setIsBoardModalOpen(false)}
          onCreated={handleBoardCreated}
        />
      )}

      <UserManagementDialog
        isOpen={isAdmin && isUserModalOpen}
        currentUser={currentUser}
        onClose={() => setIsUserModalOpen(false)}
        onUpdated={() => {
          const fresh = AuthService.getCurrentUser();
          if (fresh) onAuthSuccess(fresh);
        }}
      />
    </div>
  );
};
