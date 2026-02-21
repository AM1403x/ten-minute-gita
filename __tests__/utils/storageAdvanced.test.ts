/**
 * Advanced storage utility tests — covers edge cases not in the base storage.test.ts:
 * - loadProgress with corrupt/partial/missing data
 * - saveProgress error paths
 * - isYesterday grace period (midnight–4 AM)
 * - getWeekStart edge cases
 * - Data migration (boolean darkMode → string)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadProgress,
  saveProgress,
  resetProgress,
  defaultProgress,
  defaultSettings,
  getDateString,
  isToday,
  isYesterday,
  getWeekStart,
  calculateProgress,
} from '@/utils/storage';
import { CONFIG } from '@/constants/config';

const STORAGE_KEY = CONFIG.STORAGE_KEY;

describe('loadProgress — edge cases', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
  });

  it('returns defaultProgress when storage is empty', async () => {
    const result = await loadProgress();
    expect(result).toEqual(defaultProgress);
  });

  it('returns defaultProgress for corrupt JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{{{not valid json');
    const result = await loadProgress();
    expect(result).toEqual(defaultProgress);
  });

  it('returns defaultProgress when currentSnippet is 0', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...defaultProgress,
      currentSnippet: 0,
    }));
    const result = await loadProgress();
    expect(result).toEqual(defaultProgress);
  });

  it('returns defaultProgress when currentSnippet is negative', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...defaultProgress,
      currentSnippet: -1,
    }));
    const result = await loadProgress();
    expect(result).toEqual(defaultProgress);
  });

  it('returns defaultProgress when currentSnippet exceeds TOTAL_SNIPPETS', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...defaultProgress,
      currentSnippet: 999,
    }));
    const result = await loadProgress();
    expect(result).toEqual(defaultProgress);
  });

  it('returns defaultProgress when completedSnippets is not an array', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...defaultProgress,
      completedSnippets: 'not an array',
    }));
    const result = await loadProgress();
    expect(result).toEqual(defaultProgress);
  });

  it('returns defaultProgress when streak.current is negative', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...defaultProgress,
      streak: { ...defaultProgress.streak, current: -5 },
    }));
    const result = await loadProgress();
    expect(result).toEqual(defaultProgress);
  });

  it('merges with defaults for missing fields (forward compat)', async () => {
    // Simulate old data without some new fields
    const oldData = {
      currentSnippet: 5,
      completedSnippets: [1, 2, 3, 4],
      streak: { current: 4, longest: 4, lastReadDate: '2025-01-01' },
      settings: { fontSize: 20 },
      readingHistory: {},
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(oldData));
    const result = await loadProgress();

    // Old fields preserved
    expect(result.currentSnippet).toBe(5);
    expect(result.completedSnippets).toEqual([1, 2, 3, 4]);
    expect(result.streak.current).toBe(4);
    expect(result.settings.fontSize).toBe(20);

    // New fields from defaults
    expect(result.settings.showSanskrit).toBe(true);
    expect(result.settings.showTransliteration).toBe(true);
    expect(result.settings.showTranslation).toBe(true);
    expect(result.streak.freezesAvailable).toBe(1);
    expect(result.streak.freezeUsedThisWeek).toBe(false);
  });

  it('migrates boolean darkMode to string', async () => {
    const oldData = {
      ...defaultProgress,
      settings: { ...defaultSettings, darkMode: true },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(oldData));
    const result = await loadProgress();
    expect(result.settings.darkMode).toBe('dark');
  });

  it('migrates false darkMode to "system"', async () => {
    const oldData = {
      ...defaultProgress,
      settings: { ...defaultSettings, darkMode: false },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(oldData));
    const result = await loadProgress();
    expect(result.settings.darkMode).toBe('system');
  });

  it('preserves string darkMode values', async () => {
    const data = {
      ...defaultProgress,
      settings: { ...defaultSettings, darkMode: 'light' },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const result = await loadProgress();
    expect(result.settings.darkMode).toBe('light');
  });

  it('migrates readingHistory from number to number[]', async () => {
    // Simulate v1 data: no readingHistoryVersion field, number values
    const { readingHistoryVersion: _, ...v1Progress } = defaultProgress;
    const oldData = {
      ...v1Progress,
      readingHistory: { '2025-01-01': 1, '2025-01-02': 2, '2025-01-03': 3 },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(oldData));
    const result = await loadProgress();
    expect(result.readingHistory['2025-01-01']).toEqual([1]);
    expect(result.readingHistory['2025-01-02']).toEqual([2]);
    expect(result.readingHistory['2025-01-03']).toEqual([3]);
    expect(result.readingHistoryVersion).toBe(2);
  });

  it('readingHistory migration is idempotent (already-migrated data unchanged)', async () => {
    const data = {
      ...defaultProgress,
      readingHistory: { '2025-01-01': [1], '2025-01-02': [2, 3] },
      readingHistoryVersion: 2,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const result = await loadProgress();
    expect(result.readingHistory['2025-01-01']).toEqual([1]);
    expect(result.readingHistory['2025-01-02']).toEqual([2, 3]);
  });

  it('readingHistory migration handles mixed old/new values', async () => {
    // Edge case: partially migrated data (shouldn't happen but be safe)
    const { readingHistoryVersion: _, ...v1Progress } = defaultProgress;
    const mixedData = {
      ...v1Progress,
      readingHistory: { '2025-01-01': 1, '2025-01-02': [2] },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mixedData));
    const result = await loadProgress();
    expect(result.readingHistory['2025-01-01']).toEqual([1]);
    expect(result.readingHistory['2025-01-02']).toEqual([2]);
  });

  it('sets readingHistoryVersion to 2 in defaultProgress', () => {
    expect(defaultProgress.readingHistoryVersion).toBe(2);
  });
});

describe('saveProgress', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
  });

  it('persists progress to AsyncStorage', async () => {
    await saveProgress(defaultProgress);
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.currentSnippet).toBe(1);
  });

  it('overwrites existing data', async () => {
    await saveProgress({ ...defaultProgress, currentSnippet: 5 });
    await saveProgress({ ...defaultProgress, currentSnippet: 10 });
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    expect(parsed.currentSnippet).toBe(10);
  });
});

describe('resetProgress', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
  });

  it('removes the storage key', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProgress));
    await resetProgress();
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(stored).toBeNull();
  });
});

describe('isYesterday — grace period', () => {
  it('returns true for today at 3 AM (within grace period)', () => {
    // Mock Date to be 3 AM today
    const realDateNow = Date.now;
    const today = new Date();
    today.setHours(3, 0, 0, 0);
    jest.spyOn(Date, 'now').mockReturnValue(today.getTime());

    // When it's 3 AM, "today's date" should count as "yesterday" for grace period
    const todayStr = getDateString(today);
    // We need to test the actual function behavior
    // At 3 AM, isYesterday should return true for today's date
    // because the grace period allows midnight-4 AM to count
    const result = isYesterday(todayStr);
    // At 3 AM, now.getHours() < 4, so dateString === getDateString(now) → true
    expect(result).toBe(true);

    Date.now = realDateNow;
    jest.restoreAllMocks();
  });
});

describe('getWeekStart — additional edge cases', () => {
  it('handles Monday correctly (start of week = itself)', () => {
    const result = getWeekStart(new Date(2025, 0, 13)); // Mon Jan 13
    expect(result).toBe('2025-01-13');
  });

  it('handles Saturday', () => {
    const result = getWeekStart(new Date(2025, 0, 18)); // Sat Jan 18
    expect(result).toBe('2025-01-13');
  });

  it('handles month boundary (week spans two months)', () => {
    // Fri Jan 31, 2025 → Monday should be Jan 27
    const result = getWeekStart(new Date(2025, 0, 31));
    expect(result).toBe('2025-01-27');
  });

  it('handles year boundary', () => {
    // Wed Jan 1, 2025 → Monday should be Dec 30, 2024
    const result = getWeekStart(new Date(2025, 0, 1));
    expect(result).toBe('2024-12-30');
  });
});

describe('calculateProgress — edge cases', () => {
  it('handles completion (239/239)', () => {
    const result = calculateProgress(239);
    expect(result.percentage).toBe(100);
    expect(result.daysRemaining).toBe(0);
  });

  it('rounds percentage correctly', () => {
    // 1/239 ≈ 0.418% → rounds to 0
    const result = calculateProgress(1);
    expect(result.percentage).toBe(0);
    expect(result.daysRemaining).toBe(238);
  });

  it('handles midway point', () => {
    const result = calculateProgress(120);
    expect(result.percentage).toBe(50);
  });
});
