import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, r } from '../theme';

/**
 * Refined glass surface.
 * The overlay is intentionally light (25-35%) so the underlying blur shows through.
 */
export const Glass = ({
  children,
  style,
  intensity = 85,
  radius = r.lg,
  bg,
  border = true,
}) => {
  const isDark = colors.text === '#ffffff';

  // Lighter overlay → real blur becomes visible
  const overlay =
    bg || (isDark ? 'rgba(12,12,16,0.28)' : 'rgba(255,255,255,0.35)');

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        // Android: enable the real blur
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dimezisBlurView' : undefined
        }
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />

      {border && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.borderHi,
            },
          ]}
        />
      )}
      {children}
    </View>
  );
};