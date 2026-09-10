export interface ThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  accent: string;
  onAccent: string;
  warning: string;
  danger: string;
  onDanger: string;
  disabled: string;
  bulkEditBackground: string;
  backdrop: string;
}

export const lightColors: ThemeColors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceVariant: '#EBEEF2',
  textPrimary: '#1A1F26',
  textSecondary: '#5C6774',
  divider: '#DEE3E9',
  accent: '#2F6BE0',
  onAccent: '#FFFFFF',
  warning: '#B8730F',
  danger: '#D23F3F',
  onDanger: '#FFFFFF',
  disabled: '#9AA3AE',
  bulkEditBackground: '#FFF7E3',
  backdrop: 'rgba(0, 0, 0, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0F1216',
  surface: '#1A1F26',
  surfaceVariant: '#252C35',
  textPrimary: '#ECEFF3',
  textSecondary: '#9AA5B3',
  divider: '#2B333D',
  accent: '#7AA2FF',
  onAccent: '#0B1220',
  warning: '#E4B04E',
  danger: '#F07070',
  onDanger: '#1A0A0A',
  disabled: '#5A6572',
  bulkEditBackground: '#2A2416',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const typography = {
  title: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  secondary: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const },
  summary: { fontSize: 20, fontWeight: '700' as const },
} as const;

/** Minimum touch target size in dp. */
export const MIN_TOUCH = 44;
