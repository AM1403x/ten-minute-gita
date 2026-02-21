/**
 * Advanced appReducer tests — covers edge cases not in the base test:
 * - SIMULATE_PROGRESS action
 * - SET_LOADING action
 * - SET_PROGRESS action
 * - MARK_COMPLETE streak edge cases (read twice same day, week reset)
 * - USE_STREAK_FREEZE when already used this week
 * - SYNC_STREAK with null lastReadDate
 * - Default/unknown action type
 */

import { appReducer, initialState } from '@/reducers/appReducer';
import { defaultProgress, getDateString, getWeekStart } from '@/utils/storage';
import { AppState, TOTAL_SNIPPETS } from '@/types';

function stateWith(overrides: Partial<AppState['progress']>): AppState {
  return {
    ...initialState,
    isLoading: false,
    progress: { ...defaultProgress, ...overrides },
  };
}

describe('SET_PROGRESS', () => {
  it('sets progress and clears loading', () => {
    const custom = { ...defaultProgress, currentSnippet: 42 };
    const result = appReducer(initialState, { type: 'SET_PROGRESS', payload: custom });
    expect(result.progress.currentSnippet).toBe(42);
    expect(result.isLoading).toBe(false);
  });
});

describe('SET_LOADING', () => {
  it('sets loading to true', () => {
    const state = stateWith({});
    const result = appReducer(state, { type: 'SET_LOADING', payload: true });
    expect(result.isLoading).toBe(true);
  });

  it('sets loading to false', () => {
    const state = { ...stateWith({}), isLoading: true };
    const result = appReducer(state, { type: 'SET_LOADING', payload: false });
    expect(result.isLoading).toBe(false);
  });
});

describe('SIMULATE_PROGRESS', () => {
  it('simulates progress to day 10', () => {
    const state = stateWith({});
    const result = appReducer(state, { type: 'SIMULATE_PROGRESS', payload: 10 });

    expect(result.progress.currentSnippet).toBe(10);
    expect(result.progress.completedSnippets).toHaveLength(9); // days 1-9
    expect(result.progress.completedSnippets).toContain(1);
    expect(result.progress.completedSnippets).toContain(9);
    expect(result.progress.completedSnippets).not.toContain(10);
    expect(result.progress.streak.current).toBe(9);
    expect(result.progress.streak.longest).toBe(9);
  });

  it('simulates progress to day 1 (no completions)', () => {
    const state = stateWith({});
    const result = appReducer(state, { type: 'SIMULATE_PROGRESS', payload: 1 });

    expect(result.progress.currentSnippet).toBe(1);
    expect(result.progress.completedSnippets).toHaveLength(0);
    expect(result.progress.streak.current).toBe(0);
  });

  it('fills readingHistory with dates as arrays', () => {
    const state = stateWith({});
    const result = appReducer(state, { type: 'SIMULATE_PROGRESS', payload: 5 });

    // Should have 4 entries in readingHistory
    const historyDates = Object.keys(result.progress.readingHistory);
    expect(historyDates).toHaveLength(4);

    // Each value should be an array with one snippet ID
    for (const date of historyDates) {
      const val = result.progress.readingHistory[date];
      expect(Array.isArray(val)).toBe(true);
      expect(val).toHaveLength(1);
    }
  });

  it('sets lastReadDate to yesterday', () => {
    const state = stateWith({});
    const result = appReducer(state, { type: 'SIMULATE_PROGRESS', payload: 10 });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(result.progress.streak.lastReadDate).toBe(getDateString(yesterday));
  });
});

