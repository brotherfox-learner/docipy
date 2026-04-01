import 'dotenv/config';
import { pool } from './src/db';

async function checkExtensions() {
  console.log('Checking installed extensions on AWS RDS...');
  try {
    const res = await pool.query(`SELECT extname FROM pg_extension;`);
    console.log('Installed extensions:', res.rows.map(r => r.extname).join(', '));
    process.exit(0);
  } catch (err) {
    console.error('Error querying extensions:', err);
    process.exit(1);
  }
}

checkExtensions();
