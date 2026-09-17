import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useBrowser } from '../context/BrowserContext';

const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, clearHistory, bookmarks, history } = useBrowser();
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [clearConfirm, setClearConfirm] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);
  const [showTerms, setShowTerms] = useState<boolean>(false);
  const [showOffline, setShowOffline] = useState<boolean>(false);
  const [offlinePages, setOfflinePages] = useState<number>(0);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    loadOfflineCount();
  }, []);

  const loadOfflineCount = async (): Promise<void> => {
    try {
      const pages = await AsyncStorage.getItem('offlinePages');
      if (pages) {
        const parsed = JSON.parse(pages);
        setOfflinePages(Object.keys(parsed).length);
      }
    } catch (error) {
      console.error('Error loading offline count:', error);
    }
  };

  const toggleSetting = (key: 'darkMode' | 'saveHistory' | 'clearOnExit'): void => {
    animatePress();
    updateSettings({ ...settings, [key]: !settings[key] });
  };

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleClearAllData = (): void => {
    setClearConfirm(true);
  };

  const confirmClearAll = async (): Promise<void> => {
    setClearConfirm(false);
    try {
      await AsyncStorage.clear();
      clearHistory();
      updateSettings({
        darkMode: false,
        saveHistory: true,
        clearOnExit: false,
      });
      setOfflinePages(0);
      Alert.alert('✓ Success', 'All data has been cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('✗ Error', 'Failed to clear data');
    }
  };

  const handleClearHistory = (): void => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all browsing history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Alert.alert('✓', 'History cleared');
          }
        },
      ]
    );
  };

  const handleClearCache = (): void => {
    Alert.alert(
      'Clear Cache',
      'Clear cached data to free up space?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Cache', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear WebView cache
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(key => key.includes('cache'));
              await AsyncStorage.multiRemove(cacheKeys);
              Alert.alert('✓', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('✗', 'Failed to clear cache');
            }
          }
        },
      ]
    );
  };

  const handleRateApp = (): void => {
    const url = Platform.select({
      ios: 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID',
      android: 'market://details?id=com.your.app',
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('⭐ Rate Us', 'Thank you for your support!');
      });
    }
  };

  const handleFeedback = (): void => {
    Linking.openURL('mailto:support@browserpro.com?subject=Browser%20Pro%20Feedback').catch(() => {
      Alert.alert('💬 Feedback', 'We appreciate your feedback!');
    });
  };

  const handlePrivacyPolicy = (): void => {
    setShowAbout(false);
    setShowPrivacy(true);
  };

  const handleTermsOfService = (): void => {
    setShowAbout(false);
    setShowTerms(true);
  };

  const handleCopyVersion = async (): Promise<void> => {
    await Clipboard.setStringAsync('Browser Pro v1.0.0');
    Alert.alert('✓', 'Version copied to clipboard');
  };

  const handleExportData = async (): Promise<void> => {
    try {
      const data = {
        bookmarks,
        history,
        settings,
        exportedAt: new Date().toISOString(),
      };
      const jsonData = JSON.stringify(data, null, 2);
      await Clipboard.setStringAsync(jsonData);
      Alert.alert('✓', 'Data exported to clipboard');
    } catch (error) {
      Alert.alert('✗', 'Failed to export data');
    }
  };

  return (
    <ScrollView 
      style={[styles.container, settings.darkMode && styles.darkContainer]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, settings.darkMode && styles.darkText]}>
            Settings
          </Text>
          <Text style={styles.headerSubtitle}>
            Customize your experience
          </Text>
        </View>
        <View style={[styles.headerIcon, settings.darkMode && styles.darkHeaderIcon]}>
          <Ionicons name="settings-outline" size={28} color="#8B5CF6" />
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, settings.darkMode && styles.darkSectionTitle]}>
          Appearance
        </Text>
        <View style={[styles.card, settings.darkMode && styles.darkCard]}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={styles.settingRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="moon-outline" size={22} color="#8B5CF6" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                  Dark Mode
                </Text>
                <Text style={styles.settingDescription}>
                  Switch to dark theme
                </Text>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={() => toggleSetting('darkMode')}
                trackColor={{ false: '#E5E5EA', true: '#8B5CF6' }}
                thumbColor={'#FFFFFF'}
                ios_backgroundColor="#E5E5EA"
              />
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Privacy Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, settings.darkMode && styles.darkSectionTitle]}>
          Privacy
        </Text>
        <View style={[styles.card, settings.darkMode && styles.darkCard]}>
          <View style={styles.settingRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="time-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                Save History
              </Text>
              <Text style={styles.settingDescription}>
                Keep track of visited pages
              </Text>
            </View>
            <Switch
              value={settings.saveHistory}
              onValueChange={() => toggleSetting('saveHistory')}
              trackColor={{ false: '#E5E5EA', true: '#8B5CF6' }}
              thumbColor={'#FFFFFF'}
              ios_backgroundColor="#E5E5EA"
            />
          </View>

          <View style={[styles.divider, settings.darkMode && styles.darkDivider]} />

          <View style={styles.settingRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="eye-off-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                Incognito Mode
              </Text>
              <Text style={styles.settingDescription}>
                Don't save browsing data
              </Text>
            </View>
            <Switch
              value={settings.clearOnExit}
              onValueChange={() => toggleSetting('clearOnExit')}
              trackColor={{ false: '#E5E5EA', true: '#8B5CF6' }}
              thumbColor={'#FFFFFF'}
              ios_backgroundColor="#E5E5EA"
            />
          </View>
        </View>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, settings.darkMode && styles.darkSectionTitle]}>
          Data Management
        </Text>
        
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, settings.darkMode && styles.darkCard]}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="bookmark" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statNumber}>{bookmarks.length}</Text>
            <Text style={[styles.statLabel, settings.darkMode && styles.darkText]}>Bookmarks</Text>
          </View>
          <View style={[styles.statCard, settings.darkMode && styles.darkCard]}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="time" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statNumber}>{history.length}</Text>
            <Text style={[styles.statLabel, settings.darkMode && styles.darkText]}>History</Text>
          </View>
          <View style={[styles.statCard, settings.darkMode && styles.darkCard]}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="cloud-offline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statNumber}>{offlinePages}</Text>
            <Text style={[styles.statLabel, settings.darkMode && styles.darkText]}>Offline</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.card, settings.darkMode && styles.darkCard]}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleClearHistory}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FF3B3015' }]}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, { color: '#FF3B30' }]}>
                Clear History
              </Text>
              <Text style={styles.settingDescription}>
                Remove all browsing history
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={[styles.divider, settings.darkMode && styles.darkDivider]} />

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleClearCache}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FF950015' }]}>
              <Ionicons name="flash-outline" size={22} color="#FF9500" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                Clear Cache
              </Text>
              <Text style={styles.settingDescription}>
                Free up storage space
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={[styles.divider, settings.darkMode && styles.darkDivider]} />

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleExportData}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#007AFF15' }]}>
              <Ionicons name="download-outline" size={22} color="#007AFF" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                Export Data
              </Text>
              <Text style={styles.settingDescription}>
                Copy all data to clipboard
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={[styles.divider, settings.darkMode && styles.darkDivider]} />

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleClearAllData}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FF3B3015' }]}>
              <Ionicons name="warning-outline" size={22} color="#FF3B30" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, { color: '#FF3B30' }]}>
                Clear All Data
              </Text>
              <Text style={styles.settingDescription}>
                Remove everything permanently
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, settings.darkMode && styles.darkSectionTitle]}>
          About
        </Text>
        <View style={[styles.card, settings.darkMode && styles.darkCard]}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowAbout(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="information-circle-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                About Browser
              </Text>
              <Text style={styles.settingDescription}>
                Version 1.0.0
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={[styles.divider, settings.darkMode && styles.darkDivider]} />

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRateApp}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFCC0015' }]}>
              <Ionicons name="star-outline" size={22} color="#FFCC00" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                Rate App
              </Text>
              <Text style={styles.settingDescription}>
                Support our work
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={[styles.divider, settings.darkMode && styles.darkDivider]} />

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleFeedback}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="chatbubble-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                Send Feedback
              </Text>
              <Text style={styles.settingDescription}>
                Help us improve
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={[styles.divider, settings.darkMode && styles.darkDivider]} />

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCopyVersion}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="copy-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, settings.darkMode && styles.darkText]}>
                Copy Version
              </Text>
              <Text style={styles.settingDescription}>
                Share version info
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.footerLogo, { backgroundColor: '#8B5CF615' }]}>
          <Ionicons name="globe" size={32} color="#8B5CF6" />
        </View>
        <Text style={[styles.footerText, settings.darkMode && styles.darkText]}>
          Browser Pro
        </Text>
        <Text style={styles.footerSubtext}>
          Fast • Simple • Secure
        </Text>
        <Text style={styles.footerVersion}>
          v1.0.0 • Made by Barshan sarkar 
          .ig - barshansarkar01
          ..malda
        </Text>
      </View>

      {/* About Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAbout}
        onRequestClose={() => setShowAbout(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowAbout(false)}
        >
          <View style={[styles.aboutContainer, settings.darkMode && styles.darkMenu]}>
            <View style={styles.menuHandle} />
            <Text style={[styles.aboutTitle, settings.darkMode && styles.darkText]}>
              About Browser Pro
            </Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={[styles.aboutDescription, settings.darkMode && styles.darkText]}>
              A fast, simple, and secure browser built with React Native. Browse the web with ease and confidence.
            </Text>
            
            <TouchableOpacity style={styles.aboutItem} onPress={handlePrivacyPolicy}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.aboutItemText, settings.darkMode && styles.darkText]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={16} color="#999" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            
            <View style={[styles.divider, settings.darkMode && styles.darkDivider]} />

            <TouchableOpacity style={styles.aboutItem} onPress={handleTermsOfService}>
              <Ionicons name="document-text-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.aboutItemText, settings.darkMode && styles.darkText]}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={16} color="#999" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowAbout(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPrivacy}
        onRequestClose={() => setShowPrivacy(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.legalContainer, settings.darkMode && styles.darkMenu]}>
            <View style={styles.menuHandle} />
            <Text style={[styles.legalTitle, settings.darkMode && styles.darkText]}>Privacy Policy</Text>
            <ScrollView style={styles.legalScroll}>
              <Text style={[styles.legalText, settings.darkMode && styles.darkText]}>
                Your privacy is important to us. This browser application does not collect, store, or transmit any personal information.
                
                {'\n\n'}All browsing data, including history, bookmarks, and settings, is stored locally on your device and never leaves your device.
                
                {'\n\n'}We do not use tracking cookies, analytics, or any third-party services that could compromise your privacy.
                
                {'\n\n'}You can clear all data at any time from the Settings menu.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowPrivacy(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTerms}
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.legalContainer, settings.darkMode && styles.darkMenu]}>
            <View style={styles.menuHandle} />
            <Text style={[styles.legalTitle, settings.darkMode && styles.darkText]}>Terms of Service</Text>
            <ScrollView style={styles.legalScroll}>
              <Text style={[styles.legalText, settings.darkMode && styles.darkText]}>
                This browser application is provided "as-is" without any warranties of any kind.
                
                {'\n\n'}The developer is not responsible for any content accessed through this browser.
                
                {'\n\n'}Users are responsible for complying with all applicable laws and regulations while using this application.
                
                {'\n\n'}This application is intended for personal use only.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Clear All Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={clearConfirm}
        onRequestClose={() => setClearConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmContainer, settings.darkMode && styles.darkMenu]}>
            <View style={[styles.confirmIcon, { backgroundColor: '#FF3B3015' }]}>
              <Ionicons name="warning" size={32} color="#FF3B30" />
            </View>
            <Text style={[styles.confirmTitle, settings.darkMode && styles.darkText]}>
              Clear All Data?
            </Text>
            <Text style={styles.confirmDescription}>
              This will permanently delete {bookmarks.length} bookmarks, {history.length} history items, and {offlinePages} offline pages. This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.cancelConfirmButton]} 
                onPress={() => setClearConfirm(false)}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.deleteConfirmButton]} 
                onPress={confirmClearAll}
              >
                <Text style={styles.deleteConfirmText}>Delete All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  darkContainer: { 
    backgroundColor: '#000000' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: { 
    fontSize: 34, 
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#000',
  },
  darkText: { 
    color: '#fff' 
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  darkHeaderIcon: {
    backgroundColor: '#1C1C1E',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  darkSectionTitle: {
    color: '#8E8E93',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  darkCard: { 
    backgroundColor: '#1C1C1E',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingText: { 
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  settingDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 68,
  },
  darkDivider: {
    backgroundColor: '#2C2C2E',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  footerVersion: {
    fontSize: 10,
    color: '#8B5CF6',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  aboutContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  darkMenu: {
    backgroundColor: '#1C1C1E',
  },
  menuHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 20,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  aboutItemText: {
    fontSize: 16,
    color: '#8B5CF6',
  },
  closeButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  legalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  legalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  legalScroll: {
    maxHeight: 400,
  },
  legalText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  confirmContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelConfirmButton: {
    backgroundColor: '#E5E5EA',
  },
  deleteConfirmButton: {
    backgroundColor: '#FF3B30',
  },
  cancelConfirmText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;