import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Modal, Pressable, Alert, Linking, Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors, sp, r, fs, shadow } from '../theme';
import { Glass } from './Glass';

const haptic = (type) => {
  try {
    if (type === 'light')    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'warn')    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else Haptics.selectionAsync();
  } catch {}
};

export const SEARCH_ENGINES = [
  { id: 'google',    name: 'Google',     url: 'https://www.google.com/search?q=%s',          icon: 'logo-google',    color: '#4285F4' },
  { id: 'duck',      name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s',                icon: 'shield-checkmark-outline', color: '#DE5833' },
  { id: 'brave',     name: 'Brave',      url: 'https://search.brave.com/search?q=%s',        icon: 'shield-outline', color: '#FB542B' },
  { id: 'bing',      name: 'Bing',       url: 'https://www.bing.com/search?q=%s',             icon: 'logo-microsoft', color: '#008373' },
  { id: 'yahoo',     name: 'Yahoo',      url: 'https://search.yahoo.com/search?p=%s',         icon: 'logo-yahoo',     color: '#6001D2' },
  { id: 'ecosia',    name: 'Ecosia',     url: 'https://www.ecosia.org/search?q=%s',           icon: 'leaf-outline',   color: '#008009' },
  { id: 'startpage', name: 'Startpage',  url: 'https://www.startpage.com/sp/search?query=%s', icon: 'search-outline', color: '#6573FF' },
  { id: 'qwant',     name: 'Qwant',      url: 'https://www.qwant.com/?q=%s',                  icon: 'search-outline', color: '#5C97FF' },
];

export const DEFAULT_SETTINGS = {
  searchEngine: 'google',
  homepage: 'https://www.google.com',
  theme: 'dark',
  // Privacy
  saveHistory: true,
  doNotTrack: true,
  blockPopups: true,
  blockThirdPartyCookies: true,
  // Content
  javascript: true,
  loadImages: true,
  autoplay: false,
  // Accessibility
  fontSize: 100,
  defaultZoom: 100,
  // Browsing
  desktopByDefault: false,
  pullToRefresh: true,
  swipeNavigation: true,
  // Permissions
  locationAccess: false,
  cameraAccess: false,
  micAccess: false,
  notifications: true,
};

const STORAGE_KEY = 'bn:settings';

export const loadSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
};

export const saveSettings = async (s) => {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};

// ─── Rows ────────────────────────────────────────────
const Section = ({ title, children }) => (
  <View style={{ marginBottom: sp.lg }}>
    <Text
      style={{
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.8,
        paddingHorizontal: 16,
        paddingBottom: 8,
      }}
    >
      {title.toUpperCase()}
    </Text>
    <View
      style={{
        backgroundColor: colors.bgElev,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      }}
    >
      {children}
    </View>
  </View>
);

const Row = ({ icon, label, sub, value, onPress, right, danger, last, tint }) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.6 : 1}
    onPress={onPress ? () => { haptic(); onPress(); } : undefined}
    disabled={!onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
      gap: 14,
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    }}
  >
    {icon && (
      <View
        style={{
          width: 30, height: 30,
          borderRadius: 8,
          backgroundColor: tint || colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.textSub} />
      </View>
    )}
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: danger ? colors.danger : colors.text,
          fontSize: 14,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
      {!!sub && (
        <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 2 }}>
          {sub}
        </Text>
      )}
    </View>
    {right ? right : (
      <>
        {!!value && (
          <Text
            style={{ color: colors.textMuted, fontSize: 13, marginRight: 4, maxWidth: 140 }}
            numberOfLines={1}
          >
            {value}
          </Text>
        )}
        {!!onPress && (
          <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
        )}
      </>
    )}
  </TouchableOpacity>
);

const SwitchRow = ({ icon, label, sub, value, onChange, last }) => (
  <Row
    icon={icon}
    label={label}
    sub={sub}
    last={last}
    right={
      <Switch
        value={!!value}
        onValueChange={(v) => { haptic('light'); onChange(v); }}
        trackColor={{ false: 'rgba(120,120,130,0.28)', true: colors.accent }}
        thumbColor="#ffffff"
        ios_backgroundColor="rgba(120,120,130,0.28)"
      />
    }
  />
);

