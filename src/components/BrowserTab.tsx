import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

interface BrowserTabProps {
  url: string;
  darkMode: boolean;
  onNavigationStateChange: (navState: WebViewNavigation) => void;
  onLoadProgress: (progress: number) => void;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  desktopMode: boolean;
  incognito: boolean;
}

export interface BrowserTabRef {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stopLoading: () => void;
}

const BrowserTab = forwardRef<BrowserTabRef, BrowserTabProps>(({
  url,
  darkMode,
  onNavigationStateChange,
  onLoadProgress,
  onLoadStart,
  onLoadEnd,
  desktopMode,
  incognito,
}, ref) => {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    goBack: () => webViewRef.current?.goBack(),
    goForward: () => webViewRef.current?.goForward(),
    reload: () => webViewRef.current?.reload(),
    stopLoading: () => webViewRef.current?.stopLoading(),
  }));

  const userAgent = desktopMode
    ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    : undefined;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webView}
        onNavigationStateChange={onNavigationStateChange}
        onLoadProgress={({ nativeEvent }) => onLoadProgress(nativeEvent.progress)}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        allowsBackForwardNavigationGestures
        incognito={incognito}
        startInLoadingState
        userAgent={userAgent}
        renderLoading={() => (
          <View style={[styles.loadingContainer, darkMode && styles.darkLoading]}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        cacheEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
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
});

export default BrowserTab;