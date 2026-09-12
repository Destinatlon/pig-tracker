import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reorderItems, ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { Fab } from '../../components/Fab';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSnackbar } from '../../components/Snackbar';
import { copyDay, copyEntryToDate, deleteEntry, reorderEntries, restoreEntry } from '../../db/repositories/dayEntriesRepo';
import { addDays, parseDateKey, toDateKey, todayKey } from '../../domain/dates';
import { useI18n } from '../../i18n';
import { DateKey, DayEntry } from '../../domain/models';
import { DrawerRouteProps } from '../../navigation/types';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { BulkEditMode } from './BulkEditMode';
import { DayPagerView, useDayPager } from './DayPager';
import { DayPanel } from './DayPanel';
import { EntryEditSheet } from './EntryEditSheet';
import { IncompleteMacrosSheet } from './IncompleteMacrosSheet';
import { useDay } from './useDay';

const BULK_EDIT_HOLD_MS = 1000;

function openDatePicker(initial: DateKey, onPicked: (date: DateKey) => void) {
  DateTimePickerAndroid.open({
    value: parseDateKey(initial),
    mode: 'date',
    onChange: (event, picked) => {
      if (event.type === 'set' && picked) onPicked(toDateKey(picked));
    },
  });
}

export function DayScreen({ navigation, route }: DrawerRouteProps<'Day'>) {
  const { colors } = useTheme();
  const { t, tn, longDate, relativeDate } = useI18n();
  const snackbar = useSnackbar();
  const [initialDate] = useState(todayKey);
  const pager = useDayPager(initialDate);
  const { date } = pager;
  // One hook per mounted panel, in a fixed order; only the recycled slot ever reloads.
  const day0 = useDay(pager.slots[0].date);
  const day1 = useDay(pager.slots[1].date);
  const day2 = useDay(pager.slots[2].date);
  const days = [day0, day1, day2];
  const { entries, reload, setEntries } = days[pager.activeIndex];
  const [editing, setEditing] = useState<DayEntry | null>(null);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  const reload0 = day0.reload;
  const reload1 = day1.reload;
  const reload2 = day2.reload;
  useFocusEffect(
    useCallback(() => {
      const onError = (error: unknown) => console.error('Failed to reload day', error);
      reload0().catch(onError);
      reload1().catch(onError);
      reload2().catch(onError);
    }, [reload0, reload1, reload2]),
  );

  const goToDay = useCallback(
    (next: DateKey) => {
      setBulkMode(false);
      pager.goToDate(next);
    },
    [pager],
  );

  // Another destination (Statistics) asked for one exact date. The param is cleared once handled
  // so returning to this screen later does not drag the user back to that day.
  const requestedDate = route.params?.date;
  useEffect(() => {
    if (!requestedDate) return;
    goToDay(requestedDate);
    navigation.setParams({ date: undefined });
  }, [requestedDate, goToDay, navigation]);

  const deleteWithUndo = useCallback(
    async (entry: DayEntry) => {
      setEditing(null);
      try {
        await deleteEntry(entry.id);
      } catch (error) {
        snackbar.show({ message: `${t('error.couldNotDelete')}: ${String(error)}` });
        return;
      }
      setEntries(entries.filter((e) => e.id !== entry.id));
      snackbar.show({
        message: t('day.entryDeleted'),
        actionLabel: t('common.undo'),
        onAction: () => {
          restoreEntry(entry)
            .then(reload)
            .catch((error) => snackbar.show({ message: `${t('error.couldNotRestore')}: ${String(error)}` }));
        },
      });
    },
    [entries, reload, setEntries, snackbar, t],
  );

  const onReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      const next = reorderItems(entries, from, to);
      setEntries(next);
      reorderEntries(
        date,
        next.map((e) => e.id),
      ).catch((error) => {
        snackbar.show({ message: `${t('error.couldNotSaveOrder')}: ${String(error)}` });
        reload();
      });
    },
    [date, entries, reload, setEntries, snackbar, t],
  );

  const copyEntry = useCallback(
    (entry: DayEntry) => {
      setEditing(null);
      openDatePicker(addDays(date, 1), (target) => {
        copyEntryToDate(entry, target)
          .then(() => {
            snackbar.show({ message: t('day.copiedTo', { date: relativeDate(target) }) });
            if (target === date) reload();
          })
          .catch((error) => snackbar.show({ message: `${t('error.couldNotCopy')}: ${String(error)}` }));
      });
    },
    [date, reload, snackbar, t, relativeDate],
  );

  const copyAnotherDay = useCallback(() => {
    openDatePicker(addDays(date, -1), (source) => {
      if (source === date) return;
      copyDay(source, date, 'add')
        .then((count) => {
          if (count === 0) snackbar.show({ message: t('day.nothingLoggedOn', { date: relativeDate(source) }) });
          else snackbar.show({ message: tn('day.copiedEntries', count, { date: relativeDate(source) }) });
          return reload();
        })
        .catch((error) => snackbar.show({ message: `${t('error.couldNotCopy')}: ${String(error)}` }));
    });
  }, [date, reload, snackbar, t, tn, relativeDate]);

  const openAdd = useCallback(() => navigation.navigate('AddProduct', { date }), [navigation, date]);

  const openIncomplete = useCallback(() => setShowIncomplete(true), []);

  const enterBulkMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setBulkMode(true);
  }, []);

  const header = (
    <ScreenHeader
      left={<IconButton icon="menu" accessibilityLabel={t('common.openMenu')} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />}
      center={
        <View style={styles.dateRow}>
          <IconButton icon="chevron-left" accessibilityLabel={t('day.previousDay')} onPress={() => goToDay(addDays(date, -1))} />
          <Pressable
            onPress={() => openDatePicker(date, goToDay)}
            accessibilityRole="button"
            accessibilityLabel={`${longDate(pager.visibleDate)}. ${t('day.changeDate')}`}
            style={styles.dateButton}
            hitSlop={4}
          >
            <Text style={[styles.dateText, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {longDate(pager.visibleDate)}
            </Text>
            {pager.visibleDate !== todayKey() ? (
              <Text style={[styles.dateHint, { color: colors.textSecondary }]}>{relativeDate(pager.visibleDate)}</Text>
            ) : null}
          </Pressable>
          <IconButton icon="chevron-right" accessibilityLabel={t('day.nextDay')} onPress={() => goToDay(addDays(date, 1))} />
        </View>
      }
      right={bulkMode ? <Text style={[styles.modeTag, { color: colors.warning }]}>{t('day.bulkEditTag')}</Text> : <View style={styles.rightSpacer} />}
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
            snackbar.show({ message: t('day.changesSaved') });
            reload();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {header}
      <DayPagerView pager={pager}>
        {(slot, index) => (
          <DayPanel
            entries={days[index].entries}
            goal={days[index].goal}
            loading={days[index].loading}
            active={index === pager.activeIndex}
            onWarningPress={openIncomplete}
            onEntryPress={setEditing}
            onEntryDelete={deleteWithUndo}
            onReorder={onReorder}
            onAdd={openAdd}
            onCopyAnotherDay={copyAnotherDay}
          />
        )}
      </DayPagerView>
      <Fab
        onPress={openAdd}
        onLongPress={enterBulkMode}
        delayLongPress={BULK_EDIT_HOLD_MS}
        accessibilityLabel={t('day.addProduct')}
        accessibilityHint={t('day.fabHint')}
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
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  dateButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dateText: { ...typography.title, textAlign: 'center' },
  dateHint: { ...typography.label, textAlign: 'center' },
  modeTag: { ...typography.label, marginRight: spacing.sm },
  rightSpacer: { width: 48 },
});