// ─── Screen ──────────────────────────────────────────
export default function Settings({ settings, onChange, onClose }) {
  const [picker, setPicker] = useState(null);
  const [temp, setTemp] = useState(settings);

  useEffect(() => { setTemp(settings); }, [settings]);

  const update = (key, val) => {
    const next = { ...temp, [key]: val };
    setTemp(next);
    onChange(next);
  };

  const clearData = (label, keys) => {
    Alert.alert(
      `Clear ${label}?`,
      `This permanently deletes ${label.toLowerCase()}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            haptic('warn');
            try { for (const k of keys) await AsyncStorage.removeItem(k); } catch {}
            Alert.alert('Done', `${label} cleared.`);
          },
        },
      ]
    );
  };

  const clearEverything = () => {
    Alert.alert(
      'Clear ALL data?',
      'This deletes bookmarks, history, and all settings. The app will reset to defaults.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            haptic('warn');
            try {
              await AsyncStorage.multiRemove(['bn:bm', 'bn:hs', STORAGE_KEY]);
              onChange(DEFAULT_SETTINGS);
              Alert.alert('Reset', 'All data cleared. Restart the app.');
            } catch {}
          },
        },
      ]
    );
  };

  const currentEngine = SEARCH_ENGINES.find((e) => e.id === temp.searchEngine) || SEARCH_ENGINES[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
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
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: '800',
            letterSpacing: -0.5,
          }}
        >
          Settings
        </Text>
        <TouchableOpacity
          onPress={() => { haptic(); onClose(); }}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 14, paddingVertical: 6,
            borderRadius: r.pill,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '700' }}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: sp.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Search">
          <Row
            icon="search-outline"
            label="Search Engine"
            value={currentEngine.name}
            onPress={() => setPicker('searchEngine')}
          />
          <Row
            icon="home-outline"
            label="Homepage"
            value={(temp.homepage || '').replace(/^https?:\/\//, '').slice(0, 30)}
            onPress={() => setPicker('homepage')}
            last
          />
        </Section>

        <Section title="Appearance">
          <Row
            icon="moon-outline"
            label="Theme"
            value={temp.theme === 'dark' ? 'Dark' : temp.theme === 'light' ? 'Light' : 'System'}
            onPress={() => setPicker('theme')}
          />
          <Row
            icon="text-outline"
            label="Font Size"
            value={`${temp.fontSize}%`}
            onPress={() => setPicker('fontSize')}
          />
          <Row
            icon="resize-outline"
            label="Default Zoom"
            value={`${temp.defaultZoom}%`}
            onPress={() => setPicker('zoom')}
            last
          />
        </Section>

        <Section title="Privacy">
          <SwitchRow
            icon="time-outline"
            label="Save Browsing History"
            sub="Record pages you visit"
            value={temp.saveHistory}
            onChange={(v) => update('saveHistory', v)}
          />
          <SwitchRow
            icon="eye-off-outline"
            label="Do Not Track"
            sub="Ask sites not to track you"
            value={temp.doNotTrack}
            onChange={(v) => update('doNotTrack', v)}
          />
          <SwitchRow
            icon="close-circle-outline"
            label="Block Pop-ups"
            sub="Stop sites opening new windows"
            value={temp.blockPopups}
            onChange={(v) => update('blockPopups', v)}
          />
          <SwitchRow
            icon="shield-outline"
            label="Block Third-Party Cookies"
            sub="Stricter privacy, some sites may break"
            value={temp.blockThirdPartyCookies}
            onChange={(v) => update('blockThirdPartyCookies', v)}
            last
          />
        </Section>

        <Section title="Content">
          <SwitchRow
            icon="code-slash-outline"
            label="Enable JavaScript"
            sub="Required by most modern sites"
            value={temp.javascript}
            onChange={(v) => update('javascript', v)}
          />
          <SwitchRow
            icon="image-outline"
            label="Load Images"
            sub="Turn off to save data"
            value={temp.loadImages}
            onChange={(v) => update('loadImages', v)}
          />
          <SwitchRow
            icon="play-circle-outline"
            label="Autoplay Media"
            sub="Play videos automatically"
            value={temp.autoplay}
            onChange={(v) => update('autoplay', v)}
            last
          />
        </Section>

        <Section title="Browsing">
          <SwitchRow
            icon="desktop-outline"
            label="Desktop Site by Default"
            sub="Always request the desktop version"
            value={temp.desktopByDefault}
            onChange={(v) => update('desktopByDefault', v)}
          />
          <SwitchRow
            icon="refresh-outline"
            label="Pull to Refresh"
            sub="Swipe down to reload"
            value={temp.pullToRefresh}
            onChange={(v) => update('pullToRefresh', v)}
          />
          <SwitchRow
            icon="swap-horizontal-outline"
            label="Swipe Navigation"
            sub="Swipe from edges to go back/forward"
            value={temp.swipeNavigation}
            onChange={(v) => update('swipeNavigation', v)}
            last
          />
        </Section>

        <Section title="Permissions">
          <SwitchRow
            icon="location-outline"
            label="Location Access"
            sub="Let sites request your location"
            value={temp.locationAccess}
            onChange={(v) => update('locationAccess', v)}
          />
          <SwitchRow
            icon="camera-outline"
            label="Camera Access"
            sub="Let sites use the camera"
            value={temp.cameraAccess}
            onChange={(v) => update('cameraAccess', v)}
          />
          <SwitchRow
            icon="mic-outline"
            label="Microphone Access"
            sub="Let sites use the microphone"
            value={temp.micAccess}
            onChange={(v) => update('micAccess', v)}
            last
          />
        </Section>

        <Section title="Data">
          <Row
            icon="bookmarks-outline"
            label="Clear Bookmarks"
            sub="Delete all saved bookmarks"
            danger
            onPress={() => clearData('Bookmarks', ['bn:bm'])}
          />
          <Row
            icon="time-outline"
            label="Clear History"
            sub="Delete all browsing history"
            danger
            onPress={() => clearData('History', ['bn:hs'])}
          />
          <Row
            icon="trash-outline"
            label="Clear Everything"
            sub="Bookmarks, history, and settings"
            danger
            onPress={clearEverything}
            last
          />
        </Section>

        <Section title="About">
          <Row icon="information-circle-outline" label="Niddle Browser" value="v1.0.0" />
          <Row
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://example.com/privacy').catch(() => {})}
          />
          <Row
            icon="code-outline"
            label="Open Source Licenses"
            onPress={() => Alert.alert('Licenses', 'MIT • React Native • Expo\nWebView • Ionicons')}
            last
          />
        </Section>

        <Text
          style={{
            textAlign: 'center',
            color: colors.textFaint,
            fontSize: 11,
            marginTop: 8,
            marginBottom: 20,
          }}
        >
          Made with care · Niddle
        </Text>
      </ScrollView>

      {/* Pickers */}
      <PickerModal
        visible={picker === 'searchEngine'}
        title="Search Engine"
        onClose={() => setPicker(null)}
        items={SEARCH_ENGINES.map((e) => ({
          id: e.id, label: e.name, icon: e.icon, color: e.color,
        }))}
        selected={temp.searchEngine}
        onSelect={(id) => { update('searchEngine', id); setPicker(null); }}
      />

      <PickerModal
        visible={picker === 'theme'}
        title="Theme"
        onClose={() => setPicker(null)}
        items={[
          { id: 'dark',   label: 'Dark',   icon: 'moon-outline' },
          { id: 'light',  label: 'Light',  icon: 'sunny-outline' },
          { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
        ]}
        selected={temp.theme}
        onSelect={(id) => { update('theme', id); setPicker(null); }}
      />

      <SliderModal
        visible={picker === 'fontSize'}
        title="Font Size"
        value={temp.fontSize}
        min={70} max={150} step={5}
        format={(v) => `${v}%`}
        onClose={() => setPicker(null)}
        onConfirm={(v) => { update('fontSize', v); setPicker(null); }}
      />

      <SliderModal
        visible={picker === 'zoom'}
        title="Default Zoom"
        value={temp.defaultZoom}
        min={50} max={200} step={10}
        format={(v) => `${v}%`}
        onClose={() => setPicker(null)}
        onConfirm={(v) => { update('defaultZoom', v); setPicker(null); }}
      />

      <HomepageModal
        visible={picker === 'homepage'}
        value={temp.homepage}
        onClose={() => setPicker(null)}
        onConfirm={(v) => { update('homepage', v); setPicker(null); }}
      />
    </View>
  );
}

// ─── Pickers ─────────────────────────────────────────
function PickerModal({ visible, title, items, selected, onSelect, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: colors.overlay }} />
      </Pressable>
      <View style={{ position: 'absolute', left: 20, right: 20, top: '18%' }}>
        <Glass intensity={96} radius={r.lg} bg={colors.bgElev} style={shadow.card}>
          <View
            style={{
              padding: 16,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
              {title}
            </Text>
          </View>
          {items.map((it, i) => {
            const isSel = it.id === selected;
            return (
              <TouchableOpacity
                key={it.id}
                onPress={() => { haptic(); onSelect(it.id); }}
                activeOpacity={0.65}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 16, paddingVertical: 13,
                  borderBottomWidth: i < items.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: colors.border,
                }}
              >
                {it.icon && (
                  <Ionicons name={it.icon} size={18} color={it.color || colors.textSub} />
                )}
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: isSel ? '700' : '500',
                  }}
                >
                  {it.label}
                </Text>
                {isSel && <Ionicons name="checkmark" size={18} color={colors.accent} />}
              </TouchableOpacity>
            );
          })}
        </Glass>
      </View>
    </Modal>
  );
}

function SliderModal({ visible, title, value, min, max, step, format, onConfirm, onClose }) {
  const [v, setV] = useState(value);
  useEffect(() => { if (visible) setV(value); }, [visible, value]);
  const dec = () => setV((x) => Math.max(min, x - step));
  const inc = () => setV((x) => Math.min(max, x + step));

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: colors.overlay }} />
      </Pressable>
      <View style={{ position: 'absolute', left: 30, right: 30, top: '32%' }}>
        <Glass intensity={96} radius={r.lg} bg={colors.bgElev} style={shadow.card}>
          <View style={{ padding: 20 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 16 }}>
              {title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity
                onPress={() => { haptic('light'); dec(); }}
                style={circleBtnStyle}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text
                style={{
                  flex: 1,
                  textAlign: 'center',
                  color: colors.text,
                  fontSize: 28,
                  fontWeight: '800',
                  letterSpacing: -0.5,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {format(v)}
              </Text>
              <TouchableOpacity
                onPress={() => { haptic('light'); inc(); }}
                style={circleBtnStyle}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: r.md,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { haptic('success'); onConfirm(v); }}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: r.md,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Glass>
      </View>
    </Modal>
  );
}

const circleBtnStyle = {
  width: 42, height: 42, borderRadius: 21,
  backgroundColor: colors.surface,
  alignItems: 'center', justifyContent: 'center',
};

function HomepageModal({ visible, value, onConfirm, onClose }) {
  const [v, setV] = useState(value || '');
  useEffect(() => { if (visible) setV(value || ''); }, [visible, value]);

  const presets = [
    { label: 'Google',     url: 'https://www.google.com' },
    { label: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    { label: 'Bing',       url: 'https://www.bing.com' },
    { label: 'Brave',      url: 'https://search.brave.com' },
    { label: 'Wikipedia',  url: 'https://www.wikipedia.org' },
    { label: 'YouTube',    url: 'https://www.youtube.com' },
    { label: 'Reddit',     url: 'https://www.reddit.com' },
    { label: 'GitHub',     url: 'https://github.com' },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: colors.overlay }} />
      </Pressable>
      <View style={{ position: 'absolute', left: 20, right: 20, top: '20%' }}>
        <Glass intensity={96} radius={r.lg} bg={colors.bgElev} style={shadow.card}>
          <View
            style={{
              padding: 16,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12 }}>
              Homepage
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: r.sm,
                paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'ios' ? 11 : 5,
              }}
            >
              <TextInput
                value={v}
                onChangeText={setV}
                onSubmitEditing={() => onConfirm(v)}
                placeholder="https://example.com"
                placeholderTextColor={colors.textMuted}
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: '500',
                  paddingVertical: 0,
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
              />
            </View>
            <TouchableOpacity
              onPress={() => { haptic('success'); onConfirm(v); }}
              style={{
                marginTop: 12,
                paddingVertical: 11,
                borderRadius: r.sm,
                backgroundColor: colors.accent,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              color: colors.textMuted, fontSize: 11, fontWeight: '800',
              letterSpacing: 1.4, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
            }}
          >
            QUICK PICKS
          </Text>
          {presets.map((p, i) => (
            <TouchableOpacity
              key={p.url}
              onPress={() => { haptic(); setV(p.url); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 16, paddingVertical: 11,
                borderBottomWidth: i < presets.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons name="globe-outline" size={15} color={colors.textSub} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' }}>
                {p.label}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>
                {p.url.replace(/^https?:\/\//, '')}
              </Text>
            </TouchableOpacity>
          ))}
        </Glass>
      </View>
    </Modal>
  );
}