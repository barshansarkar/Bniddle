import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  Platform, KeyboardAvoidingView, BackHandler, Modal, Pressable,
  Animated, Easing, FlatList, Share, ActivityIndicator, Appearance,
  Linking, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { colors, sp, r, fs, setTheme, shadow } from './theme';
import { Glass } from './components/Glass';
import Home from './components/Home';
import Tabs from './components/Tabs';
import FindBar from './components/FindBar';
import LinkPreview from './components/LinkPreview';
import Downloads from './components/Downloads';
import PermissionPrompt from './components/PermissionPrompt';
import { Favicon, hostOf } from './components/Favicon';
import Settings, {
  loadSettings, saveSettings, SEARCH_ENGINES, DEFAULT_SETTINGS,
} from './components/Settings';

// ─── helpers ─────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

const pathOf = (url) => {
  try {
    const u = new URL(url);
    const p = (u.pathname + u.search).replace(/^\/$/, '');
    return p.length > 30 ? p.slice(0, 30) + '…' : p;
  } catch { return ''; }
};

const haptic = (type) => {
  try {
    if (type === 'light')    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'warn')    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else Haptics.selectionAsync();
  } catch {}
};

const makeTab = (incognito = false, url = null, desktop = false) => ({
  id: uid(),
  url,
  title: url ? 'Loading…' : 'New Tab',
  canGoBack: false,
  canGoForward: false,
  loading: !!url,
  progress: 0,
  incognito,
  desktop,
  reader: false,
});

const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

// ─── Injected JS ─────────────────────────────────────
const buildInjectedBefore = (settings) => `
(function() {
  window.__bnSettings = {
    fontSize: ${Number(settings.fontSize) || 100},
    zoom: ${Number(settings.defaultZoom) || 100},
    doNotTrack: ${!!settings.doNotTrack},
  };
  true;
})();
`;

const buildInjectedAfter = () => `
(function() {
  if (window.__bn_installed) return;
  window.__bn_installed = true;

  var applyLayout = function() {
    try {
      var s = window.__bnSettings || {};
      if (s.fontSize) {
        var px = Math.round((s.fontSize / 100) * 16);
        document.documentElement.style.fontSize = px + 'px';
      }
      if (s.zoom) {
        try { document.documentElement.style.zoom = (s.zoom / 100); } catch(e) {}
      }
    } catch(e) {}
  };
  applyLayout();

  // Long-press link detection
  var timer = null;
  document.addEventListener('touchstart', function(e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a || !a.href) return;
    timer = setTimeout(function() {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'link-longpress', href: a.href })
      );
    }, 500);
  }, true);
  ['touchend','touchcancel','touchmove','scroll'].forEach(function(ev) {
    document.addEventListener(ev, function() {
      if (timer) { clearTimeout(timer); timer = null; }
    }, true);
  });

  // ── Per-site permission interception (camera + mic) ──
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    var origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    var pending = {};
    var reqId = 0;
    navigator.mediaDevices.getUserMedia = function(constraints) {
      constraints = constraints || {};
      var perm = constraints.video ? 'camera' : 'microphone';
      var id = ++reqId;
      return new Promise(function(resolve, reject) {
        pending[id] = { resolve: resolve, reject: reject, constraints: constraints };
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'permission-request',
          permission: perm,
          domain: location.hostname,
          reqId: id,
        }));
      });
    };
    window.__bn_respondPermission = function(id, allowed) {
      var p = pending[id];
      if (!p) return;
      delete pending[id];
      if (allowed) {
        origGUM(p.constraints).then(p.resolve).catch(p.reject);
      } else {
        p.reject(new Error('Permission denied'));
      }
    };
  }

  true;
})();
`;

const RESPOND_PERMISSION_JS = (id, allowed) => `
(function() {
  try {
    if (window.__bn_respondPermission) {
      window.__bn_respondPermission(${id}, ${allowed ? 'true' : 'false'});
    }
  } catch(e) {}
})(); true;
`;

const FIND_JS = (q, forward) => `
(function() {
  try {
    if (!window.__bn_find) window.__bn_find = { q: null, marks: [], idx: -1 };
    const state = window.__bn_find;
    if (state.q !== ${JSON.stringify(q)}) {
      document.querySelectorAll('mark.__bn_find').forEach(function(m) {
        const parent = m.parentNode;
        parent.replaceChild(document.createTextNode(m.textContent), m);
        parent.normalize();
      });
      state.q = ${JSON.stringify(q)};
      state.idx = -1;
      state.marks = [];
      if (!state.q) return;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = []; let n;
      while ((n = walker.nextNode())) nodes.push(n);
      const lower = state.q.toLowerCase();
      nodes.forEach(function(node) {
        const text = node.textContent || '';
        const lowerText = text.toLowerCase();
        let i = 0, pos;
        const frag = document.createDocumentFragment();
        while ((pos = lowerText.indexOf(lower, i)) !== -1) {
          if (pos > i) frag.appendChild(document.createTextNode(text.slice(i, pos)));
          const mark = document.createElement('mark');
          mark.className = '__bn_find';
          mark.style.background = 'rgba(59,130,246,0.5)';
          mark.style.color = '#fff';
          mark.textContent = text.slice(pos, pos + state.q.length);
          frag.appendChild(mark);
          state.marks.push(mark);
          i = pos + state.q.length;
        }
        if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
        if (i > 0) node.parentNode.replaceChild(frag, node);
      });
    }
    const step = ${forward ? 1 : -1};
    if (state.marks.length === 0) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'find-result', total: 0, current: 0 }));
      return;
    }
    state.idx = (state.idx + step + state.marks.length) % state.marks.length;
    state.marks.forEach(function(m, i) {
      m.style.background = i === state.idx ? 'rgba(251,191,36,0.95)' : 'rgba(59,130,246,0.4)';
    });
    const target = state.marks[state.idx];
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'find-result', total: state.marks.length, current: state.idx + 1 })
    );
  } catch (err) {}
})(); true;
`;

