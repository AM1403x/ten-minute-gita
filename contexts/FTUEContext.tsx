import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';
import { logger } from '@/utils/logger';

const STORAGE_KEY = CONFIG.FTUE_KEY;

interface FTUEState {
  hasSeenWelcome: boolean;
  hasCompletedFirstReading: boolean;
  hasSetupNotifications: boolean;
}

const DEFAULT_STATE: FTUEState = {
  hasSeenWelcome: false,
  hasCompletedFirstReading: false,
  hasSetupNotifications: false,
};

interface FTUEContextValue extends FTUEState {
  loaded: boolean;
  dismissWelcome: () => void;
  markFirstReadingComplete: () => void;
  markNotificationsHandled: () => void;
  resetFTUE: () => void;
}

const FTUEContext = createContext<FTUEContextValue | null>(null);

export function FTUEProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FTUEState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          setState({ ...DEFAULT_STATE, ...JSON.parse(stored) });
        } catch (e) { logger.error('FTUEContext.load', e); }
      }
      setLoaded(true);
    }).catch((e) => {
      logger.error('FTUEContext.load', e);
      setLoaded(true);
    });
  }, []);

  // Persist state changes to AsyncStorage via effect (not inside setState updater,
  // which can run multiple times in StrictMode)
  const isInitialLoadRef = useRef(true);
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) => {
        logger.error('FTUEContext.persist', e);
      });
    }
  }, [state, loaded]);

  const update = useCallback((partial: Partial<FTUEState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const dismissWelcome = useCallback(() => update({ hasSeenWelcome: true }), [update]);
  const markFirstReadingComplete = useCallback(() => update({ hasCompletedFirstReading: true }), [update]);
  const markNotificationsHandled = useCallback(() => update({ hasSetupNotifications: true }), [update]);

  const resetFTUE = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const value = useMemo(() => ({
    ...state,
    loaded,
    dismissWelcome,
    markFirstReadingComplete,
    markNotificationsHandled,
    resetFTUE,
  }), [state, loaded, dismissWelcome, markFirstReadingComplete, markNotificationsHandled, resetFTUE]);

  return (
    <FTUEContext value={value}>
      {children}
    </FTUEContext>
  );
}

export function useFirstTimeUser() {
  const ctx = useContext(FTUEContext);
  if (!ctx) throw new Error('useFirstTimeUser must be used within FTUEProvider');
  return ctx;
}
