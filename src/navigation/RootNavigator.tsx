import { createDrawerNavigator } from '@react-navigation/drawer';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AddProductScreen } from '../screens/add/AddProductScreen';
import { DayScreen } from '../screens/day/DayScreen';
import { ProductsScreen } from '../screens/products/ProductsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { useTheme } from '../theme/ThemeProvider';
import { DrawerContent } from './DrawerContent';
import { DrawerParamList, RootStackParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainDrawer() {
  const { colors } = useTheme();
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
      <Drawer.Screen name="Day" component={DayScreen} options={{ title: 'Day' }} />
      <Drawer.Screen name="Products" component={ProductsScreen} options={{ title: 'Products' }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
