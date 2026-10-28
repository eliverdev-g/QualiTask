import React from 'react';
import { ActivityLog } from '../../types';
import { AuthService } from '../../services/authService';
import { Avatar } from '../atoms/Avatar';

export interface ActivityLogItemProps {
  activity: ActivityLog;
}

export const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ activity }) => {
  const user = AuthService.getUserById(activity.userId);
  const formattedTime = new Date(activity.timestamp).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="flex items-start gap-2.5 text-xs py-1.5">
      <Avatar
        name={activity.userName}
        role={activity.userRole}
        size="xs"
        avatarUrl={user?.avatarUrl}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-slate-800">{activity.userName}</span>
            <span className="text-[10px] text-slate-500 font-normal">
              ({activity.userRole === 'admin' ? 'Admin' : 'Colaborador'})
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 shrink-0">{formattedTime}</span>
        </div>
        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{activity.details}</p>
      </div>
    </div>
  );
};
