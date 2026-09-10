import { nowIso } from '../../domain/dates';
import { Category } from '../../domain/models';
import { getDb } from '../database';
import { CategoryRow, mapCategory } from './rowMappers';

const ORDER = 'ORDER BY is_system ASC, sort_order ASC, id ASC';

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>(`SELECT * FROM categories ${ORDER}`);
  return rows.map(mapCategory);
}

export async function getUncategorizedCategoryId(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM categories WHERE is_system = 1 ORDER BY id LIMIT 1');
  if (!row) throw new Error('Uncategorized category is missing');
  return row.id;
}

export async function createCategory(name: string): Promise<Category> {
  const db = await getDb();
  const now = nowIso();
  const max = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM categories WHERE is_system = 0',
  );
  const sortOrder = (max?.max_order ?? -1) + 1;
  const result = await db.runAsync(
    'INSERT INTO categories (name, sort_order, is_system, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
    [name, sortOrder, now, now],
  );
  return { id: result.lastInsertRowId, name, sortOrder, isSystem: false, createdAt: now, updatedAt: now };
}

export async function renameCategory(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET name = ?, updated_at = ? WHERE id = ? AND is_system = 0', [name, nowIso(), id]);
}

/** Moves the category's products to the target category (Uncategorized by default), then deletes it. */
export async function deleteCategory(id: number, moveProductsToCategoryId?: number): Promise<void> {
  const db = await getDb();
  const targetId = moveProductsToCategoryId ?? (await getUncategorizedCategoryId());
  if (targetId === id) throw new Error('Cannot move products into the category being deleted');
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE products SET category_id = ?, updated_at = ? WHERE category_id = ?', [targetId, nowIso(), id]);
    await db.runAsync('DELETE FROM categories WHERE id = ? AND is_system = 0', [id]);
  });
}

/** Swaps sort order with the neighbouring user category. The system category never moves. */
export async function moveCategory(id: number, direction: 'up' | 'down'): Promise<void> {
  const db = await getDb();
  const ordered = (await listCategories()).filter((c) => !c.isSystem);
  const index = ordered.findIndex((c) => c.id === id);
  if (index === -1) return;
  const neighbourIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighbourIndex < 0 || neighbourIndex >= ordered.length) return;
  const reordered = [...ordered];
  [reordered[index], reordered[neighbourIndex]] = [reordered[neighbourIndex], reordered[index]];
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].sortOrder !== i) {
        await db.runAsync('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?', [i, now, reordered[i].id]);
      }
    }
  });
}
