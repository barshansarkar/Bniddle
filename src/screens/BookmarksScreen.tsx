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

const BookmarksScreen: React.FC = () => {
  const { bookmarks, removeBookmark, settings, addTab, setActiveTabId } = useBrowser();

  const handleOpenBookmark = (url: string): void => {
    addTab(url);
    const newTabId = Date.now();
    setTimeout(() => {
      setActiveTabId(newTabId);
    }, 100);
  };

  const handleDeleteBookmark = (id: number, title: string): void => {
    Alert.alert(
      'Delete Bookmark',
      `Remove "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => removeBookmark(id)
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

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <View style={[styles.container, settings.darkMode && styles.darkContainer]}>
      {/* Simple Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, settings.darkMode && styles.darkText]}>
          Bookmarks
        </Text>
        {bookmarks.length > 0 && (
          <Text style={styles.count}>{bookmarks.length}</Text>
        )}
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {bookmarks.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bookmark-outline" size={32} color="#C7C7CC" />
            </View>
            <Text style={[styles.emptyText, settings.darkMode && styles.darkText]}>
              No Bookmarks
            </Text>
            <Text style={styles.emptySubtext}>
              Tap the bookmark icon while browsing{'\n'}to save pages here
            </Text>
          </View>
        ) : (
          bookmarks.map((bookmark) => (
            <TouchableOpacity
              key={bookmark.id}
              style={[
                styles.card,
                settings.darkMode && styles.darkCard,
              ]}
              onPress={() => handleOpenBookmark(bookmark.url)}
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
                    {bookmark.title}
                  </Text>
                  <Text style={styles.date}>{formatDate(bookmark.date)}</Text>
                </View>
                
                <Text style={styles.url} numberOfLines={1}>
                  {getDomain(bookmark.url)}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={() => handleDeleteBookmark(bookmark.id, bookmark.title)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons 
                  name="close" 
                  size={18} 
                  color={settings.darkMode ? '#666' : '#C7C7CC'} 
                />
              </TouchableOpacity>
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
  count: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    marginTop: 6,
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
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 8,
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
  date: {
    fontSize: 11,
    color: '#8E8E93',
  },
  url: {
    fontSize: 12,
    color: '#8E8E93',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BookmarksScreen;