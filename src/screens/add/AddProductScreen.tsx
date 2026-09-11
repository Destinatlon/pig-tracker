import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SegmentTabs } from '../../components/SegmentTabs';
import { useI18n } from '../../i18n';
import { RootStackScreenProps } from '../../navigation/types';
import { typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { ManualTab } from './ManualTab';
import { RecipesTab } from './RecipesTab';
import { SavedTab } from './SavedTab';

type Tab = 'manual' | 'saved' | 'recipes';

/** Full-screen add flow. Always opens on Manual; the previous tab is deliberately not remembered. */
export function AddProductScreen({ navigation, route }: RootStackScreenProps<'AddProduct'>) {
  const { colors } = useTheme();
  const { t, relativeDate } = useI18n();
  const { date } = route.params;
  const [tab, setTab] = useState<Tab>('manual');
  const tabs = [
    { key: 'manual', label: t('add.tabManual') },
    { key: 'saved', label: t('add.tabSaved') },
    { key: 'recipes', label: t('add.tabRecipes') },
  ] as const;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        left={<IconButton icon="arrow-left" accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} />}
        center={
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('add.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{relativeDate(date)}</Text>
          </View>
        }
        right={<View style={styles.spacer} />}
        bottom={<SegmentTabs tabs={tabs} active={tab} onChange={setTab} />}
      />
      {tab === 'manual' ? (
        <ManualTab date={date} onDone={() => navigation.goBack()} onUseSaved={() => setTab('saved')} />
      ) : tab === 'saved' ? (
        <SavedTab date={date} onDone={() => navigation.goBack()} />
      ) : (
        <RecipesTab date={date} onDone={() => navigation.goBack()} />
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
