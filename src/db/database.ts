import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

export type Database = SQLite.SQLiteDatabase;

const DATABASE_NAME = 'pig-tracker.db';

let dbPromise: Promise<Database> | null = null;

/** Opens the database once, applies pending migrations, and returns the shared connection. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function openDatabase(): Promise<Database> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  return db;
}

export async function runMigrations(db: Database): Promise<void> {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL);',
  );
  const applied = await db.getAllAsync<{ version: number }>('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(applied.map((row) => row.version));
  const pending = [...migrations].sort((a, b) => a.version - b.version).filter((m) => !appliedVersions.has(m.version));
  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
        migration.version,
        migration.name,
        new Date().toISOString(),
      ]);
    });
  }
}
