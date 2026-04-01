import 'dotenv/config';
import { pool } from './src/db';

async function dropAll() {
  console.log('Dropping public schema to reset database...');
  try {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    // Restore extensions just in case they were installed in public schema
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Database reset successfully. Ready for fresh migration.');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting database:', err);
    process.exit(1);
  }
}

dropAll();
