import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  Subtask,
  ActivityLog,
  TaskComment,
  BoardColumn,
  User,
} from '../types';
import { AuthService } from './authService';

export const BOARD_COLUMNS: BoardColumn[] = [
  {
    id: 'backlog',
    title: 'Por hacer (Backlog)',
    description: 'Tareas creadas y priorizadas, aún no iniciadas.',
    ruleDescription: 'Pasa a "En progreso" cuando se asigna un responsable.',
    color: 'border-slate-300 text-slate-700',
    badgeBg: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'in_progress',
    title: 'En progreso',
    description: 'Tarea en desarrollo activo.',
    ruleDescription: 'Pasa a "En revisión" cuando el responsable marca avance completo.',
    color: 'border-blue-300 text-blue-700',
    badgeBg: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'in_qa',
    title: 'En revisión / QA',
    description: 'Validación de la tarea contra su criterio de aceptación.',
    ruleDescription: 'Pasa a "Completado" si aprueba, o regresa a "En progreso" si se detectan defectos.',
    color: 'border-amber-300 text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'completed',
    title: 'Completado',
    description: 'Tarea validada y cerrada. Estado final con fecha de cierre.',
    ruleDescription: 'Estado final; queda en el historial con fecha de cierre.',
    color: 'border-emerald-300 text-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700',
  },
];

// Clean v2 with NO hardcoded/burned-in tasks
const STORAGE_TASKS_KEY = 'qualitask_clean_tasks_v2';

export class TaskService {
  static getTasks(): Task[] {
    const raw = localStorage.getItem(STORAGE_TASKS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveTasks(tasks: Task[]): void {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
  }

  static async syncWithApi(boardId?: string): Promise<Task[]> {
    try {
      const url = boardId ? `/api/tasks?boardId=${boardId}` : '/api/tasks';
      const res = await fetch(url);
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          this.saveTasks(remote);
          return remote;
        }
      }
    } catch {
      // Backend no disponible, usa local
    }
    return this.getTasks();
  }

  static getTasksByBoard(boardId: string): Task[] {
    const all = this.getTasks();
    const users = AuthService.getAllUsers();
    return all
      .filter((t) => t.boardId === boardId)
      .map((t) => ({
        ...t,
        assignee: users.find((u) => u.id === t.assigneeId),
        reporter: users.find((u) => u.id === t.reporterId),
      }));
  }

  static getTaskById(taskId: string): Task | undefined {
    const all = this.getTasks();
    const task = all.find((t) => t.id === taskId);
    if (!task) return undefined;
    const users = AuthService.getAllUsers();
    return {
      ...task,
      assignee: users.find((u) => u.id === task.assigneeId),
      reporter: users.find((u) => u.id === task.reporterId),
    };
  }

  static isTaskOverdue(task: Task): boolean {
    if (task.status === 'completed') return false;
    if (!task.dueDate) return false;
    const due = new Date(`${task.dueDate}T23:59:59`);
    return due.getTime() < Date.now();
  }

