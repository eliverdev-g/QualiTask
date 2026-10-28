import React from 'react';
import { Shield } from 'lucide-react';
import { TaskComment } from '../../types';
import { AuthService } from '../../services/authService';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';

export interface CommentItemProps {
  comment: TaskComment;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const user = AuthService.getUserById(comment.userId);
  const formattedTime = new Date(comment.createdAt).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div
      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
        comment.isQaObservation
          ? 'bg-amber-50/70 border-amber-200'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar
            name={comment.userName}
            role={comment.userRole}
            size="xs"
            avatarUrl={user?.avatarUrl}
          />
          <span className="font-bold text-slate-800">{comment.userName}</span>
          {comment.isQaObservation && (
            <Badge variant="warning" size="xs" icon={<Shield className="w-3 h-3" />}>
              Observación QA
            </Badge>
          )}
        </div>
        <span className="font-mono text-[10px] text-slate-400">{formattedTime}</span>
      </div>
      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap pl-6">{comment.content}</p>
    </div>
  );
};
