import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BrowserContextType, HistoryItem, Settings, Tab } from '../types';

const BrowserContext = createContext<BrowserContextType | undefined>(undefined);

// Constants
const STORAGE_KEYS = {
  BOOKMARKS: 'bookmarks',
  HISTORY: 'history',
  SETTINGS: 'settings',
  TABS: 'tabs',
  ACTIVE_TAB: 'activeTabId',
} as const;

const MAX_HISTORY_ITEMS = 100;
const MAX_TABS = 20;

export const useBrowser = (): BrowserContextType => {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error('useBrowser must be used within a BrowserProvider');
  }
  return context;
};

export const BrowserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 1, url: 'https://www.google.com', title: 'New Tab' }
  ]);
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    saveHistory: true,
    clearOnExit: false,
  });
  
  // Refs for optimization
  const isInitialized = useRef<boolean>(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const dataLoaded = useRef<boolean>(false);

  // Load all data on mount
  useEffect(() => {
    loadData();
    
    // Cleanup on unmount
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  const loadData = useCallback(async (): Promise<void> => {
    if (dataLoaded.current) return;
    
    try {
      const results = await Promise.allSettled([
        AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS),
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.TABS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TAB),
      ]);

      const [bookmarksResult, historyResult, settingsResult, tabsResult, activeTabResult] = results;

      if (bookmarksResult.status === 'fulfilled' && bookmarksResult.value) {
        const parsedBookmarks = JSON.parse(bookmarksResult.value);
        if (Array.isArray(parsedBookmarks)) {
          setBookmarks(parsedBookmarks);
        }
      }

      if (historyResult.status === 'fulfilled' && historyResult.value) {
        const parsedHistory = JSON.parse(historyResult.value);
        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory.slice(0, MAX_HISTORY_ITEMS));
        }
      }

      if (settingsResult.status === 'fulfilled' && settingsResult.value) {
        const parsedSettings = JSON.parse(settingsResult.value);
        setSettings(prev => ({
          ...prev,
          ...parsedSettings,
        }));
      }

      if (tabsResult.status === 'fulfilled' && tabsResult.value) {
        const parsedTabs = JSON.parse(tabsResult.value);
        if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
          setTabs(parsedTabs.slice(0, MAX_TABS));
        }
      }

      if (activeTabResult.status === 'fulfilled' && activeTabResult.value) {
        const parsedActiveTab = JSON.parse(activeTabResult.value);
        if (typeof parsedActiveTab === 'number') {
          setActiveTabId(parsedActiveTab);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Set default values on error
      setTabs([{ id: 1, url: 'https://www.google.com', title: 'New Tab' }]);
      setActiveTabId(1);
      setBookmarks([]);
      setHistory([]);
    } finally {
      isInitialized.current = true;
      dataLoaded.current = true;
    }
  }, []);

  const saveData = useCallback(async (key: string, data: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  }, []);

  // Debounced save helper
  const debouncedSave = useCallback((key: string, data: any, delay: number = 500): void => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(() => {
      saveData(key, data);
    }, delay);
  }, [saveData]);

  // Save tabs when they change
  useEffect(() => {
    if (isInitialized.current) {
      debouncedSave(STORAGE_KEYS.TABS, tabs, 1000);
    }
  }, [tabs, debouncedSave]);

  // Save active tab when it changes
  useEffect(() => {
    if (isInitialized.current) {
      saveData(STORAGE_KEYS.ACTIVE_TAB, activeTabId);
    }
  }, [activeTabId, saveData]);

  // Save settings when they change
  useEffect(() => {
    if (isInitialized.current) {
      debouncedSave(STORAGE_KEYS.SETTINGS, settings, 1000);
    }
  }, [settings, debouncedSave]);

  const addTab = useCallback((url: string = 'https://www.google.com'): void => {
    setTabs(prevTabs => {
      if (prevTabs.length >= MAX_TABS) {
        console.warn(`Maximum tabs limit reached (${MAX_TABS})`);
        return prevTabs;
      }
      
      const newTab: Tab = { 
        id: Date.now(), 
        url, 
        title: 'New Tab' 
      };
      setActiveTabId(newTab.id);
      return [...prevTabs, newTab];
    });
  }, []);

  const closeTab = useCallback((id: number): void => {
    setTabs(prevTabs => {
      if (prevTabs.length <= 1) return prevTabs;
      
      const index = prevTabs.findIndex(tab => tab.id === id);
      if (index === -1) return prevTabs;
      
      const newTabs = prevTabs.filter(tab => tab.id !== id);
      
      // If closing active tab, switch to adjacent tab
      setActiveTabId(prevActiveId => {
        if (prevActiveId === id) {
          // Prefer the tab to the right, fallback to left
          const newActiveTab = newTabs[Math.min(index, newTabs.length - 1)];
          return newActiveTab?.id || newTabs[0]?.id || 1;
        }
        return prevActiveId;
      });
      
      return newTabs;
    });
  }, []);

  const updateTab = useCallback((id: number, updates: Partial<Tab>): void => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === id ? { ...tab, ...updates } : tab
      )
    );
  }, []);

  const addBookmark = useCallback(async (url: string, title: string): Promise<void> => {
    // Check for duplicate bookmarks
    const isDuplicate = bookmarks.some(bookmark => bookmark.url === url);
    if (isDuplicate) {
      console.log('Bookmark already exists');
      return;
    }
    
    const newBookmark: Bookmark = { 
      id: Date.now(), 
      url, 
      title, 
      date: new Date() 
    };
    
    const newBookmarks = [...bookmarks, newBookmark];
    setBookmarks(newBookmarks);
    await saveData(STORAGE_KEYS.BOOKMARKS, newBookmarks);
  }, [bookmarks, saveData]);

  const removeBookmark = useCallback(async (id: number): Promise<void> => {
    const newBookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
    setBookmarks(newBookmarks);
    await saveData(STORAGE_KEYS.BOOKMARKS, newBookmarks);
  }, [bookmarks, saveData]);

  const isBookmarked = useCallback((url: string): boolean => {
    return bookmarks.some(bookmark => bookmark.url === url);
  }, [bookmarks]);

  const addToHistory = useCallback(async (url: string, title: string): Promise<void> => {
    if (!settings.saveHistory) return;
    
    // Remove duplicates of same URL within last hour
    const now = Date.now();
    const hourAgo = now - 3600000;
    
    setHistory(prevHistory => {
      const filteredHistory = prevHistory.filter(item => 
        !(item.url === url && new Date(item.date).getTime() > hourAgo)
      );
      
      const historyItem: HistoryItem = { 
        id: now, 
        url, 
        title, 
        date: new Date() 
      };
      
      const newHistory = [historyItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
      
      // Async save
      saveData(STORAGE_KEYS.HISTORY, newHistory);
      
      return newHistory;
    });
  }, [settings.saveHistory, saveData]);

  const clearHistory = useCallback(async (): Promise<void> => {
    setHistory([]);
    await saveData(STORAGE_KEYS.HISTORY, []);
  }, [saveData]);

  const removeHistoryItem = useCallback(async (id: number): Promise<void> => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.filter(item => item.id !== id);
      saveData(STORAGE_KEYS.HISTORY, newHistory);
      return newHistory;
    });
  }, [saveData]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>): Promise<void> => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      
      // If clearOnExit is enabled, clear all data
      if (updatedSettings.clearOnExit && !prevSettings.clearOnExit) {
        clearAllData();
      }
      
      saveData(STORAGE_KEYS.SETTINGS, updatedSettings);
      return updatedSettings;
    });
  }, [saveData]);

  const clearAllData = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.BOOKMARKS),
        AsyncStorage.removeItem(STORAGE_KEYS.HISTORY),
        AsyncStorage.removeItem(STORAGE_KEYS.SETTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.TABS),
        AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_TAB),
      ]);
      
      setBookmarks([]);
      setHistory([]);
      setTabs([{ id: 1, url: 'https://www.google.com', title: 'New Tab' }]);
      setActiveTabId(1);
      
      console.log('All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }, []);

  const closeAllTabs = useCallback((): void => {
    const newTab: Tab = { id: Date.now(), url: 'https://www.google.com', title: 'New Tab' };
    setTabs([newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const duplicateTab = useCallback((id: number): void => {
    setTabs(prevTabs => {
      const tabToDuplicate = prevTabs.find(tab => tab.id === id);
      if (!tabToDuplicate || prevTabs.length >= MAX_TABS) return prevTabs;
      
      const newTab: Tab = {
        ...tabToDuplicate,
        id: Date.now(),
        title: tabToDuplicate.title || 'New Tab',
      };
      
      setActiveTabId(newTab.id);
      return [...prevTabs, newTab];
    });
  }, []);

  const reloadAllTabs = useCallback((): void => {
    // This is just a state update to trigger re-render
    setTabs(prevTabs => [...prevTabs]);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<BrowserContextType>(() => ({
    tabs, 
    setTabs, 
    activeTabId, 
    setActiveTabId,
    bookmarks, 
    history, 
    settings,
    addTab, 
    closeTab, 
    updateTab,
    addBookmark, 
    removeBookmark,
    isBookmarked,
    addToHistory, 
    clearHistory,
    removeHistoryItem,
    updateSettings,
    clearAllData,
    closeAllTabs,
    duplicateTab,
    reloadAllTabs,
  }), [
    tabs, 
    activeTabId, 
    bookmarks, 
    history, 
    settings,
    addTab, 
    closeTab, 
    updateTab,
    addBookmark, 
    removeBookmark,
    isBookmarked,
    addToHistory, 
    clearHistory,
    removeHistoryItem,
    updateSettings,
    clearAllData,
    closeAllTabs,
    duplicateTab,
    reloadAllTabs,
  ]);

  return (
    <BrowserContext.Provider value={contextValue}>
      {children}
    </BrowserContext.Provider>
  );
};

export default BrowserContext;