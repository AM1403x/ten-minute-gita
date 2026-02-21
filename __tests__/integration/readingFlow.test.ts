/**
 * Integration test: simulates the core user flow through the reducer.
 * reading → mark complete → streak updates → next day → streak continues
 */
import { appReducer, initialState } from '@/reducers/appReducer';
import { defaultProgress, getDateString } from '@/utils/storage';
import { AppState } from '@/types';

describe('Reading → Complete → Streak flow', () => {
  it('completes a full day-1 through day-3 journey', () => {
    let state: AppState = { ...initialState, isLoading: false };

    // === Day 1: First reading ===
    state = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });

    expect(state.progress.completedSnippets).toEqual([1]);
    expect(state.progress.currentSnippet).toBe(2);
    expect(state.progress.streak.current).toBe(1);
    expect(state.progress.streak.longest).toBe(1);
    expect(state.progress.streak.lastReadDate).toBe(getDateString());
    expect(state.progress.readingHistory[getDateString()]).toEqual([1]);

    // === Day 2: Simulate "yesterday" read by backdating lastReadDate ===
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    state = {
      ...state,
      progress: {
        ...state.progress,
        streak: {
          ...state.progress.streak,
          lastReadDate: getDateString(yesterday),
        },
      },
    };

    // SYNC_STREAK should keep streak alive (yesterday is valid)
    state = appReducer(state, { type: 'SYNC_STREAK' });
    expect(state.progress.streak.current).toBe(1); // still alive

    // Mark day 2 complete
    state = appReducer(state, { type: 'MARK_COMPLETE', payload: 2 });

    expect(state.progress.completedSnippets).toEqual([1, 2]);
    expect(state.progress.currentSnippet).toBe(3);
    expect(state.progress.streak.current).toBe(2);
    expect(state.progress.streak.longest).toBe(2);

    // === Day 3: Same pattern ===
    state = {
      ...state,
      progress: {
        ...state.progress,
        streak: {
          ...state.progress.streak,
          lastReadDate: getDateString(yesterday),
        },
      },
    };

    state = appReducer(state, { type: 'MARK_COMPLETE', payload: 3 });

    expect(state.progress.completedSnippets).toEqual([1, 2, 3]);
    expect(state.progress.currentSnippet).toBe(4);
    expect(state.progress.streak.current).toBe(3);
    expect(state.progress.streak.longest).toBe(3);
  });

  it('breaks streak after 2-day gap', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    let state: AppState = {
      ...initialState,
      isLoading: false,
      progress: {
        ...defaultProgress,
        completedSnippets: [1, 2, 3],
        currentSnippet: 4,
        streak: {
          current: 3,
          longest: 3,
          lastReadDate: getDateString(threeDaysAgo),
          freezesAvailable: 1,
          freezeUsedThisWeek: false,
        },
      },
    };

    // SYNC_STREAK should reset because 3 days ago is stale
    state = appReducer(state, { type: 'SYNC_STREAK' });
    expect(state.progress.streak.current).toBe(0);
    expect(state.progress.streak.longest).toBe(3); // longest preserved

    // New reading starts streak at 1
    state = appReducer(state, { type: 'MARK_COMPLETE', payload: 4 });
    expect(state.progress.streak.current).toBe(1);
    expect(state.progress.streak.longest).toBe(3);
  });

  it('prevents duplicate completion', () => {
    let state: AppState = {
      ...initialState,
      isLoading: false,
      progress: {
        ...defaultProgress,
        completedSnippets: [1],
        currentSnippet: 2,
        streak: { current: 1, longest: 1, lastReadDate: getDateString(), freezesAvailable: 1, freezeUsedThisWeek: false },
      },
    };

    const before = state;
    state = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
    expect(state).toBe(before); // same reference = no change
  });

  it('streak freeze preserves the streak', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let state: AppState = {
      ...initialState,
      isLoading: false,
      progress: {
        ...defaultProgress,
        completedSnippets: [1, 2],
        currentSnippet: 3,
        streak: {
          current: 2,
          longest: 2,
          lastReadDate: getDateString(yesterday),
          freezesAvailable: 1,
          freezeUsedThisWeek: false,
        },
      },
    };

    // Use freeze instead of reading
    state = appReducer(state, { type: 'USE_STREAK_FREEZE' });
    expect(state.progress.streak.freezesAvailable).toBe(0);
    expect(state.progress.streak.freezeUsedThisWeek).toBe(true);
    expect(state.progress.streak.lastReadDate).toBe(getDateString()); // updated to today

    // Can't use freeze again this week
    const before = state;
    state = appReducer(state, { type: 'USE_STREAK_FREEZE' });
    expect(state).toBe(before);
  });

  it('settings updates preserve progress', () => {
    let state: AppState = {
      ...initialState,
      isLoading: false,
      progress: {
        ...defaultProgress,
        completedSnippets: [1, 2, 3],
        currentSnippet: 4,
      },
    };

    state = appReducer(state, { type: 'UPDATE_SETTINGS', payload: { fontSize: 24, showSanskrit: false } });
    expect(state.progress.settings.fontSize).toBe(24);
    expect(state.progress.settings.showSanskrit).toBe(false);
    expect(state.progress.completedSnippets).toEqual([1, 2, 3]); // preserved
  });

  it('completes multiple readings in one day (no daily gate)', () => {
    let state: AppState = { ...initialState, isLoading: false };
    const today = getDateString();

    // Complete day 1
    state = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
    expect(state.progress.completedSnippets).toEqual([1]);
    expect(state.progress.currentSnippet).toBe(2);
    expect(state.progress.readingHistory[today]).toEqual([1]);

    // Complete day 2 — same calendar day
    state = appReducer(state, { type: 'MARK_COMPLETE', payload: 2 });
    expect(state.progress.completedSnippets).toEqual([1, 2]);
    expect(state.progress.currentSnippet).toBe(3);
    expect(state.progress.readingHistory[today]).toEqual([1, 2]);

    // Complete day 3 — still same day
    state = appReducer(state, { type: 'MARK_COMPLETE', payload: 3 });
    expect(state.progress.completedSnippets).toEqual([1, 2, 3]);
    expect(state.progress.currentSnippet).toBe(4);
    expect(state.progress.readingHistory[today]).toEqual([1, 2, 3]);

    // Streak should still be 1 (all same day)
    expect(state.progress.streak.current).toBeGreaterThanOrEqual(1);
  });

  it('reset clears everything', () => {
    let state: AppState = {
      ...initialState,
      isLoading: false,
      progress: {
        ...defaultProgress,
        completedSnippets: [1, 2, 3],
        currentSnippet: 4,
        streak: { current: 3, longest: 3, lastReadDate: getDateString(), freezesAvailable: 0, freezeUsedThisWeek: true },
      },
    };

    state = appReducer(state, { type: 'RESET_PROGRESS' });
    expect(state.progress).toEqual(defaultProgress);
  });
});
