import fs from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

/** Load server/.env when cwd is repo root or server/ */
function loadServerEnv() {
  const cwd = process.cwd()
  loadEnv({ path: path.join(cwd, '.env') })
  loadEnv({ path: path.join(cwd, '.env.local') })
  if (!process.env.DATABASE_URL?.trim()) {
    loadEnv({ path: path.join(cwd, 'server', '.env') })
    loadEnv({ path: path.join(cwd, 'server', '.env.local') })
  }
}

function resolveMigrationsFolder(): string {
  const cwd = process.cwd()
  const direct = path.join(cwd, 'drizzle')
  if (fs.existsSync(path.join(direct, 'meta', '_journal.json'))) {
    return direct
  }
  const nested = path.join(cwd, 'server', 'drizzle')
  if (fs.existsSync(path.join(nested, 'meta', '_journal.json'))) {
    return nested
  }
  return direct
}

async function main() {
  loadServerEnv()

  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    console.error('')
    console.error('[db:migrate] DATABASE_URL is missing.')
    console.error('')
    console.error('Fix: create a file server/.env (or .env.local) with:')
    console.error('  DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/YOUR_DB')
    console.error('')
    console.error('Then run from the server folder:')
    console.error('  cd server')
    console.error('  npm run db:migrate')
    console.error('')
    process.exit(1)
  }

  const isLocal = /localhost|127\.0\.0\.1/i.test(url)
  const pool = new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  })

  const migrationsFolder = resolveMigrationsFolder()
  console.log('[db:migrate] Folder:', migrationsFolder)
  console.log('[db:migrate] Applying migrations…')

  const db = drizzle(pool)
  await migrate(db, { migrationsFolder })

  await pool.end()
  console.log('[db:migrate] Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[db:migrate] Failed:', err)
  process.exit(1)
})
