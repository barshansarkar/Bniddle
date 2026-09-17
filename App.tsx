import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrowserProvider, useBrowser } from './src/context/BrowserContext';
import BookmarksScreen from './src/screens/BookmarksScreen';
import BrowserScreen from './src/screens/BrowserScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TabsScreen from './src/screens/TabsScreen';

type ScreenName = 'Browser' | 'Tabs' | 'Bookmarks' | 'History' | 'Settings';

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Browser');
  const { settings } = useBrowser();

  const renderScreen = (): React.ReactNode => {
    switch (currentScreen) {
      case 'Browser': return <BrowserScreen />;
      case 'Tabs': return <TabsScreen />;
      case 'Bookmarks': return <BookmarksScreen />;
      case 'History': return <HistoryScreen />;
      case 'Settings': return <SettingsScreen />;
      default: return <BrowserScreen />;
    }
  };

  const tabs: { name: ScreenName; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { name: 'Browser', icon: 'globe-outline', label: 'Home' },
    { name: 'Tabs', icon: 'layers-outline', label: 'Tabs' },
    { name: 'Bookmarks', icon: 'bookmark-outline', label: 'Saved' },
    { name: 'History', icon: 'time-outline', label: 'History' },
    { name: 'Settings', icon: 'settings-outline', label: 'Settings' },
  ];

  return (
    <SafeAreaView style={[styles.container, settings.darkMode && styles.darkContainer]}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      
      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, settings.darkMode && styles.darkBottomNav]}>
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.navItem}
              onPress={() => setCurrentScreen(tab.name)}
              activeOpacity={0.6}
            >
              <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                <Ionicons
                  name={tab.icon}
                  size={22}
                  color={isActive ? '#007AFF' : settings.darkMode ? '#666' : '#999'}
                />
              </View>
              <Text
                style={[
                  styles.navLabel,
                  isActive && styles.activeNavLabel,
                  settings.darkMode && !isActive && styles.darkNavLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const App: React.FC = () => {
  return (
    <BrowserProvider>
      <AppContent />
    </BrowserProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  darkBottomNav: {
    borderTopColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconWrapper: {
    backgroundColor: '#F0F7FF',
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
    color: '#999',
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
  darkNavLabel: {
    color: '#666',
  },
});

export default App;