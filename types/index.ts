export interface Snippet {
  id: number;
  title: string;
  chapter: number;
  verses: string;
  sanskrit: string;
  transliteration: string;
  verseTranslations: string[];
  commentary: string;
  reflection: string;
  shortReflection?: string;
}

export interface StreakData {
  current: number;
  longest: number;
  lastReadDate: string | null;
  freezesAvailable: number;
  freezeUsedThisWeek: boolean;
}

export interface Settings {
  fontSize: number;
  darkMode: 'system' | 'light' | 'dark';
  notificationTime: string;
  notificationsEnabled: boolean;
  showSanskrit: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
}

export interface ReadingHistory {
  [date: string]: number[]; // date -> snippet ids completed that day (in order)
}

export interface UserProgress {
  currentSnippet: number;
  completedSnippets: number[];
  streak: StreakData;
  settings: Settings;
  readingHistory: ReadingHistory;
  readingHistoryVersion?: number;
}

export interface AppState {
  progress: UserProgress;
  isLoading: boolean;
}

export type AppAction =
  | { type: 'SET_PROGRESS'; payload: UserProgress }
  | { type: 'MARK_COMPLETE'; payload: number }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'USE_STREAK_FREEZE' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET_PROGRESS' }
  | { type: 'SIMULATE_PROGRESS'; payload: number }
  | { type: 'SYNC_STREAK' };

export const TOTAL_SNIPPETS = 239;

export const MILESTONES = [1, 3, 7, 30, 100, 239];
