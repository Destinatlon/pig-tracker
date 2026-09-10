import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { CategoryPicker } from '../../components/CategoryPicker';
import { IconButton } from '../../components/IconButton';
import { MenuItem, MenuSheet } from '../../components/MenuSheet';
import { Per100gFields } from '../../components/NutritionDraftFields';
import { TextField } from '../../components/TextField';
import { deleteProduct, deleteVariant, updateProductAndVariant } from '../../db/repositories/productsRepo';
import { Category, LibraryItem } from '../../domain/models';
import { DraftErrors, parsePer100gTexts, Per100gTexts, per100gTextsFrom } from '../../domain/nutrition/draft';
import { FieldErrorCode, parseRequiredName } from '../../domain/numeric';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  item: LibraryItem;
  categories: Category[];
  onClose: () => void;
  onChanged: () => void;
  onAddVariant: (item: LibraryItem) => void;
}

/** Edits a product (via its default variant) or a named variant. Explicit Save only. */
export function ProductEditSheet({ item, categories, onClose, onChanged, onAddVariant }: Props) {
  const { colors } = useTheme();
  const { t, fieldError } = useI18n();
  const [productName, setProductName] = useState(item.productName);
  const [variantName, setVariantName] = useState(item.variantName);
  const [categoryId, setCategoryId] = useState<number>(item.categoryId);
  const [texts, setTexts] = useState<Per100gTexts>(() => per100gTextsFrom(item));
  const [errors, setErrors] = useState<DraftErrors & { variantName?: FieldErrorCode }>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const touch = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setDirty(true);
    setErrors({});
  };

  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert(t('common.discardChangesTitle'), undefined, [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: onClose },
    ]);
  };

  const save = async () => {
    if (saving) return;
    const name = parseRequiredName(productName);
    const variant = item.isDefault ? { ok: true as const, value: '' } : parseRequiredName(variantName);
    const parsed = parsePer100gTexts(texts);
    if (!name.ok || !variant.ok || !parsed.ok) {
      setErrors({
        ...(parsed.ok ? {} : parsed.errors),
        ...(name.ok ? {} : { name: name.error }),
        ...(variant.ok ? {} : { variantName: variant.error }),
      });
      return;
    }
    setSaving(true);
    try {
      await updateProductAndVariant({
        productId: item.productId,
        name: name.value,
        categoryId,
        variantId: item.variantId,
        variantName: item.isDefault ? undefined : variant.value,
        nutrition: parsed.value,
      });
      onChanged();
      onClose();
    } catch (error) {
      setSaving(false);
      Alert.alert(t('error.couldNotSave'), String(error));
    }
  };

  const confirmDeleteProduct = () => {
    Alert.alert(t('products.deleteProductTitle'), t('products.historyRemains'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteProduct(item.productId)
            .then(() => {
              onChanged();
              onClose();
            })
            .catch((error) => Alert.alert(t('error.couldNotDelete'), String(error)));
        },
      },
    ]);
  };

  const confirmDeleteVariant = () => {
    Alert.alert(t('products.deleteVariantTitle'), t('products.historyRemains'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteVariant(item.variantId)
            .then(() => {
              onChanged();
              onClose();
            })
            .catch((error) => Alert.alert(t('error.couldNotDelete'), String(error)));
        },
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    { key: 'variant', label: t('products.addVariant'), icon: 'plus', onPress: () => onAddVariant(item) },
    ...(item.isDefault ? [] : [{ key: 'delete-variant', label: t('products.deleteVariant'), icon: 'trash-can-outline' as const, destructive: true, onPress: confirmDeleteVariant }]),
    { key: 'delete-product', label: t('products.deleteProduct'), icon: 'delete-forever-outline', destructive: true, onPress: confirmDeleteProduct },
  ];

  return (
    <BottomSheet
      visible
      onRequestClose={requestClose}
      title={item.isDefault ? t('products.editProduct') : t('products.editVariant')}
      headerRight={<IconButton icon="dots-vertical" accessibilityLabel={t('common.moreActions')} onPress={() => setMenuOpen(true)} />}
      footer={
        <>
          <Button title={t('common.discard')} variant="secondary" onPress={requestClose} style={styles.footerButton} />
          <Button title={t('common.save')} onPress={save} loading={saving} style={styles.footerButton} />
        </>
      }
    >
      <TextField label={t('field.productName')} required value={productName} onChangeText={touch(setProductName)} error={fieldError(t('field.productName'), errors.name)} autoCapitalize="sentences" />
      <CategoryPicker categories={categories} selectedId={categoryId} onSelect={touch(setCategoryId)} />
      {item.isDefault ? null : (
        <TextField label={t('field.variantName')} required value={variantName} onChangeText={touch(setVariantName)} error={fieldError(t('field.variantName'), errors.variantName)} autoCapitalize="sentences" />
      )}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('products.nutritionPer100g')}</Text>
      <Per100gFields texts={texts} onChange={touch(setTexts)} errors={errors} />
      <MenuSheet visible={menuOpen} onRequestClose={() => setMenuOpen(false)} items={menuItems} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.label, marginBottom: spacing.sm },
  footerButton: { flex: 1 },
});
