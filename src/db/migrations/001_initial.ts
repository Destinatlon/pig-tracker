import type { Migration } from './index';

const DEFAULT_CATEGORIES = ['Dairy', 'Meat', 'Fish', 'Grains', 'Vegetables', 'Fruit', 'Drinks', 'Snacks', 'Other'];

export const UNCATEGORIZED_NAME = 'Uncategorized';

export const migration001Initial: Migration = {
  version: 1,
  name: 'initial',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_products_category ON products(category_id);
      CREATE INDEX idx_products_name ON products(name COLLATE NOCASE);

      CREATE TABLE product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT '',
        is_default INTEGER NOT NULL DEFAULT 0,
        calories_per_100g REAL NOT NULL CHECK (calories_per_100g >= 0),
        protein_per_100g REAL CHECK (protein_per_100g IS NULL OR protein_per_100g >= 0),
        carbs_per_100g REAL CHECK (carbs_per_100g IS NULL OR carbs_per_100g >= 0),
        fat_per_100g REAL CHECK (fat_per_100g IS NULL OR fat_per_100g >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_variants_product ON product_variants(product_id);

      -- Historical snapshots. Library references may become NULL; the snapshot columns always remain.
      CREATE TABLE day_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        variant_name TEXT,
        weight_grams REAL NOT NULL CHECK (weight_grams > 0),
        calories_per_100g REAL NOT NULL CHECK (calories_per_100g >= 0),
        protein_per_100g REAL CHECK (protein_per_100g IS NULL OR protein_per_100g >= 0),
        carbs_per_100g REAL CHECK (carbs_per_100g IS NULL OR carbs_per_100g >= 0),
        fat_per_100g REAL CHECK (fat_per_100g IS NULL OR fat_per_100g >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_day_entries_date ON day_entries(date, sort_order);
      CREATE INDEX idx_day_entries_variant ON day_entries(variant_id, created_at);

      CREATE TABLE goal_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calories REAL NOT NULL CHECK (calories >= 0),
        protein REAL CHECK (protein IS NULL OR protein >= 0),
        carbs REAL CHECK (carbs IS NULL OR carbs >= 0),
        fat REAL CHECK (fat IS NULL OR fat >= 0),
        effective_from TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);

    const now = new Date().toISOString();
    let sortOrder = 0;
    for (const name of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (name, sort_order, is_system, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
        [name, sortOrder++, now, now],
      );
    }
    await db.runAsync(
      'INSERT INTO categories (name, sort_order, is_system, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
      [UNCATEGORIZED_NAME, sortOrder, now, now],
    );

    // A baseline goal so every date, including dates before the user first edits goals, has a target.
    await db.runAsync(
      'INSERT INTO goal_settings (calories, protein, carbs, fat, effective_from, created_at) VALUES (?, NULL, NULL, NULL, ?, ?)',
      [2000, '1970-01-01', now],
    );
  },
};
