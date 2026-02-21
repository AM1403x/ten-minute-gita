import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Settings } from '@/types';
import {
  loadProgress,
  saveProgress,
  resetProgress,
} from '@/utils/storage';
import { cleanupOldDownloads } from '@/utils/downloadStorage';
import { clearAuthGateState } from '@/utils/authGateStorage';
import { appReducer, initialState } from '@/reducers/appReducer';
import { trackEvent } from '@/utils/sentry';

interface AppContextType {
  state: typeof initialState;
  dispatch: React.Dispatch<Parameters<typeof appReducer>[1]>;
  markComplete: (snippetId: number) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  useStreakFreeze: () => void;
  resetAllProgress: () => void;
  simulateProgress: (day: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load progress on mount
  useEffect(() => {
    const load = async () => {
      const progress = await loadProgress();
      dispatch({ type: 'SET_PROGRESS', payload: progress });
      dispatch({ type: 'SYNC_STREAK' });

      // Auto-remove old downloads in background (fire-and-forget)
      cleanupOldDownloads(progress.readingHistory, progress.completedSnippets, 'en').catch(() => {});
      cleanupOldDownloads(progress.readingHistory, progress.completedSnippets, 'hi').catch(() => {});
    };
    load();
  }, []);

  // Save progress whenever it changes
  useEffect(() => {
    if (!state.isLoading) {
      saveProgress(state.progress);
    }
  }, [state.progress, state.isLoading]);

  const markComplete = useCallback((snippetId: number) => {
    dispatch({ type: 'MARK_COMPLETE', payload: snippetId });
    trackEvent('reading_complete', { day: snippetId });
  }, []);

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const useStreakFreeze = useCallback(() => {
    dispatch({ type: 'USE_STREAK_FREEZE' });
  }, []);

  const resetAllProgress = useCallback(async () => {
    await resetProgress();
    await clearAuthGateState();
    dispatch({ type: 'RESET_PROGRESS' });
  }, []);

  const simulateProgress = useCallback((day: number) => {
    clearAuthGateState().catch(() => {});
    dispatch({ type: 'SIMULATE_PROGRESS', payload: day });
  }, []);

  const value = useMemo(() => ({
    state,
    dispatch,
    markComplete,
    updateSettings,
    useStreakFreeze,
    resetAllProgress,
    simulateProgress,
  }), [state, markComplete, updateSettings, useStreakFreeze, resetAllProgress, simulateProgress]);

  return (
    <AppContext value={value}>
      {children}
    </AppContext>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
