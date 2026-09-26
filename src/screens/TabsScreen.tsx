import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBrowser } from '../context/BrowserContext';

const TabsScreen: React.FC = () => {
  const { tabs, activeTabId, setActiveTabId, closeTab, addTab, settings } = useBrowser();
  const [closingTabId, setClosingTabId] = useState<number | null>(null);
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renamingTab, setRenamingTab] = useState<{ id: number; title: string } | null>(null);
  const [renameText, setRenameText] = useState<string>('');
  const [showTabActions, setShowTabActions] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleCloseTab = (tabId: number, tabTitle: string): void => {
    if (tabs.length === 1) {
      Alert.alert('Cannot Close', 'Keep at least one tab open');
      return;
    }
    
    // Animate closing
    setClosingTabId(tabId);
    Animated.timing(scaleAnim, {
      toValue: 0.9,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      closeTab(tabId);
      setClosingTabId(null);
      scaleAnim.setValue(1);
    });
  };

  const handleLongPressTab = (tabId: number, tabTitle: string): void => {
    setSelectedTab(tabId);
    setRenamingTab({ id: tabId, title: tabTitle });
    setShowTabActions(true);
  };

  const handleRenameTab = (): void => {
    if (renamingTab) {
      setRenameText(renamingTab.title);
      setShowTabActions(false);
      setShowRenameModal(true);
    }
  };

  const confirmRename = (): void => {
    if (renamingTab && renameText.trim()) {
      const updatedTabs = tabs.map(tab =>
        tab.id === renamingTab.id ? { ...tab, title: renameText.trim() } : tab
      );
      useBrowser().setTabs(updatedTabs);
    }
    setShowRenameModal(false);
    setRenamingTab(null);
    setRenameText('');
  };

  const handleDuplicateTab = (): void => {
    if (selectedTab) {
      const tabToDuplicate = tabs.find(tab => tab.id === selectedTab);
      if (tabToDuplicate) {
        addTab(tabToDuplicate.url);
      }
    }
    setShowTabActions(false);
  };

  const handleCloseAllTabs = (): void => {
    Alert.alert(
      'Close All Tabs',
      `Close all ${tabs.length} tabs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Close All', 
          style: 'destructive',
          onPress: () => {
            tabs.forEach(tab => {
              if (tab.id !== activeTabId) {
                closeTab(tab.id);
              }
            });
          }
        },
      ]
    );
    setShowTabActions(false);
  };

  const getDomain = (url: string): string => {
    try {
      return url.replace('https://', '').replace('http://', '').split('/')[0];
    } catch {
      return url;
    }
  };

  const getFaviconColor = (url: string): string => {
    const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9'];
    const hash = url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <View style={[styles.container, settings.darkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, settings.darkMode && styles.darkText]}>
            Tabs
          </Text>
          <Text style={styles.headerSubtitle}>
            {tabs.length} open {tabs.length === 1 ? 'tab' : 'tabs'}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => addTab()} 
          style={[styles.addButton, settings.darkMode && styles.darkAddButton]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs List */}
      <ScrollView 
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTabId === tab.id;
          const isClosing = closingTabId === tab.id;
          const faviconColor = getFaviconColor(tab.url);
          
          return (
            <Animated.View
              key={tab.id}
              style={[
                styles.tabCardWrapper,
                isClosing && { opacity: 0, transform: [{ scale: 0.9 }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tabCard,
                  isActive && styles.activeCard,
                  settings.darkMode && styles.darkCard,
                  isActive && settings.darkMode && styles.darkActiveCard,
                ]}
                onPress={() => setActiveTabId(tab.id)}
                onLongPress={() => handleLongPressTab(tab.id, tab.title || 'New Tab')}
                activeOpacity={0.7}
                delayLongPress={300}
              >
                {/* Favicon */}
                <View style={[styles.favicon, { backgroundColor: faviconColor + '20' }]}>
                  <Ionicons 
                    name="globe-outline" 
                    size={18} 
                    color={faviconColor} 
                  />
                </View>

                {/* Tab Info */}
                <View style={styles.info}>
                  <Text 
                    style={[
                      styles.title,
                      settings.darkMode && styles.darkText,
                      isActive && styles.activeTitle,
                    ]} 
                    numberOfLines={1}
                  >
                    {tab.title || 'New Tab'}
                  </Text>
                  <View style={styles.urlRow}>
                    <Ionicons 
                      name="lock-closed" 
                      size={10} 
                      color={isActive ? '#8B5CF6' : '#8E8E93'} 
                      style={styles.lockIcon}
                    />
                    <Text 
                      style={[styles.url, isActive && styles.activeUrl]} 
                      numberOfLines={1}
                    >
                      {getDomain(tab.url)}
                    </Text>
                  </View>
                </View>

                {/* Active Indicator */}
                {isActive && (
                  <View style={styles.activeDot} />
                )}

                {/* Close Button */}
                <TouchableOpacity 
                  onPress={() => handleCloseTab(tab.id, tab.title || 'New Tab')}
                  style={[
                    styles.closeBtn,
                    isActive && styles.activeCloseBtn,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons 
                    name="close" 
                    size={16} 
                    color={isActive ? '#8B5CF6' : settings.darkMode ? '#666' : '#C7C7CC'} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Quick Actions */}
        {tabs.length > 1 && (
          <TouchableOpacity
            style={[styles.closeAllBtn, settings.darkMode && styles.darkCloseAll]}
            onPress={handleCloseAllTabs}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={18} color="#8B5CF6" />
            <Text style={styles.closeAllText}>Close All Other Tabs</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Tab Actions Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTabActions}
        onRequestClose={() => setShowTabActions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowTabActions(false)}
        >
          <View style={[styles.actionsContainer, settings.darkMode && styles.darkActions]}>
            <Text style={[styles.actionsTitle, settings.darkMode && styles.darkText]}>
              Tab Actions
            </Text>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleRenameTab}>
              <Ionicons name="pencil-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.actionText, settings.darkMode && styles.darkText]}>Rename Tab</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleDuplicateTab}>
              <Ionicons name="copy-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.actionText, settings.darkMode && styles.darkText]}>Duplicate Tab</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionItem, styles.cancelAction]} 
              onPress={() => setShowTabActions(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showRenameModal}
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.renameContainer, settings.darkMode && styles.darkActions]}>
            <Text style={[styles.renameTitle, settings.darkMode && styles.darkText]}>
              Rename Tab
            </Text>
            <TextInput
              style={[styles.renameInput, settings.darkMode && styles.darkInput]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter tab name"
              placeholderTextColor="#999"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity 
                style={[styles.renameBtn, styles.cancelRenameBtn]} 
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.cancelRenameText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.renameBtn, styles.confirmRenameBtn]} 
                onPress={confirmRename}
              >
                <Text style={styles.confirmRenameText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    color: '#000',
    letterSpacing: -0.5,
  },
  darkText: { 
    color: '#FFFFFF' 
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  darkAddButton: {
    backgroundColor: '#7C3AED',
  },
  list: { 
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  tabCardWrapper: {
    marginBottom: 8,
  },
  tabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCard: {
    backgroundColor: '#F5F3FF',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: '#1C1C1E',
  },
  darkActiveCard: {
    backgroundColor: '#1C1C2E',
  },
  favicon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  activeTitle: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 4,
  },
  url: {
    fontSize: 12,
    color: '#8E8E93',
  },
  activeUrl: {
    color: '#8B5CF6',
    opacity: 0.7,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginRight: 8,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  activeCloseBtn: {
    backgroundColor: '#8B5CF615',
  },
  closeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 8,
    borderRadius: 12,
    gap: 8,
  },
  darkCloseAll: {
    backgroundColor: '#1C1C1E',
  },
  closeAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  darkActions: {
    backgroundColor: '#1C1C1E',
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#000',
  },
  cancelAction: {
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  renameContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  renameInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  darkInput: {
    backgroundColor: '#2C2C2E',
    color: '#fff',
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  renameBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelRenameBtn: {
    backgroundColor: '#F2F2F7',
  },
  confirmRenameBtn: {
    backgroundColor: '#8B5CF6',
  },
  cancelRenameText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  confirmRenameText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default TabsScreen;