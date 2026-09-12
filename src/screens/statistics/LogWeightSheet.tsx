import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { NumberField } from '../../components/TextField';
import { deleteWeight, getWeightForDate, saveWeight } from '../../db/repositories/bodyWeightRepo';
import { parseDateKey, toDateKey } from '../../domain/dates';
import { PROFILE_LIMITS } from '../../domain/goals/constants';
import { DateKey } from '../../domain/models';
import { formatForInput } from '../../domain/nutrition/format';
import { FieldErrorCode, parseNumberInRange } from '../../domain/numeric';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  /** Starting date, normally today; the user can move it to fill in a missed weighing. */
  date: DateKey;
  /** The weighing already recorded for this date, or the latest one as a starting point. */
  initialKg: number | null;
  /** True when `initialKg` is this date's own measurement and can therefore be removed. */
  existing: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Records one weighing. Explicit Save, like every other editor in the app. */
export function LogWeightSheet({ date, initialKg, existing, onClose, onSaved }: Props) {
  const { colors } = useTheme();
  const { t, fieldError, longDate } = useI18n();
  const [day, setDay] = useState<DateKey>(date);
  const [own, setOwn] = useState(existing);
  const [text, setText] = useState(() => formatForInput(initialKg));
  const [error, setError] = useState<FieldErrorCode | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  /** Moving to another date shows that date's weighing, so an edit never lands on the wrong day. */
  const pickDate = () => {
    DateTimePickerAndroid.open({
      value: parseDateKey(day),
      mode: 'date',
      maximumDate: parseDateKey(date),
      onChange: (event, picked) => {
        if (event.type !== 'set' || !picked) return;
        const next = toDateKey(picked);
        setDay(next);
        setError(undefined);
        getWeightForDate(next)
          .then((entry) => {
            setOwn(entry !== null);
            if (entry !== null) setText(formatForInput(entry.weightKg));
          })
          .catch((failure) => console.error('Failed to read the weighing for that date', failure));
      },
    });
  };

  const save = async () => {
    if (saving) return;
    const parsed = parseNumberInRange(text, PROFILE_LIMITS.weightKg.min, PROFILE_LIMITS.weightKg.max);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    try {
      await saveWeight(day, parsed.value);
      onSaved(t('weight.saved'));
    } catch (failure) {
      setSaving(false);
      Alert.alert(t('weight.couldNotSave'), String(failure));
    }
  };

  const remove = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteWeight(day);
      onSaved(t('weight.removed'));
    } catch (failure) {
      setSaving(false);
      Alert.alert(t('weight.couldNotRemove'), String(failure));
    }
  };

  return (
    <BottomSheet
      visible
      onRequestClose={onClose}
      title={t('weight.logTitle')}
      footer={
        <>
          <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.footerButton} />
          <Button title={t('common.save')} onPress={save} loading={saving} style={styles.footerButton} />
        </>
      }
    >
      <Pressable
        onPress={pickDate}
        accessibilityRole="button"
        accessibilityLabel={t('weight.onDate', { date: longDate(day) })}
        accessibilityHint={t('day.changeDate')}
        style={({ pressed }) => [styles.dateRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.date, { color: colors.accent }]}>{t('weight.onDate', { date: longDate(day) })}</Text>
      </Pressable>
      <NumberField
        label={t('weight.field')}
        required
        unit={t('weight.kg')}
        value={text}
        onChangeText={(next) => {
          setText(next);
          setError(undefined);
        }}
        error={fieldError(t('weight.field'), error)}
        autoFocus
      />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('weight.hint')}</Text>
      {own ? <Button title={t('weight.remove')} variant="text" onPress={remove} style={styles.remove} /> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  dateRow: { minHeight: 44, justifyContent: 'center' },
  date: { ...typography.bodyStrong },
  hint: { ...typography.secondary, marginTop: spacing.xs },
  remove: { marginTop: spacing.md, alignSelf: 'flex-start' },
  footerButton: { flex: 1 },
});