const READER_JS = `
(function() {
  if (window.__bn_reader) {
    document.documentElement.removeAttribute('data-bn-reader');
    const old = document.getElementById('__bn_reader_style');
    if (old) old.remove();
    window.__bn_reader = false;
    return;
  }
  const article = document.querySelector('article') || document.querySelector('main') || document.body;
  if (!article) return;
  const style = document.createElement('style');
  style.id = '__bn_reader_style';
  style.textContent =
    'body * { visibility: hidden !important; } ' +
    'article, article *, main, main *, body > p, body > h1, body > h2, body > h3, body > ul, body > ol, body > blockquote, body > pre, body > img { visibility: visible !important; } ' +
    'body { background: #fbfbfb !important; color: #111 !important; font-family: Georgia, serif !important; font-size: 18px !important; line-height: 1.7 !important; padding: 24px !important; max-width: 720px !important; margin: 0 auto !important; } ' +
    'a { color: #2563eb !important; } img { max-width: 100% !important; height: auto !important; }';
  document.head.appendChild(style);
  window.__bn_reader = true;
})(); true;
`;

const LIVE_APPLY_JS = (settings) => `
(function() {
  try {
    document.documentElement.style.fontSize = '${Math.round((settings.fontSize / 100) * 16)}px';
    try { document.documentElement.style.zoom = '${settings.defaultZoom / 100}'; } catch(e) {}
  } catch(e) {}
})(); true;
`;

// ─── Session storage keys ────────────────────────────
const K = {
  BM:    'bn:bm',
  HS:    'bn:hs',
  RC:    'bn:rc',
  TABS:  'bn:tabs',
  PERMS: 'bn:perms',
  DL:    'bn:dl',
  SETT:  'bn:settings',
};

const guessFilename = (url) => {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop() || '';
    if (seg && /\.\w{2,5}$/.test(seg)) return decodeURIComponent(seg);
    return `${u.hostname.replace(/^www\./, '')}-${Date.now()}`;
  } catch {
    return `download-${Date.now()}`;
  }
};

