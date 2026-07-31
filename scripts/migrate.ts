/**
 * Applies db/neon-schema.sql to the configured Postgres database.
 *
 *   npm run db:migrate
 *
 * Exists so setting the project up does not require psql on your machine. The
 * schema is written with IF NOT EXISTS throughout, so running this repeatedly
 * is safe and is the intended way to bring an existing database up to date.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from '@neondatabase/serverless';

/** Minimal .env.local reader, so local runs work without extra tooling. */
function loadLocalEnv(): void {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Real environment variables win over the file.
    if (!process.env[key]) process.env[key] = value;
  }
}

/** Same alias list the app uses, so the two can never disagree. */
function databaseUrl(): string | undefined {
  for (const name of [
    'DATABASE_URL',
    'POSTGRES_URL',
    'NEON_DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
  ]) {
    const value = process.env[name];
    if (value && value.trim()) return value;
  }
  return undefined;
}

/**
 * Splits on semicolons that are not inside a quoted string. The schema is
 * simple DDL, but doing this properly costs three lines and avoids a confusing
 * failure if a default value ever contains a semicolon.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === ';') {
      statements.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  statements.push(current);

  return statements
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((s) => s.length > 0);
}

async function main(): Promise<void> {
  loadLocalEnv();

  const connectionString = databaseUrl();
  if (!connectionString) {
    console.error(
      'No Postgres connection string found. Set DATABASE_URL (or POSTGRES_URL) in .env.local,\n' +
        'or run with:  DATABASE_URL="postgres://..." npm run db:migrate',
    );
    process.exit(1);
  }

  const schemaPath = resolve(process.cwd(), 'db/neon-schema.sql');
  const statements = splitStatements(readFileSync(schemaPath, 'utf8'));

  const host = (() => {
    try {
      return new URL(connectionString).host;
    } catch {
      return 'unknown host';
    }
  })();
  console.log(`Applying ${statements.length} statements to ${host}\n`);

  const pool = new Pool({ connectionString });
  try {
    for (const statement of statements) {
      const label = statement.replace(/\s+/g, ' ').slice(0, 68);
      await pool.query(statement);
      console.log(`  \x1b[32m✓\x1b[0m ${label}…`);
    }
    console.log('\n\x1b[32mSchema applied.\x1b[0m Sign-in should work once an OAuth app is set.\n');
  } catch (error) {
    console.error('\n\x1b[31mMigration failed:\x1b[0m', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
