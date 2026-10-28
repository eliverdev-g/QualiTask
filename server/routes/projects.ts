import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireUser, requireAdmin } from '../security';

export const projectsRouter = Router();
projectsRouter.use(requireUser);

// Obtener todos los proyectos con sus tableros
projectsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const projectsRes = await pool.query(`
      SELECT p.status, p.id, p.key, p.name, p.description, p.created_by as "createdBy", p.created_at as "createdAt"
      FROM projects p WHERE p.status = 'active' ORDER BY p.created_at ASC
    `);

    const boardsRes = await pool.query(`
      SELECT id, project_id as "projectId", name, created_at as "createdAt"
      FROM boards ORDER BY created_at ASC
    `);

    const membersRes = await pool.query(`
      SELECT project_id, user_id FROM project_members
    `);

    const projects = projectsRes.rows.map((p) => ({
      ...p,
      boards: boardsRes.rows.filter((b) => b.projectId === p.id),
      members: membersRes.rows.filter((m) => m.project_id === p.id).map((m) => m.user_id),
    }));

    return res.json(projects);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    return res.status(500).json({ error: 'Error al consultar proyectos en PostgreSQL' });
  }
});

// Solo el administrador puede consultar los proyectos inactivos.
projectsRouter.get('/inactive', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, key, name, status FROM projects WHERE status = 'inactive' ORDER BY name ASC");
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'No se pudieron cargar los proyectos.' }); }
});

// Crear nuevo proyecto
projectsRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, key, name, description, boardName } = req.body;
    const createdBy = res.locals.user.id;

    const projectId = id || `proj-${Date.now()}`;
    const cleanKey = key?.trim().toUpperCase();

    // Insertar proyecto
    await pool.query(
      `INSERT INTO projects (id, key, name, description, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [projectId, cleanKey, name.trim(), description || '', createdBy || null]
    );

    // Si viene creador, asociarlo a project_members
    if (createdBy) {
      await pool.query(
        `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [projectId, createdBy]
      );
    }

    // Crear tablero inicial si se solicita
    const boardId = req.body.boardId || `board-${Date.now()}`;
    const initialBoardName = boardName?.trim() || 'Tablero Principal';
    await pool.query(
      `INSERT INTO boards (id, project_id, name) VALUES ($1, $2, $3)`,
      [boardId, projectId, initialBoardName]
    );

    const createdProject = {
      status: 'active',
      id: projectId,
      key: cleanKey,
      name: name.trim(),
      description: description || '',
      createdBy,
      members: createdBy ? [createdBy] : [],
      boards: [
        {
          id: boardId,
          projectId,
          name: initialBoardName,
        },
      ],
    };

    return res.status(201).json(createdProject);
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    return res.status(500).json({ error: 'Error al registrar proyecto en la base de datos' });
  }
});

// Crear tablero adicional dentro de un proyecto
projectsRouter.post('/:id/boards', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { id, name } = req.body;
    const project = await pool.query("SELECT id FROM projects WHERE id = $1 AND status = 'active'", [projectId]);
    if (!project.rows.length) return res.status(409).json({ error: 'El proyecto no está activo.' });

    const boardId = id || `board-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO boards (id, project_id, name) VALUES ($1, $2, $3)
       RETURNING id, project_id as "projectId", name, created_at as "createdAt"`,
      [boardId, projectId, name.trim()]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear tablero:', error);
    return res.status(500).json({ error: 'Error al registrar tablero en PostgreSQL' });
  }
});

// La inactivación conserva el proyecto, los tableros y las tareas.
projectsRouter.put('/:id/status', requireAdmin, async (req, res) => {
  if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ error: 'Estado no válido.' });
  try {
    const result = await pool.query("UPDATE projects SET status = $1 WHERE id = $2 RETURNING id, status", [req.body.status, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'No se pudo actualizar el proyecto.' }); }
});
