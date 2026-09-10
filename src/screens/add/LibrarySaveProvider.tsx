import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { CategoryPicker } from '../../components/CategoryPicker';
import { Per100gFields } from '../../components/NutritionDraftFields';
import { useSnackbar } from '../../components/Snackbar';
import { TextField } from '../../components/TextField';
import { getUncategorizedCategoryId, listCategories } from '../../db/repositories/categoriesRepo';
import { linkEntryToLibrary } from '../../db/repositories/dayEntriesRepo';
import { addVariant, createProduct } from '../../db/repositories/productsRepo';
import { Category, DayEntry, LibraryItem } from '../../domain/models';
import { DraftErrors, parsePer100gTexts, Per100gTexts, per100gTextsFrom } from '../../domain/nutrition/draft';
import { parseRequiredName } from '../../domain/numeric';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface LibrarySaveApi {
  /** Offer to turn a manual day entry into a new product with a default variant. */
  openSaveAsProduct: (entry: DayEntry) => void;
  /** Offer to store an overridden saved-product entry as a new variant of that product. */
  openSaveAsVariant: (entry: DayEntry, source: LibraryItem) => void;
}

const LibrarySaveContext = createContext<LibrarySaveApi | null>(null);

type Request = { kind: 'product'; entry: DayEntry } | { kind: 'variant'; entry: DayEntry; source: LibraryItem };

/** Hosts the "save for future use" sheets so they can be opened from any screen's snackbar. */
export function LibrarySaveProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const api = useMemo<LibrarySaveApi>(
    () => ({
      openSaveAsProduct: (entry) => setRequest({ kind: 'product', entry }),
      openSaveAsVariant: (entry, source) => setRequest({ kind: 'variant', entry, source }),
    }),
    [],
  );
  return (
    <LibrarySaveContext.Provider value={api}>
      {children}
      {request?.kind === 'product' ? <SaveAsProductSheet key={request.entry.id} entry={request.entry} onClose={() => setRequest(null)} /> : null}
      {request?.kind === 'variant' ? (
        <SaveAsVariantSheet key={request.entry.id} entry={request.entry} source={request.source} onClose={() => setRequest(null)} />
      ) : null}
    </LibrarySaveContext.Provider>
  );
}

export function useLibrarySave(): LibrarySaveApi {
  const api = useContext(LibrarySaveContext);
  if (!api) throw new Error('useLibrarySave must be used inside LibrarySaveProvider');
  return api;
}

function SaveAsProductSheet({ entry, onClose }: { entry: DayEntry; onClose: () => void }) {
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const [name, setName] = useState(entry.productName);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [texts, setTexts] = useState<Per100gTexts>(() => per100gTextsFrom(entry));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listCategories(), getUncategorizedCategoryId()])
      .then(([cats, uncategorized]) => {
        setCategories(cats);
        setCategoryId((current) => current ?? uncategorized);
      })
      .catch((error) => console.error('Failed to load categories', error));
  }, []);

  const save = async () => {
    if (saving) return;
    const parsedName = parseRequiredName(name, 'Product name');
    const parsed = parsePer100gTexts(texts);
    if (!parsedName.ok || !parsed.ok || categoryId === null) {
      setErrors({ ...(parsed.ok ? {} : parsed.errors), ...(parsedName.ok ? {} : { name: parsedName.error }) });
      return;
    }
    setSaving(true);
    try {
      const created = await createProduct({ name: parsedName.value, categoryId, ...parsed.value });
      await linkEntryToLibrary(entry.id, created.productId, created.variantId);
      onClose();
      snackbar.show({ message: `Saved ${parsedName.value} to products` });
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save product', String(error));
    }
  };

  return (
    <BottomSheet
      visible
      onRequestClose={onClose}
      title="Save as product"
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.footerButton} />
          <Button title="Save" onPress={save} loading={saving} style={styles.footerButton} />
        </>
      }
    >
      <Text style={[styles.hint, { color: colors.textSecondary }]}>Values below were calculated per 100 g from what you logged. Adjust them if needed.</Text>
      <TextField label="Product name" required value={name} onChangeText={setName} error={errors.name} autoCapitalize="sentences" />
      <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
      <Per100gFields texts={texts} onChange={setTexts} errors={errors} />
    </BottomSheet>
  );
}

function SaveAsVariantSheet({ entry, source, onClose }: { entry: DayEntry; source: LibraryItem; onClose: () => void }) {
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const [variantName, setVariantName] = useState('');
  const [texts, setTexts] = useState<Per100gTexts>(() => per100gTextsFrom(entry));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const parsedName = parseRequiredName(variantName, 'Variant name');
    const parsed = parsePer100gTexts(texts);
    if (!parsedName.ok || !parsed.ok) {
      setErrors({ ...(parsed.ok ? {} : parsed.errors), ...(parsedName.ok ? {} : { name: parsedName.error }) });
      return;
    }
    setSaving(true);
    try {
      const variantId = await addVariant(source.productId, parsedName.value, parsed.value);
      await linkEntryToLibrary(entry.id, source.productId, variantId);
      onClose();
      snackbar.show({ message: `Saved variant ${source.productName} — ${parsedName.value}` });
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save variant', String(error));
    }
  };

  return (
    <BottomSheet
      visible
      onRequestClose={onClose}
      title="Save as new variant"
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.footerButton} />
          <Button title="Save" onPress={save} loading={saving} style={styles.footerButton} />
        </>
      }
    >
      <Text style={[styles.product, { color: colors.textPrimary }]}>{source.productName}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>Per-100 g values were calculated from the amount you logged. You can correct them before saving.</Text>
      <TextField label="Variant name" required value={variantName} onChangeText={setVariantName} error={errors.name} autoFocus autoCapitalize="sentences" />
      <Per100gFields texts={texts} onChange={setTexts} errors={errors} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.secondary, marginBottom: spacing.md },
  product: { ...typography.bodyStrong, marginBottom: spacing.xs },
  footerButton: { flex: 1 },
});
