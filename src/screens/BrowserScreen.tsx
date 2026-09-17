import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import FindInPage from '../components/FindInPage';
import PrivacyDashboard from '../components/PrivacyDashboard';
import { useBrowser } from '../context/BrowserContext';
import { DATA_SAVER_SCRIPT } from '../utils/dataSaver';
import { downloadFile } from '../utils/downloadManager';
import { hapticSuccess } from '../utils/haptics';
import { saveOfflinePage } from '../utils/offlineStorage';
import { getSearchSuggestions, Suggestion } from '../utils/searchSuggestions';

// Ultra-optimized WebView component - only renders active tab
const MemoizedWebView = memo(
  ({ 
    tab, 
    isActive, 
    onRef, 
    onNavigationStateChange,
    onLoadProgress,
    onLoadStart,
    onLoadEnd,
    onMessage,
    darkMode,
    incognito,
    userAgent,
  }: any) => {
    // Only render if active
    if (!isActive) return null;

    return (
      <WebView
        ref={onRef}
        source={{ uri: tab.url }}
        style={styles.webView}
        onNavigationStateChange={onNavigationStateChange}
        onLoadProgress={onLoadProgress}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onMessage={onMessage}
        allowsBackForwardNavigationGestures={false}
        incognito={incognito}
        startInLoadingState={false}
        userAgent={userAgent}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled
        cacheEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        textZoom={100}
        renderLoading={() => (
          <View style={[styles.loadingContainer, darkMode && styles.darkLoading]}>
            <ActivityIndicator size="small" color="#8B5CF6" />
          </View>
        )}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.tab.url === nextProps.tab.url &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.darkMode === nextProps.darkMode &&
      prevProps.incognito === nextProps.incognito &&
      prevProps.userAgent === nextProps.userAgent
    );
  }
);

