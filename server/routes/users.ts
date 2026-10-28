import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireUser, requireAdmin } from '../security';

export const usersRouter = Router();
usersRouter.use(requireUser);

// Listar todos los usuarios
usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name as "fullName", role, department, avatar_url as "avatarUrl", status, created_at as "createdAt"
       FROM users ORDER BY created_at ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ error: 'Error al consultar usuarios en PostgreSQL' });
  }
});

// Actualizar rol de usuario (RBAC)
usersRouter.put('/:id/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === res.locals.user.id) return res.status(400).json({ error: 'No puede modificar su propio rol o estado.' });
    const { role } = req.body;

    if (!['admin', 'collaborator'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name as "fullName", role, department, status`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al cambiar rol:', error);
    return res.status(500).json({ error: 'Error al actualizar rol en la base de datos' });
  }
});

// Cambiar estado activo / inactivo
usersRouter.put('/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === res.locals.user.id) return res.status(400).json({ error: 'No puede modificar su propio rol o estado.' });
    const current = await pool.query('SELECT status FROM users WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const newStatus = current.rows[0].status === 'active' ? 'inactive' : 'active';
    const result = await pool.query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, full_name as "fullName", role, status',
      [newStatus, id]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    return res.status(500).json({ error: 'Error al actualizar estado en la base de datos' });
  }
});
