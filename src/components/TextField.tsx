import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { sanitizeNumericText } from '../domain/numeric';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface BaseProps extends Omit<TextInputProps, 'style' | 'onChangeText' | 'value'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  error?: string | null;
  required?: boolean;
  containerStyle?: ViewStyle;
  compact?: boolean;
}

export function TextField({ label, value, onChangeText, unit, error, required, containerStyle, compact, ...inputProps }: BaseProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          compact && styles.inputRowCompact,
          { backgroundColor: colors.surfaceVariant, borderColor: error ? colors.danger : colors.divider },
        ]}
      >
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.disabled}
          style={[styles.input, compact && styles.inputCompact, { color: colors.textPrimary }]}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
        />
        {unit ? <Text style={[styles.unit, { color: colors.textSecondary }]}>{unit}</Text> : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

/** Numeric field: digits and one decimal separator only, no negative numbers. */
export function NumberField(props: BaseProps) {
  const { onChangeText, ...rest } = props;
  return (
    <TextField
      {...rest}
      keyboardType="decimal-pad"
      inputMode="decimal"
      onChangeText={(text) => onChangeText(sanitizeNumericText(text))}
    />
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  inputRowCompact: { minHeight: 40, paddingHorizontal: spacing.sm },
  input: { flex: 1, ...typography.body, paddingVertical: spacing.sm },
  inputCompact: { paddingVertical: spacing.xs },
  unit: { ...typography.secondary, marginLeft: spacing.xs },
  error: { ...typography.label, marginTop: spacing.xs },
});