// ─── App ─────────────────────────────────────────────
export default function App() {
  const initial = useRef(makeTab()).current;

  const [tabs, setTabs] = useState([initial]);
  const [activeId, setActiveId] = useState(initial.id);
  const [screen, setScreen] = useState('web');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [recentClosed, setRecentClosed] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [permissions, setPermissions] = useState({}); // domain -> { camera, microphone }
  const [pendingPerm, setPendingPerm] = useState(null); // { tabId, domain, permission, reqId }
  const [bootstrapped, setBootstrapped] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findStats, setFindStats] = useState({ total: 0, current: 0 });
  const [linkPreview, setLinkPreview] = useState(null);
  const [siteInfoOpen, setSiteInfoOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [themeKey, setThemeKey] = useState(0);

  const webRefs = useRef({});
  const menuAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const sessionSaveTimer = useRef(null);

  const active = tabs.find((t) => t.id === activeId) || tabs[0];
  const isBookmarked = !!(active?.url && bookmarks.find((b) => b.url === active.url));

  // ── Load persisted state on mount ──
  useEffect(() => {
    (async () => {
      try {
        const [b, h, rc, tabsRaw, perms, dl, s] = await Promise.all([
          AsyncStorage.getItem(K.BM),
          AsyncStorage.getItem(K.HS),
          AsyncStorage.getItem(K.RC),
          AsyncStorage.getItem(K.TABS),
          AsyncStorage.getItem(K.PERMS),
          AsyncStorage.getItem(K.DL),
          loadSettings(),
        ]);
        if (b) setBookmarks(JSON.parse(b));
        if (h) setHistory(JSON.parse(h));
        if (rc) setRecentClosed(JSON.parse(rc));
        if (perms) setPermissions(JSON.parse(perms));
        if (dl) setDownloads(JSON.parse(dl).map((d) => d.status === 'downloading' ? { ...d, status: 'failed', error: 'Interrupted' } : d));

        // Session restore
        if (tabsRaw && s && s.restoreSession !== false) {
          const restored = JSON.parse(tabsRaw);
          if (Array.isArray(restored) && restored.length) {
            const hydrated = restored.map((t) => ({
              ...makeTab(!!t.incognito, t.url || null, !!t.desktop),
              id: t.id || uid(),
              title: t.title || (t.url ? 'Loading…' : 'New Tab'),
              loading: !!t.url,
            }));
            // Skip incognito on restore
            const safe = hydrated.filter((t) => !t.incognito);
            const list = safe.length ? safe : [makeTab()];
            setTabs(list);
            setActiveId(list[0].id);
          }
        }

        setTheme(s.theme);
        setSettings(s);
        setThemeKey((k) => k + 1);
      } catch {}
      setBootstrapped(true);
    })();
  }, []);

  // ── Persist session (non-incognito tabs) ──
  useEffect(() => {
    if (!bootstrapped) return;
    if (sessionSaveTimer.current) clearTimeout(sessionSaveTimer.current);
    sessionSaveTimer.current = setTimeout(() => {
      const payload = tabs
        .filter((t) => !t.incognito)
        .map((t) => ({
          id: t.id, url: t.url, title: t.title,
          desktop: t.desktop, incognito: false,
        }));
      AsyncStorage.setItem(K.TABS, JSON.stringify(payload)).catch(() => {});
    }, 400);
    return () => sessionSaveTimer.current && clearTimeout(sessionSaveTimer.current);
  }, [tabs, bootstrapped]);

  // ── Persist permissions + downloads ──
  useEffect(() => {
    if (!bootstrapped) return;
    AsyncStorage.setItem(K.PERMS, JSON.stringify(permissions)).catch(() => {});
  }, [permissions, bootstrapped]);

  useEffect(() => {
    if (!bootstrapped) return;
    AsyncStorage.setItem(K.DL, JSON.stringify(downloads)).catch(() => {});
  }, [downloads, bootstrapped]);

  // ── System theme listener ──
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const sub = Appearance.addChangeListener(() => {
      setTheme('system');
      setThemeKey((k) => k + 1);
    });
    return () => sub.remove();
  }, [settings.theme]);

  // ── JS toggle → reload ──
  useEffect(() => {
    if (!bootstrapped) return;
    Object.keys(webRefs.current).forEach((id) => {
      const ref = webRefs.current[id];
      if (ref) { try { ref.reload(); } catch {} }
    });
  }, [settings.javascript]);

  // ── Live font/zoom ──
  useEffect(() => {
    Object.keys(webRefs.current).forEach((id) => {
      const ref = webRefs.current[id];
      if (ref) { try { ref.injectJavaScript(LIVE_APPLY_JS(settings)); } catch {} }
    });
  }, [settings.fontSize, settings.defaultZoom]);

  // ── Progress bar ──
  useEffect(() => {
    const target = active?.loading ? Math.max(0.05, active.progress) : 0;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: active?.loading ? 220 : 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active?.loading, active?.progress]);

  // ── URL autocomplete + suggestions ──
  useEffect(() => {
    const term = (draft || '').trim();
    if (!editing) { setSuggestions([]); return; }
    if (term.length < 1) { setSuggestions([]); return; }

    const lower = term.toLowerCase();

    // 1) Direct URL detection
    const looksLikeUrl =
      /^https?:\/\//i.test(term) ||
      (/^[\w-]+(\.[\w-]+)+/.test(term) && !term.includes(' '));

    const items = [];

    // 2) History/bookmark exact & prefix matches
    const fromHistory = history
      .filter((h) => (h.url + ' ' + (h.title || '')).toLowerCase().includes(lower))
      .slice(0, 3)
      .map((h) => ({
        type: 'history',
        value: h.url,
        title: h.title || h.url,
        sub: hostOf(h.url),
      }));

    const fromBookmarks = bookmarks
      .filter((b) => (b.url + ' ' + (b.title || '')).toLowerCase().includes(lower))
      .slice(0, 2)
      .map((b) => ({
        type: 'bookmark',
        value: b.url,
        title: b.title || b.url,
        sub: hostOf(b.url),
      }));

    // 3) Inline autocomplete — top hit from history/bookmark
    const topHit = fromHistory[0] || fromBookmarks[0];

    // 4) Direct "Go to" row if it looks like a URL
    if (looksLikeUrl) {
      const url = /^https?:\/\//i.test(term) ? term : `https://${term}`;
      items.push({
        type: 'direct',
        value: url,
        title: url,
        sub: 'Go',
      });
    } else if (topHit) {
      items.push({
        type: 'direct',
        value: topHit.value,
        title: topHit.value,
        sub: 'Go',
      });
    }

    // 5) Merge remaining
    items.push(...fromBookmarks);
    items.push(...fromHistory.filter((_, i) => i > 0));

    // 6) Search suggestions (debounced network)
    const t = setTimeout(async () => {
      let remote = [];
      if (term.length >= 2) {
        try {
          const res = await fetch(
            `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(term)}`
          );
          const j = await res.json();
          remote = (j[1] || []).slice(0, 5).map((s) => ({
            type: 'search',
            value: s,
            title: s,
          }));
        } catch {}
      }
      setSuggestions([...items, ...remote].slice(0, 8));
    }, 140);

    // Emit an immediate placeholder so direct/history entries show up instantly
    setSuggestions(items.slice(0, 8));
    return () => clearTimeout(t);
  }, [draft, editing, history, bookmarks]);

  const save = useCallback((k, v) => {
    AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
  }, []);

  const patch = useCallback((id, p) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...(typeof p === 'function' ? p(t) : p) } : t)));
  }, []);

  const normalize = useCallback((raw) => {
    const s = (raw || '').trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[\w-]+(\.[\w-]+)+/.test(s) && !s.includes(' ')) return `https://${s}`;
    const engine = SEARCH_ENGINES.find((e) => e.id === settings.searchEngine) || SEARCH_ENGINES[0];
    return engine.url.replace('%s', encodeURIComponent(s));
  }, [settings.searchEngine]);

  const go = useCallback((raw) => {
    const target = normalize(raw);
    if (!target) return;
    haptic('light');
    patch(activeId, { url: target, loading: true, progress: 0, title: 'Loading…' });
    setScreen('web');
    setEditing(false);
    setDraft('');
    setSuggestions([]);
    setFindOpen(false);
  }, [activeId, patch, normalize]);

  const addTab = useCallback((incog = false, url = null) => {
    const t = makeTab(incog, url, settings.desktopByDefault);
    setTabs((prev) => [...prev, t]);
    setActiveId(t.id);
    setScreen('web');
    haptic('medium');
  }, [settings.desktopByDefault]);

  const closeTab = useCallback((id) => {
    haptic('light');
    setTabs((prev) => {
      const closing = prev.find((t) => t.id === id);
      if (closing?.url) {
        setRecentClosed((rc) => {
          const next = [{ url: closing.url, title: closing.title, ts: Date.now() }, ...rc].slice(0, 10);
          save(K.RC, next);
          return next;
        });
      }

      if (prev.length <= 1) {
        const fresh = makeTab(false, null, settings.desktopByDefault);
        setActiveId(fresh.id);
        delete webRefs.current[id];
        return [fresh];
      }
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      delete webRefs.current[id];
      if (id === activeId) {
        const fb = next[Math.min(idx, next.length - 1)];
        setActiveId(fb.id);
      }
      return next;
    });
  }, [activeId, settings.desktopByDefault, save]);

  const reopenClosed = useCallback(() => {
    const [last, ...rest] = recentClosed;
    if (!last) return;
    setRecentClosed(rest);
    save(K.RC, rest);
    addTab(false, last.url);
    haptic('success');
  }, [recentClosed, addTab, save]);

  const selectTab = useCallback((id) => {
    haptic();
    setActiveId(id);
    setScreen('web');
  }, []);

  const toggleBookmark = useCallback(() => {
    if (!active?.url) return;
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.url === active.url);
      const next = exists
        ? prev.filter((b) => b.url !== active.url)
        : [{ url: active.url, title: active.title || active.url, ts: Date.now() }, ...prev].slice(0, 300);
      save(K.BM, next);
      haptic(exists ? 'warn' : 'success');
      return next;
    });
  }, [active, save]);

  const record = useCallback((url, title, incog) => {
    if (!url || url === 'about:blank' || incog) return;
    if (!settings.saveHistory) return;
    setHistory((prev) => {
      const next = [
        { url, title: title || url, ts: Date.now() },
        ...prev.filter((h) => h.url !== url),
      ].slice(0, 400);
      save(K.HS, next);
      return next;
    });
  }, [save, settings.saveHistory]);

  const updateSettings = useCallback((next) => {
    const themeChanged = next.theme !== settings.theme;
    setSettings(next);
    saveSettings(next);
    if (themeChanged) {
      setTheme(next.theme);
      setThemeKey((k) => k + 1);
    }
  }, [settings.theme]);

  // ── Permissions ──
  const resolvePermission = useCallback((domain, permission, decision) => {
    setPermissions((prev) => {
      const entry = { ...(prev[domain] || {}) };
      if (decision === 'allow') entry[permission] = 'allow';
      else if (decision === 'deny') entry[permission] = 'deny';
      // 'allow-once' → don't store
      const next = { ...prev, [domain]: entry };
      save(K.PERMS, next);
      return next;
    });
  }, [save]);

  const handlePermissionRequest = useCallback((tabId, data) => {
    const { domain, permission, reqId } = data;
    const stored = permissions[domain]?.[permission];
    if (stored === 'allow') {
      webRefs.current[tabId]?.injectJavaScript(RESPOND_PERMISSION_JS(reqId, true));
      return;
    }
    if (stored === 'deny') {
      webRefs.current[tabId]?.injectJavaScript(RESPOND_PERMISSION_JS(reqId, false));
      return;
    }
    haptic('medium');
    setPendingPerm({ tabId, domain, permission, reqId });
  }, [permissions]);

  const decidePermission = useCallback((choice) => {
    const p = pendingPerm;
    if (!p) return;
    setPendingPerm(null);
    haptic(choice === 'deny' ? 'warn' : 'success');

    if (choice === 'allow' || choice === 'deny') {
      resolvePermission(p.domain, p.permission, choice);
    }
    const allowed = choice === 'allow' || choice === 'allow-once';
    webRefs.current[p.tabId]?.injectJavaScript(RESPOND_PERMISSION_JS(p.reqId, allowed));
  }, [pendingPerm, resolvePermission]);

  // ── Downloads ──
  const startDownload = useCallback(async (tabId, url, suggestedName) => {
    const id = uid();
    const filename = suggestedName || guessFilename(url);
    const safe = filename.replace(/[^\w.\-]+/g, '_');
    const dir = FileSystem.documentDirectory + 'downloads/';
    const fileUri = dir + `${id}-${safe}`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch {}

    setDownloads((prev) => [
      { id, url, filename: safe, path: fileUri, size: 0, progress: 0, status: 'downloading', ts: Date.now() },
      ...prev,
    ].slice(0, 100));

    haptic('light');

    try {
      const res = await FileSystem.createDownloadResumable(
        url, fileUri, {},
        (prog) => {
          const total = prog.totalBytesExpectedToWrite || 0;
          const written = prog.totalBytesWritten || 0;
          setDownloads((prev) => prev.map((d) =>
            d.id === id ? { ...d, progress: total ? written / total : 0, size: written } : d
          ));
        }
      );
      const result = await res.downloadAsync();
      if (result?.uri) {
        const info = await FileSystem.getInfoAsync(result.uri);
        setDownloads((prev) => prev.map((d) =>
          d.id === id ? { ...d, status: 'complete', size: info.size || d.size, progress: 1, path: result.uri } : d
        ));
        haptic('success');
      } else {
        throw new Error('Download did not complete');
      }
    } catch (e) {
      setDownloads((prev) => prev.map((d) =>
        d.id === id ? { ...d, status: 'failed', error: String(e?.message || e) } : d
      ));
      haptic('warn');
    }
  }, []);

  const openDownload = useCallback(async (item) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(item.path);
      } else {
        await Linking.openURL(item.path);
      }
    } catch (e) {
      Alert.alert('Cannot open file', String(e?.message || e));
    }
  }, []);

  const removeDownload = useCallback((id) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearDownloads = useCallback(() => {
    setDownloads([]);
    AsyncStorage.removeItem(K.DL).catch(() => {});
  }, []);

  // ── Back handler ──
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pendingPerm) { decidePermission('deny'); return true; }
      if (linkPreview) { setLinkPreview(null); return true; }
      if (siteInfoOpen) { setSiteInfoOpen(false); return true; }
      if (findOpen) { setFindOpen(false); setFindStats({ total: 0, current: 0 }); return true; }
      if (menuOpen) { setMenuOpen(false); return true; }
      if (editing) { setEditing(false); setDraft(''); setSuggestions([]); return true; }
      if (screen !== 'web') { setScreen('web'); return true; }
      if (active?.canGoBack) { webRefs.current[activeId]?.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [menuOpen, editing, screen, active?.canGoBack, activeId, findOpen, linkPreview, siteInfoOpen, pendingPerm, decidePermission]);

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: menuOpen ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [menuOpen]);

  const onNavChange = useCallback((tabId, state, incog) => {
    patch(tabId, {
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      title: state.title || state.url,
      url: state.url,
    });
    record(state.url, state.title, incog);
  }, [patch, record]);

  const onMessage = useCallback((tabId, e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data || '{}');
      if (data.type === 'link-longpress' && data.href) {
        haptic('medium');
        setLinkPreview(data.href);
      } else if (data.type === 'find-result') {
        setFindStats({ total: data.total || 0, current: data.current || 0 });
      } else if (data.type === 'permission-request') {
        handlePermissionRequest(tabId, data);
      }
    } catch {}
  }, [handlePermissionRequest]);

  const goBack = useCallback(() => {
    if (!active?.canGoBack) return;
    haptic();
    webRefs.current[activeId]?.goBack();
  }, [active, activeId]);

  const goForward = useCallback(() => {
    if (!active?.canGoForward) return;
    haptic();
    webRefs.current[activeId]?.goForward();
  }, [active, activeId]);

  const goHome = useCallback(() => {
    haptic();
    if (settings.homepage && settings.homepage !== 'https://www.google.com') {
      const target = normalize(settings.homepage);
      if (target) {
        patch(activeId, { url: target, loading: true, progress: 0, title: 'Loading…' });
        setScreen('web');
        setFindOpen(false);
        return;
      }
    }
    patch(activeId, { url: null, title: 'New Tab', canGoBack: false, canGoForward: false });
    setScreen('web');
    setFindOpen(false);
  }, [activeId, patch, settings.homepage, normalize]);

  const reload = useCallback(() => {
    if (!active?.url) return;
    haptic();
    if (active.loading) webRefs.current[activeId]?.stopLoading();
    else webRefs.current[activeId]?.reload();
  }, [active, activeId]);

  const runFind = useCallback((q, forward) => {
    if (!active?.url) return;
    webRefs.current[activeId]?.injectJavaScript(FIND_JS(q, forward));
  }, [active, activeId]);

  const clearFind = useCallback(() => {
    if (!active?.url) return;
    webRefs.current[activeId]?.injectJavaScript(FIND_JS('', true));
    setFindStats({ total: 0, current: 0 });
  }, [active, activeId]);

  const toggleDesktop = useCallback(() => {
    haptic();
    const nextVal = !active.desktop;
    patch(activeId, { desktop: nextVal, loading: true });
    setTimeout(() => webRefs.current[activeId]?.reload(), 60);
  }, [active, activeId, patch]);

  const toggleReader = useCallback(() => {
    if (!active?.url) return;
    haptic();
    const nextVal = !active.reader;
    patch(activeId, { reader: nextVal });
    webRefs.current[activeId]?.injectJavaScript(READER_JS);
  }, [active, activeId, patch]);

  const share = useCallback(async () => {
    if (!active?.url) return;
    haptic();
    try { await Share.share({ message: active.url, url: active.url }); } catch {}
  }, [active]);

  const copyUrl = useCallback(async () => {
    if (!active?.url) return;
    haptic('success');
    try { await Clipboard.setStringAsync(active.url); } catch {}
  }, [active]);

  const pasteAndGo = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) go(text);
    } catch {}
  }, [go]);

  const zoom = useCallback((delta) => {
    if (!active?.url) return;
    haptic();
    webRefs.current[activeId]?.injectJavaScript(`
      (function(){
        var cur = parseFloat(document.documentElement.style.zoom || '1');
        var nxt = Math.min(3, Math.max(0.5, cur + ${delta}));
        document.documentElement.style.zoom = nxt;
      })(); true;
    `);
  }, [active, activeId]);

  const goBackOrHome = useCallback(() => {
    if (active?.canGoBack) { goBack(); return; }
    if (active?.url) goHome();
  }, [active, goBack, goHome]);

  const menu = useMemo(() => ([
    { section: 'Tab' },
    { icon: 'add-outline',          label: 'New Tab',        action: () => addTab() },
    { icon: 'eye-off-outline',      label: 'New Incognito',  action: () => addTab(true) },
    ...(recentClosed.length
      ? [{ icon: 'arrow-undo-outline', label: 'Reopen Closed Tab', action: reopenClosed }]
      : []),

    { section: 'Page' },
    {
      icon: isBookmarked ? 'star' : 'star-outline',
      label: isBookmarked ? 'Remove Bookmark' : 'Add Bookmark',
      action: toggleBookmark, disabled: !active?.url,
    },
    { icon: 'search-outline', label: 'Find in Page',  action: () => setFindOpen(true), disabled: !active?.url },
    { icon: 'copy-outline',   label: 'Copy Link',     action: copyUrl,    disabled: !active?.url },
    { icon: 'share-outline',  label: 'Share',         action: share,      disabled: !active?.url },
    {
      icon: active?.desktop ? 'phone-portrait-outline' : 'desktop-outline',
      label: active?.desktop ? 'Request Mobile Site' : 'Request Desktop Site',
      action: toggleDesktop, disabled: !active?.url,
    },
    {
      icon: active?.reader ? 'close-circle-outline' : 'book-outline',
      label: active?.reader ? 'Exit Reader Mode' : 'Reader Mode',
      action: toggleReader, disabled: !active?.url,
    },
    { icon: 'add-outline',    label: 'Zoom In',  action: () => zoom(0.15), disabled: !active?.url },
    { icon: 'remove-outline', label: 'Zoom Out', action: () => zoom(-0.15), disabled: !active?.url },

    { section: 'Library' },
    { icon: 'bookmarks-outline', label: 'Bookmarks', action: () => setScreen('bookmarks') },
    { icon: 'time-outline',      label: 'History',   action: () => setScreen('history') },
    { icon: 'cloud-download-outline', label: `Downloads${downloads.length ? ` (${downloads.length})` : ''}`, action: () => setScreen('downloads') },

    { section: 'App' },
    { icon: 'settings-outline', label: 'Settings', action: () => setScreen('settings') },
    { icon: 'trash-outline',    label: 'Close Tab', action: () => closeTab(activeId), danger: true },
  ]), [active, isBookmarked, addTab, toggleBookmark, share, copyUrl, toggleDesktop, toggleReader, zoom, closeTab, activeId, recentClosed, reopenClosed, downloads.length]);

  const injectedBefore = useMemo(
    () => buildInjectedBefore(settings),
    [settings.fontSize, settings.defaultZoom, settings.doNotTrack]
  );
  const injectedAfter = useMemo(() => buildInjectedAfter(), []);

  // ─── Render ─────────────────────────────────────────
  return (
    <View key={themeKey} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />

      {/* ── Top chrome ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              paddingHorizontal: 6,
              paddingTop: Platform.OS === 'android' ? 4 : 2,
              paddingBottom: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 38, gap: 2 }}>
              <BarIcon
                icon="chevron-back"
                size={20}
                disabled={!active?.canGoBack && !active?.url}
                onPress={goBackOrHome}
              />

              <View style={{ flex: 1, minWidth: 0 }}>
                <Pressable
                  onPress={() => {
                    if (editing) return;
                    haptic();
                    setEditing(true);
                    setDraft(active?.url || '');
                  }}
                  style={{
                    height: 36,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: editing ? colors.surfaceHi : colors.surface,
                    borderRadius: 18,
                    paddingHorizontal: 12,
                    gap: 6,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: editing ? colors.borderFocus : colors.border,
                    overflow: 'hidden',
                  }}
                >
                  {!editing && (
                    <TouchableOpacity
                      onPress={() => active?.url && setSiteInfoOpen(true)}
                      hitSlop={6}
                      disabled={!active?.url}
                    >
                      <Ionicons
                        name={
                          active?.incognito ? 'eye-off'
                            : active?.url ? (active.url.startsWith('https') ? 'lock-closed' : 'warning')
                            : 'search'
                        }
                        size={11}
                        color={
                          active?.incognito ? colors.purple
                            : active?.url?.startsWith('https') ? colors.success
                            : colors.textMuted
                        }
                      />
                    </TouchableOpacity>
                  )}

                  {editing ? (
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      onSubmitEditing={() => go(draft)}
                      autoFocus
                      placeholder="Search or enter URL"
                      placeholderTextColor={colors.textMuted}
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: 13.5,
                        fontWeight: '500',
                        paddingVertical: 0,
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      returnKeyType="go"
                    />
                  ) : (
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5 }}>
                      {active?.url ? (
                        <>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>
                            {hostOf(active.url) || 'Untitled'}
                          </Text>
                          {!!pathOf(active.url) && (
                            <Text style={{ color: colors.textMuted, fontWeight: '500' }}>
                              {pathOf(active.url)}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={{ color: colors.textMuted, fontWeight: '500' }}>
                          Search or enter URL
                        </Text>
                      )}
                    </Text>
                  )}

                  {editing ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {draft.length > 0 && (
                        <TouchableOpacity onPress={() => setDraft('')} hitSlop={8} style={{ padding: 2 }}>
                          <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={pasteAndGo} hitSlop={8} style={{ padding: 2 }}>
                        <Ionicons name="clipboard-outline" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : !!active?.url && (
                    <TouchableOpacity onPress={reload} hitSlop={8} style={{ padding: 2 }}>
                      {active.loading ? (
                        <ActivityIndicator size="small" color={colors.textMuted} />
                      ) : (
                        <Ionicons name="reload" size={13} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  )}

                  {!editing && active?.loading && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        height: 2,
                        backgroundColor: colors.accent,
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      }}
                    />
                  )}
                </Pressable>

                {/* URL autocomplete dropdown */}
                {editing && suggestions.length > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 40,
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      borderRadius: r.md,
                      overflow: 'hidden',
                      backgroundColor: colors.bgElev,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: colors.borderHi,
                      ...shadow.card,
                    }}
                  >
                    {suggestions.map((s, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => go(s.value)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: sp.md,
                          paddingHorizontal: sp.md,
                          paddingVertical: 11,
                          borderBottomWidth: i < suggestions.length - 1 ? StyleSheet.hairlineWidth : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View
                          style={{
                            width: 20, height: 20,
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {s.type === 'direct' ? (
                            <Ionicons name="arrow-forward-circle" size={16} color={colors.accentHi} />
                          ) : s.type === 'bookmark' ? (
                            <Ionicons name="star" size={14} color={colors.gold} />
                          ) : s.type === 'history' ? (
                            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                          ) : (
                            <Ionicons name="search-outline" size={14} color={colors.textMuted} />
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{
                              color: s.type === 'direct' ? colors.accentHi : colors.text,
                              fontSize: fs.sm,
                              fontWeight: s.type === 'direct' ? '700' : '500',
                            }}
                            numberOfLines={1}
                          >
                            {s.title}
                          </Text>
                          {!!s.sub && s.sub !== s.title && (
                            <Text
                              style={{ color: colors.textMuted, fontSize: fs.xs, marginTop: 1 }}
                              numberOfLines={1}
                            >
                              {s.sub}
                            </Text>
                          )}
                        </View>
                        {s.type === 'direct' && (
                          <Text
                            style={{
                              color: colors.accentHi, fontSize: 11, fontWeight: '700',
                              letterSpacing: 0.6,
                            }}
                          >
                            GO
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => { haptic(); setScreen('tabs'); }}
                style={{ width: 34, height: 36, alignItems: 'center', justifyContent: 'center' }}
              >
                <View>
                  <Ionicons name="albums-outline" size={17} color={colors.text} />
                  {tabs.length > 1 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4, right: -6,
                        minWidth: 14, height: 14,
                        paddingHorizontal: 3,
                        borderRadius: 7,
                        backgroundColor: colors.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 11 }}>
                        {tabs.length}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <BarIcon
                icon="ellipsis-horizontal"
                size={18}
                onPress={() => { haptic(); setMenuOpen(true); }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Main content ── */}
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {tabs.map((t) => {
          const visible = t.id === activeId && screen === 'web';
          return (
            <View
              key={t.id}
              pointerEvents={visible ? 'auto' : 'none'}
              style={[StyleSheet.absoluteFill, { opacity: visible ? 1 : 0 }]}
            >
              {t.url ? (
                <WebView
                  ref={(r) => { if (r) webRefs.current[t.id] = r; }}
                  source={{ uri: t.url }}
                  userAgent={t.desktop ? DESKTOP_UA : undefined}
                  style={{
                    flex: 1,
                    backgroundColor: t.incognito ? '#0a0514' : colors.webviewBg,
                  }}
                  onLoadStart={() => patch(t.id, { loading: true, progress: 0 })}
                  onLoadEnd={() => patch(t.id, { loading: false, progress: 1 })}
                  onLoadProgress={({ nativeEvent }) => patch(t.id, { progress: nativeEvent.progress })}
                  onNavigationStateChange={(s) => onNavChange(t.id, s, t.incognito)}
                  onMessage={(e) => onMessage(t.id, e)}
                  injectedJavaScriptBeforeContentLoaded={injectedBefore}
                  injectedJavaScript={injectedAfter}
                  allowsBackForwardNavigationGestures={settings.swipeNavigation}
                  pullToRefreshEnabled={settings.pullToRefresh}
                  setSupportMultipleWindows={settings.blockPopups ? false : true}
                  incognito={t.incognito}
                  originWhitelist={['*']}
                  javaScriptEnabled={settings.javascript}
                  domStorageEnabled={settings.javascript}
                  thirdPartyCookiesEnabled={!settings.blockThirdPartyCookies}
                  startInLoadingState={false}
                  mixedContentMode="compatibility"
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={!settings.autoplay}
                  onFileDownload={({ nativeEvent }) => {
                    const url = nativeEvent?.downloadUrl;
                    if (!url) return;
                    const name =
                      nativeEvent?.suggestedFilename ||
                      nativeEvent?.downloadUrl?.split('/').pop()?.split('?')[0];
                    startDownload(t.id, url, name);
                  }}
                  onShouldStartLoadWithRequest={(req) => {
                    const u = req.url || '';
                    // Hand off non-web schemes to the OS
                    if (u.startsWith('http') || u === 'about:blank') return true;
                    if (u.startsWith('data:')) return true;
                    Linking.openURL(u).catch(() => {});
                    return false;
                  }}
                />
              ) : null}
            </View>
          );
        })}

        {!active?.url && screen === 'web' && (
          <Home onOpen={go} onSearch={go} history={history} />
        )}

        {screen === 'tabs' && (
          <View style={StyleSheet.absoluteFill}>
            <Tabs
              tabs={tabs}
              activeId={activeId}
              onSelect={selectTab}
              onClose={closeTab}
              onNew={() => { addTab(); setScreen('web'); }}
              onDone={() => setScreen('web')}
            />
          </View>
        )}

        {(screen === 'bookmarks' || screen === 'history') && (
          <ListPanel
            title={screen === 'bookmarks' ? 'Bookmarks' : 'History'}
            items={screen === 'bookmarks' ? bookmarks : history}
            empty={screen === 'bookmarks' ? 'No bookmarks yet' : 'No history yet'}
            onClose={() => setScreen('web')}
            onSelect={(u) => { go(u); setScreen('web'); }}
          />
        )}

        {screen === 'downloads' && (
          <View style={StyleSheet.absoluteFill}>
            <Downloads
              downloads={downloads}
              onClose={() => setScreen('web')}
              onOpen={openDownload}
              onRemove={removeDownload}
              onClear={clearDownloads}
            />
          </View>
        )}

        {screen === 'settings' && (
          <View style={StyleSheet.absoluteFill}>
            <Settings
              settings={settings}
              onChange={updateSettings}
              onClose={() => setScreen('web')}
            />
          </View>
        )}

        {findOpen && (
          <FindBar
            onFind={(q, fwd) => runFind(q, fwd)}
            onClose={() => { clearFind(); setFindOpen(false); }}
            total={findStats.total}
            current={findStats.current}
          />
        )}
      </View>

      {/* ── Menu ── */}
      <Modal transparent visible={menuOpen} animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(0,0,0,0)', colors.overlay],
                }),
              },
            ]}
          />
        </Pressable>

        <Animated.View
          style={{
            position: 'absolute',
            right: 8,
            top: Platform.OS === 'ios' ? 96 : 88,
            width: 240,
            maxHeight: '82%',
            opacity: menuAnim,
            transform: [
              { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
              { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            ],
          }}
        >
          <Glass intensity={96} radius={r.lg} bg={colors.bgElev} style={shadow.card}>
            <FlatList
              data={menu}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item: it }) => {
                if (it.section) {
                  return (
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 10,
                        fontWeight: '800',
                        letterSpacing: 1.6,
                        paddingHorizontal: 14,
                        paddingTop: 12,
                        paddingBottom: 4,
                      }}
                    >
                      {it.section.toUpperCase()}
                    </Text>
                  );
                }
                const disabled = it.disabled;
                return (
                  <TouchableOpacity
                    disabled={disabled}
                    onPress={() => {
                      haptic();
                      setMenuOpen(false);
                      setTimeout(() => { try { it.action(); } catch {} }, 90);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      opacity: disabled ? 0.32 : 1,
                    }}
                  >
                    <Ionicons
                      name={it.icon}
                      size={16}
                      color={it.danger ? colors.danger : colors.textSub}
                      style={{ width: 20 }}
                    />
                    <Text
                      style={{
                        fontSize: 13.5,
                        fontWeight: '600',
                        color: it.danger ? colors.danger : colors.text,
                      }}
                    >
                      {it.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Glass>
        </Animated.View>
      </Modal>

      {/* ── Site info sheet ── */}
      <SiteInfoSheet
        visible={siteInfoOpen}
        onClose={() => setSiteInfoOpen(false)}
        url={active?.url}
        isSecure={active?.url?.startsWith('https')}
        isIncognito={active?.incognito}
        cookiesBlocked={settings.blockThirdPartyCookies}
        jsEnabled={settings.javascript}
      />

      {/* ── Permission prompt ── */}
      <PermissionPrompt
        visible={!!pendingPerm}
        request={pendingPerm}
        onDecide={decidePermission}
      />

      <LinkPreview
        visible={!!linkPreview}
        url={linkPreview}
        onClose={() => setLinkPreview(null)}
        onOpen={(u) => go(u)}
        onOpenNewTab={(u) => addTab(false, u)}
      />
    </View>
  );
}

