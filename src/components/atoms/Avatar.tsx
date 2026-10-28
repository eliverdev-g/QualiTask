import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export interface AvatarProps {
  name: string;
  role?: 'admin' | 'collaborator';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  avatarUrl?: string;
}

const sizeStyles = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm font-bold',
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  role,
  size = 'md',
  className = '',
  title,
  avatarUrl,
}) => {
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [avatarUrl]);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleBg =
    role === 'admin'
      ? 'bg-indigo-600 text-white'
      : 'bg-blue-600 text-white';

  const avatarTitle = title || `${name}${role ? ` (${role === 'admin' ? 'Administrador' : 'Colaborador'})` : ''}`;

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={avatarTitle}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={`rounded-full object-cover shrink-0 select-none shadow-2xs ${sizeStyles[size]} ${className}`}
      />
    );
  }

  return (
    <div
      title={avatarTitle}
      className={`rounded-full flex items-center justify-center font-bold shrink-0 select-none shadow-2xs ${roleBg} ${sizeStyles[size]} ${className}`}
    >
      {initials || 'U'}
    </div>
  );
};

Avatar.propTypes = {
  name: PropTypes.string.isRequired,
  role: PropTypes.oneOf(['admin', 'collaborator']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  className: PropTypes.string,
  title: PropTypes.string,
  avatarUrl: PropTypes.string,
};
