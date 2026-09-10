import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { Per100gFields } from '../../components/NutritionDraftFields';
import { TextField } from '../../components/TextField';
import { addVariant } from '../../db/repositories/productsRepo';
import { DraftErrors, parsePer100gTexts, Per100gTexts, per100gTextsFrom } from '../../domain/nutrition/draft';
import { parseRequiredName } from '../../domain/numeric';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  productId: number;
  productName: string;
  onClose: () => void;
  onCreated: () => void;
}

/** Compact Add Variant sheet: name plus per-100 g values. Product and category are inherited. */
export function VariantSheet({ productId, productName, onClose, onCreated }: Props) {
  const { colors } = useTheme();
  const { t, fieldError } = useI18n();
  const [name, setName] = useState('');
  const [texts, setTexts] = useState<Per100gTexts>(() => per100gTextsFrom(null));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const dirty = name !== '' || texts.calories !== '' || texts.protein !== '' || texts.carbs !== '' || texts.fat !== '';

  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert(t('products.discardVariant'), undefined, [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: onClose },
    ]);
  };

  const save = async () => {
    if (saving) return;
    const parsedName = parseRequiredName(name);
    const parsed = parsePer100gTexts(texts);
    if (!parsedName.ok || !parsed.ok) {
      setErrors({ ...(parsed.ok ? {} : parsed.errors), ...(parsedName.ok ? {} : { name: parsedName.error }) });
      return;
    }
    setSaving(true);
    try {
      await addVariant(productId, parsedName.value, parsed.value);
      onCreated();
      onClose();
    } catch (error) {
      setSaving(false);
      Alert.alert(t('products.couldNotAddVariant'), String(error));
    }
  };

  return (
    <BottomSheet
      visible
      onRequestClose={requestClose}
      title={t('products.addVariant')}
      footer={
        <>
          <Button title={t('common.discard')} variant="secondary" onPress={requestClose} style={styles.footerButton} />
          <Button title={t('common.save')} onPress={save} loading={saving} style={styles.footerButton} />
        </>
      }
    >
      <Text style={[styles.product, { color: colors.textSecondary }]}>{productName}</Text>
      <TextField
        label={t('field.variantName')}
        required
        value={name}
        onChangeText={(text) => {
          setName(text);
          setErrors({});
        }}
        error={fieldError(t('field.variantName'), errors.name)}
        autoFocus
        autoCapitalize="sentences"
        placeholder={t('products.variantPlaceholder')}
      />
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
  product: { ...typography.bodyStrong, marginBottom: spacing.md },
  footerButton: { flex: 1 },
});
