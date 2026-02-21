import { appReducer, initialState } from '@/reducers/appReducer';
import { defaultProgress, getDateString } from '@/utils/storage';
import { AppState } from '@/types';

// Helper to create a state with specific progress
function stateWith(overrides: Partial<AppState['progress']>): AppState {
  return {
    ...initialState,
    isLoading: false,
    progress: { ...defaultProgress, ...overrides },
  };
}

describe('appReducer', () => {
  describe('MARK_COMPLETE', () => {
    it('adds snippet to completedSnippets', () => {
      const state = stateWith({});
      const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
      expect(result.progress.completedSnippets).toContain(1);
    });

    it('advances currentSnippet', () => {
      const state = stateWith({});
      const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
      expect(result.progress.currentSnippet).toBe(2);
    });

    it('records reading history for today', () => {
      const state = stateWith({});
      const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
      const today = getDateString();
      expect(result.progress.readingHistory[today]).toEqual([1]);
    });

    it('does not duplicate if already completed', () => {
      const state = stateWith({ completedSnippets: [1] });
      const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
      expect(result).toBe(state); // same reference, no change
    });

    it('starts streak at 1 for first reading', () => {
      const state = stateWith({});
      const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
      expect(result.progress.streak.current).toBe(1);
      expect(result.progress.streak.longest).toBe(1);
    });

    it('continues streak when lastReadDate is yesterday', () => {
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

    it('does not cap currentSnippet above TOTAL_SNIPPETS', () => {
      const state = stateWith({ currentSnippet: 239 });
      const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 239 });
      expect(result.progress.currentSnippet).toBe(239);
    });

    it('appends multiple completions to readingHistory array for same day', () => {
      const today = getDateString();
      let state = stateWith({});
      state = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
      expect(state.progress.readingHistory[today]).toEqual([1]);

      // Second completion same day
      state = appReducer(state, { type: 'MARK_COMPLETE', payload: 2 });
      expect(state.progress.readingHistory[today]).toEqual([1, 2]);
    });

    it('does not duplicate snippetId in readingHistory array', () => {
      const today = getDateString();
      // Manually set up state where snippet 1 is NOT in completedSnippets
      // but IS in readingHistory (edge case)
      const state = stateWith({
        readingHistory: { [today]: [1] },
      });
      const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 1 });
      expect(result.progress.readingHistory[today]).toEqual([1]);
    });

    it('handles old-format readingHistory (number instead of array) gracefully', () => {
      const today = getDateString();
      // Simulate old format still in memory (pre-migration)
      const state = stateWith({
        readingHistory: { [today]: 5 as unknown as number[] },
      });
      const result = appReducer(state, { type: 'MARK_COMPLETE', payload: 6 });
      expect(result.progress.readingHistory[today]).toEqual([5, 6]);
    });
  });

  describe('UPDATE_SETTINGS', () => {
    it('merges partial settings', () => {
      const state = stateWith({});
      const result = appReducer(state, { type: 'UPDATE_SETTINGS', payload: { fontSize: 22 } });
      expect(result.progress.settings.fontSize).toBe(22);
      expect(result.progress.settings.showSanskrit).toBe(true); // unchanged
    });
  });

  describe('USE_STREAK_FREEZE', () => {
    it('decrements freezesAvailable', () => {
      const state = stateWith({
        streak: { current: 3, longest: 3, lastReadDate: null, freezesAvailable: 1, freezeUsedThisWeek: false },
      });
      const result = appReducer(state, { type: 'USE_STREAK_FREEZE' });
      expect(result.progress.streak.freezesAvailable).toBe(0);
      expect(result.progress.streak.freezeUsedThisWeek).toBe(true);
    });

    it('does nothing if no freezes available', () => {
      const state = stateWith({
        streak: { current: 3, longest: 3, lastReadDate: null, freezesAvailable: 0, freezeUsedThisWeek: false },
      });
      const result = appReducer(state, { type: 'USE_STREAK_FREEZE' });
      expect(result).toBe(state);
    });
  });

  describe('SYNC_STREAK', () => {
    it('resets streak if lastReadDate is stale', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const state = stateWith({
        streak: { current: 5, longest: 5, lastReadDate: getDateString(threeDaysAgo), freezesAvailable: 1, freezeUsedThisWeek: false },
      });
      const result = appReducer(state, { type: 'SYNC_STREAK' });
      expect(result.progress.streak.current).toBe(0);
    });

    it('preserves streak if lastReadDate is today', () => {
      const state = stateWith({
        streak: { current: 5, longest: 5, lastReadDate: getDateString(), freezesAvailable: 1, freezeUsedThisWeek: false },
      });
      const result = appReducer(state, { type: 'SYNC_STREAK' });
      expect(result.progress.streak.current).toBe(5);
    });

    it('preserves streak if lastReadDate is yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const state = stateWith({
        streak: { current: 5, longest: 5, lastReadDate: getDateString(yesterday), freezesAvailable: 1, freezeUsedThisWeek: false },
      });
      const result = appReducer(state, { type: 'SYNC_STREAK' });
      expect(result.progress.streak.current).toBe(5);
    });
  });

  describe('RESET_PROGRESS', () => {
    it('resets to default progress', () => {
      const state = stateWith({ completedSnippets: [1, 2, 3], currentSnippet: 4 });
      const result = appReducer(state, { type: 'RESET_PROGRESS' });
      expect(result.progress).toEqual(defaultProgress);
    });
  });
});
