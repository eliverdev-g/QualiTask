-- ==============================================================================
-- SISTEMA DE GESTIÓN DE TAREAS Y CALIDAD DE SOFTWARE (QUALITASK / JIRA STYLE)
-- UNIVERSIDAD MARIANO GÁLVEZ DE GUATEMALA
-- ESQUEMA DDL COMPLETO PARA PGADMIN 4 / POSTGRESQL (ISO 9001 / ISO 27001)
-- ==============================================================================

-- 1. EXTENSIONES RECOMENDADAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE USUARIOS (AUTENTICACIÓN, GOOGLE AUTH Y ROLES RBAC)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'collaborator' CHECK (role IN ('admin', 'collaborator')),
    department VARCHAR(100) NOT NULL DEFAULT 'Ingeniería de Software / QA',
    avatar_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    password_hash TEXT,
    google_sub VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE RECUPERACIÓN DE CONTRASEÑA (TOKENS OTP - 15 MIN DE VALIDEZ)
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    token VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE PROYECTOS / ESPACIOS DE TRABAJO
CREATE TABLE IF NOT EXISTS projects (
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    id VARCHAR(50) PRIMARY KEY,
    key VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE MIEMBROS DE PROYECTO (RELACIÓN M:N)
CREATE TABLE IF NOT EXISTS project_members (
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id)
);

-- 6. TABLA DE TABLEROS KANBAN
CREATE TABLE IF NOT EXISTS boards (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE TAREAS (CICLO DE VIDA, FECHAS Y CRITERIOS DE QA)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    board_id VARCHAR(50) NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'task' CHECK (type IN ('task', 'bug', 'story')),
    priority VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'critica')),
    status VARCHAR(20) NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'in_qa', 'completed')),
    assignee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    reporter_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    qa_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE SUBTAREAS (CHECKLIST Y CONTROL DE AVANCE)
CREATE TABLE IF NOT EXISTS subtasks (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 9. TABLA DE AUDITORÍA Y TRAZABILIDAD INMUTABLE (ISO 9001 - CLÁUSULA 9.1.3)
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA DE COMENTARIOS Y OBSERVACIONES TÉCNICAS DE DEFECTOS DE QA
CREATE TABLE IF NOT EXISTS task_comments (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    is_qa_observation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. ÍNDICES DE RENDIMIENTO Y ACCESO RÁPIDO
CREATE INDEX IF NOT EXISTS idx_tasks_board_status ON tasks(board_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_order ON subtasks(task_id, order_index);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task ON activity_logs(task_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);

-- 12. ADMINISTRADOR INICIAL
-- Ejecutar en pgAdmin sobre la base de datos del aplicativo.
-- Acceso: admin@qualitask.com / Admin123$
-- La contraseña se almacena como hash scrypt compatible con el backend.
INSERT INTO users (id, email, full_name, password_hash, role, department, status)
VALUES ('usr-admin-initial', 'admin@qualitask.com', 'Administrador del Sistema',
  'scrypt:8f9d4c43d0db3aa2dcf76de51b99dccb:f9cc1e1bc7c6f213c7d773a6d55dd5af20e848e083148bc6033fbdf45e524dcb19f43fc4f51ddadccb1f570a4b0092162654955f9e98401adcd3177ced3c5eb1',
  'admin', 'Aseguramiento de Calidad y TI', 'active')
ON CONFLICT (email) DO NOTHING;
