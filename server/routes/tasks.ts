import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireUser, publicUser } from '../security';

export const tasksRouter = Router();
tasksRouter.use(requireUser);
tasksRouter.use(async (req, res, next) => {
  if (req.method === 'GET') return next();
  try {
    const taskId = req.path.split('/')[1];
    const result = taskId
      ? await pool.query('SELECT p.status FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1', [taskId])
      : await pool.query('SELECT p.status FROM boards b JOIN projects p ON p.id = b.project_id WHERE b.id = $1 AND p.id = $2', [req.body.boardId, req.body.projectId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Proyecto o tarea no encontrado.' });
    if (result.rows[0].status !== 'active') return res.status(409).json({ error: 'El proyecto está inactivo.' });
    next();
  } catch { res.status(503).json({ error: 'No se pudo verificar el proyecto.' }); }
});
tasksRouter.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body.currentUser = publicUser(res.locals.user);
  next();
});

// 1. Obtener tareas (opcionalmente filtradas por tablero)
tasksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { boardId } = req.query;

    let query = `
      SELECT t.id, t.project_id as "projectId", t.board_id as "boardId", t.title, t.description,
             t.type, t.priority, t.status, t.assignee_id as "assigneeId", t.reporter_id as "reporterId",
             t.tags, t.start_date as "startDate", t.due_date as "dueDate", t.qa_notes as "qaNotes",
             t.completed_at as "completedAt", t.created_at as "createdAt"
      FROM tasks t JOIN projects p ON p.id = t.project_id AND p.status = 'active'
    `;
    const params: any[] = [];
    if (boardId) {
      query += ' WHERE t.board_id = $1';
      params.push(boardId);
    }
    query += ' ORDER BY t.created_at DESC';

    const tasksRes = await pool.query(query, params);
    const taskIds = tasksRes.rows.map((t) => t.id);

    if (taskIds.length === 0) {
      return res.json([]);
    }

    // Traer subtareas
    const subtasksRes = await pool.query(
      `SELECT id, task_id as "taskId", title, completed, order_index as "order",
              created_at as "createdAt", completed_at as "completedAt"
       FROM subtasks WHERE task_id = ANY($1) ORDER BY order_index ASC`,
      [taskIds]
    );

    // Traer actividades de auditoría inmutable
    const activitiesRes = await pool.query(
      `SELECT id, task_id as "taskId", user_id as "userId", user_name as "userName",
              user_role as "userRole", action, details, previous_value as "previousValue",
              new_value as "newValue", timestamp
       FROM activity_logs WHERE task_id = ANY($1) ORDER BY timestamp DESC`,
      [taskIds]
    );

    // Traer comentarios
    const commentsRes = await pool.query(
      `SELECT id, task_id as "taskId", user_id as "userId", user_name as "userName",
              user_role as "userRole", content, is_qa_observation as "isQaObservation",
              created_at as "createdAt"
       FROM task_comments WHERE task_id = ANY($1) ORDER BY created_at ASC`,
      [taskIds]
    );

    // Traer usuarios asignados/reportadores
    const usersRes = await pool.query(
      `SELECT id, email, full_name as "fullName", role, department, avatar_url as "avatarUrl", status FROM users`
    );
    const usersMap = new Map(usersRes.rows.map((u) => [u.id, u]));

    const fullTasks = tasksRes.rows.map((t) => ({
      ...t,
      assignee: t.assigneeId ? usersMap.get(t.assigneeId) : undefined,
      reporter: t.reporterId ? usersMap.get(t.reporterId) : undefined,
      subtasks: subtasksRes.rows.filter((s) => s.taskId === t.id),
      activities: activitiesRes.rows.filter((a) => a.taskId === t.id),
      comments: commentsRes.rows.filter((c) => c.taskId === t.id),
    }));

    return res.json(fullTasks);
  } catch (error) {
    console.error('Error al listar tareas:', error);
    return res.status(500).json({ error: 'Error al consultar tareas en la base de datos' });
  }
});

