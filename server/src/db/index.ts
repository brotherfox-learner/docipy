import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,                // max connections ใน pool
  idleTimeoutMillis: 30000,
});

// Test connection ตอน startup
pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL')
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err);
  process.exit(1);
});

export const db = drizzle(pool, { schema });
