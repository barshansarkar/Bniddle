import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface FindInPageProps {
  visible: boolean;
  darkMode: boolean;
  onFind: (text: string) => void;
  onClose: () => void;
  matchCount: number;
  currentMatch: number;
}

const FindInPage: React.FC<FindInPageProps> = ({
  visible,
  darkMode,
  onFind,
  onClose,
  matchCount,
  currentMatch,
}) => {
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <TextInput
        style={[styles.input, darkMode && styles.darkInput]}
        value={searchText}
        onChangeText={(text) => {
          setSearchText(text);
          onFind(text);
        }}
        placeholder="Find in page"
        placeholderTextColor="#999"
        autoFocus
      />
      <Text style={styles.counter}>
        {matchCount > 0 ? `${currentMatch}/${matchCount}` : ''}
      </Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  darkContainer: {
    backgroundColor: '#1C1C1E',
    borderBottomColor: '#2C2C2E',
  },
  input: {
    flex: 1,
    height: 36,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
  },
  darkInput: {
    backgroundColor: '#2C2C2E',
    color: '#fff',
  },
  counter: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 8,
  },
  closeButton: {
    padding: 4,
  },
});

export default FindInPage;