const BrowserScreen: React.FC = () => {
  const { tabs, setTabs, activeTabId, addBookmark, addToHistory, settings, history, bookmarks } = useBrowser();
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const [urlInput, setUrlInput] = useState<string>(activeTab?.url || '');
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [desktopMode, setDesktopMode] = useState<boolean>(false);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  const [findVisible, setFindVisible] = useState<boolean>(false);
  const [findMatchCount, setFindMatchCount] = useState<number>(0);
  const [findCurrentMatch, setFindCurrentMatch] = useState<number>(0);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState<boolean>(false);
  const [readerMode, setReaderMode] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [dataSaver, setDataSaver] = useState<boolean>(false);
  const webViewRefs = useRef<{ [key: number]: WebView | null }>({});
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const urlUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const historyTimeout = useRef<NodeJS.Timeout | null>(null);
  const suggestionTimeout = useRef<NodeJS.Timeout | null>(null);

  // Update URL input when active tab changes (immediate, no timeout)
  useEffect(() => {
    if (activeTab) {
      setUrlInput(activeTab.url);
      setShowSuggestions(false);
      setCanGoBack(false);
      setCanGoForward(false);
      setProgress(0);
      setLoading(false);
    }
  }, [activeTabId]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (urlUpdateTimeout.current) clearTimeout(urlUpdateTimeout.current);
      if (historyTimeout.current) clearTimeout(historyTimeout.current);
      if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current);
    };
  }, []);

  const detectAndNavigate = useCallback((text: string): string => {
    let url = text.trim();
    if (!url) return 'https://www.google.com';
    
    if (!url.includes('.') && !url.includes(' ')) {
      url = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }, []);

  const animatePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { 
        toValue: 0.97, 
        duration: 80, 
        useNativeDriver: true 
      }),
      Animated.timing(scaleAnim, { 
        toValue: 1, 
        duration: 80, 
        useNativeDriver: true 
      }),
    ]).start();
  }, [scaleAnim]);

  const handleUrlSubmitWithText = useCallback((text: string): void => {
    const url = detectAndNavigate(text);
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId ? { ...tab, url } : tab
      )
    );
    setUrlInput(url);
    setShowSuggestions(false);
  }, [activeTabId, detectAndNavigate, setTabs]);

  const handleUrlSubmit = useCallback((): void => {
    animatePress();
    handleUrlSubmitWithText(urlInput);
  }, [urlInput, animatePress, handleUrlSubmitWithText]);

  const handleUrlChange = useCallback((text: string): void => {
    setUrlInput(text);
    
    // Debounced suggestions
    if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current);
    
    if (text.length > 0) {
      suggestionTimeout.current = setTimeout(() => {
        const suggs = getSearchSuggestions(text, history || [], bookmarks || []);
        if (suggs.length > 0) {
          setSuggestions(suggs);
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [history, bookmarks]);

  const handleSuggestionPress = useCallback((suggestion: Suggestion): void => {
    setShowSuggestions(false);
    setUrlInput(suggestion.text);
    handleUrlSubmitWithText(suggestion.text);
  }, [handleUrlSubmitWithText]);

  const handleNavigationStateChange = useCallback((tabId: number) => (navState: WebViewNavigation): void => {
    if (tabId === activeTabId) {
      setUrlInput(navState.url);
      setCanGoBack(navState.canGoBack);
      setCanGoForward(navState.canGoForward);
    }
    
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, url: navState.url, title: navState.title || tab.title } : tab
      )
    );
    
    if (navState.title && tabId === activeTabId) {
      addToHistory(navState.url, navState.title);
    }
  }, [activeTabId, addToHistory]);

  const handleShare = useCallback(async (): Promise<void> => {
    setShowMenu(false);
    try {
      await Share.share({
        message: `${activeTab?.title || 'Page'} - ${activeTab?.url}`,
        url: activeTab?.url,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [activeTab]);

  const handleBookmark = useCallback((): void => {
    setShowMenu(false);
    if (activeTab) {
      addBookmark(activeTab.url, activeTab.title || 'Untitled');
      hapticSuccess();
      Alert.alert('✓', 'Bookmark added!');
    }
  }, [activeTab, addBookmark]);

  const handleDownload = useCallback(async (): Promise<void> => {
    setShowMenu(false);
    if (activeTab?.url) {
      const result = await downloadFile(activeTab.url);
      if (result.success) {
        hapticSuccess();
        Alert.alert('✓', result.message);
      } else {
        Alert.alert('✗', result.message);
      }
    }
  }, [activeTab?.url]);

  const handleSaveOffline = useCallback(async (): Promise<void> => {
    setShowMenu(false);
    if (activeTab) {
      try {
        const htmlScript = `
          (function() {
            window.ReactNativeWebView.postMessage(document.documentElement.outerHTML);
            true;
          })();
        `;
        webViewRefs.current[activeTabId]?.injectJavaScript(htmlScript);
      } catch (error) {
        Alert.alert('✗', 'Failed to save page');
      }
    }
  }, [activeTab, activeTabId]);

  const handleWebViewMessage = useCallback((event: any): void => {
    const data = event.nativeEvent.data;
    if (data && activeTab) {
      saveOfflinePage(activeTab.url, data, activeTab.title || 'Page');
      hapticSuccess();
      Alert.alert('✓', 'Page saved for offline viewing');
    }
  }, [activeTab]);

  const handleFindInPage = useCallback((text: string): void => {
    setFindMatchCount(text ? 1 : 0);
    setFindCurrentMatch(text ? 1 : 0);
  }, []);

  const handleReaderMode = useCallback((): void => {
    setShowMenu(false);
    setReaderMode(prev => !prev);
    
    if (!readerMode) {
      const readerScript = `
        (function() {
          var elements = document.querySelectorAll('script, style, nav, header, footer, aside, .ad, .advertisement, .social, .comments');
          elements.forEach(el => el.remove());
          var article = document.querySelector('article, main, .content, #content') || document.body;
          article.style.maxWidth = '680px';
          article.style.margin = '0 auto';
          article.style.padding = '20px';
          article.style.fontSize = '18px';
          article.style.lineHeight = '1.6';
          article.style.color = '#333';
          article.style.fontFamily = '-apple-system, Georgia, serif';
          true;
        })();
      `;
      webViewRefs.current[activeTabId]?.injectJavaScript(readerScript);
    } else {
      webViewRefs.current[activeTabId]?.reload();
    }
  }, [readerMode, activeTabId]);

  const handleDesktopModeToggle = useCallback((): void => {
    setShowMenu(false);
    setDesktopMode(prev => !prev);
  }, []);

  const handleCopyUrl = useCallback((): void => {
    setShowMenu(false);
    if (activeTab?.url) {
      Alert.alert('URL Copied', activeTab.url);
    }
  }, [activeTab?.url]);

  const toggleDataSaver = useCallback((): void => {
    setShowMenu(false);
    setDataSaver(prev => !prev);
    if (!dataSaver) {
      webViewRefs.current[activeTabId]?.injectJavaScript(DATA_SAVER_SCRIPT);
    }
  }, [dataSaver, activeTabId]);

  const userAgent = useMemo(() => 
    desktopMode
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      : undefined,
    [desktopMode]
  );

  const renderSuggestionItem = useCallback(({ item }: { item: Suggestion }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, settings.darkMode && styles.darkSuggestionItem]}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={item.type === 'history' ? 'time-outline' : item.type === 'bookmark' ? 'bookmark-outline' : 'search-outline'} 
        size={16} 
        color={settings.darkMode ? '#999' : '#666'} 
        style={styles.suggestionIcon}
      />
      <Text 
        style={[styles.suggestionText, settings.darkMode && styles.darkText]} 
        numberOfLines={1}
      >
        {item.text}
      </Text>
    </TouchableOpacity>
  ), [settings.darkMode, handleSuggestionPress]);

  return (
    <View style={[styles.container, settings.darkMode && styles.darkContainer]}>
      {/* URL Bar */}
      <View style={[styles.urlBar, settings.darkMode && styles.darkUrlBar]}>
        <Animated.View style={[styles.urlBarInner, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.navGroup}>
            <TouchableOpacity 
              onPress={() => webViewRefs.current[activeTabId]?.goBack()} 
              style={[styles.iconButton, !canGoBack && styles.disabledButton]}
              disabled={!canGoBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color={canGoBack ? (settings.darkMode ? '#fff' : '#333') : '#999'} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => webViewRefs.current[activeTabId]?.goForward()} 
              style={[styles.iconButton, !canGoForward && styles.disabledButton]}
              disabled={!canGoForward}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={22} color={canGoForward ? (settings.darkMode ? '#fff' : '#333') : '#999'} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputWrapper, settings.darkMode && styles.darkInputWrapper]}>
            {loading ? (
              <TouchableOpacity onPress={() => webViewRefs.current[activeTabId]?.stopLoading()}>
                <Ionicons name="close" size={12} color={settings.darkMode ? '#666' : '#999'} style={styles.inputIcon} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="lock-closed" size={10} color={settings.darkMode ? '#666' : '#999'} style={styles.inputIcon} />
            )}
            <TextInput
              style={[styles.input, settings.darkMode && styles.darkInput]}
              value={urlInput}
              onChangeText={handleUrlChange}
              onSubmitEditing={handleUrlSubmit}
              onFocus={() => {
                if (urlInput.length > 0) {
                  const suggs = getSearchSuggestions(urlInput, history || [], bookmarks || []);
                  setSuggestions(suggs);
                  setShowSuggestions(suggs.length > 0);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              placeholder="Search or URL"
              placeholderTextColor={settings.darkMode ? '#666' : '#999'}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              selectTextOnFocus
              returnKeyType="go"
            />
          </View>

          <View style={styles.navGroup}>
            <TouchableOpacity 
              onPress={() => webViewRefs.current[activeTabId]?.reload()} 
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="refresh" size={18} color={settings.darkMode ? '#fff' : '#333'} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowMenu(true)} 
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={settings.darkMode ? '#fff' : '#333'} />
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        {/* Progress Bar - Only show when loading */}
        {loading && progress > 0 && progress < 1 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
        )}

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={[styles.suggestionsContainer, settings.darkMode && styles.darkSuggestionsContainer]}>
            <FlatList
              data={suggestions.slice(0, 10)}
              renderItem={renderSuggestionItem}
              keyExtractor={(item, index) => `${item.type}-${index}`}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={3}
              style={styles.suggestionsList}
            />
          </View>
        )}
      </View>

      {/* Find in Page */}
      {findVisible && (
        <FindInPage
          visible={findVisible}
          darkMode={settings.darkMode}
          onFind={handleFindInPage}
          onClose={() => setFindVisible(false)}
          matchCount={findMatchCount}
          currentMatch={findCurrentMatch}
        />
      )}

      {/* Render ONLY active tab */}
      <View style={styles.tabsContainer}>
        {activeTab && (
          <MemoizedWebView
            key={activeTab.id}
            tab={activeTab}
            isActive={true}
            onRef={(ref: WebView | null) => {
              if (ref) {
                webViewRefs.current[activeTab.id] = ref;
              }
            }}
            onNavigationStateChange={handleNavigationStateChange(activeTab.id)}
            onLoadProgress={({ nativeEvent }: any) => {
              setProgress(nativeEvent.progress);
            }}
            onLoadStart={() => {
              setLoading(true);
            }}
            onLoadEnd={() => {
              setLoading(false);
              setProgress(0);
            }}
            onMessage={handleWebViewMessage}
            darkMode={settings.darkMode}
            incognito={settings.clearOnExit}
            userAgent={userAgent}
          />
        )}
      </View>

      {/* Menu Modal - Only render when visible */}
      {showMenu && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showMenu}
          onRequestClose={() => setShowMenu(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowMenu(false)}
          >
            <View style={[styles.menuContainer, settings.darkMode && styles.darkMenu]}>
              <View style={styles.menuHandle} />
              
              <View style={styles.menuHeader}>
                <Text style={[styles.menuTitle, settings.darkMode && styles.darkText]} numberOfLines={1}>
                  {activeTab?.title || 'Page'}
                </Text>
                <Text style={styles.menuUrl} numberOfLines={1}>
                  {activeTab?.url}
                </Text>
              </View>

              <TouchableOpacity style={styles.menuItem} onPress={handleBookmark}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#8B5CF615' }]}>
                  <Ionicons name="bookmark-outline" size={20} color="#8B5CF6" />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>Add Bookmark</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#8B5CF615' }]}>
                  <Ionicons name="share-outline" size={20} color="#8B5CF6" />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                setFindVisible(true);
              }}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#34C75915' }]}>
                  <Ionicons name="search" size={20} color="#34C759" />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>Find in Page</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleDownload}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#007AFF15' }]}>
                  <Ionicons name="download-outline" size={20} color="#007AFF" />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>Download Page</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleSaveOffline}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FF950015' }]}>
                  <Ionicons name="cloud-download-outline" size={20} color="#FF9500" />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>Save Offline</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleReaderMode}>
                <View style={[styles.menuIconContainer, { backgroundColor: readerMode ? '#8B5CF615' : '#F2F2F7' }]}>
                  <Ionicons name="book-outline" size={20} color={readerMode ? '#8B5CF6' : '#999'} />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>
                  Reader Mode {readerMode && '✓'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => { 
                setShowMenu(false);
                setShowPrivacyDashboard(true);
              }}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#34C75915' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#34C759" />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>Privacy Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleDesktopModeToggle}>
                <View style={[styles.menuIconContainer, { backgroundColor: desktopMode ? '#8B5CF615' : '#F2F2F7' }]}>
                  <Ionicons name="desktop-outline" size={20} color={desktopMode ? '#8B5CF6' : '#999'} />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>
                  Desktop Mode {desktopMode && '✓'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={toggleDataSaver}>
                <View style={[styles.menuIconContainer, { backgroundColor: dataSaver ? '#FF950015' : '#F2F2F7' }]}>
                  <Ionicons name="speedometer-outline" size={20} color={dataSaver ? '#FF9500' : '#999'} />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>
                  Data Saver {dataSaver && '✓'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleCopyUrl}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#8B5CF615' }]}>
                  <Ionicons name="copy-outline" size={20} color="#8B5CF6" />
                </View>
                <Text style={[styles.menuText, settings.darkMode && styles.darkText]}>Copy URL</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuItem, styles.cancelButton]} 
                onPress={() => setShowMenu(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Privacy Dashboard */}
      {showPrivacyDashboard && (
        <PrivacyDashboard
          visible={showPrivacyDashboard}
          darkMode={settings.darkMode}
          onClose={() => setShowPrivacyDashboard(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  darkContainer: { 
    backgroundColor: '#000000' 
  },
  urlBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 6,
    paddingVertical: 6,
    zIndex: 1000,
  },
  darkUrlBar: {
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#0000',
  },
  urlBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  iconButton: {
    padding: 5,
    borderRadius: 6,
  },
  disabledButton: {
    opacity: 0.4,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
    marginHorizontal: 2,
  },
  darkInputWrapper: {
    backgroundColor: '#2C2C2E',
  },
  inputIcon: {
    marginRight: 5,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    paddingVertical: 0,
  },
  darkInput: {
    color: '#fff',
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: '#E5E5EA',
    marginTop: 6,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 1,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 6,
    maxHeight: 250,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  darkSuggestionsContainer: {
    backgroundColor: '#1C1C1E',
    borderTopColor: '#2C2C2E',
  },
  suggestionsList: {
    flexGrow: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  darkSuggestionItem: {
    borderBottomColor: '#2C2C2E',
  },
  suggestionIcon: {
    width: 18,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  tabsContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  darkLoading: {
    backgroundColor: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: '75%',
  },
  darkMenu: {
    backgroundColor: '#000000',
  },
  menuHandle: {
    width: 36,
    height: 3,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 6,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  menuUrl: {
    fontSize: 11,
    color: '#999',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  darkText: {
    color: '#fff',
  },
  cancelButton: {
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 6,
  },
  cancelText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});

export default BrowserScreen;