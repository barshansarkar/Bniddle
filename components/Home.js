import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, Easing, Dimensions, Keyboard, Platform, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, fs, shadow } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = sp.sm;
const COL = Math.floor((SCREEN_W - sp.lg * 2 - GAP * 3) / 4);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Shortcuts ────────────────────────────────────────
const SHORTCUTS = [
  { name: 'Google',    url: 'https://google.com',    icon: 'logo-google',    color: '#4285F4' },
  { name: 'YouTube',   url: 'https://youtube.com',   icon: 'logo-youtube',   color: '#FF0000' },
  { name: 'GitHub',    url: 'https://github.com',    icon: 'logo-github',    color: '#a5a5a5' },
  { name: 'Reddit',    url: 'https://reddit.com',    icon: 'logo-reddit',    color: '#FF4500' },
  { name: 'X',         url: 'https://x.com',         icon: 'logo-twitter',   color: '#7ec8ff' },
  { name: 'Instagram', url: 'https://instagram.com', icon: 'logo-instagram', color: '#E1306C' },
  { name: 'Wikipedia', url: 'https://wikipedia.org', icon: 'book-outline',   color: '#c7c7c7' },
  { name: 'Stack',     url: 'https://stackoverflow.com', icon: 'code-slash', color: '#F48024' },
];

const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); }
  catch { return ''; }
};

// ─── Staggered entrance helper ────────────────────────
// Each child gets its own fade + rise, offset by `delay`.
const useStagger = (count, { delay = 60, duration = 420, rise = 14 } = {}) => {
  const anims = useRef(
    Array.from({ length: count }, () => ({
      p: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const seq = anims.map((a, i) =>
      Animated.timing(a.p, {
        toValue: 1,
        duration,
        delay: i * delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.parallel(seq).start();
  }, []);

  return anims.map((a) => ({
    opacity: a.p,
    transform: [{
      translateY: a.p.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }),
    }],
  }));
};

// ─── Spring-press wrapper (fluid tap feedback) ────────
const Pressy = ({ children, onPress, style, scaleTo = 0.94, hitSlop }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      friction: 6,
      tension: 220,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 180,
    }).start();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      hitSlop={hitSlop}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// ─── Shortcut tile ────────────────────────────────────
const Shortcut = ({ s, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const down = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, friction: 6, tension: 240 }),
      Animated.timing(glow, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  };
  const up = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 160 }),
      Animated.timing(glow, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={down}
      onPressOut={up}
      onPress={() => onPress(s.url)}
      style={{ width: COL, aspectRatio: 1 }}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: r.lg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: glow.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.border, s.color + '66'],
          }),
          transform: [{ scale }],
        }}
      >
        {/* Soft colored glow under icon when pressed */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 40, height: 40,
            borderRadius: 20,
            backgroundColor: s.color,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] }),
          }}
        />
        <Ionicons name={s.icon} size={22} color={s.color} />
        <Text
          style={{ color: colors.textSub, fontSize: 10, fontWeight: '600' }}
          numberOfLines={1}
        >
          {s.name}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Home ─────────────────────────────────────────────
