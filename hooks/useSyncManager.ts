import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { runMigration, pullFromFirestore, clearMigrationFlag, syncReadingCompleted, getMigrationKey } from '@/services/firestoreSync';
import { setAnalyticsUser, clearAnalyticsUser } from '@/services/analytics';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { logger } from '@/utils/logger';

/**
 * Manages Firestore sync lifecycle:
 * - Runs migration on first login
 * - Pulls from Firestore on app foreground
 * - Syncs completions to Firestore
 * Only active when user is authenticated.
 */
export function useSyncManager() {
  const { authState } = useAuth();
  const { state, dispatch } = useApp();
  const { language } = useLanguage();
  const migrationRanRef = useRef(false);
  const migrationInFlightRef = useRef(false);
  const foregroundSyncInFlightRef = useRef(false);
  const previousUidRef = useRef<string | null>(null);
  const lastCompletedCountRef = useRef(state.progress.completedSnippets.length);

  // Run migration when user becomes authenticated
  useEffect(() => {
    if (authState.status !== 'authenticated' || !authState.user) {
      if (previousUidRef.current && authState.status === 'unauthenticated') {
        // User signed out
        clearMigrationFlag(previousUidRef.current);
        clearAnalyticsUser();
        previousUidRef.current = null;
        migrationRanRef.current = false;
      }
      return;
    }

    const uid = authState.user.uid;

    // Set analytics user
    setAnalyticsUser(uid, authState.user.providerId, language);

    // Avoid running migration twice for same user in same session
    if (previousUidRef.current === uid && migrationRanRef.current) return;
    previousUidRef.current = uid;
    migrationRanRef.current = true;

    // Fire-and-forget migration
    if (migrationInFlightRef.current) return;
    migrationInFlightRef.current = true;
    runMigration(uid, {
      email: authState.user.email,
      displayName: authState.user.displayName,
      photoURL: authState.user.photoURL,
      providerId: authState.user.providerId,
    }).then((mergedProgress) => {
      if (mergedProgress) {
        // Migration pulled data from cloud - update local state
        dispatch({ type: 'SET_PROGRESS', payload: mergedProgress });
      }
    }).catch((error) => {
      logger.error('useSyncManager.migration', error);
      // Allow retry later in the session (foreground effect will also retry).
      migrationRanRef.current = false;
    }).finally(() => {
      migrationInFlightRef.current = false;
    });
  }, [authState.status, authState.user, dispatch, language]);

  // Sync completions to Firestore when they change
  useEffect(() => {
    if (authState.status !== 'authenticated') return;

    const currentCount = state.progress.completedSnippets.length;
    if (currentCount > lastCompletedCountRef.current) {
      // New completion detected
      syncReadingCompleted(state.progress);
    }
    lastCompletedCountRef.current = currentCount;
  }, [state.progress.completedSnippets.length, authState.status, state.progress]);

  // Pull from Firestore on app foreground — with migration retry if previous attempt failed
  useEffect(() => {
    if (authState.status !== 'authenticated' || !authState.user) return;

    const user = authState.user;
    const uid = user.uid;
    const userSnapshot = {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      providerId: user.providerId,
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (foregroundSyncInFlightRef.current) return;
      foregroundSyncInFlightRef.current = true;

      (async () => {
        // Check if migration still needs to run (flag not set = previous attempt failed).
        // If we cannot read the flag, be conservative and attempt migration.
        let needsMigration = true;
        try {
          const migrationDone = await AsyncStorage.getItem(getMigrationKey(uid));
          needsMigration = migrationDone !== 'true';
        } catch {
          needsMigration = true;
        }

        if (needsMigration && !migrationInFlightRef.current) {
          try {
            migrationInFlightRef.current = true;
            const mergedProgress = await runMigration(uid, userSnapshot);
            if (mergedProgress) {
              dispatch({ type: 'SET_PROGRESS', payload: mergedProgress });
            }
          } catch (error) {
            logger.error('useSyncManager.migrationRetry', error);
          } finally {
            migrationInFlightRef.current = false;
          }
        }

        // Normal foreground pull (best-effort, should not block if migration fails).
        try {
          const mergedProgress = await pullFromFirestore();
          if (mergedProgress) {
            dispatch({ type: 'SET_PROGRESS', payload: mergedProgress });
          }
        } catch {
          // silent fail
        }
      })().finally(() => {
        foregroundSyncInFlightRef.current = false;
      });
    });

    return () => subscription.remove();
  }, [authState.status, authState.user, dispatch]);
}
