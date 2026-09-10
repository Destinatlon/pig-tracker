import { nowIso } from '../../domain/dates';
import { DateKey, DayEntry, NewDayEntry, NutritionPer100g } from '../../domain/models';
import { getDb, Database } from '../database';
import { DayEntryRow, mapDayEntry } from './rowMappers';

const INSERT_SQL = `
  INSERT INTO day_entries (date, sort_order, product_id, variant_id, product_name, variant_name, weight_grams,
    calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

async function nextSortOrder(db: Database, date: DateKey): Promise<number> {
  const row = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM day_entries WHERE date = ?',
    [date],
  );
  return (row?.max_order ?? -1) + 1;
}

async function insertRow(db: Database, entry: NewDayEntry, sortOrder: number, now: string): Promise<number> {
  const result = await db.runAsync(INSERT_SQL, [
    entry.date,
    sortOrder,
    entry.productId,
    entry.variantId,
    entry.productName,
    entry.variantName,
    entry.weightGrams,
    entry.caloriesPer100g,
    entry.proteinPer100g,
    entry.carbsPer100g,
    entry.fatPer100g,
    now,
    now,
  ]);
  return result.lastInsertRowId;
}

export async function listEntriesForDate(date: DateKey): Promise<DayEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DayEntryRow>(
    'SELECT * FROM day_entries WHERE date = ? ORDER BY sort_order ASC, id ASC',
    [date],
  );
  return rows.map(mapDayEntry);
}

export async function getEntry(id: number): Promise<DayEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DayEntryRow>('SELECT * FROM day_entries WHERE id = ?', [id]);
  return row ? mapDayEntry(row) : null;
}

export async function insertEntry(entry: NewDayEntry): Promise<DayEntry> {
  const db = await getDb();
  const now = nowIso();
  const sortOrder = await nextSortOrder(db, entry.date);
  const id = await insertRow(db, entry, sortOrder, now);
  return { ...entry, id, sortOrder, createdAt: now, updatedAt: now };
}

/** Re-inserts a previously deleted entry with its original id and position (used by Undo). */
export async function restoreEntry(entry: DayEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO day_entries (id, date, sort_order, product_id, variant_id, product_name, variant_name, weight_grams,
       calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.date,
      entry.sortOrder,
      entry.productId,
      entry.variantId,
      entry.productName,
      entry.variantName,
      entry.weightGrams,
      entry.caloriesPer100g,
      entry.proteinPer100g,
      entry.carbsPer100g,
      entry.fatPer100g,
      entry.createdAt,
      nowIso(),
    ],
  );
}

export interface DayEntryPatch extends NutritionPer100g {
  productName: string;
  variantName: string | null;
  weightGrams: number;
}

/** Updates the snapshot fields of an entry. Library references are left untouched. */
export async function updateEntry(id: number, patch: DayEntryPatch): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE day_entries SET product_name = ?, variant_name = ?, weight_grams = ?, calories_per_100g = ?,
       protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, updated_at = ?
     WHERE id = ?`,
    [
      patch.productName,
      patch.variantName,
      patch.weightGrams,
      patch.caloriesPer100g,
      patch.proteinPer100g,
      patch.carbsPer100g,
      patch.fatPer100g,
      nowIso(),
      id,
    ],
  );
}

export async function linkEntryToLibrary(id: number, productId: number, variantId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE day_entries SET product_id = ?, variant_id = ?, updated_at = ? WHERE id = ?', [
    productId,
    variantId,
    nowIso(),
    id,
  ]);
}

export async function deleteEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM day_entries WHERE id = ?', [id]);
}

function snapshotOf(entry: DayEntry, date: DateKey): NewDayEntry {
  return {
    date,
    productId: entry.productId,
    variantId: entry.variantId,
    productName: entry.productName,
    variantName: entry.variantName,
    weightGrams: entry.weightGrams,
    caloriesPer100g: entry.caloriesPer100g,
    proteinPer100g: entry.proteinPer100g,
    carbsPer100g: entry.carbsPer100g,
    fatPer100g: entry.fatPer100g,
  };
}

/** Copies the entry's snapshot to another date. Nothing is re-read from the library. */
export async function copyEntryToDate(entry: DayEntry, targetDate: DateKey): Promise<DayEntry> {
  return insertEntry(snapshotOf(entry, targetDate));
}

export type CopyDayMode = 'add' | 'replace';

/** Copies every entry of one date to another. Returns the number of copied entries. */
export async function copyDay(sourceDate: DateKey, targetDate: DateKey, mode: CopyDayMode = 'add'): Promise<number> {
  if (sourceDate === targetDate) return 0;
  const db = await getDb();
  const source = await listEntriesForDate(sourceDate);
  if (source.length === 0 && mode === 'add') return 0;
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      await db.runAsync('DELETE FROM day_entries WHERE date = ?', [targetDate]);
    }
    let sortOrder = await nextSortOrder(db, targetDate);
    for (const entry of source) {
      await insertRow(db, snapshotOf(entry, targetDate), sortOrder++, now);
    }
  });
  return source.length;
}

export async function clearDay(date: DateKey): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM day_entries WHERE date = ?', [date]);
}

/** Persists a new order for the date. Ids not listed keep their existing order after the listed ones. */
export async function reorderEntries(date: DateKey, orderedIds: readonly number[]): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE day_entries SET sort_order = ?, updated_at = ? WHERE id = ? AND date = ?', [
        i,
        now,
        orderedIds[i],
        date,
      ]);
    }
  });
}

export interface BulkDayChanges {
  /** Existing entries, in their final display order, with their (possibly edited) snapshot. */
  updates: { id: number; patch: DayEntryPatch }[];
  /** New entries appended after the existing ones, in order. */
  inserts: NewDayEntry[];
  deletes: number[];
}

/** Commits a whole bulk-edit draft atomically. */
export async function applyBulkDayChanges(date: DateKey, changes: BulkDayChanges): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    for (const id of changes.deletes) {
      await db.runAsync('DELETE FROM day_entries WHERE id = ? AND date = ?', [id, date]);
    }
    let sortOrder = 0;
    for (const { id, patch } of changes.updates) {
      await db.runAsync(
        `UPDATE day_entries SET sort_order = ?, product_name = ?, variant_name = ?, weight_grams = ?, calories_per_100g = ?,
           protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, updated_at = ?
         WHERE id = ? AND date = ?`,
        [
          sortOrder++,
          patch.productName,
          patch.variantName,
          patch.weightGrams,
          patch.caloriesPer100g,
          patch.proteinPer100g,
          patch.carbsPer100g,
          patch.fatPer100g,
          now,
          id,
          date,
        ],
      );
    }
    for (const entry of changes.inserts) {
      await insertRow(db, { ...entry, date }, sortOrder++, now);
    }
  });
}
