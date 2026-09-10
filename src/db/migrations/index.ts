import type { SQLiteDatabase } from 'expo-sqlite';
import { migration001Initial } from './001_initial';

export interface Migration {
  version: number;
  name: string;
  up(db: SQLiteDatabase): Promise<void>;
}

/** Append new migrations here. Never edit an already-shipped migration. */
export const migrations: readonly Migration[] = [migration001Initial];
