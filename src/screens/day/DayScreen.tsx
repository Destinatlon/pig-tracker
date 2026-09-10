import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReorderableList, { reorderItems, ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSnackbar } from '../../components/Snackbar';
import { copyDay, copyEntryToDate, deleteEntry, reorderEntries, restoreEntry } from '../../db/repositories/dayEntriesRepo';
import { addDays, describeDate, formatLongDate, parseDateKey, toDateKey, todayKey } from '../../domain/dates';
import { DateKey, DayEntry } from '../../domain/models';
import { calculateDayTotals } from '../../domain/nutrition/calculations';
import { DrawerRouteProps } from '../../navigation/types';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { BulkEditMode } from './BulkEditMode';
import { DayEntryRow } from './DayEntryRow';
import { DaySummary } from './DaySummary';
import { EntryEditSheet } from './EntryEditSheet';
import { IncompleteMacrosSheet } from './IncompleteMacrosSheet';
import { useDay } from './useDay';

const BULK_EDIT_HOLD_MS = 2000;

function openDatePicker(initial: DateKey, onPicked: (date: DateKey) => void) {
  DateTimePickerAndroid.open({
    value: parseDateKey(initial),
    mode: 'date',
    onChange: (event, picked) => {
      if (event.type === 'set' && picked) onPicked(toDateKey(picked));
    },
  });
}

export function DayScreen({ navigation }: DrawerRouteProps<'Day'>) {
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const [date, setDate] = useState<DateKey>(() => todayKey());
  const { entries, goal, loading, reload, setEntries } = useDay(date);
  const [editing, setEditing] = useState<DayEntry | null>(null);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload().catch((error) => console.error('Failed to reload day', error));
    }, [reload]),
  );

  const totals = useMemo(() => calculateDayTotals(entries), [entries]);

  const goToDay = useCallback((next: DateKey) => {
    setBulkMode(false);
    setDate(next);
  }, []);

  const deleteWithUndo = useCallback(
    async (entry: DayEntry) => {
      setEditing(null);
      try {
        await deleteEntry(entry.id);
      } catch (error) {
        snackbar.show({ message: `Could not delete: ${String(error)}` });
        return;
      }
      setEntries(entries.filter((e) => e.id !== entry.id));
      snackbar.show({
        message: 'Entry deleted',
        actionLabel: 'Undo',
        onAction: () => {
          restoreEntry(entry)
            .then(reload)
            .catch((error) => snackbar.show({ message: `Could not restore: ${String(error)}` }));
        },
      });
    },
    [entries, reload, setEntries, snackbar],
  );

  const onReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      const next = reorderItems(entries, from, to);
      setEntries(next);
      reorderEntries(
        date,
        next.map((e) => e.id),
      ).catch((error) => {
        snackbar.show({ message: `Could not save order: ${String(error)}` });
        reload();
      });
    },
    [date, entries, reload, setEntries, snackbar],
  );

  const copyEntry = useCallback(
    (entry: DayEntry) => {
      setEditing(null);
      openDatePicker(addDays(date, 1), (target) => {
        copyEntryToDate(entry, target)
          .then(() => {
            snackbar.show({ message: `Copied to ${describeDate(target)}` });
            if (target === date) reload();
          })
          .catch((error) => snackbar.show({ message: `Could not copy: ${String(error)}` }));
      });
    },
    [date, reload, snackbar],
  );

  const copyAnotherDay = useCallback(() => {
    openDatePicker(addDays(date, -1), (source) => {
      if (source === date) return;
      copyDay(source, date, 'add')
        .then((count) => {
          if (count === 0) snackbar.show({ message: `Nothing logged on ${describeDate(source)}` });
          else snackbar.show({ message: `Copied ${count} ${count === 1 ? 'entry' : 'entries'} from ${describeDate(source)}` });
          return reload();
        })
        .catch((error) => snackbar.show({ message: `Could not copy: ${String(error)}` }));
    });
  }, [date, reload, snackbar]);

  const openAdd = useCallback(() => navigation.navigate('AddProduct', { date }), [navigation, date]);

  const enterBulkMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setBulkMode(true);
  }, []);

  const daySwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-40, 40])
        .failOffsetY([-20, 20])
        .runOnJS(true)
        .onEnd((event) => {
          if (event.translationX < -60 || event.velocityX < -600) goToDay(addDays(date, 1));
          else if (event.translationX > 60 || event.velocityX > 600) goToDay(addDays(date, -1));
        }),
    [date, goToDay],
  );

  const listPan = useMemo(() => Gesture.Pan().activeOffsetY([-10, 10]), []);

  const header = (
    <ScreenHeader
      left={<IconButton icon="menu" accessibilityLabel="Open navigation menu" onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />}
      center={
        <View style={styles.dateRow}>
          <IconButton icon="chevron-left" accessibilityLabel="Previous day" onPress={() => goToDay(addDays(date, -1))} />
          <Pressable
            onPress={() => openDatePicker(date, goToDay)}
            accessibilityRole="button"
            accessibilityLabel={`${formatLongDate(date)}. Change date`}
            style={styles.dateButton}
            hitSlop={4}
          >
            <Text style={[styles.dateText, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatLongDate(date)}
            </Text>
            {date !== todayKey() ? <Text style={[styles.dateHint, { color: colors.textSecondary }]}>{describeDate(date)}</Text> : null}
          </Pressable>
          <IconButton icon="chevron-right" accessibilityLabel="Next day" onPress={() => goToDay(addDays(date, 1))} />
        </View>
      }
      right={bulkMode ? <Text style={[styles.modeTag, { color: colors.warning }]}>Bulk edit</Text> : <View style={styles.rightSpacer} />}
    />
  );

  if (bulkMode) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {header}
        <BulkEditMode
          date={date}
          entries={entries}
          onCancel={() => setBulkMode(false)}
          onSaved={() => {
            setBulkMode(false);
            snackbar.show({ message: 'Changes saved' });
            reload();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {header}
      <GestureDetector gesture={daySwipe}>
        <View style={styles.body}>
          <DaySummary totals={totals} goal={goal} onWarningPress={() => setShowIncomplete(true)} />
          <ReorderableList
            data={entries}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <DayEntryRow entry={item} onPress={setEditing} onDelete={deleteWithUndo} />}
            onReorder={onReorder}
            panGesture={listPan}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              loading ? null : (
                <EmptyState message="Nothing logged for this day">
                  <Button title="Add product" onPress={openAdd} />
                  <Button title="Copy another day" variant="secondary" onPress={copyAnotherDay} />
                </EmptyState>
              )
            }
          />
        </View>
      </GestureDetector>
      <Fab
        onPress={openAdd}
        onLongPress={enterBulkMode}
        delayLongPress={BULK_EDIT_HOLD_MS}
        accessibilityLabel="Add product"
        accessibilityHint="Hold for two seconds to edit the whole day"
      />
      {editing ? (
        <EntryEditSheet
          key={editing.id}
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onCopyToDate={copyEntry}
          onDelete={deleteWithUndo}
        />
      ) : null}
      {showIncomplete ? (
        <IncompleteMacrosSheet
          entries={entries}
          onClose={() => setShowIncomplete(false)}
          onEdit={(entry) => {
            setShowIncomplete(false);
            setEditing(entry);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  dateButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dateText: { ...typography.title, textAlign: 'center' },
  dateHint: { ...typography.label, textAlign: 'center' },
  modeTag: { ...typography.label, marginRight: spacing.sm },
  rightSpacer: { width: 48 },
  listContent: { paddingBottom: 96, flexGrow: 1 },
});
