import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Dimensions, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, fs } from '../theme';
import { Favicon } from './Favicon';

const { width } = Dimensions.get('window');
const GAP = sp.md;
const CARD = Math.floor((width - sp.lg * 2 - GAP) / 2);

const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); }
  catch { return ''; }
};

export default function Tabs({ tabs, activeId, onSelect, onClose, onNew, onDone }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: sp.lg,
          paddingTop: sp.xl,
          paddingBottom: sp.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: sp.sm }}>
          <Text
            style={{
              color: colors.text,
              fontSize: fs.xxl,
              fontWeight: '800',
              letterSpacing: -0.6,
            }}
          >
            Tabs
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: fs.md,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
            }}
          >
            {tabs.length}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onDone}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: sp.lg,
            paddingVertical: sp.sm,
            borderRadius: r.pill,
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.borderHi,
          }}
        >
          <Text style={{ color: colors.text, fontSize: fs.sm, fontWeight: '700' }}>Done</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...tabs, { id: '__new__' }]}
        keyExtractor={(t) => t.id}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: sp.lg,
          paddingBottom: sp.xxl,
          gap: GAP,
        }}
        columnWrapperStyle={{ gap: GAP }}
        renderItem={({ item }) => {
          if (item.id === '__new__') {
            return (
              <TouchableOpacity
                onPress={onNew}
                activeOpacity={0.7}
                style={{
                  width: CARD,
                  height: CARD * 1.1,
                  borderRadius: r.lg,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.borderHi,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: sp.sm,
                }}
              >
                <View
                  style={{
                    width: 40, height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="add" size={22} color={colors.textSub} />
                </View>
                <Text style={{ color: colors.textSub, fontSize: fs.xs, fontWeight: '700' }}>
                  New Tab
                </Text>
              </TouchableOpacity>
            );
          }

          const active = item.id === activeId;
          const host = hostOf(item.url) || 'New Tab';

          return (
            <TouchableOpacity
              onPress={() => onSelect(item.id)}
              activeOpacity={0.75}
              style={{
                width: CARD,
                height: CARD * 1.1,
                backgroundColor: active ? colors.surfaceActive : colors.surface,
                borderRadius: r.lg,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
                padding: sp.md,
                justifyContent: 'space-between',
                ...(active ? {
                  shadowColor: colors.accent,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                } : {}),
              }}
            >
              {/* Top row — favicon + title + close */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm }}>
                <Favicon url={item.url} size={22} radius={6} />
                <Text
                  style={{ flex: 1, color: colors.text, fontSize: 11.5, fontWeight: '700' }}
                  numberOfLines={1}
                >
                  {item.title || 'New Tab'}
                </Text>
                <TouchableOpacity
                  onPress={() => onClose(item.id)}
                  hitSlop={10}
                  style={{ padding: 2 }}
                >
                  <Ionicons name="close" size={13} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Center — big favicon or incognito mask */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {item.incognito ? (
                  <Ionicons
                    name="eye-off-outline"
                    size={26}
                    color={active ? colors.purple : colors.textFaint}
                  />
                ) : item.url ? (
                  <View style={{ opacity: active ? 1 : 0.75 }}>
                    <Favicon url={item.url} size={40} radius={10} />
                  </View>
                ) : (
                  <Ionicons
                    name="globe-outline"
                    size={26}
                    color={active ? colors.accentHi : colors.textFaint}
                  />
                )}
              </View>

              {/* Footer — host */}
              <Text
                style={{
                  color: active ? colors.accentHi : colors.textMuted,
                  fontSize: 9.5,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {item.incognito ? 'Private' : host}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}