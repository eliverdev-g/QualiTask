import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  Bug,
  Users,
  TrendingUp,
  FileText,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { Project, Board } from '../../types';
import { TaskService } from '../../services/taskService';
import { AuthService } from '../../services/authService';
import { MetricStatCard } from '../molecules/MetricStatCard';
import { Card } from '../atoms/Card';
import { ProgressBar } from '../atoms/ProgressBar';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';

export interface DashboardPageProps {
  project: Project;
  board: Board;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ project, board }) => {
  const tasks = TaskService.getTasksByBoard(board.id);
  const users = AuthService.getAllUsers();

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const inQa = tasks.filter((t) => t.status === 'in_qa').length;
  const backlog = tasks.filter((t) => t.status === 'backlog').length;
  const overdue = tasks.filter((t) => TaskService.isTaskOverdue(t)).length;

  const bugs = tasks.filter((t) => t.type === 'bug');
  const bugsResolved = bugs.filter((t) => t.status === 'completed').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const onTimeRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

  const memberWorkload = users.map((u) => {
    const assignedTasks = tasks.filter((t) => t.assigneeId === u.id);
    const memberCompleted = assignedTasks.filter((t) => t.status === 'completed').length;
    const memberOverdue = assignedTasks.filter((t) => TaskService.isTaskOverdue(t)).length;
    return {
      user: u,
      total: assignedTasks.length,
      completed: memberCompleted,
      overdue: memberOverdue,
    };
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
      {/* Banner */}
      <Card className="shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Resumen del proyecto
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="primary" size="md">
            Proyecto: <span className="font-mono ml-1">{project.key}</span>
          </Badge>
          <Badge variant="neutral" size="md">
            {board.name}
          </Badge>
        </div>
      </Card>

      {/* KPI Cards Row using reusable MetricStatCard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricStatCard
          title="Total Tareas"
          value={total}
          sublabel="Requisitos en el sprint"
          icon={<FileText className="w-4 h-4 text-slate-400" />}
        />

        <MetricStatCard
          title="Completadas"
          value={completed}
          sublabel={`${completionRate}% de avance general`}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          valueColor="text-emerald-600"
        />

        <MetricStatCard
          title="En Desarrollo"
          value={inProgress}
          sublabel="Actividad en curso"
          icon={<Flame className="w-4 h-4 text-blue-500" />}
          valueColor="text-blue-600"
        />

        <MetricStatCard
          title="En Revisión / QA"
          value={inQa}
          sublabel="Inspección de criterios"
          icon={<ShieldCheck className="w-4 h-4 text-amber-500" />}
          valueColor="text-amber-600"
        />

        <MetricStatCard
          title="Tareas Vencidas"
          value={overdue}
          sublabel={`${onTimeRate}% a tiempo`}
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
          variant={overdue > 0 ? 'alert' : 'default'}
          valueColor="text-rose-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State distribution */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Distribución de Tareas por Estado (Ciclo de Vida)
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">100% de cobertura</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Por hacer (Backlog)</span>
                <span className="font-mono font-bold text-slate-800">
                  {backlog} ({total > 0 ? Math.round((backlog / total) * 100) : 0}%)
                </span>
              </div>
              <ProgressBar
                value={total > 0 ? (backlog / total) * 100 : 0}
                color="amber"
                size="md"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">En progreso</span>
                <span className="font-mono font-bold text-blue-700">
                  {inProgress} ({total > 0 ? Math.round((inProgress / total) * 100) : 0}%)
                </span>
              </div>
              <ProgressBar
                value={total > 0 ? (inProgress / total) * 100 : 0}
                color="blue"
                size="md"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">En revisión / QA</span>
                <span className="font-mono font-bold text-amber-700">
                  {inQa} ({total > 0 ? Math.round((inQa / total) * 100) : 0}%)
                </span>
              </div>
              <ProgressBar
                value={total > 0 ? (inQa / total) * 100 : 0}
                color="amber"
                size="md"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Completadas</span>
                <span className="font-mono font-bold text-emerald-700">
                  {completed} ({total > 0 ? Math.round((completed / total) * 100) : 0}%)
                </span>
              </div>
              <ProgressBar
                value={total > 0 ? (completed / total) * 100 : 0}
                color="emerald"
                size="md"
              />
            </div>
          </div>
        </Card>

        {/* Bug tracker health */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bug className="w-4 h-4 text-rose-600" />
              Errores
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Card variant="muted" padding="sm">
              <span className="text-[11px] text-slate-500">Defectos Reportados:</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">{bugs.length}</p>
            </Card>
            <Card variant="muted" padding="sm" className="bg-emerald-50/60 border-emerald-200">
              <span className="text-[11px] text-emerald-700 font-semibold">Defectos Subsanados:</span>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-1">{bugsResolved}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                {bugs.length > 0 ? Math.round((bugsResolved / bugs.length) * 100) : 100}% tasa de resolución
              </p>
            </Card>
          </div>
        </Card>
      </div>

      {/* Team Member Workload Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900">
              Carga de Trabajo y Asignación por Colaborador
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Colaborador</th>
                <th className="py-2.5 px-4 font-semibold">Rol</th>
                <th className="py-2.5 px-4 font-semibold text-center">Tareas Asignadas</th>
                <th className="py-2.5 px-4 font-semibold text-center">Completadas</th>
                <th className="py-2.5 px-4 font-semibold text-center">Tareas Vencidas</th>
                <th className="py-2.5 px-4 font-semibold text-right">Efectividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberWorkload.map(({ user, total: userTotal, completed: userComp, overdue: userOverdue }) => {
                const eff = userTotal > 0 ? Math.round((userComp / userTotal) * 100) : 0;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={user.fullName}
                          role={user.role}
                          size="sm"
                          avatarUrl={user.avatarUrl}
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{user.fullName}</p>
                          <p className="text-[11px] text-slate-500">{user.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.role === 'admin' ? 'info' : 'default'} size="xs">
                        {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {userTotal}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">
                      {userComp}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {userOverdue > 0 ? (
                        <Badge variant="danger" size="xs">
                          {userOverdue} vencida{userOverdue > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {eff}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
