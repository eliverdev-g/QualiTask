import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { pool } from '../db';
import { publicUser, hashPassword, verifyPassword, startSession, endSession, requireUser, sessionId } from '../security';

export const authRouter = Router();

// 1. Google OAuth en tiempo real (Google Identity Services)
authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: 'Google no está configurado.' });
    if (typeof credential !== 'string') return res.status(400).json({ error: 'Credencial de Google requerida.' });
    const verification = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { signal: AbortSignal.timeout(10000) });
    if (!verification.ok) return res.status(401).json({ error: 'Credencial de Google inválida.' });
    const payload: any = await verification.json();
    if (payload.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) || Number(payload.exp) * 1000 <= Date.now() || ![true, 'true'].includes(payload.email_verified) || !payload.sub || !payload.email) return res.status(401).json({ error: 'Cuenta de Google no verificada.' });
    const email = payload.email.toLowerCase();
    const fullName = payload.name || email.split('@')[0];
    const googleSub = payload.sub;
    const avatarUrl = payload.picture || null;

    // Buscar si el usuario ya existe en PostgreSQL
    const existing = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.status === 'inactive') {
        return res.status(403).json({ success: false, error: 'Esta cuenta ha sido desactivada por un Administrador.' });
      }

      if (user.google_sub && user.google_sub !== googleSub) return res.status(403).json({ error: 'Cuenta de Google no vinculada.' });
      await pool.query('UPDATE users SET avatar_url = $1, google_sub = $2 WHERE id = $3', [avatarUrl || user.avatar_url, googleSub, user.id]);
      user.avatar_url = avatarUrl || user.avatar_url;
      startSession(res, user.id);

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          department: user.department,
          avatarUrl: user.avatar_url,
          status: user.status,
          createdAt: user.created_at,
        },
      });
    }

    // Todo usuario nuevo que se registre (sea por Google o Formulario) nace como Colaborador
    const assignedRole = 'collaborator';
    const userId = randomUUID();
    const userDept = 'Ingeniería de Software / QA';

    const insertRes = await pool.query(
      `INSERT INTO users (id, email, full_name, role, department, avatar_url, google_sub, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [userId, email, fullName || email.split('@')[0], assignedRole, userDept, avatarUrl, googleSub]
    );

    const newUser = insertRes.rows[0];
    startSession(res, newUser.id);
    return res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        department: newUser.department,
        avatarUrl: newUser.avatar_url,
        status: newUser.status,
        createdAt: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Error en /api/auth/google:', error);
    return res.status(500).json({ success: false, error: 'Error interno al autenticar con Google en la base de datos.' });
  }
});

// 2. Inicio de sesión con Correo y Contraseña
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ success: false, error: 'Correo y contraseña requeridos.' });
    }

    const queryRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (queryRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no registrado. Regístrese primero.' });
    }

    const user = queryRes.rows[0];
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, error: 'Esta cuenta ha sido desactivada por un Administrador.' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
    }

    startSession(res, user.id);
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatar_url,
        status: user.status,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    return res.status(500).json({ success: false, error: 'Error en el servidor al iniciar sesión.' });
  }
});

// 3. Registro tradicional con validación ISO 27001
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, department } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    if (!fullName || !cleanEmail || !password || !department) {
      return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios.' });
    }

    if (typeof password !== 'string' || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) return res.status(400).json({ error: 'Use 8 caracteres, mayúscula, minúscula, número y símbolo.' });
    const checkRes = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (checkRes.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Ya existe un usuario con este correo electrónico.' });
    }

    // Todo nuevo usuario registrado nace estrictamente con rol Colaborador
    const assignedRole = 'collaborator';
    const userId = randomUUID();

    const insertRes = await pool.query(
      `INSERT INTO users (id, email, full_name, password_hash, role, department, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [userId, cleanEmail, fullName.trim(), hashPassword(password), assignedRole, department.trim()]
    );

    const newUser = insertRes.rows[0];
    startSession(res, newUser.id);
    return res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        department: newUser.department,
        avatarUrl: newUser.avatar_url,
        status: newUser.status,
        createdAt: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Error en /api/auth/register:', error);
    return res.status(500).json({ success: false, error: 'Error al registrar el usuario en la base de datos.' });
  }
});

// 4. Solicitud de código OTP de recuperación (15 minutos)
authRouter.post('/forgot', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    const userRes = await pool.query('SELECT email FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No se encontró ninguna cuenta con ese correo.' });
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await pool.query('DELETE FROM password_resets WHERE LOWER(email) = $1', [cleanEmail]);
    await pool.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)',
      [cleanEmail, token, expiresAt]
    );

    return res.json({
      success: true,
      token,
      message: `Código de recuperación OTP generado: ${token} (validez 15 minutos).`,
    });
  } catch (error) {
    console.error('Error en /api/auth/forgot:', error);
    return res.status(500).json({ success: false, error: 'Error al solicitar recuperación.' });
  }
});

// 5. Confirmación de restablecimiento de contraseña
authRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    const resetRes = await pool.query(
      'SELECT * FROM password_resets WHERE LOWER(email) = $1 AND token = $2 AND expires_at > NOW()',
      [cleanEmail, token.trim()]
    );

    if (resetRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Código incorrecto o expirado.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) return res.status(400).json({ error: 'La contraseña no cumple los requisitos.' });
    await pool.query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2', [hashPassword(newPassword), cleanEmail]);
    await pool.query('DELETE FROM password_resets WHERE LOWER(email) = $1', [cleanEmail]);

    return res.json({ success: true, message: 'Contraseña actualizada con éxito.' });
  } catch (error) {
    console.error('Error en /api/auth/reset:', error);
    return res.status(500).json({ success: false, error: 'Error al restablecer la contraseña.' });
  }
});

authRouter.get('/me', requireUser, (_req, res) => res.json({ user: publicUser(res.locals.user) }));
authRouter.post('/logout', (_req, res) => { endSession(res); res.json({ success: true }); });
authRouter.get('/events', requireUser, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  let previous = '', busy = false, closed = false;
  const sync = async () => {
    if (busy || closed) return;
    busy = true;
    try {
      const id = sessionId(req);
      const result = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
      const user = result.rows.find(u => u.id === id && u.status === 'active');
      if (!user) { if (!closed) { res.write('event: revoked\ndata: {}\n\n'); res.end(); } clearInterval(timer); return; }
      const snapshot = JSON.stringify({ user: publicUser(user), users: result.rows.map(publicUser) });
      if (!closed && snapshot !== previous) { res.write('data: ' + snapshot + '\n\n'); previous = snapshot; }
      else if (!closed) res.write(': heartbeat\n\n');
    } catch { if (!closed) res.write('event: unavailable\ndata: {}\n\n'); }
    finally { busy = false; }
  };
  const timer = setInterval(sync, 1000);
  void sync();
  req.on('close', () => { closed = true; clearInterval(timer); });
});
