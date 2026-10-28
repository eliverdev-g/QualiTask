import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, ensureProjectStatus } from './db';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { projectsRouter } from './routes/projects';
import { tasksRouter } from './routes/tasks';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Logging de peticiones para auditoría
app.use((req, _res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Rutas de la API REST
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    system: 'QualiTask',
    timestamp: new Date().toISOString(),
  });
});

// Inicialización del servidor
await ensureProjectStatus();
app.listen(PORT, async () => {
  console.log(`\n🚀 [Backend] Servidor Node.js Express ejecutándose en: http://localhost:${PORT}`);
  console.log(`🔗 [API] Rutas activas en http://localhost:${PORT}/api/`);
  console.log(`🔍 [PostgreSQL] Probando enlace con pgAdmin 4...`);
  await testConnection();
  console.log(`✨ Sistema listo para recibir peticiones del frontend.\n`);
});