// 2. Crear nueva tarea con trazabilidad inicial
tasksRouter.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      id,
      projectId,
      boardId,
      title,
      description,
      type,
      priority,
      status,
      assigneeId,
      reporterId,
      tags,
      startDate,
      dueDate,
      subtasks,
      currentUser,
    } = req.body;

    const taskId = id || `TASK-${Date.now()}`;

    await client.query(
      `INSERT INTO tasks (
        id, project_id, board_id, title, description, type, priority, status,
        assignee_id, reporter_id, tags, start_date, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        taskId,
        projectId,
        boardId,
        title.trim(),
        description || '',
        type || 'task',
        priority || 'media',
        status || 'backlog',
        assigneeId || null,
        reporterId || currentUser?.id || null,
        tags || [],
        startDate || new Date().toISOString().split('T')[0],
        dueDate || new Date().toISOString().split('T')[0],
      ]
    );

    // Insertar subtareas iniciales si existen
    if (Array.isArray(subtasks) && subtasks.length > 0) {
      for (let i = 0; i < subtasks.length; i++) {
        const s = subtasks[i];
        await client.query(
          `INSERT INTO subtasks (id, task_id, title, completed, order_index)
           VALUES ($1, $2, $3, $4, $5)`,
          [s.id || `sub-${Date.now()}-${i}`, taskId, s.title, false, i]
        );
      }
    }

    // Registrar en bitácora inmutable de auditoría (ISO 9001)
    await client.query(
      `INSERT INTO activity_logs (id, task_id, user_id, user_name, user_role, action, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `log-${Date.now()}`,
        taskId,
        currentUser?.id || null,
        currentUser?.fullName || 'Sistema',
        currentUser?.role || 'admin',
        'Tarea creada',
        `Requisito inicial registrado en el backlog con prioridad ${priority || 'media'}.`,
      ]
    );

    await client.query('COMMIT');
    return res.status(201).json({ id: taskId, success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear tarea:', error);
    return res.status(500).json({ error: 'Error al registrar tarea en PostgreSQL' });
  } finally {
    client.release();
  }
});

// 3. Actualizar tarea (estado, asignado, fechas, retrocesos de QA)
tasksRouter.put('/:id', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const {
      status,
      priority,
      assigneeId,
      title,
      description,
      dueDate,
      startDate,
      qaNotes,
      completedAt,
      currentUser,
      rejectionReason,
    } = req.body;

    const currentTaskRes = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (currentTaskRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    const currentTask = currentTaskRes.rows[0];

    // Actualizar tarea
    await client.query(
      `UPDATE tasks SET
        status = COALESCE($1, status),
        priority = COALESCE($2, priority),
        assignee_id = COALESCE($3, assignee_id),
        title = COALESCE($4, title),
        description = COALESCE($5, description),
        due_date = COALESCE($6, due_date),
        start_date = COALESCE($7, start_date),
        qa_notes = COALESCE($8, qa_notes),
        completed_at = COALESCE($9, completed_at),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        status || null,
        priority || null,
        assigneeId !== undefined ? assigneeId : null,
        title || null,
        description !== undefined ? description : null,
        dueDate || null,
        startDate || null,
        qaNotes !== undefined ? qaNotes : null,
        completedAt !== undefined ? completedAt : null,
        id,
      ]
    );

    // Auditoría ISO 9001: Registrar cambio de estado si cambió
    if (status && status !== currentTask.status) {
      let action = 'Cambio de estado';
      let details = `Estado cambiado de "${currentTask.status}" a "${status}".`;

      if (rejectionReason) {
        action = 'Defecto detectado en QA (Retroceso)';
        details = `Retroceso a "En progreso". Motivo técnico: ${rejectionReason}`;

        // Anexar también a comentarios
        await client.query(
          `INSERT INTO task_comments (id, task_id, user_id, user_name, user_role, content, is_qa_observation)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [
            `com-${Date.now()}`,
            id,
            currentUser?.id || null,
            currentUser?.fullName || 'QA / Auditor',
            currentUser?.role || 'collaborator',
            `[OBSERVACIÓN DE CALIDAD - RETROCESO]: ${rejectionReason}`,
          ]
        );
      }

      await client.query(
        `INSERT INTO activity_logs (id, task_id, user_id, user_name, user_role, action, details, previous_value, new_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          `log-${Date.now()}`,
          id,
          currentUser?.id || null,
          currentUser?.fullName || 'Sistema',
          currentUser?.role || 'collaborator',
          action,
          details,
          currentTask.status,
          status,
        ]
      );
    }

    // Auditoría si cambió asignado
    if (assigneeId !== undefined && assigneeId !== currentTask.assignee_id) {
      await client.query(
        `INSERT INTO activity_logs (id, task_id, user_id, user_name, user_role, action, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          `log-asg-${Date.now()}`,
          id,
          currentUser?.id || null,
          currentUser?.fullName || 'Sistema',
          currentUser?.role || 'collaborator',
          'Asignación de responsable',
          `Responsable asignado para iniciar desarrollo.`,
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true, id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar tarea:', error);
    return res.status(500).json({ error: 'Error al actualizar tarea en PostgreSQL' });
  } finally {
    client.release();
  }
});

