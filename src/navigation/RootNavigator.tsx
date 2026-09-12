import { createDrawerNavigator } from '@react-navigation/drawer';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AddProductScreen } from '../screens/add/AddProductScreen';
import { DayScreen } from '../screens/day/DayScreen';
import { ProductsScreen } from '../screens/products/ProductsScreen';
import { RecipeEditorScreen } from '../screens/recipes/RecipeEditorScreen';
import { RecipesScreen } from '../screens/recipes/RecipesScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { StatisticsScreen } from '../screens/statistics/StatisticsScreen';
import { useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { DrawerContent } from './DrawerContent';
import { DrawerParamList, RootStackParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainDrawer() {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <Drawer.Navigator
      initialRouteName="Day"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerActiveTintColor: colors.accent,
        drawerActiveBackgroundColor: colors.surfaceVariant,
        drawerInactiveTintColor: colors.textPrimary,
        drawerStyle: { backgroundColor: colors.surface },
        drawerLabelStyle: { fontSize: 15 },
      }}
    >
      <Drawer.Screen name="Day" component={DayScreen} options={{ title: t('nav.day') }} />
      <Drawer.Screen name="Statistics" component={StatisticsScreen} options={{ title: t('nav.statistics') }} />
      <Drawer.Screen name="Products" component={ProductsScreen} options={{ title: t('nav.products') }} />
      <Drawer.Screen name="Recipes" component={RecipesScreen} options={{ title: t('nav.recipes') }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
    </Drawer.Navigator>
  );
}

export function RootNavigator() {
  const { colors, mode } = useTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.divider,
    },
  };
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="Main" component={MainDrawer} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="RecipeEditor" component={RecipeEditorScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