export default function Home({ onOpen, onSearch, history = [] }) {
  // Scroll-driven parallax
  const scrollY = useRef(new Animated.Value(0)).current;

  // One stagger list for the top sections
  // order: greet, clock, brand, searchbar, shortcutsLabel, shortcuts, recentLabel, recent
  const recentCount = Math.min(history.length, 4);
  const stagger = useStagger(8, { delay: 55, duration: 460, rise: 16 });

  const [q, setQ] = useState('');
  const [sug, setSug] = useState([]);
  const [clock, setClock] = useState(new Date());
  const [focused, setFocused] = useState(false);

  // search bar animations
  const barScale = useRef(new Animated.Value(1)).current;
  const barGlow = useRef(new Animated.Value(0)).current;
  const sugAnim = useRef(new Animated.Value(0)).current; // presence for suggestions

  // live clock
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // debounced suggestions
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      Animated.timing(sugAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
      setSug([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(term)}`
        );
        const j = await res.json();
        const next = (j[1] || []).slice(0, 6);
        setSug(next);
        if (next.length) {
          Animated.spring(sugAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
            tension: 140,
          }).start();
        }
      } catch {}
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  const hour = clock.getHours();
  const greet =
    hour < 5 ? 'Good night' :
    hour < 12 ? 'Good morning' :
    hour < 18 ? 'Good afternoon' : 'Good evening';

  const timeStr = useMemo(
    () => clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    [clock]
  );

  const recent = history.slice(0, recentCount);

  const submit = (text) => {
    const v = (text ?? q).trim();
    if (!v) return;
    Keyboard.dismiss();
    onSearch(v);
  };

  const onFocus = () => {
    setFocused(true);
    Animated.parallel([
      Animated.spring(barScale, { toValue: 1.02, useNativeDriver: true, friction: 7, tension: 160 }),
      Animated.timing(barGlow, { toValue: 1, duration: 220, useNativeDriver: false }),
    ]).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.parallel([
      Animated.spring(barScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 140 }),
      Animated.timing(barGlow, { toValue: 0, duration: 260, useNativeDriver: false }),
    ]).start();
  };

  // Parallax: hero drifts up slightly slower than scroll, fades out gently.
  const heroTranslate = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [1, 0.35],
    extrapolate: 'clamp',
  });

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: sp.lg,
        paddingTop: sp.xxl,
        paddingBottom: sp.xxxl,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
    >
      {/* ── HERO ── */}
      <Animated.View
        style={{
          alignItems: 'center',
          marginTop: sp.xxl,
          marginBottom: sp.xxl,
          opacity: Animated.multiply(heroOpacity, stagger[0].opacity),
          transform: [
            { translateY: heroTranslate },
            ...stagger[0].transform,
          ],
        }}
      >
        <Animated.Text
          style={[
            {
              color: colors.textMuted,
              fontSize: fs.xs,
              fontWeight: '700',
              letterSpacing: 2.4,
              textAlign: 'center',
            },
            stagger[0],
          ]}
        >
          {greet.toUpperCase()}
        </Animated.Text>

        <Animated.Text
          style={[
            {
              color: colors.text,
              fontSize: 44,
              fontWeight: '800',
              letterSpacing: -1.8,
              marginTop: 6,
              fontVariant: ['tabular-nums'],
            },
            stagger[1],
          ]}
        >
          {timeStr}
        </Animated.Text>

        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 14,
            },
            stagger[2],
          ]}
        >
          <View
            style={{
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <Text
            style={{
              color: colors.textSub,
              fontSize: fs.sm,
              fontWeight: '700',
              letterSpacing: -0.2,
            }}
          >
            Niddle
          </Text>
        </Animated.View>
      </Animated.View>

      {/* ── SEARCH ── */}
      <Animated.View
        style={[
          { zIndex: 30, transform: [{ scale: barScale }] },
          stagger[3],
        ]}
      >
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: sp.md,
            backgroundColor: colors.surface,
            borderRadius: r.pill,
            paddingHorizontal: sp.lg,
            paddingVertical: 15,
            borderWidth: focused ? 1.2 : StyleSheet.hairlineWidth,
            borderColor: barGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.borderHi, colors.borderFocus],
            }),
            shadowColor: colors.accent,
            shadowOpacity: barGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.18],
            }),
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 6 },
            elevation: focused ? 6 : 0,
          }}
        >
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => submit()}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="Search the web or enter a URL"
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: fs.md,
              fontWeight: '500',
              paddingVertical: 0,
            }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {q.length > 0 && (
            <Pressy onPress={() => setQ('')} scaleTo={0.85} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </Pressy>
          )}
        </Animated.View>

        {/* SUGGESTIONS — spring-in, staggered items */}
        {sug.length > 0 && (
          <Animated.View
            pointerEvents={sug.length ? 'auto' : 'none'}
            style={{
              marginTop: sp.sm,
              backgroundColor: colors.bgElev,
              borderRadius: r.lg,
              overflow: 'hidden',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.borderHi,
              ...shadow.card,
              opacity: sugAnim,
              transform: [
                {
                  translateY: sugAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
                {
                  scale: sugAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                  }),
                },
              ],
            }}
          >
            {sug.map((s, i) => (
              <SuggestionRow
                key={`${s}-${i}`}
                text={s}
                isLast={i === sug.length - 1}
                onPress={() => { setSug([]); setQ(''); submit(s); }}
              />
            ))}
          </Animated.View>
        )}
      </Animated.View>

      {/* ── SHORTCUTS ── */}
      <Animated.Text style={[labelStyle, stagger[4]]}>SHORTCUTS</Animated.Text>
      <Animated.View
        style={[
          { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
          stagger[5],
        ]}
      >
        {SHORTCUTS.map((s) => (
          <Shortcut key={s.name} s={s} onPress={onOpen} />
        ))}
      </Animated.View>

      {/* ── RECENT ── */}
      {recent.length > 0 && (
        <>
          <Animated.Text style={[labelStyle, stagger[6]]}>RECENT</Animated.Text>
          <Animated.View style={[{ gap: 2 }, stagger[7]]}>
            {recent.map((it, i) => (
              <RecentRow
                key={i}
                item={it}
                onPress={() => onOpen(it.url)}
              />
            ))}
          </Animated.View>
        </>
      )}
    </Animated.ScrollView>
  );
}

// ─── Suggestion row with per-item entrance ────────────
const SuggestionRow = ({ text, onPress, isLast }) => {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Pressy onPress={onPress} scaleTo={0.98}>
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp.md,
          paddingHorizontal: sp.lg,
          paddingVertical: 13,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          opacity: p,
          transform: [{
            translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }),
          }],
        }}
      >
        <Ionicons name="search-outline" size={14} color={colors.textMuted} />
        <Text
          style={{ flex: 1, color: colors.text, fontSize: fs.sm, fontWeight: '500' }}
          numberOfLines={1}
        >
          {text}
        </Text>
        <Ionicons
          name="arrow-up-outline"
          size={13}
          color={colors.textFaint}
          style={{ transform: [{ rotate: '45deg' }] }}
        />
      </Animated.View>
    </Pressy>
  );
};

// ─── Recent row with fluid press ──────────────────────
const RecentRow = ({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const down = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 6, tension: 240 }).start();
  const up = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 160 }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={down}
      onPressOut={up}
      onPress={onPress}
      style={{ borderRadius: r.md }}
    >
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp.md,
          paddingVertical: 12,
          paddingHorizontal: sp.sm,
          borderRadius: r.md,
          transform: [{ scale }],
        }}
      >
        <View
          style={{
            width: 34, height: 34,
            borderRadius: r.sm,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textSub, fontWeight: '800', fontSize: fs.sm }}>
            {(item.title || hostOf(item.url) || '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.text, fontSize: fs.sm, fontWeight: '600' }}
            numberOfLines={1}
          >
            {item.title || item.url}
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: fs.xs, marginTop: 2 }}
            numberOfLines={1}
          >
            {hostOf(item.url) || item.url}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={13} color={colors.textFaint} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const labelStyle = {
  color: colors.textMuted,
  fontSize: fs.xs,
  fontWeight: '800',
  letterSpacing: 1.8,
  marginTop: sp.xxxl,
  marginBottom: sp.md,
};