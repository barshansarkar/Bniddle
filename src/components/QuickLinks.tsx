import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuickLink {
  name: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const quickLinks: QuickLink[] = [
  { name: 'Google', url: 'https://www.google.com', icon: 'logo-google', color: '#4285F4' },
  { name: 'YouTube', url: 'https://www.youtube.com', icon: 'logo-youtube', color: '#FF0000' },
  { name: 'GitHub', url: 'https://www.github.com', icon: 'logo-github', color: '#333333' },
  { name: 'Twitter', url: 'https://www.twitter.com', icon: 'logo-twitter', color: '#1DA1F2' },
  { name: 'Reddit', url: 'https://www.reddit.com', icon: 'logo-reddit', color: '#FF4500' },
  { name: 'Amazon', url: 'https://www.amazon.com', icon: 'cart', color: '#FF9900' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'book', color: '#636363' },
  { name: 'Netflix', url: 'https://www.netflix.com', icon: 'film', color: '#E50914' },
];

interface QuickLinksProps {
  darkMode: boolean;
  onNavigate: (url: string) => void;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ darkMode, onNavigate }) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, darkMode && styles.darkText]}>Quick Access</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {quickLinks.map((link, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.linkCard, darkMode && styles.darkCard]}
            onPress={() => onNavigate(link.url)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: link.color + '20' }]}>
              <Ionicons name={link.icon} size={28} color={link.color} />
            </View>
            <Text style={[styles.linkText, darkMode && styles.darkText]} numberOfLines={1}>
              {link.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  linkCard: {
    alignItems: 'center',
    width: 72,
  },
  darkCard: {
    opacity: 0.9,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});

export default QuickLinks;