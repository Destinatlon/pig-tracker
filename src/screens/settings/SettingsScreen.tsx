import { DrawerActions } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SegmentTabs } from '../../components/SegmentTabs';
import { DrawerRouteProps } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { AppTab } from './AppTab';
import { GoalsTab } from './GoalsTab';
import { ReminderTab } from './ReminderTab';

type Tab = 'goals' | 'reminder' | 'app';
const TABS = [
  { key: 'goals', label: 'Goals' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'app', label: 'App' },
] as const;

export function SettingsScreen({ navigation }: DrawerRouteProps<'Settings'>) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('goals');
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        left={<IconButton icon="menu" accessibilityLabel="Open navigation menu" onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />}
        title="Settings"
        right={<View style={styles.spacer} />}
        bottom={<SegmentTabs tabs={TABS} active={tab} onChange={setTab} />}
      />
      {tab === 'goals' ? <GoalsTab /> : tab === 'reminder' ? <ReminderTab /> : <AppTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  spacer: { width: 48 },
});
