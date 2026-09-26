import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, fs, shadow } from '../theme';
import { Glass } from './Glass';

const META = {
  camera:     { icon: 'camera-outline',     label: 'camera' },
  microphone: { icon: 'mic-outline',        label: 'microphone' },
  location:   { icon: 'location-outline',   label: 'location' },
};

export default function PermissionPrompt({ visible, request, onDecide }) {
  if (!request) return null;
  const meta = META[request.permission] || META.camera;

  const decide = (choice) => onDecide(choice);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => decide('deny')}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => decide('deny')}>
        <View style={{ flex: 1, backgroundColor: colors.overlay }} />
      </Pressable>

      <View
        style={{
          position: 'absolute',
          left: sp.lg, right: sp.lg,
          top: '32%',
        }}
      >
        <Glass intensity={96} radius={r.xl} bg={colors.bgElev} style={shadow.card}>
          <View style={{ padding: sp.xl, alignItems: 'center' }}>
            <View
              style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: colors.accentSoft,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: sp.md,
              }}
            >
              <Ionicons name={meta.icon} size={26} color={colors.accentHi} />
            </View>

            <Text
              style={{
                color: colors.text, fontSize: 16, fontWeight: '800',
                textAlign: 'center', letterSpacing: -0.3,
              }}
            >
              {request.domain}
            </Text>
            <Text
              style={{
                color: colors.textSub, fontSize: 13, fontWeight: '500',
                textAlign: 'center', marginTop: 6, lineHeight: 19,
              }}
            >
              wants to use your <Text style={{ color: colors.text, fontWeight: '700' }}>{meta.label}</Text>
            </Text>
          </View>

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

          <TouchableOpacity
            onPress={() => decide('allow-once')}
            style={rowStyle}
            activeOpacity={0.65}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.text} />
            <Text style={rowTextStyle}>Allow once</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => decide('allow')}
            style={rowStyle}
            activeOpacity={0.65}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={colors.accentHi} />
            <Text style={[rowTextStyle, { color: colors.accentHi }]}>Allow on this site</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => decide('deny')}
            style={[rowStyle, { borderBottomWidth: 0 }]}
            activeOpacity={0.65}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
            <Text style={[rowTextStyle, { color: colors.danger }]}>Block</Text>
          </TouchableOpacity>
        </Glass>
      </View>
    </Modal>
  );
}

const rowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: sp.lg,
  paddingHorizontal: sp.lg,
  paddingVertical: 15,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: colors.border,
};

const rowTextStyle = {
  color: colors.text,
  fontSize: fs.sm,
  fontWeight: '600',
};