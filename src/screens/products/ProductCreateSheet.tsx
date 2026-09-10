import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { CategoryPicker } from '../../components/CategoryPicker';
import { Per100gFields } from '../../components/NutritionDraftFields';
import { TextField } from '../../components/TextField';
import { createProduct } from '../../db/repositories/productsRepo';
import { Category } from '../../domain/models';
import { DraftErrors, parsePer100gTexts, Per100gTexts, per100gTextsFrom } from '../../domain/nutrition/draft';
import { parseRequiredName } from '../../domain/numeric';

interface Props {
  categories: Category[];
  defaultCategoryId: number;
  onClose: () => void;
  onCreated: () => void;
}

/** Creates a product and its hidden default variant from one form. */
export function ProductCreateSheet({ categories, defaultCategoryId, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [texts, setTexts] = useState<Per100gTexts>(() => per100gTextsFrom(null));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const dirty = name !== '' || texts.calories !== '' || texts.protein !== '' || texts.carbs !== '' || texts.fat !== '';

  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert('Discard this product?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };

  const save = async () => {
    if (saving) return;
    const parsedName = parseRequiredName(name, 'Product name');
    const parsed = parsePer100gTexts(texts);
    if (!parsedName.ok || !parsed.ok) {
      setErrors({ ...(parsed.ok ? {} : parsed.errors), ...(parsedName.ok ? {} : { name: parsedName.error }) });
      return;
    }
    setSaving(true);
    try {
      await createProduct({ name: parsedName.value, categoryId, ...parsed.value });
      onCreated();
      onClose();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not create product', String(error));
    }
  };

  return (
    <BottomSheet
      visible
      onRequestClose={requestClose}
      title="New product"
      footer={
        <>
          <Button title="Discard" variant="secondary" onPress={requestClose} style={styles.footerButton} />
          <Button title="Save" onPress={save} loading={saving} style={styles.footerButton} />
        </>
      }
    >
      <TextField
        label="Product name"
        required
        value={name}
        onChangeText={(text) => {
          setName(text);
          setErrors({});
        }}
        error={errors.name}
        autoFocus
        autoCapitalize="sentences"
      />
      <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
      <Per100gFields
        texts={texts}
        onChange={(next) => {
          setTexts(next);
          setErrors({});
        }}
        errors={errors}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footerButton: { flex: 1 },
});
