import React, { useState, useEffect } from 'react';
import { User } from './types';
import { AuthService } from './services/authService';
import { MainLayout } from './components/templates/MainLayout';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(AuthService.getCurrentUser());

  const [ready, setReady] = useState(false);
  useEffect(() => {
    AuthService.request('auth/me', undefined, 'GET').then(data => {
      AuthService.setCurrentUser(data.user); setCurrentUser(data.user);
    }).catch(() => { AuthService.setCurrentUser(null); setCurrentUser(null); }).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready || !currentUser) return;
    const stream = new EventSource('/api/auth/events');
    stream.onmessage = event => {
      const snapshot = JSON.parse(event.data);
      AuthService.setCurrentUser(snapshot.user);
      AuthService.cacheUsers(snapshot.users);
      setCurrentUser(snapshot.user);
    };
    stream.addEventListener('revoked', () => { AuthService.setCurrentUser(null); setCurrentUser(null); stream.close(); });
    return () => stream.close();
  }, [ready, currentUser?.id]);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try { await AuthService.logout(); } finally { setCurrentUser(null); }
  };

  if (!ready) return <div className="h-full flex items-center justify-center text-slate-500">Verificando sesión…</div>;
  return (
    <MainLayout
      currentUser={currentUser}
      onAuthSuccess={handleAuthSuccess}
      onLogout={handleLogout}
    />
  );
}
