import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useBrowser } from '../context/BrowserContext';

const HistoryScreen: React.FC = () => {
  const { history, clearHistory, settings, addTab, setActiveTabId } = useBrowser();

  const handleOpenHistory = (url: string): void => {
    addTab(url);
    const newTabId = Date.now();
    setTimeout(() => {
      setActiveTabId(newTabId);
    }, 100);
  };

  const handleClearHistory = (): void => {
    Alert.alert(
      'Clear History',
      'Remove all browsing history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => clearHistory()
        },
      ]
    );
  };

  const getDomain = (url: string): string => {
    try {
      return url.replace('https://', '').replace('http://', '').split('/')[0];
    } catch {
      return url;
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <View style={[styles.container, settings.darkMode && styles.darkContainer]}>
      {/* Simple Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, settings.darkMode && styles.darkText]}>
          History
        </Text>
        {history.length > 0 && (
          <TouchableOpacity 
            onPress={handleClearHistory}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={32} color="#C7C7CC" />
            </View>
            <Text style={[styles.emptyText, settings.darkMode && styles.darkText]}>
              No History
            </Text>
            <Text style={styles.emptySubtext}>
              Pages you visit will appear here
            </Text>
          </View>
        ) : (
          history.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                settings.darkMode && styles.darkCard,
              ]}
              onPress={() => handleOpenHistory(item.url)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                  <Text 
                    style={[
                      styles.title,
                      settings.darkMode && styles.darkText,
                    ]} 
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.time}>{formatTime(item.date)}</Text>
                </View>
                
                <Text style={styles.url} numberOfLines={1}>
                  {getDomain(item.url)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#000',
  },
  darkText: { 
    color: '#FFFFFF' 
  },
  clearText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  list: { 
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 120,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { 
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
  },
  darkCard: {
    backgroundColor: '#1C1C1E',
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: '#8E8E93',
  },
  url: {
    fontSize: 12,
    color: '#8E8E93',
  },
});

export default HistoryScreen;