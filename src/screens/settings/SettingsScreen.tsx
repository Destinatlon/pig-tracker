import { DrawerActions } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SegmentTabs } from '../../components/SegmentTabs';
import { DrawerRouteProps } from '../../navigation/types';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { AppTab } from './AppTab';
import { GoalsTab } from './GoalsTab';
import { ReminderTab } from './ReminderTab';

type Tab = 'goals' | 'reminder' | 'app';

export function SettingsScreen({ navigation }: DrawerRouteProps<'Settings'>) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('goals');
  const tabs = [
    { key: 'goals', label: t('settings.tabGoals') },
    { key: 'reminder', label: t('settings.tabReminder') },
    { key: 'app', label: t('settings.tabApp') },
  ] as const;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        left={<IconButton icon="menu" accessibilityLabel={t('common.openMenu')} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />}
        title={t('settings.title')}
        right={<View style={styles.spacer} />}
        bottom={<SegmentTabs tabs={tabs} active={tab} onChange={setTab} />}
      />
      {tab === 'goals' ? <GoalsTab /> : tab === 'reminder' ? <ReminderTab /> : <AppTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  spacer: { width: 48 },
});
