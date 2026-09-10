import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SegmentTabs } from '../../components/SegmentTabs';
import { describeDate } from '../../domain/dates';
import { RootStackScreenProps } from '../../navigation/types';
import { typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { ManualTab } from './ManualTab';
import { SavedTab } from './SavedTab';

type Tab = 'manual' | 'saved';
const TABS = [
  { key: 'manual', label: 'Manual' },
  { key: 'saved', label: 'Saved' },
] as const;

/** Full-screen add flow. Always opens on Manual; the previous tab is deliberately not remembered. */
export function AddProductScreen({ navigation, route }: RootStackScreenProps<'AddProduct'>) {
  const { colors } = useTheme();
  const { date } = route.params;
  const [tab, setTab] = useState<Tab>('manual');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        left={<IconButton icon="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />}
        center={
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Add product</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{describeDate(date)}</Text>
          </View>
        }
        right={<View style={styles.spacer} />}
        bottom={<SegmentTabs tabs={TABS} active={tab} onChange={setTab} />}
      />
      {tab === 'manual' ? (
        <ManualTab date={date} onDone={() => navigation.goBack()} onUseSaved={() => setTab('saved')} />
      ) : (
        <SavedTab date={date} onDone={() => navigation.goBack()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  titleBlock: { alignItems: 'center' },
  title: { ...typography.title },
  subtitle: { ...typography.label },
  spacer: { width: 48 },
});
