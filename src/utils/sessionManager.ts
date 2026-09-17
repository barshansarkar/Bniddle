import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Session {
  tabs: { url: string; title: string }[];
  activeTabId: number;
  timestamp: string;
}

export const saveSession = async (tabs: any[], activeTabId: number): Promise<void> => {
  try {
    const session: Session = {
      tabs: tabs.map(tab => ({ url: tab.url, title: tab.title })),
      activeTabId,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem('lastSession', JSON.stringify(session));
  } catch (error) {
    console.error('Error saving session:', error);
  }
};

export const loadSession = async (): Promise<Session | null> => {
  try {
    const session = await AsyncStorage.getItem('lastSession');
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('lastSession');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};