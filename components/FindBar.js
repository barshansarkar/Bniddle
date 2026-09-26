import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, fs, shadow } from '../theme';
import { Glass } from './Glass';

export default function FindBar({ onFind, onClose, total = 0, current = 0 }) {
  const [q, setQ] = useState('');
  const slide = useRef(new Animated.Value(-20)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const submit = (next = true) => {
    if (!q.trim()) return;
    onFind(q, next);
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: sp.sm, left: sp.md, right: sp.md,
        zIndex: 30,
        opacity: fade,
        transform: [{ translateY: slide }],
      }}
    >
      <Glass intensity={92} radius={r.pill} bg={colors.bgElev} style={shadow.card}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: sp.md,
            height: 48,
            gap: sp.sm,
          }}
        >
          <Ionicons name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => submit(true)}
            autoFocus
            placeholder="Find in page"
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: fs.sm,
              fontWeight: '500',
              paddingVertical: 0,
            }}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {total > 0 && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fs.xs,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            >
              {current}/{total}
            </Text>
          )}
          <TouchableOpacity onPress={() => submit(false)} hitSlop={8} style={{ padding: 5 }}>
            <Ionicons name="chevron-up" size={16} color={colors.textSub} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => submit(true)} hitSlop={8} style={{ padding: 5 }}>
            <Ionicons name="chevron-down" size={16} color={colors.textSub} />
          </TouchableOpacity>
          <View style={{ width: StyleSheet.hairlineWidth, height: 18, backgroundColor: colors.borderHi }} />
          <TouchableOpacity onPress={onClose} hitSlop={8} style={{ padding: 5 }}>
            <Ionicons name="close" size={18} color={colors.textSub} />
          </TouchableOpacity>
        </View>
      </Glass>
    </Animated.View>
  );
}