describe('MARK_COMPLETE — streak edge cases', () => {
  it('second MARK_COMPLETE same day adds to completed but streak changes depend on grace period', () => {
    // The streak behavior during 0-4 AM grace period intentionally differs
    // (isYesterday(today) returns true to prevent midnight streak breaks).
    // This test validates the core completion logic without asserting on
    // time-dependent streak values.
    const today = getDateString();
    const state = stateWith({
      completedSnippets: [1],
      currentSnippet: 2,
      streak: {
        current: 1,
        longest: 1,
        lastReadDate: today,
        freezesAvailable: 1,
        freezeUsedThisWeek: false,
      },
    });

    const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 2 });
    // Core logic: snippet was added to completedSnippets
    expect(result.progress.completedSnippets).toContain(2);
    expect(result.progress.currentSnippet).toBe(3);
    expect(result.progress.streak.lastReadDate).toBe(today);
    // Streak is either 1 (outside grace period) or 2 (during grace period)
    expect(result.progress.streak.current).toBeGreaterThanOrEqual(1);
    expect(result.progress.streak.current).toBeLessThanOrEqual(2);
  });

  it('resets streak to 1 after multi-day gap', () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const state = stateWith({
      streak: {
        current: 10,
        longest: 10,
        lastReadDate: getDateString(fiveDaysAgo),
        freezesAvailable: 1,
        freezeUsedThisWeek: false,
      },
    });

    const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
    expect(result.progress.streak.current).toBe(1);
    expect(result.progress.streak.longest).toBe(10); // preserved
  });

  it('updates longest streak when new high achieved', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const state = stateWith({
      streak: {
        current: 5,
        longest: 5,
        lastReadDate: getDateString(yesterday),
        freezesAvailable: 1,
        freezeUsedThisWeek: false,
      },
    });

    const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
    expect(result.progress.streak.current).toBe(6);
    expect(result.progress.streak.longest).toBe(6);
  });

  it('does not update longest when below previous record', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const state = stateWith({
      streak: {
        current: 2,
        longest: 50,
        lastReadDate: getDateString(yesterday),
        freezesAvailable: 1,
        freezeUsedThisWeek: false,
      },
    });

    const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
    expect(result.progress.streak.current).toBe(3);
    expect(result.progress.streak.longest).toBe(50);
  });

  it('resets freeze on new week', () => {
    // Create a lastReadDate from last week
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 8); // > 7 days ago = different week

    const state = stateWith({
      streak: {
        current: 0, // already broken
        longest: 5,
        lastReadDate: getDateString(lastWeek),
        freezesAvailable: 0,
        freezeUsedThisWeek: true,
      },
    });

    const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
    // If weeks differ, freeze should be reset
    const lastWeekStart = getWeekStart(lastWeek);
    const currentWeekStart = getWeekStart();
    if (lastWeekStart !== currentWeekStart) {
      expect(result.progress.streak.freezesAvailable).toBe(1);
      expect(result.progress.streak.freezeUsedThisWeek).toBe(false);
    }
  });
});

describe('USE_STREAK_FREEZE — edge cases', () => {
  it('does nothing if freeze already used this week', () => {
    const state = stateWith({
      streak: {
        current: 3,
        longest: 3,
        lastReadDate: null,
        freezesAvailable: 1,
        freezeUsedThisWeek: true,
      },
    });
    const result = appReducer(state, { type: 'USE_STREAK_FREEZE' });
    expect(result).toBe(state); // no change
  });

  it('sets lastReadDate to today when freeze used', () => {
    const state = stateWith({
      streak: {
        current: 3,
        longest: 3,
        lastReadDate: null,
        freezesAvailable: 1,
        freezeUsedThisWeek: false,
      },
    });
    const result = appReducer(state, { type: 'USE_STREAK_FREEZE' });
    expect(result.progress.streak.lastReadDate).toBe(getDateString());
  });
});

describe('SYNC_STREAK — edge cases', () => {
  it('does nothing when lastReadDate is null', () => {
    const state = stateWith({
      streak: {
        current: 0,
        longest: 0,
        lastReadDate: null,
        freezesAvailable: 1,
        freezeUsedThisWeek: false,
      },
    });
    const result = appReducer(state, { type: 'SYNC_STREAK' });
    expect(result).toBe(state);
  });

  it('does nothing when streak is already 0', () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const state = stateWith({
      streak: {
        current: 0,
        longest: 10,
        lastReadDate: getDateString(fiveDaysAgo),
        freezesAvailable: 1,
        freezeUsedThisWeek: false,
      },
    });
    const result = appReducer(state, { type: 'SYNC_STREAK' });
    expect(result).toBe(state); // no change needed
  });

  it('preserves longest when resetting current', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const state = stateWith({
      streak: {
        current: 5,
        longest: 20,
        lastReadDate: getDateString(threeDaysAgo),
        freezesAvailable: 1,
        freezeUsedThisWeek: false,
      },
    });
    const result = appReducer(state, { type: 'SYNC_STREAK' });
    expect(result.progress.streak.current).toBe(0);
    expect(result.progress.streak.longest).toBe(20);
  });
});

describe('default action type', () => {
  it('returns state unchanged for unknown action', () => {
    const state = stateWith({});
    // @ts-expect-error — testing unknown action type
    const result = appReducer(state, { type: 'UNKNOWN_ACTION' });
    expect(result).toBe(state);
  });
});

describe('MARK_COMPLETE — last snippet (239)', () => {
  it('caps currentSnippet at TOTAL_SNIPPETS', () => {
    const state = stateWith({
      currentSnippet: 239,
      completedSnippets: Array.from({ length: 238 }, (_, i) => i + 1),
    });
    const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 239 });
    expect(result.progress.currentSnippet).toBe(TOTAL_SNIPPETS);
    expect(result.progress.completedSnippets).toHaveLength(239);
  });
});
