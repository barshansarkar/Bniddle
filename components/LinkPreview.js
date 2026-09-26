import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  Share, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, sp, r, fs, shadow } from '../theme';
import { Glass } from './Glass';

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
};

const pathOf = (url) => {
  try {
    const u = new URL(url);
    const p = (u.pathname + u.search).replace(/^\/$/, '');
    return p.length > 60 ? p.slice(0, 60) + '…' : p;
  } catch { return ''; }
};

export default function LinkPreview({ visible, url, onClose, onOpen, onOpenNewTab }) {
  if (!url) return null;

  const actions = [
    { icon: 'open-outline',        label: 'Open in this tab',   action: () => { onOpen(url); onClose(); } },
    { icon: 'add-circle-outline',  label: 'Open in new tab',    action: () => { onOpenNewTab(url); onClose(); } },
    {
      icon: 'copy-outline',
      label: 'Copy link',
      action: async () => { try { await Clipboard.setStringAsync(url); } catch {} onClose(); },
    },
    {
      icon: 'share-outline',
      label: 'Share',
      action: async () => { try { await Share.share({ message: url, url }); } catch {} onClose(); },
    },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: colors.overlay }} />
      </Pressable>

      <View
        style={{
          position: 'absolute',
          left: sp.md, right: sp.md,
          bottom: Platform.OS === 'ios' ? 40 : 24,
        }}
      >
        <Glass intensity={96} radius={r.xl} bg={colors.bgElev} style={shadow.card}>
          {/* URL header */}
          <View style={{ padding: sp.lg, flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
            <View
              style={{
                width: 40, height: 40,
                borderRadius: r.md,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                {hostOf(url).slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ color: colors.text, fontSize: fs.md, fontWeight: '700' }}
                numberOfLines={1}
              >
                {hostOf(url)}
              </Text>
              <Text
                style={{ color: colors.textMuted, fontSize: fs.xs, marginTop: 2 }}
                numberOfLines={1}
              >
                {pathOf(url) || url}
              </Text>
            </View>
          </View>

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={a.action}
              activeOpacity={0.65}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: sp.lg,
                paddingHorizontal: sp.lg,
                paddingVertical: 15,
                borderBottomWidth: i < actions.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons name={a.icon} size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: fs.sm, fontWeight: '600' }}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Glass>
      </View>
    </Modal>
  );
}