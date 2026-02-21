import {
  AppState,
  AppAction,
  UserProgress,
  Settings,
  TOTAL_SNIPPETS,
} from '@/types';
import {
  defaultProgress,
  getDateString,
  isToday,
  isYesterday,
  getWeekStart,
} from '@/utils/storage';

export const initialState: AppState = {
  progress: defaultProgress,
  isLoading: true,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload, isLoading: false };

    case 'MARK_COMPLETE': {
      const snippetId = action.payload;
      const today = getDateString();
      const { progress } = state;

      // Check if already completed
      if (progress.completedSnippets.includes(snippetId)) {
        return state;
      }

      // Update streak
      let newStreak = { ...progress.streak };
      const lastRead = progress.streak.lastReadDate;

      if (lastRead && isToday(lastRead)) {
        // Already read today — don't change streak
      } else if (!lastRead || isYesterday(lastRead)) {
        // Continue or start streak
        newStreak.current += 1;
        newStreak.longest = Math.max(newStreak.longest, newStreak.current);
      } else {
        // Streak broken (more than 1 day gap)
        newStreak.current = 1;
      }

      newStreak.lastReadDate = today;

      // Reset freeze if new week
      const currentWeekStart = getWeekStart();
      const lastWeekStart = lastRead ? getWeekStart(new Date(lastRead)) : null;
      if (lastWeekStart && currentWeekStart !== lastWeekStart) {
        newStreak.freezesAvailable = 1;
        newStreak.freezeUsedThisWeek = false;
      }

      // Calculate next snippet
      const newCompleted = [...progress.completedSnippets, snippetId];
      const nextSnippet = Math.min(snippetId + 1, TOTAL_SNIPPETS);

      const newProgress: UserProgress = {
        ...progress,
        currentSnippet: nextSnippet,
        completedSnippets: newCompleted,
        streak: newStreak,
        readingHistory: {
          ...progress.readingHistory,
          [today]: (() => {
            const existing = progress.readingHistory[today];
            // Normalize: old format (number) → array, missing → empty array
            const arr = Array.isArray(existing) ? existing : existing != null ? [existing as unknown as number] : [];
            return arr.includes(snippetId) ? arr : [...arr, snippetId];
          })(),
        },
      };

      return { ...state, progress: newProgress };
    }

    case 'UPDATE_SETTINGS': {
      const newSettings: Settings = {
        ...state.progress.settings,
        ...action.payload,
      };
      return {
        ...state,
        progress: { ...state.progress, settings: newSettings },
      };
    }

    case 'USE_STREAK_FREEZE': {
      const { streak } = state.progress;
      if (streak.freezesAvailable > 0 && !streak.freezeUsedThisWeek) {
        const today = getDateString();
        const newStreak = {
          ...streak,
          lastReadDate: today,
          freezesAvailable: streak.freezesAvailable - 1,
          freezeUsedThisWeek: true,
        };
        return {
          ...state,
          progress: { ...state.progress, streak: newStreak },
        };
      }
      return state;
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'RESET_PROGRESS':
      return { ...state, progress: defaultProgress };

    case 'SIMULATE_PROGRESS': {
      const targetDay = action.payload;
      const completedSnippets: number[] = [];
      const readingHistory: { [date: string]: number[] } = {};

      // Complete days 1 through (targetDay - 1), so user is AT targetDay ready to read
      for (let i = 1; i < targetDay; i++) {
        completedSnippets.push(i);
        // Create date strings going back from today
        const date = new Date();
        date.setDate(date.getDate() - (targetDay - i));
        const dateStr = getDateString(date);
        readingHistory[dateStr] = [i];
      }

      // lastReadDate should be yesterday so streak is maintained but today's reading isn't done
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastReadDateStr = getDateString(yesterday);

      const newProgress: UserProgress = {
        ...state.progress,
        currentSnippet: targetDay,
        completedSnippets,
        streak: {
          current: targetDay - 1,
          longest: targetDay - 1,
          lastReadDate: lastReadDateStr,
          freezesAvailable: 1,
          freezeUsedThisWeek: false,
        },
        readingHistory,
      };

      return { ...state, progress: newProgress };
    }

    case 'SYNC_STREAK': {
      const { streak } = state.progress;
      if (streak.lastReadDate && !isToday(streak.lastReadDate) && !isYesterday(streak.lastReadDate) && streak.current > 0) {
        return {
          ...state,
          progress: {
            ...state.progress,
            streak: { ...streak, current: 0 },
          },
        };
      }
      return state;
    }

    default:
      return state;
  }
}
