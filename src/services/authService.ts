import { User, UserRole } from '../types';

export interface PasswordStrength {
  score: number; // 0 - 4
  label: string;
  color: string;
  barColor: string;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  feedback: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const criteria = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial];
  const passedCount = criteria.filter(Boolean).length;

  const feedback: string[] = [];
  if (!hasMinLength) feedback.push('Mínimo 8 caracteres');
  if (!hasUpper) feedback.push('Al menos 1 letra mayúscula (A-Z)');
  if (!hasLower) feedback.push('Al menos 1 letra minúscula (a-z)');
  if (!hasNumber) feedback.push('Al menos 1 número (0-9)');
  if (!hasSpecial) feedback.push('Al menos 1 caracter especial (!@#$...)');

  let score = 0;
  let label = 'Muy débil';
  let color = 'text-rose-600';
  let barColor = 'bg-rose-500';

  if (passedCount <= 1) {
    score = 0;
    label = 'Muy débil';
    color = 'text-rose-600';
    barColor = 'bg-rose-500';
  } else if (passedCount === 2) {
    score = 1;
    label = 'Débil';
    color = 'text-amber-600';
    barColor = 'bg-amber-500';
  } else if (passedCount === 3) {
    score = 2;
    label = 'Aceptable';
    color = 'text-yellow-600';
    barColor = 'bg-yellow-500';
  } else if (passedCount === 4) {
    score = 3;
    label = 'Fuerte';
    color = 'text-teal-600';
    barColor = 'bg-teal-500';
  } else if (passedCount === 5) {
    score = 4;
    label = 'Excelente';
    color = 'text-emerald-600';
    barColor = 'bg-emerald-500';
  }

  return {
    score,
    label,
    color,
    barColor,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    feedback,
  };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


const CURRENT = 'qualitask_clean_current_user_v2';
const USERS = 'qualitask_clean_users_v2';
export class AuthService {
  static getCurrentUser(): User | null { try { return JSON.parse(localStorage.getItem(CURRENT) || 'null'); } catch { return null; } }
  static setCurrentUser(user: User | null) { if (user) localStorage.setItem(CURRENT, JSON.stringify(user)); else localStorage.removeItem(CURRENT); }
  static getAllUsers(): User[] { try { return JSON.parse(localStorage.getItem(USERS) || '[]'); } catch { return []; } }
  static getUserById(id: string) { return this.getAllUsers().find(u => u.id === id); }
  static cacheUsers(users: User[]) { localStorage.setItem(USERS, JSON.stringify(users)); window.dispatchEvent(new Event('users-updated')); }
  static async request(path: string, body?: unknown, method = 'POST') {
    const response = await fetch('/api/' + path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
    return data;
  }
  static async authenticate(path: string, body: unknown): Promise<User> {
    const data = await this.request('auth/' + path, body);
    this.setCurrentUser(data.user);
    return data.user;
  }
  static async updateUserRole(id: string, role: UserRole) { return this.request('users/' + encodeURIComponent(id) + '/role', { role }, 'PUT'); }
  static async toggleUserStatus(id: string) { return this.request('users/' + encodeURIComponent(id) + '/status', undefined, 'PUT'); }
  static async logout() { try { await this.request('auth/logout'); } finally { this.setCurrentUser(null); } }
}
