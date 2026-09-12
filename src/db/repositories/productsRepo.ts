import { nowIso } from '../../domain/dates';
import { LibraryItem, NutritionPer100g } from '../../domain/models';
import { filterBySearch } from '../../domain/search';
import { getDb } from '../database';
import { LibraryItemRow, mapLibraryItem } from './rowMappers';

const LIBRARY_SELECT = `
  SELECT v.id AS variant_id, v.name AS variant_name, v.is_default,
         p.id AS product_id, p.name AS product_name,
         c.id AS category_id, c.name AS category_name,
         v.calories_per_100g, v.protein_per_100g, v.carbs_per_100g, v.fat_per_100g
  FROM product_variants v
  JOIN products p ON p.id = v.product_id
  JOIN categories c ON c.id = p.category_id
`;

const LIBRARY_ORDER = 'ORDER BY p.name COLLATE NOCASE ASC, v.is_default DESC, v.name COLLATE NOCASE ASC';

export interface LibraryFilter {
  search?: string;
  categoryId?: number | null;
}

/**
 * Flat list of every variant (default variants included) matching the optional search/category
 * filter. The category narrows the query; the text is matched in `src/domain/search`, which
 * handles word order and non-ASCII case as SQLite's LIKE cannot.
 */
export async function listLibrary(filter: LibraryFilter = {}): Promise<LibraryItem[]> {
  const db = await getDb();
  const where = filter.categoryId != null ? 'WHERE p.category_id = ?' : '';
  const params = filter.categoryId != null ? [filter.categoryId] : [];
  const rows = await db.getAllAsync<LibraryItemRow>(`${LIBRARY_SELECT} ${where} ${LIBRARY_ORDER}`, params);
  const items = rows.map(mapLibraryItem);
  return filterBySearch(items, filter.search ?? '', (item) => [item.productName, item.variantName]);
}

export async function getLibraryItemByVariantId(variantId: number): Promise<LibraryItem | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LibraryItemRow>(`${LIBRARY_SELECT} WHERE v.id = ?`, [variantId]);
  return row ? mapLibraryItem(row) : null;
}

export async function listVariantsForProduct(productId: number): Promise<LibraryItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LibraryItemRow>(`${LIBRARY_SELECT} WHERE p.id = ? ${LIBRARY_ORDER}`, [productId]);
  return rows.map(mapLibraryItem);
}

/** Products whose name resembles the typed name; used for the subtle suggestion on the Manual tab. */
export async function findLibraryItemsByName(name: string, limit = 3): Promise<LibraryItem[]> {
  if (name.trim().length < 2) return [];
  const matches = await listLibrary({ search: name });
  return matches.slice(0, limit);
}

/** Recently used library items, derived from day entries that still reference an existing variant. */
export async function listRecentlyUsed(limit = 10): Promise<LibraryItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LibraryItemRow>(
    `${LIBRARY_SELECT}
     JOIN (
       SELECT variant_id, MAX(created_at) AS last_used
       FROM day_entries
       WHERE variant_id IS NOT NULL
       GROUP BY variant_id
     ) recent ON recent.variant_id = v.id
     ORDER BY recent.last_used DESC
     LIMIT ?`,
    [limit],
  );
  return rows.map(mapLibraryItem);
}

export interface CreateProductInput extends NutritionPer100g {
  name: string;
  categoryId: number;
}

/** Creates the product together with its hidden default variant in one transaction. */
export async function createProduct(input: CreateProductInput): Promise<{ productId: number; variantId: number }> {
  const db = await getDb();
  const now = nowIso();
  let productId = 0;
  let variantId = 0;
  await db.withTransactionAsync(async () => {
    const product = await db.runAsync(
      'INSERT INTO products (category_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [input.categoryId, input.name, now, now],
    );
    productId = product.lastInsertRowId;
    const variant = await db.runAsync(
      `INSERT INTO product_variants (product_id, name, is_default, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at, updated_at)
       VALUES (?, '', 1, ?, ?, ?, ?, ?, ?)`,
      [productId, input.caloriesPer100g, input.proteinPer100g, input.carbsPer100g, input.fatPer100g, now, now],
    );
    variantId = variant.lastInsertRowId;
  });
  return { productId, variantId };
}

export async function updateProduct(productId: number, input: { name: string; categoryId: number }): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE products SET name = ?, category_id = ?, updated_at = ? WHERE id = ?', [
    input.name,
    input.categoryId,
    nowIso(),
    productId,
  ]);
}

export async function addVariant(productId: number, name: string, nutrition: NutritionPer100g): Promise<number> {
  const db = await getDb();
  const now = nowIso();
  const result = await db.runAsync(
    `INSERT INTO product_variants (product_id, name, is_default, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at, updated_at)
     VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    [productId, name, nutrition.caloriesPer100g, nutrition.proteinPer100g, nutrition.carbsPer100g, nutrition.fatPer100g, now, now],
  );
  return result.lastInsertRowId;
}

export async function updateVariant(variantId: number, input: { name?: string } & NutritionPer100g): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  if (input.name !== undefined) {
    await db.runAsync(
      `UPDATE product_variants SET name = ?, calories_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, updated_at = ?
       WHERE id = ? AND is_default = 0`,
      [input.name, input.caloriesPer100g, input.proteinPer100g, input.carbsPer100g, input.fatPer100g, now, variantId],
    );
  }
  await db.runAsync(
    `UPDATE product_variants SET calories_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, updated_at = ?
     WHERE id = ?`,
    [input.caloriesPer100g, input.proteinPer100g, input.carbsPer100g, input.fatPer100g, now, variantId],
  );
}

/** Deletes the product and all its variants. Day entries keep their snapshots (references become NULL). */
export async function deleteProduct(productId: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE day_entries SET product_id = NULL, variant_id = NULL WHERE product_id = ?', [productId]);
    await db.runAsync('DELETE FROM product_variants WHERE product_id = ?', [productId]);
    await db.runAsync('DELETE FROM products WHERE id = ?', [productId]);
  });
}

/** Deletes a named variant only. Day entries keep their snapshots. */
export async function deleteVariant(variantId: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE day_entries SET variant_id = NULL WHERE variant_id = ?', [variantId]);
    await db.runAsync('DELETE FROM product_variants WHERE id = ? AND is_default = 0', [variantId]);
  });
}

/** Saves product name/category and one variant's values atomically (product edit sheet). */
export async function updateProductAndVariant(input: {
  productId: number;
  name: string;
  categoryId: number;
  variantId: number;
  variantName?: string;
  nutrition: NutritionPer100g;
}): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await updateProduct(input.productId, { name: input.name, categoryId: input.categoryId });
    await updateVariant(input.variantId, { name: input.variantName, ...input.nutrition });
  });
}
