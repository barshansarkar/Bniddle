import { Appearance } from 'react-native';

// ─── Palettes ────────────────────────────────────────
const DARK = {
  // Base
  bg:           '#000000',
  bgElev:       '#0b0b0f',
  bgElevHi:     '#111117',
  // Surfaces (used as translucent fills over bg)
  surface:      'rgba(255,255,255,0.06)',
  surfaceHi:    'rgba(255,255,255,0.11)',
  surfacePress: 'rgba(255,255,255,0.16)',
  surfaceActive:'rgba(59,130,246,0.16)',

  // Borders / dividers
  border:       'rgba(255,255,255,0.07)',
  borderHi:     'rgba(255,255,255,0.13)',
  borderFocus:  'rgba(96,165,250,0.6)',

  // Type
  text:         '#ffffff',
  textSub:      'rgba(255,255,255,0.68)',
  textMuted:    'rgba(255,255,255,0.42)',
  textFaint:    'rgba(255,255,255,0.22)',

  // Accents
  accent:       '#3b82f6',
  accentHi:     '#60a5fa',
  accentSoft:   'rgba(59,130,246,0.14)',
  accentGlow:   'rgba(59,130,246,0.35)',

  // Semantic
  success:      '#22c55e',
  danger:       '#ef4444',
  warning:      '#f59e0b',
  gold:         '#fbbf24',
  purple:       '#a855f7',

  // Chrome
  statusBar:    'light-content',
  webviewBg:    '#ffffff',
  overlay:      'rgba(0,0,0,0.62)',
  tabBarBg:     'rgba(10,10,15,0.85)',
  sheen:        'rgba(255,255,255,0.09)',
};

const LIGHT = {
  bg:           '#ffffff',
  bgElev:       '#f6f6f9',
  bgElevHi:     '#ececf1',
  surface:      'rgba(0,0,0,0.045)',
  surfaceHi:    'rgba(0,0,0,0.08)',
  surfacePress: 'rgba(0,0,0,0.13)',
  surfaceActive:'rgba(37,99,235,0.12)',

  border:       'rgba(0,0,0,0.07)',
  borderHi:     'rgba(0,0,0,0.13)',
  borderFocus:  'rgba(37,99,235,0.6)',

  text:         '#0a0a0f',
  textSub:      'rgba(0,0,0,0.66)',
  textMuted:    'rgba(0,0,0,0.45)',
  textFaint:    'rgba(0,0,0,0.26)',

  accent:       '#2563eb',
  accentHi:     '#3b82f6',
  accentSoft:   'rgba(37,99,235,0.12)',
  accentGlow:   'rgba(37,99,235,0.28)',

  success:      '#16a34a',
  danger:       '#dc2626',
  warning:      '#d97706',
  gold:         '#ca8a04',
  purple:       '#9333ea',

  statusBar:    'dark-content',
  webviewBg:    '#ffffff',
  overlay:      'rgba(0,0,0,0.4)',
  tabBarBg:     'rgba(246,246,249,0.9)',
  sheen:        'rgba(255,255,255,0.6)',
};

// ─── Live mutable palette ────────────────────────────
// Components import `colors` and re-render when themeKey bumps in App.
export const colors = { ...DARK };

export const gradients = {
  app:    ['#000000', '#08080c', '#000000'],
  sheet:  ['rgba(22,22,28,0.98)', 'rgba(12,12,16,0.98)'],
  accent: ['#3b82f6', '#2563eb'],
  sheen:  ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'],
};

let currentMode = 'dark';

export const getResolvedTheme = (mode) => {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  }
  return mode;
};

export const setTheme = (mode) => {
  currentMode = mode;
  const resolved = getResolvedTheme(mode);
  const palette = resolved === 'light' ? LIGHT : DARK;
  Object.keys(palette).forEach((k) => { colors[k] = palette[k]; });

  if (resolved === 'light') {
    gradients.app   = ['#ffffff', '#f6f6f9', '#ffffff'];
    gradients.sheet = ['rgba(255,255,255,0.99)', 'rgba(240,240,245,0.98)'];
    gradients.sheen = ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)'];
    gradients.accent = ['#3b82f6', '#2563eb'];
  } else {
    gradients.app   = ['#000000', '#08080c', '#000000'];
    gradients.sheet = ['rgba(22,22,28,0.98)', 'rgba(12,12,16,0.98)'];
    gradients.sheen = ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'];
    gradients.accent = ['#60a5fa', '#3b82f6'];
  }
  return resolved;
};

export const getCurrentMode = () => currentMode;

// ─── Spacing / radii / typography ────────────────────
export const sp = { xs: 4, sm: 6, md: 10, lg: 14, xl: 18, xxl: 24, xxxl: 32 };
export const r  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 };
export const fs = { xs: 11, sm: 12.5, md: 14, lg: 16, xl: 19, xxl: 23, xxxl: 28 };

// Small helper for consistent shadow
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};