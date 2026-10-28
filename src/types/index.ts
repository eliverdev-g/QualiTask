export type UserRole = 'admin' | 'collaborator';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  department: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export type TaskStatus = 'backlog' | 'in_progress' | 'in_qa' | 'completed';

export interface BoardColumn {
  id: TaskStatus;
  title: string;
  description: string;
  ruleDescription: string;
  color: string;
  badgeBg: string;
}

export type TaskType = 'task' | 'bug' | 'story';
export type TaskPriority = 'baja' | 'media' | 'alta' | 'critica';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
  completedAt?: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
  isQaObservation?: boolean;
}

export interface Task {
  id: string; // e.g. BANK-101
  projectId: string;
  boardId: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string | null;
  assignee?: User;
  reporterId: string;
  reporter?: User;
  tags: string[];
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  createdAt: string;
  completedAt?: string;
  subtasks: Subtask[];
  activities: ActivityLog[];
  comments: TaskComment[];
  qaNotes?: string;
}

export interface Project {
  status?: 'active' | 'inactive';
  id: string;
  key: string; // e.g. BANK
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  members: string[]; // User IDs
  boards: Board[];
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
}
