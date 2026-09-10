import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useReorderableDrag } from 'react-native-reorderable-list';
import { DayEntry, entryDisplayName } from '../../domain/models';
import { calculateConsumedMacros } from '../../domain/nutrition/calculations';
import { formatCalories, formatMacro, formatWeight } from '../../domain/nutrition/format';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  entry: DayEntry;
  onPress: (entry: DayEntry) => void;
  onDelete: (entry: DayEntry) => void;
}

const DELETE_WIDTH = 96;

export const DayEntryRow = memo(function DayEntryRow({ entry, onPress, onDelete }: Props) {
  const { colors } = useTheme();
  const drag = useReorderableDrag();
  const consumed = calculateConsumedMacros(entry, entry.weightGrams);
  const incomplete = consumed.consumedProtein === null || consumed.consumedCarbs === null || consumed.consumedFat === null;
  const detail = `${formatWeight(entry.weightGrams)} g · ${formatCalories(consumed.consumedCalories)} kcal · P ${formatMacro(consumed.consumedProtein)} · C ${formatMacro(consumed.consumedCarbs)} · F ${formatMacro(consumed.consumedFat)}`;

  return (
    <ReanimatedSwipeable
      renderRightActions={() => (
        <View style={[styles.deleteAction, { backgroundColor: colors.danger }]} accessibilityElementsHidden>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.onDanger} accessibilityLabel="Delete entry" />
        </View>
      )}
      rightThreshold={DELETE_WIDTH}
      dragOffsetFromLeftEdge={10000}
      overshootLeft={false}
      friction={1.4}
      onSwipeableWillOpen={() => onDelete(entry)}
      containerStyle={{ backgroundColor: colors.danger }}
    >
      <Pressable
        onPress={() => onPress(entry)}
        accessibilityRole="button"
        accessibilityLabel={`${entryDisplayName(entry)}, ${detail}${incomplete ? ', incomplete nutrition information' : ''}`}
        accessibilityHint="Opens the entry editor. Swipe left to delete."
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceVariant : colors.surface, borderBottomColor: colors.divider }]}
      >
        <View style={styles.text}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {entryDisplayName(entry)}
          </Text>
          <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={2}>
            {detail}
          </Text>
        </View>
        {incomplete ? (
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={20}
            color={colors.warning}
            style={styles.warning}
            accessibilityLabel="Incomplete nutrition information"
          />
        ) : null}
        <Pressable
          onPressIn={drag}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Reorder entry"
          accessibilityHint="Drag to move this entry"
          style={styles.handle}
        >
          <MaterialCommunityIcons name="drag-horizontal-variant" size={22} color={colors.disabled} />
        </Pressable>
      </Pressable>
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
  name: { ...typography.bodyStrong },
  detail: { ...typography.secondary, marginTop: 2 },
  warning: { marginHorizontal: spacing.xs },
  handle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  deleteAction: { width: DELETE_WIDTH, alignItems: 'center', justifyContent: 'center' },
});
