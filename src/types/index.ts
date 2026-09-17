export interface Tab {
  id: number;
  url: string;
  title: string;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  date: Date;
}

export interface HistoryItem {
  id: number;
  url: string;
  title: string;
  date: Date;
}

export interface Settings {
  darkMode: boolean;
  saveHistory: boolean;
  clearOnExit: boolean;
}

// types.ts
export interface BrowserContextType {
  tabs: Tab[];
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
  activeTabId: number;
  setActiveTabId: React.Dispatch<React.SetStateAction<number>>;
  bookmarks: Bookmark[];
  history: HistoryItem[];
  settings: Settings;
  addTab: (url?: string) => void;
  closeTab: (id: number) => void;
  updateTab: (id: number, updates: Partial<Tab>) => void;
  addBookmark: (url: string, title: string) => Promise<void>;
  removeBookmark: (id: number) => Promise<void>;
  isBookmarked: (url: string) => boolean;
  addToHistory: (url: string, title: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  removeHistoryItem: (id: number) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  clearAllData: () => Promise<void>;
  closeAllTabs: () => void;
  duplicateTab: (id: number) => void;
  reloadAllTabs: () => void;
}