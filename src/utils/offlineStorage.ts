import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflinePage {
  url: string;
  html: string;
  title: string;
  savedAt: string;
}

export const saveOfflinePage = async (
  url: string, 
  html: string, 
  title: string
): Promise<boolean> => {
  try {
    const offlinePages = await AsyncStorage.getItem('offlinePages') || '{}';
    const pages = JSON.parse(offlinePages);
    pages[url] = {
      url,
      html,
      title,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('offlinePages', JSON.stringify(pages));
    return true;
  } catch (error) {
    console.error('Error saving offline page:', error);
    return false;
  }
};

export const getOfflinePage = async (url: string): Promise<OfflinePage | null> => {
  try {
    const offlinePages = await AsyncStorage.getItem('offlinePages') || '{}';
    const pages = JSON.parse(offlinePages);
    return pages[url] || null;
  } catch (error) {
    console.error('Error getting offline page:', error);
    return null;
  }
};

export const getAllOfflinePages = async (): Promise<OfflinePage[]> => {
  try {
    const offlinePages = await AsyncStorage.getItem('offlinePages') || '{}';
    const pages = JSON.parse(offlinePages);
    return Object.values(pages);
  } catch (error) {
    console.error('Error getting offline pages:', error);
    return [];
  }
};

export const deleteOfflinePage = async (url: string): Promise<boolean> => {
  try {
    const offlinePages = await AsyncStorage.getItem('offlinePages') || '{}';
    const pages = JSON.parse(offlinePages);
    delete pages[url];
    await AsyncStorage.setItem('offlinePages', JSON.stringify(pages));
    return true;
  } catch (error) {
    console.error('Error deleting offline page:', error);
    return false;
  }
};