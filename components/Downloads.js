import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { colors, sp, r, fs } from '../theme';
import { Favicon, hostOf } from './Favicon';

const fmtBytes = (n) => {
  if (!n || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Downloads({ downloads, onClose, onClear, onRemove, onOpen }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>
          Downloads
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {downloads.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Clear Downloads?', 'This removes the list. Files on disk stay.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: onClear },
                ]);
              }}
              style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: r.pill,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ color: colors.danger, fontSize: 12.5, fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingHorizontal: 14, paddingVertical: 6,
              borderRadius: r.pill,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '700' }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>

      {downloads.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="cloud-download-outline" size={44} color={colors.textFaint} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>No downloads yet</Text>
        </View>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingVertical: 6 }}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.border,
                marginLeft: 62,
              }}
            />
          )}
          renderItem={({ item }) => {
            const done = item.status === 'complete';
            const failed = item.status === 'failed';
            return (
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => {
                  if (done) onOpen(item);
                  else if (failed) Alert.alert('Download failed', item.error || 'Unknown error');
                }}
                onLongPress={() => {
                  Alert.alert(item.filename || 'Download', item.url, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove from list', style: 'destructive', onPress: () => onRemove(item.id) },
                  ]);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
              >
                <View
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    backgroundColor: colors.surface,
                    alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {failed ? (
                    <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                  ) : done ? (
                    <Ionicons name="document-outline" size={18} color={colors.accent} />
                  ) : (
                    <Ionicons name="cloud-download-outline" size={18} color={colors.textSub} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}
                    numberOfLines={1}
                  >
                    {item.filename || hostOf(item.url) || 'Download'}
                  </Text>
                  <Text
                    style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {failed
                      ? 'Failed'
                      : done
                        ? `${fmtBytes(item.size)}  ·  Tap to open`
                        : `Downloading…  ${Math.round((item.progress || 0) * 100)}%`}
                  </Text>
                </View>
                {done && (
                  <Ionicons name="open-outline" size={16} color={colors.textFaint} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}