  static getOverdueDays(task: Task): number {
    if (!this.isTaskOverdue(task)) return 0;
    const due = new Date(`${task.dueDate}T23:59:59`);
    const diff = Date.now() - due.getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  static createTask(
    data: {
      projectId: string;
      boardId: string;
      title: string;
      description: string;
      type: TaskType;
      priority: TaskPriority;
      assigneeId?: string | null;
      tags: string[];
      startDate: string;
      dueDate: string;
      subtasksTitles?: string[];
    },
    currentUser: User
  ): { success: boolean; task?: Task; error?: string } {
    if (!data.title.trim()) {
      return { success: false, error: 'El título de la tarea es obligatorio.' };
    }
    if (!data.dueDate) {
      return { success: false, error: 'La fecha límite de cumplimiento es obligatoria.' };
    }

    const tasks = this.getTasks();
    const projectTasks = tasks.filter((t) => t.projectId === data.projectId);
    const nextNumber = 100 + projectTasks.length + 1;
    const taskId = `TASK-${nextNumber}`;

    const newSubtasks: Subtask[] = (data.subtasksTitles || []).map((title, index) => ({
      id: `sub-${Date.now()}-${index}`,
      taskId,
      title: title.trim(),
      completed: false,
      order: index + 1,
      createdAt: new Date().toISOString(),
    }));

    const now = new Date().toISOString();
    const newTask: Task = {
      id: taskId,
      projectId: data.projectId,
      boardId: data.boardId,
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type,
      priority: data.priority,
      status: 'backlog',
      assigneeId: data.assigneeId || null,
      reporterId: currentUser.id,
      tags: data.tags,
      startDate: data.startDate || now.split('T')[0],
      dueDate: data.dueDate,
      createdAt: now,
      subtasks: newSubtasks,
      activities: [
        {
          id: `act-${Date.now()}`,
          taskId,
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          action: 'Creación de tarea',
          details: `Tarea creada con prioridad ${data.priority.toUpperCase()} por ${currentUser.fullName}`,
          timestamp: now,
        },
      ],
      comments: [],
    };

    tasks.unshift(newTask);
    this.saveTasks(tasks);

    // Persistir asíncronamente en PostgreSQL
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: taskId,
        projectId: data.projectId,
        boardId: data.boardId,
        title: data.title.trim(),
        description: data.description.trim(),
        type: data.type,
        priority: data.priority,
        status: 'backlog',
        assigneeId: data.assigneeId || null,
        reporterId: currentUser.id,
        tags: data.tags,
        startDate: data.startDate,
        dueDate: data.dueDate,
        subtasks: newSubtasks,
        currentUser,
      }),
    }).catch(() => {});

    return { success: true, task: newTask };
  }

  /**
   * Controlled Transition Rules Engine:
   * 1. Por hacer -> En progreso: Pasa a "En progreso" cuando se asigna un responsable.
   * 2. En progreso -> En revisión / QA: Pasa a "En revisión" cuando el responsable marca avance completo.
   * 3. En revisión / QA -> Completado: Pasa a "Completado" si aprueba.
   * 4. En revisión / QA -> En progreso (Retroceder): Regresa a "En progreso" si se detectan defectos (requiere justificación).
   */
  static transitionTask(
    taskId: string,
    newStatus: TaskStatus,
    currentUser: User,
    options?: {
      rejectionReason?: string;
      assigneeId?: string;
    }
  ): { success: boolean; error?: string; requiresAssignee?: boolean; requiresRejectionReason?: boolean } {
    const tasks = this.getTasks();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, error: 'Tarea no encontrada.' };
    }

    const task = tasks[taskIndex];
    const prevStatus = task.status;

    if (prevStatus === newStatus) {
      return { success: true };
    }

    // Regla 1: Backlog -> En progreso exige responsable
    if (newStatus === 'in_progress') {
      const targetAssigneeId = options?.assigneeId || task.assigneeId;
      if (!targetAssigneeId) {
        return {
          success: false,
          requiresAssignee: true,
          error: 'Criterio de transición: La tarea pasa a "En progreso" cuando se asigna un responsable.',
        };
      }
      if (options?.assigneeId) {
        task.assigneeId = options.assigneeId;
      }
    }

    // Regla 2: En revisión / QA -> En progreso (Retroceso por defectos)
    const isBackwardFromQa = prevStatus === 'in_qa' && newStatus === 'in_progress';
    if (isBackwardFromQa && !options?.rejectionReason?.trim()) {
      return {
        success: false,
        requiresRejectionReason: true,
        error: 'Retroceso: Debe especificar el defecto u observación técnica al regresar a "En progreso".',
      };
    }

    const now = new Date().toISOString();
    task.status = newStatus;

    if (newStatus === 'completed') {
      task.completedAt = now;
    } else {
      task.completedAt = undefined;
    }

    const statusTitles: Record<TaskStatus, string> = {
      backlog: 'Por hacer (Backlog)',
      in_progress: 'En progreso',
      in_qa: 'En revisión / QA',
      completed: 'Completado',
    };

    let details = `Transición: [${statusTitles[prevStatus]}] ➔ [${statusTitles[newStatus]}]`;
    if (isBackwardFromQa && options?.rejectionReason) {
      details += ` | Defecto detectado: ${options.rejectionReason}`;
      task.comments.push({
        id: `comm-${Date.now()}`,
        taskId,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        content: `🚨 Observación de QA (Retroceso a desarrollo): ${options.rejectionReason}`,
        createdAt: now,
        isQaObservation: true,
      });
    }

    task.activities.unshift({
      id: `act-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: isBackwardFromQa ? 'Retroceso por defectos' : 'Cambio de estado',
      details,
      previousValue: prevStatus,
      newValue: newStatus,
      timestamp: now,
    });

    tasks[taskIndex] = task;
    this.saveTasks(tasks);

    // Persistir transición y auditoría en PostgreSQL
    fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        assigneeId: task.assigneeId,
        completedAt: task.completedAt || null,
        rejectionReason: options?.rejectionReason || null,
        currentUser,
      }),
    }).catch(() => {});

    return { success: true };
  }

  static updateTaskDetails(
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'type' | 'assigneeId' | 'startDate' | 'dueDate' | 'tags'>>,
    currentUser: User
  ): { success: boolean; task?: Task; error?: string } {
    const tasks = this.getTasks();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, error: 'Tarea no encontrada.' };
    }

    const task = tasks[taskIndex];
    const changes: string[] = [];

    if (updates.title && updates.title !== task.title) {
      changes.push(`Título actualizado a "${updates.title}"`);
      task.title = updates.title;
    }
    if (updates.description !== undefined && updates.description !== task.description) {
      changes.push('Descripción modificada');
      task.description = updates.description;
    }
    if (updates.priority && updates.priority !== task.priority) {
      changes.push(`Prioridad cambiada a ${updates.priority.toUpperCase()}`);
      task.priority = updates.priority;
    }
    if (updates.type && updates.type !== task.type) {
      changes.push(`Tipo cambiado a ${updates.type.toUpperCase()}`);
      task.type = updates.type;
    }
    if (updates.assigneeId !== undefined && updates.assigneeId !== task.assigneeId) {
      const newAssignee = AuthService.getUserById(updates.assigneeId || '');
      changes.push(`Responsable: ${newAssignee ? newAssignee.fullName : 'Sin asignar'}`);
      task.assigneeId = updates.assigneeId;
    }
    if (updates.dueDate && updates.dueDate !== task.dueDate) {
      changes.push(`Fecha límite actualizada a ${updates.dueDate}`);
      task.dueDate = updates.dueDate;
    }
    if (updates.startDate && updates.startDate !== task.startDate) {
      changes.push(`Fecha inicio actualizada a ${updates.startDate}`);
      task.startDate = updates.startDate;
    }
    if (updates.tags) {
      task.tags = updates.tags;
    }

    if (changes.length > 0) {
      task.activities.unshift({
        id: `act-${Date.now()}`,
        taskId,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Modificación de atributos',
        details: changes.join('; '),
        timestamp: new Date().toISOString(),
      });
    }

    tasks[taskIndex] = task;
    this.saveTasks(tasks);

    return { success: true, task };
  }

  // Subtasks
  static addSubtask(taskId: string, title: string, currentUser: User): { success: boolean; subtask?: Subtask; error?: string } {
    if (!title.trim()) return { success: false, error: 'El título de la subtarea es requerido.' };

    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: 'Tarea no encontrada.' };

    const newSubtask: Subtask = {
      id: `sub-${Date.now()}`,
      taskId,
      title: title.trim(),
      completed: false,
      order: task.subtasks.length + 1,
      createdAt: new Date().toISOString(),
    };

    task.subtasks.push(newSubtask);

    task.activities.unshift({
      id: `act-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Subtarea añadida',
      details: `Subtarea agregada: "${title.trim()}"`,
      timestamp: new Date().toISOString(),
    });

    this.saveTasks(tasks);
    return { success: true, subtask: newSubtask };
  }

  static toggleSubtask(taskId: string, subtaskId: string, currentUser: User): { success: boolean; completed?: boolean } {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false };

    const sub = task.subtasks.find((s) => s.id === subtaskId);
    if (!sub) return { success: false };

    sub.completed = !sub.completed;
    sub.completedAt = sub.completed ? new Date().toISOString() : undefined;

    const completedCount = task.subtasks.filter((s) => s.completed).length;
    const totalCount = task.subtasks.length;
    const percent = Math.round((completedCount / totalCount) * 100);

    task.activities.unshift({
      id: `act-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: sub.completed ? 'Subtarea completada' : 'Subtarea pendiente',
      details: `"${sub.title}" marcada como ${sub.completed ? 'completada' : 'pendiente'} (${percent}% total)`,
      timestamp: new Date().toISOString(),
    });

    this.saveTasks(tasks);
    return { success: true, completed: sub.completed };
  }

  static reorderSubtasks(taskId: string, newOrderedSubtasks: Subtask[], currentUser: User): boolean {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;

    task.subtasks = newOrderedSubtasks.map((st, index) => ({
      ...st,
      order: index + 1,
    }));

    task.activities.unshift({
      id: `act-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Reordenamiento de subtareas',
      details: 'Se actualizó el orden de subtareas.',
      timestamp: new Date().toISOString(),
    });

    this.saveTasks(tasks);
    return true;
  }

  static deleteSubtask(taskId: string, subtaskId: string, currentUser: User): boolean {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;

    const sub = task.subtasks.find((s) => s.id === subtaskId);
    task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId);

    if (sub) {
      task.activities.unshift({
        id: `act-${Date.now()}`,
        taskId,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'Subtarea eliminada',
        details: `Se eliminó la subtarea "${sub.title}"`,
        timestamp: new Date().toISOString(),
      });
    }

    this.saveTasks(tasks);
    return true;
  }

  // Comments
  static addComment(
    taskId: string,
    content: string,
    currentUser: User,
    isQaObservation = false
  ): { success: boolean; comment?: TaskComment; error?: string } {
    if (!content.trim()) return { success: false, error: 'El comentario no puede estar vacío.' };

    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: 'Tarea no encontrada.' };

    const now = new Date().toISOString();
    const newComment: TaskComment = {
      id: `comm-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      content: content.trim(),
      createdAt: now,
      isQaObservation,
    };

    task.comments.push(newComment);

    task.activities.unshift({
      id: `act-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: isQaObservation ? 'Observación de QA' : 'Comentario añadido',
      details: `${currentUser.fullName} añadió un comentario`,
      timestamp: now,
    });

    this.saveTasks(tasks);
    return { success: true, comment: newComment };
  }
}
