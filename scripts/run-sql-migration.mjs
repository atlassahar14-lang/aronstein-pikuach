#!/usr/bin/env node
/**
 * Run a SQL migration file against Supabase Postgres.
 * Requires one of: DATABASE_URL, SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD (+ optional SUPABASE_PROJECT_REF).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node scripts/run-sql-migration.mjs <file.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(sqlFile), 'utf8');
const ref = process.env.SUPABASE_PROJECT_REF || 'knbbbrnwzbkywkrcponi';
let connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_DATABASE_URL;

if (!connectionString && process.env.SUPABASE_DB_PASSWORD) {
  const host = process.env.SUPABASE_DB_HOST || `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT || '5432';
  connectionString = `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@${host}:${port}/postgres`;
}

if (!connectionString) {
  console.error('Missing DATABASE_URL / SUPABASE_DB_URL / SUPABASE_DB_PASSWORD');
  process.exit(2);
}

let pg;
try {
  pg = await import('pg');
} catch {
  console.error('Install pg: npm install pg');
  process.exit(3);
}

const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log('Migration OK:', path.basename(sqlFile));
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
