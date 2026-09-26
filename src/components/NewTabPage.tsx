import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import QuickLinks from './QuickLinks';

interface NewTabPageProps {
  darkMode: boolean;
  onNavigate: (url: string) => void;
  onSearch: (text: string) => void;
}

const NewTabPage: React.FC<NewTabPageProps> = ({ darkMode, onNavigate, onSearch }) => {
  const [searchText, setSearchText] = React.useState('');

  const handleSearch = () => {
    if (searchText.trim()) {
      onSearch(searchText.trim());
    }
  };

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Ionicons name="globe" size={48} color="#007AFF" />
        <Text style={[styles.title, darkMode && styles.darkText]}>Browser</Text>
        <Text style={styles.subtitle}>Fast, Simple, Secure</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, darkMode && styles.darkSearchBox]}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={[styles.searchInput, darkMode && styles.darkText]}
            placeholder="Search or type URL"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <QuickLinks darkMode={darkMode} onNavigate={onNavigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 12,
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  darkSearchBox: {
    backgroundColor: '#1C1C1E',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});

export default NewTabPage;