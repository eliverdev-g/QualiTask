import { Project, Board } from '../types';
import { AuthService } from './authService';

const STORAGE_PROJECTS_KEY = 'qualitask_clean_projects_v2';
const STORAGE_CURRENT_PROJECT_KEY = 'qualitask_clean_active_project_id_v2';
const STORAGE_CURRENT_BOARD_KEY = 'qualitask_clean_active_board_id_v2';

export class ProjectService {
  static async inactivateProject(id: string): Promise<Project[]> {
    await AuthService.request('projects/' + encodeURIComponent(id) + '/status', { status: 'inactive' }, 'PUT');
    const projects = this.getProjects().filter(p => p.id !== id);
    this.saveProjects(projects);
    return projects;
  }
  static getProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw).filter((p: Project) => p.status !== 'inactive');
    } catch {
      return [];
    }
  }

  static saveProjects(projects: Project[]): void {
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  }

  static getProjectById(id: string): Project | undefined {
    return this.getProjects().find((p) => p.id === id);
  }

  static getActiveProjectId(): string {
    const id = localStorage.getItem(STORAGE_CURRENT_PROJECT_KEY);
    const projects = this.getProjects();
    if (id && projects.some((p) => p.id === id)) return id;
    if (projects.length > 0) {
      localStorage.setItem(STORAGE_CURRENT_PROJECT_KEY, projects[0].id);
      return projects[0].id;
    }
    return '';
  }

  static setActiveProjectId(id: string): void {
    localStorage.setItem(STORAGE_CURRENT_PROJECT_KEY, id);
    const proj = this.getProjectById(id);
    if (proj && proj.boards.length > 0) {
      localStorage.setItem(STORAGE_CURRENT_BOARD_KEY, proj.boards[0].id);
    }
  }

  static getActiveBoardId(projectId: string): string {
    const boardId = localStorage.getItem(STORAGE_CURRENT_BOARD_KEY);
    const proj = this.getProjectById(projectId);
    if (!proj || proj.boards.length === 0) return '';
    const board = proj.boards.find((b) => b.id === boardId);
    if (board) return board.id;
    const firstBoardId = proj.boards[0].id;
    localStorage.setItem(STORAGE_CURRENT_BOARD_KEY, firstBoardId);
    return firstBoardId;
  }

  static setActiveBoardId(id: string): void {
    localStorage.setItem(STORAGE_CURRENT_BOARD_KEY, id);
  }

  static async syncWithApi(): Promise<Project[]> {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          this.saveProjects(remote);
          return remote;
        }
      }
    } catch {
      // Backend no disponible, usa cache local
    }
    return this.getProjects();
  }

  static createProject(data: {
    name: string;
    description: string;
    key?: string;
    userId: string;
  }): { success: boolean; project?: Project; error?: string } {
    if (!data.name.trim() || !data.description.trim()) {
      return { success: false, error: 'El nombre y la descripción son obligatorios.' };
    }

    const projects = this.getProjects();
    const key = data.key?.trim().toUpperCase() || data.name.substring(0, 4).toUpperCase();

    const newProjectId = `proj-${Date.now()}`;
    const newBoardId = `board-${Date.now()}`;

    const newProject: Project = {
      id: newProjectId,
      key,
      name: data.name.trim(),
      description: data.description.trim(),
      createdAt: new Date().toISOString(),
      createdBy: data.userId,
      members: [data.userId],
      boards: [
        {
          id: newBoardId,
          projectId: newProjectId,
          name: 'Tablero Principal Kanban',
          description: 'Flujo de trabajo para gestión de tareas.',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    projects.push(newProject);
    this.saveProjects(projects);
    this.setActiveProjectId(newProject.id);
    this.setActiveBoardId(newBoardId);

    // Persistir en PostgreSQL mediante la API REST de Node.js
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newProjectId,
        boardId: newBoardId,
        key,
        name: data.name.trim(),
        description: data.description.trim(),
        createdBy: data.userId,
        boardName: 'Tablero Principal Kanban',
      }),
    }).catch(() => {});

    return { success: true, project: newProject };
  }

  static createBoard(
    projectId: string,
    data: { name: string; description: string }
  ): { success: boolean; board?: Board; error?: string } {
    if (!data.name.trim()) {
      return { success: false, error: 'El nombre del tablero es obligatorio.' };
    }

    const projects = this.getProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado.' };
    }

    const newBoardId = `board-${Date.now()}`;
    const newBoard: Board = {
      id: newBoardId,
      projectId,
      name: data.name.trim(),
      description: data.description.trim(),
      createdAt: new Date().toISOString(),
    };

    project.boards.push(newBoard);
    this.saveProjects(projects);
    this.setActiveBoardId(newBoard.id);

    // Persistir en PostgreSQL
    fetch(`/api/projects/${projectId}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newBoardId,
        name: data.name.trim(),
      }),
    }).catch(() => {});

    return { success: true, board: newBoard };
  }
}
