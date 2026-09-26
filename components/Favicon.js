import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, r } from '../theme';

export const hostOf = (u) => {
  if (!u) return '';
  try { return new URL(u).hostname.replace(/^www\./, ''); }
  catch { return ''; }
};

// Deterministic hue per host so fallbacks feel branded, not random
const hueOf = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

const LetterAvatar = ({ host, size, radius }) => {
  const h = hueOf(host || 'x');
  const bg = `hsl(${h}, 55%, 32%)`;
  const fg = `hsl(${h}, 70%, 82%)`;
  return (
    <View
      style={{
        width: size, height: size,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color: fg, fontWeight: '800', fontSize: size * 0.52 }}>
        {(host || '?').slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
};

/**
 * Cached favicon via Google's s2 service.
 * Falls back to a hue-keyed letter avatar if the fetch fails.
 */
export const Favicon = ({ url, size = 20, radius = 6, fallbackToLetter = true }) => {
  const [failed, setFailed] = useState(false);
  const host = useMemo(() => hostOf(url), [url]);

  useEffect(() => { setFailed(false); }, [url]);

  if (!host || (failed && !fallbackToLetter)) {
    return fallbackToLetter ? <LetterAvatar host={host} size={size} radius={radius} /> : null;
  }

  if (failed) return <LetterAvatar host={host} size={size} radius={radius} />;

  return (
    <Image
      source={{ uri: `https://www.google.com/s2/favicons?domain=${host}&sz=64` }}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size,
        borderRadius: radius,
        backgroundColor: colors.surface,
      }}
    />
  );
};

export const LetterAvatarWrap = LetterAvatar;