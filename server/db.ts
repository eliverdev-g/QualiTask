import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de conexión a PostgreSQL
// Puede definirse mediante DATABASE_URL o mediante variables individuales
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'qualitask_db',
  port: parseInt(process.env.PGPORT || '5432', 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Prueba de conexión inicial al arrancar el servidor
pool.on('connect', () => {
  console.log('📦 [PostgreSQL] Cliente conectado exitosamente a la base de datos.');
});

pool.on('error', (err) => {
  console.error('❌ [PostgreSQL] Error inesperado en el pool de conexiones:', err);
});

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ [PostgreSQL] Conexión verificada a las:', res.rows[0].now);
    return true;
  } catch (error) {
    console.error('⚠️ [PostgreSQL] No se pudo conectar a la base de datos. Verifique sus credenciales en .env:', (error as Error).message);
    return false;
  }
}

export async function ensureProjectStatus() {
  await pool.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))");
}
