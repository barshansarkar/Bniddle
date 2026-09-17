import { Alert } from 'react-native';

export const startVoiceSearch = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    Alert.alert(
      '🎤 Voice Search',
      'Voice search coming soon! Type your search instead.',
      [
        { text: 'Cancel', onPress: () => resolve(null), style: 'cancel' },
        { text: 'OK', onPress: () => resolve(null) },
      ]
    );
  });
};