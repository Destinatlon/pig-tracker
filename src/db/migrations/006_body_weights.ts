import type { Migration } from './index';

/**
 * Body weight gets its own dated table rather than being folded into the estimation profile:
 * the profile is configuration for generating suggestions, this is history. One measurement per
 * date, so re-weighing on the same day corrects that day instead of adding a second point.
 */
export const migration006BodyWeights: Migration = {
  version: 6,
  name: 'body_weights',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE body_weights (
        date TEXT PRIMARY KEY NOT NULL,
        weight_kg REAL NOT NULL CHECK (weight_kg > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  },
};
