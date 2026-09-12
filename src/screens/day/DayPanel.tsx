import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import ReorderableList, { ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { DayEntry, GoalSettings } from '../../domain/models';
import { calculateDayTotals } from '../../domain/nutrition/calculations';
import { useI18n } from '../../i18n';
import { DayEntryRow } from './DayEntryRow';
import { DaySummary } from './DaySummary';

interface Props {
  entries: DayEntry[];
  goal: GoalSettings | null;
  loading: boolean;
  /** Only the centred panel reacts to touches; the neighbours are there to be looked at. */
  active: boolean;
  onWarningPress: () => void;
  onEntryPress: (entry: DayEntry) => void;
  onEntryDelete: (entry: DayEntry) => void;
  onReorder: (event: ReorderableListReorderEvent) => void;
  onAdd: () => void;
  onCopyAnotherDay: () => void;
}

const noop = () => undefined;

/** The summary and entry list for one day. Three of these are mounted while paging. */
export const DayPanel = memo(function DayPanel({
  entries,
  goal,
  loading,
  active,
  onWarningPress,
  onEntryPress,
  onEntryDelete,
  onReorder,
  onAdd,
  onCopyAnotherDay,
}: Props) {
  const { t } = useI18n();
  const totals = useMemo(() => calculateDayTotals(entries), [entries]);
  // Vertical-only so the horizontal day swipe wins the other axis.
  const listPan = useMemo(() => Gesture.Pan().activeOffsetY([-10, 10]), []);

  return (
    <View style={styles.panel}>
      <DaySummary totals={totals} goal={goal} onWarningPress={active ? onWarningPress : noop} />
      <ReorderableList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <DayEntryRow entry={item} onPress={active ? onEntryPress : noop} onDelete={active ? onEntryDelete : noop} />}
        onReorder={active ? onReorder : noop}
        panGesture={listPan}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? null : (
            <EmptyState message={t('day.emptyTitle')}>
              <Button title={t('day.addProduct')} onPress={active ? onAdd : noop} />
              <Button title={t('day.copyAnotherDay')} variant="secondary" onPress={active ? onCopyAnotherDay : noop} />
            </EmptyState>
          )
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  panel: { flex: 1 },
  listContent: { paddingBottom: 96, flexGrow: 1 },
});
