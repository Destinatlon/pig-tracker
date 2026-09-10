import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { setThemePreference } from '../db/repositories/settingsRepo';
import { ThemePreference } from '../domain/models';
import { darkColors, lightColors, ThemeColors } from './tokens';

export interface Theme {
  colors: ThemeColors;
  mode: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<Theme | null>(null);

interface Props {
  initialPreference: ThemePreference;
  children: React.ReactNode;
}

export function ThemeProvider({ initialPreference, children }: Props) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await setThemePreference(next);
  }, []);

  const value = useMemo<Theme>(() => {
    const mode: 'light' | 'dark' = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
    return { colors: mode === 'dark' ? darkColors : lightColors, mode, preference, setPreference };
  }, [preference, systemScheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
