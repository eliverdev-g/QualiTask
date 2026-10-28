import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { AuthService } from '../../services/authService';
import { Modal } from '../atoms/Modal';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { PasswordStrength } from '../molecules/PasswordStrength';

export interface AuthDialogProps { isOpen: boolean; onSuccess: (user: User) => void; onClose?: () => void; }
export const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, onSuccess, onClose }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Desarrollo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetStep, setResetStep] = useState(false);
  const [token, setToken] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!isOpen || tab === 'forgot' || !clientId) return;
    let cancelled = false;
    setGoogleReady(false);
    const initialize = () => {
      const google = (window as any).google;
      if (cancelled || !google?.accounts?.id || !googleButton.current) return;
      google.accounts.id.initialize({ client_id: clientId, callback: async (response: any) => {
        if (cancelled || busyRef.current) return;
        busyRef.current = true; setBusy(true); setError('');
        try { const user = await AuthService.authenticate('google', { credential: response.credential }); if (!cancelled) onSuccess(user); }
        catch (e) { if (!cancelled) setError((e as Error).message); }
        finally { busyRef.current = false; if (!cancelled) setBusy(false); }
      } });
      googleButton.current.innerHTML = '';
      google.accounts.id.renderButton(googleButton.current, { theme: 'outline', size: 'large', text: tab === 'register' ? 'signup_with' : 'signin_with', shape: 'pill', width: 320, locale: 'es' });
      setGoogleReady(true);
      clearInterval(timer);
    };
    const timer = setInterval(initialize, 250);
    initialize();
    return () => { cancelled = true; clearInterval(timer); };
  }, [isOpen, tab, clientId, onSuccess]);

  const switchTab = (next: typeof tab) => { setTab(next); setError(''); setMessage(''); setPassword(''); setVisible(false); setResetStep(false); setToken(''); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (tab === 'forgot') {
        if (!resetStep) {
          const result = await AuthService.request('auth/forgot', { email });
          setMessage(result.message); setResetStep(true);
        } else {
          await AuthService.request('auth/reset', { email, token, newPassword: password });
          switchTab('login'); setMessage('Contraseña actualizada. Ya puede iniciar sesión.');
        }
      } else {
        const user = await AuthService.authenticate(tab, tab === 'register' ? { fullName, email, password, department } : { email, password });
        onSuccess(user);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo conectar con el servidor.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose || (() => {})} hideCloseButton={!onClose} size="md" title="QualiTask">
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><ShieldCheck className="h-6 w-6" /></div>
          <h2 className="text-xl font-bold text-slate-900">{tab === 'login' ? 'Bienvenido de nuevo' : tab === 'register' ? 'Crea tu cuenta' : 'Recupera tu acceso'}</h2>
        </div>
        {tab !== 'forgot' && <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
          <button type="button" disabled={busy} onClick={() => switchTab('login')} className={`flex-1 rounded-lg py-2 font-semibold ${tab === 'login' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Iniciar sesión</button>
          <button type="button" disabled={busy} onClick={() => switchTab('register')} className={`flex-1 rounded-lg py-2 font-semibold ${tab === 'register' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Crear cuenta</button>
        </div>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {tab !== 'forgot' && <>
          <div className={`flex justify-center min-h-10 ${busy ? 'pointer-events-none opacity-50' : ''}`} ref={googleButton} />
          {!googleReady && <p className="text-center text-xs text-slate-500">{clientId ? 'Cargando Google… Si no aparece, puedes continuar con tu correo.' : 'El acceso con Google estará disponible cuando se configure el servicio.'}</p>}
          <div className="flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200" />o continúa con tu correo<div className="h-px flex-1 bg-slate-200" /></div>
        </>}
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            {tab === 'register' && <>
              <Input label="Nombre completo" autoComplete="name" required value={fullName} onChange={e => setFullName(e.target.value)} />
              <Input label="Departamento" autoComplete="organization-title" required value={department} onChange={e => setDepartment(e.target.value)} />
            </>}
            <Input label="Correo electrónico" type="email" autoComplete="email" icon={<Mail className="h-4 w-4" />} required value={email} onChange={e => setEmail(e.target.value)} />
            {(tab !== 'forgot' || resetStep) && <>
              {tab === 'forgot' && <Input label="Código de recuperación" required inputMode="numeric" maxLength={6} value={token} onChange={e => setToken(e.target.value)} />}
              <Input label={tab === 'forgot' ? 'Nueva contraseña' : 'Contraseña'} type={visible ? 'text' : 'password'} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} required minLength={tab === 'login' ? undefined : 8} icon={<Lock className="h-4 w-4" />} value={password} onChange={e => setPassword(e.target.value)} iconRight={<button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
              {tab !== 'login' && <PasswordStrength password={password} />}
            </>}
            <Button type="submit" fullWidth disabled={busy}>{busy ? 'Procesando…' : tab === 'login' ? 'Iniciar sesión' : tab === 'register' ? 'Crear cuenta' : resetStep ? 'Actualizar contraseña' : 'Solicitar código'}</Button>
          </fieldset>
        </form>
        <div className="text-center"><button type="button" disabled={busy} onClick={() => switchTab(tab === 'forgot' ? 'login' : 'forgot')} className="text-xs font-medium text-blue-600 hover:underline">{tab === 'forgot' ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}</button></div>
      </div>
    </Modal>
  );
};
