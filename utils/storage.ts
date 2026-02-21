import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProgress, Settings, TOTAL_SNIPPETS } from '@/types';
import { CONFIG } from '@/constants/config';
import { logger } from './logger';

const STORAGE_KEY = CONFIG.STORAGE_KEY;

export const defaultSettings: Settings = {
  fontSize: 18,
  darkMode: 'system',
  notificationTime: '07:00',
  notificationsEnabled: false,
  showSanskrit: true,
  showTransliteration: true,
  showTranslation: true,
};

export const defaultProgress: UserProgress = {
  currentSnippet: 1,
  completedSnippets: [],
  streak: {
    current: 0,
    longest: 0,
    lastReadDate: null,
    freezesAvailable: 1,
    freezeUsedThisWeek: false,
  },
  settings: defaultSettings,
  readingHistory: {},
  readingHistoryVersion: 2,
};

export const saveProgress = async (progress: UserProgress): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    logger.error('storage.saveProgress', error);
  }
};

export const loadProgress = async (): Promise<UserProgress> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);

      // Validate critical fields
      if (
        typeof parsed.currentSnippet !== 'number' ||
        parsed.currentSnippet < 1 ||
        parsed.currentSnippet > TOTAL_SNIPPETS ||
        !Array.isArray(parsed.completedSnippets) ||
        (parsed.streak && typeof parsed.streak.current === 'number' && parsed.streak.current < 0)
      ) {
        return defaultProgress;
      }

      // Migrate old boolean darkMode to new string type
      let migratedSettings = { ...parsed.settings };
      if (typeof migratedSettings.darkMode === 'boolean') {
        migratedSettings.darkMode = migratedSettings.darkMode ? 'dark' : 'system';
      }

      // Migrate readingHistory: number → number[] (v1 → v2)
      let migratedHistory = parsed.readingHistory || {};
      if (!parsed.readingHistoryVersion || parsed.readingHistoryVersion < 2) {
        let needsMigration = false;
        for (const key of Object.keys(migratedHistory)) {
          if (typeof migratedHistory[key] === 'number') {
            needsMigration = true;
            break;
          }
        }
        if (needsMigration) {
          const newHistory: Record<string, number[]> = {};
          for (const [date, val] of Object.entries(migratedHistory)) {
            newHistory[date] = typeof val === 'number' ? [val] : (val as number[]);
          }
          migratedHistory = newHistory;
        }
      }

      // Merge with defaults to handle any new fields
      return {
        ...defaultProgress,
        ...parsed,
        readingHistory: migratedHistory,
        readingHistoryVersion: 2,
        settings: { ...defaultSettings, ...migratedSettings },
        streak: { ...defaultProgress.streak, ...parsed.streak },
      };
    }
    return defaultProgress;
  } catch (error) {
    logger.error('storage.loadProgress', error);
    return defaultProgress;
  }
};

export const resetProgress = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error('storage.resetProgress', error);
  }
};

export const getDateString = (date: Date = new Date()): string => {
  // Use local date format to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isToday = (dateString: string): boolean => {
  return dateString === getDateString();
};

export const isYesterday = (dateString: string): boolean => {
  // Use Date.now() so tests can reliably control "now" via jest.spyOn(Date, 'now').
  const now = new Date(Date.now());
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateString === getDateString(yesterday)) return true;
  // Grace period: between midnight and 4 AM, treat today's date as "yesterday"
  // so a streak isn't broken when reading at 11:59 PM and opening at 12:01 AM
  if (now.getHours() < CONFIG.GRACE_PERIOD_HOURS && dateString === getDateString(now)) return true;
  return false;
};

export const getWeekStart = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return getDateString(d);
};

export const calculateProgress = (completedCount: number): {
  percentage: number;
  daysRemaining: number;
} => {
  const percentage = Math.round((completedCount / TOTAL_SNIPPETS) * 100);
  const daysRemaining = TOTAL_SNIPPETS - completedCount;
  return { percentage, daysRemaining };
};