// 4. Agregar comentario a una tarea
tasksRouter.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id: taskId } = req.params;
    const { content, currentUser, isQaObservation } = req.body;

    const commentId = `com-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO task_comments (id, task_id, user_id, user_name, user_role, content, is_qa_observation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, task_id as "taskId", user_id as "userId", user_name as "userName",
                 user_role as "userRole", content, is_qa_observation as "isQaObservation", created_at as "createdAt"`,
      [
        commentId,
        taskId,
        currentUser?.id || null,
        currentUser?.fullName || 'Usuario',
        currentUser?.role || 'collaborator',
        content.trim(),
        isQaObservation || false,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al insertar comentario:', error);
    return res.status(500).json({ error: 'Error al guardar comentario en la base de datos' });
  }
});

// 5. Agregar subtarea
tasksRouter.post('/:id/subtasks', async (req: Request, res: Response) => {
  try {
    const { id: taskId } = req.params;
    const { title } = req.body;

    const countRes = await pool.query('SELECT COUNT(*) FROM subtasks WHERE task_id = $1', [taskId]);
    const orderIndex = parseInt(countRes.rows[0].count, 10);
    const subtaskId = `sub-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO subtasks (id, task_id, title, completed, order_index)
       VALUES ($1, $2, $3, false, $4)
       RETURNING id, task_id as "taskId", title, completed, order_index as "order", created_at as "createdAt"`,
      [subtaskId, taskId, title.trim(), orderIndex]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear subtarea:', error);
    return res.status(500).json({ error: 'Error al registrar subtarea' });
  }
});

// 6. Alternar estado completado de subtarea
tasksRouter.put('/:id/subtasks/:subtaskId', async (req: Request, res: Response) => {
  try {
    const { subtaskId } = req.params;
    const current = await pool.query('SELECT completed FROM subtasks WHERE id = $1', [subtaskId]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Subtarea no encontrada' });
    }

    const newCompleted = !current.rows[0].completed;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    const result = await pool.query(
      `UPDATE subtasks SET completed = $1, completed_at = $2 WHERE id = $3
       RETURNING id, task_id as "taskId", title, completed, order_index as "order", completed_at as "completedAt"`,
      [newCompleted, completedAt, subtaskId]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar subtarea:', error);
    return res.status(500).json({ error: 'Error al actualizar subtarea en PostgreSQL' });
  }
});

// 7. Eliminar tarea
tasksRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Tarea eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    return res.status(500).json({ error: 'Error al eliminar tarea en la base de datos' });
  }
});