// ─── Bar icon ────────────────────────────────────────
const BarIcon = ({ icon, size = 18, onPress, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const down = () => Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, friction: 4 }).start();
  const up = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : down}
      onPressOut={disabled ? undefined : up}
      disabled={disabled}
      style={{
        width: 34, height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.25 : 1,
      }}
      hitSlop={4}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={icon} size={size} color={colors.text} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Site info sheet ─────────────────────────────────
const SiteInfoSheet = ({ visible, onClose, url, isSecure, isIncognito, cookiesBlocked, jsEnabled }) => {
  if (!url) return null;
  const host = hostOf(url) || url;

  const rows = [
    {
      icon: isSecure ? 'lock-closed' : 'warning',
      tint: isSecure ? colors.success : colors.warning,
      label: isSecure ? 'Connection is secure' : 'Not secure',
      sub: isSecure ? 'Your information is private' : 'Proceed with caution',
    },
    {
      icon: isIncognito ? 'eye-off' : 'globe-outline',
      tint: isIncognito ? colors.purple : colors.accent,
      label: isIncognito ? 'Private mode' : 'Normal browsing',
      sub: isIncognito ? 'Nothing is being saved' : 'History and cookies enabled',
    },
    {
      icon: cookiesBlocked ? 'shield-checkmark' : 'shield-outline',
      tint: cookiesBlocked ? colors.success : colors.textMuted,
      label: cookiesBlocked ? 'Trackers blocked' : 'Trackers allowed',
      sub: cookiesBlocked ? 'Third-party cookies blocked' : 'Standard tracking protection',
    },
    {
      icon: 'code-slash-outline',
      tint: jsEnabled ? colors.accent : colors.textMuted,
      label: jsEnabled ? 'JavaScript enabled' : 'JavaScript disabled',
      sub: jsEnabled ? 'Full site functionality' : 'Some sites may not work',
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
          <View style={{ padding: sp.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
            <Favicon url={url} size={36} radius={8} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.textMuted, fontSize: fs.xs, fontWeight: '800', letterSpacing: 1.6 }}>
                SITE INFO
              </Text>
              <Text
                style={{ color: colors.text, fontSize: fs.md, fontWeight: '700', marginTop: 2 }}
                numberOfLines={1}
              >
                {host}
              </Text>
            </View>
          </View>

          {rows.map((r, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: sp.lg,
                paddingHorizontal: sp.lg,
                paddingVertical: 12,
                borderBottomWidth: i < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: colors.surface,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name={r.icon} size={16} color={r.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fs.sm, fontWeight: '700' }}>
                  {r.label}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fs.xs, marginTop: 2 }}>
                  {r.sub}
                </Text>
              </View>
            </View>
          ))}
        </Glass>
      </View>
    </Modal>
  );
};

// ─── List panel (Bookmarks / History) ────────────────
const ListPanel = ({ title, items, onClose, onSelect, empty }) => (
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
        {title}
      </Text>
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.7}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: r.pill,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '700' }}>Done</Text>
      </TouchableOpacity>
    </View>

    {items.length === 0 ? (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Ionicons name="file-tray-outline" size={40} color={colors.textFaint} />
        <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>{empty}</Text>
      </View>
    ) : (
      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
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
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelect(item.url)}
            activeOpacity={0.65}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Favicon url={item.url} size={34} radius={10} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}
                numberOfLines={1}
              >
                {item.title || item.url}
              </Text>
              <Text
                style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}
                numberOfLines={1}
              >
                {(item.url || '').replace(/^https?:\/\//, '')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    )}
  </View>
);