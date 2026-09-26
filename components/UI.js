import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { tw, colors } from '../styles';

// Subtle ambient background — just 2 orbs, very muted
export const Background = ({ children }) => (
  <View style={[tw.flex1, { backgroundColor: colors.ink }]}>
    <LinearGradient
      colors={['#050508', '#0a0814', '#050508']}
      locations={[0, 0.5, 1]}
      style={StyleSheet.absoluteFill}
    />
    {/* Single soft glow at the top — restrained, not garish */}
    <View style={{
      position: 'absolute', top: -180, left: -100, right: -100, height: 400,
      backgroundColor: 'rgba(125,211,252,0.08)',
      borderRadius: 400, transform: [{ scaleX: 1.6 }],
    }} />
    <View style={{
      position: 'absolute', bottom: -200, right: -120, width: 380, height: 380,
      borderRadius: 190,
      backgroundColor: 'rgba(168,85,247,0.06)',
    }} />
    {children}
  </View>
);

// Clean glass surface — minimal, no colored noise
export const Glass = ({
  style, children,
  intensity = 50,
  radius = 20,
  tint = 'dark',
  border = true,
}) => (
  <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
    <BlurView
      intensity={intensity}
      tint={tint}
      experimentalBlurMethod="dimezisBlurView"
      style={StyleSheet.absoluteFill}
    />
    {/* Frosted overlay */}
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,20,0.55)' }]} />
    {/* Top specular highlight — very subtle */}
    <LinearGradient
      colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}
    />
    {border && (
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: radius,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.1)',
      }]} />
    )}
    {children}
  </View>
);

// Icon button — circular, subtle
export const IconButton = ({ children, onPress, disabled, size = 36, style }) => (
  <View
    style={[{
      width: size, height: size, borderRadius: size / 2,
      alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? 0.35 : 1,
    }, style]}
    onTouchEnd={disabled ? undefined : onPress}
  >
    {children}
  </View>
);