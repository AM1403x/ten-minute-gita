import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, runTransaction, setDoc, updateDoc, serverTimestamp, arrayUnion, FieldValue } from 'firebase/firestore';
import { auth, db } from '@/utils/firebaseConfig';
import { TOTAL_SNIPPETS, UserProgress, Settings } from '@/types';
import { loadProgress, saveProgress, defaultProgress, defaultSettings } from '@/utils/storage';
import { CONFIG } from '@/constants/config';
import { logger } from '@/utils/logger';
import { AnalyticsEvents } from './analytics';

// --- Types ---

interface FirestoreUserDocument {
  schemaVersion: number;
  profile: {
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    providerId: string;
    createdAt: FieldValue | Date;
    lastLoginAt: FieldValue | Date;
    platforms: string[];
  };
  progress: {
    completedReadings: Record<string, string>;
    currentDay: number;
    totalCompleted: number;
    lastCompletedAt: string | null;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastReadDate: string | null;
    freezeCount: number;
  };
  settings: {
    language: string;
    audioSpeed: number;
    theme: string;
  };
  audioPositions: Record<string, number>;
  ftueCompleted: boolean;
  syncedAt: FieldValue;
}

// --- Helpers ---

export function getMigrationKey(uid: string): string {
  return `@migration_complete_${uid}`;
}

function getUserDocRef(uid: string) {
  return doc(db, 'users', uid);
}

/** Convert local UserProgress to the Firestore completedReadings format */
function progressToFirestoreReadings(progress: UserProgress): Record<string, string> {
  const readings: Record<string, string> = {};
  // Build from readingHistory for date info
  for (const [date, ids] of Object.entries(progress.readingHistory)) {
    const arr = Array.isArray(ids) ? ids : [ids as unknown as number];
    for (const id of arr) {
      readings[String(id)] = date;
    }
  }
  // Ensure all completedSnippets are included (some may not have readingHistory entries)
  for (const id of progress.completedSnippets) {
    if (!readings[String(id)]) {
      readings[String(id)] = progress.streak.lastReadDate || new Date().toISOString().split('T')[0];
    }
  }
  return readings;
}

/** Convert Firestore completedReadings back to local arrays */
function firestoreReadingsToLocal(readings: Record<string, string>): {
  completedSnippets: number[];
  readingHistory: Record<string, number[]>;
} {
  const completedSnippets: number[] = [];
  const readingHistory: Record<string, number[]> = {};

  for (const [idStr, date] of Object.entries(readings)) {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) continue;
    completedSnippets.push(id);
    if (!readingHistory[date]) readingHistory[date] = [];
    if (!readingHistory[date].includes(id)) readingHistory[date].push(id);
  }

  completedSnippets.sort((a, b) => a - b);

  // Sort reading history arrays
  for (const date of Object.keys(readingHistory)) {
    readingHistory[date].sort((a, b) => a - b);
  }

  return { completedSnippets, readingHistory };
}

function maxIsoDate(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  // ISO-8601 date strings (YYYY-MM-DD) compare lexicographically.
  return a >= b ? a : b;
}

function deriveCurrentDayFromReadings(readings: Record<string, string>): number {
  let maxCompleted = 0;
  for (const idStr of Object.keys(readings)) {
    const id = parseInt(idStr, 10);
    if (!isNaN(id) && id > maxCompleted) maxCompleted = id;
  }
  const next = Math.max(maxCompleted + 1, 1);
  return Math.min(next, TOTAL_SNIPPETS);
}

// --- Migration ---

export async function runMigration(uid: string, user: {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string;
}): Promise<UserProgress | null> {
  // Check if migration already completed for this user
  let migrationDone: string | null = null;
  try {
    migrationDone = await AsyncStorage.getItem(getMigrationKey(uid));
  } catch {
    // If we can't read the flag, assume not migrated and proceed.
    migrationDone = null;
  }
  if (migrationDone === 'true') return null;

  try {
    const docRef = getUserDocRef(uid);
    const docSnap = await getDoc(docRef);
    const localProgress = await loadProgress();

    // Load FTUE state
    let ftueCompleted = false;
    try {
      const ftueData = await AsyncStorage.getItem(CONFIG.FTUE_KEY);
      if (ftueData) {
        const parsed = JSON.parse(ftueData);
        ftueCompleted = parsed.hasCompletedFirstReading || false;
      }
    } catch {
      // ignore
    }

    // Load audio positions
    const audioPositions: Record<string, number> = {};
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const positionKeys = allKeys.filter(k => k.startsWith(CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX));
      if (positionKeys.length > 0) {
        const pairs = await AsyncStorage.multiGet(positionKeys);
        for (const [key, value] of pairs) {
          if (value) {
            try {
              const parsed = JSON.parse(value);
              const snippetId = key.replace(CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX, '');
              if (parsed.time && parsed.time > 0) {
                audioPositions[snippetId] = parsed.time;
              }
            } catch {
              // ignore malformed entries
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // Load language
    let language = 'en';
    try {
      const storedLang = await AsyncStorage.getItem(CONFIG.LANGUAGE_KEY);
      if (storedLang === 'en' || storedLang === 'hi') language = storedLang;
    } catch {
      // ignore
    }

    const localHasData = localProgress.completedSnippets.length > 0;

    if (!docSnap.exists()) {
      // SCENARIO A: First-time login, no Firestore document
      const firestoreData: FirestoreUserDocument = {
        schemaVersion: 1,
        profile: {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          providerId: user.providerId,
          createdAt: serverTimestamp() as any,
          lastLoginAt: serverTimestamp() as any,
          platforms: [Platform.OS],
        },
        progress: {
          completedReadings: progressToFirestoreReadings(localProgress),
          currentDay: localProgress.currentSnippet,
          totalCompleted: localProgress.completedSnippets.length,
          lastCompletedAt: localProgress.streak.lastReadDate,
        },
        streak: {
          currentStreak: localProgress.streak.current,
          longestStreak: localProgress.streak.longest,
          lastReadDate: localProgress.streak.lastReadDate,
          freezeCount: localProgress.streak.freezesAvailable,
        },
        settings: {
          language,
          audioSpeed: 1.0,
          theme: localProgress.settings.darkMode,
        },
        audioPositions,
        ftueCompleted,
        syncedAt: serverTimestamp() as any,
      };

      await setDoc(docRef, firestoreData);
      await AsyncStorage.setItem(getMigrationKey(uid), 'true');
      AnalyticsEvents.dataMigrated('new_account', localProgress.completedSnippets.length);
      return null; // No changes to local data needed
    }

    // Document exists - need to merge or pull
    const cloudData = docSnap.data() as FirestoreUserDocument;

    const cloudReadings = cloudData.progress?.completedReadings || {};
    const cloudHasData = Object.keys(cloudReadings).length > 0;

    if (!localHasData && cloudHasData) {
      // SCENARIO B: New device, cloud has data, local is empty
      const { completedSnippets, readingHistory } = firestoreReadingsToLocal(
        cloudReadings
      );

      const derivedCurrentDay = deriveCurrentDayFromReadings(cloudReadings);
      const cloudCurrentDay = cloudData.progress?.currentDay || 1;

      const mergedProgress: UserProgress = {
        currentSnippet: Math.max(cloudCurrentDay, derivedCurrentDay),
        completedSnippets,
        streak: {
          current: cloudData.streak?.currentStreak || 0,
          longest: cloudData.streak?.longestStreak || 0,
          lastReadDate: cloudData.streak?.lastReadDate || null,
          freezesAvailable: cloudData.streak?.freezeCount ?? 1,
          freezeUsedThisWeek: false,
        },
        settings: {
          ...defaultSettings,
          darkMode: (cloudData.settings?.theme as Settings['darkMode']) || 'system',
        },
        readingHistory,
        readingHistoryVersion: 2,
      };

      // Save to local
      await saveProgress(mergedProgress);

      // Restore language if different
      if (cloudData.settings?.language && (cloudData.settings.language === 'en' || cloudData.settings.language === 'hi')) {
        await AsyncStorage.setItem(CONFIG.LANGUAGE_KEY, cloudData.settings.language);
      }

      // Restore FTUE state
      if (cloudData.ftueCompleted) {
        const ftueState = { hasSeenWelcome: true, hasCompletedFirstReading: true, hasSetupNotifications: true };
        await AsyncStorage.setItem(CONFIG.FTUE_KEY, JSON.stringify(ftueState));
      }

      // Restore audio positions
      if (cloudData.audioPositions) {
        for (const [snippetId, time] of Object.entries(cloudData.audioPositions)) {
          if (time > 0) {
            const key = `${CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX}${snippetId}`;
            await AsyncStorage.setItem(key, JSON.stringify({ time, hasListened: false }));
          }
        }
      }

      // Update Firestore with platform info
      await updateDoc(docRef, {
        'profile.lastLoginAt': serverTimestamp(),
        'profile.platforms': arrayUnion(Platform.OS),
      });

      await AsyncStorage.setItem(getMigrationKey(uid), 'true');
      AnalyticsEvents.dataMigrated('pull_from_cloud', completedSnippets.length);
      return mergedProgress;
    }

    // SCENARIO C: Both have data - merge with "highest progress wins"
    const localReadings = progressToFirestoreReadings(localProgress);

    // Union of completed readings
    const mergedReadings: Record<string, string> = { ...cloudReadings };
    for (const [id, date] of Object.entries(localReadings)) {
      if (!mergedReadings[id]) {
        mergedReadings[id] = date;
      }
    }

    const { completedSnippets: mergedCompleted, readingHistory: mergedHistory } =
      firestoreReadingsToLocal(mergedReadings);

    // currentDay = max
    const mergedCurrentDay = Math.max(
      localProgress.currentSnippet,
      cloudData.progress?.currentDay || 1,
      deriveCurrentDayFromReadings(mergedReadings)
    );

    // Streak: use whichever has higher currentStreak
    // If local lastReadDate is more recent, prefer local streak data
    const localStreak = localProgress.streak;
    const cloudStreak = cloudData.streak || { currentStreak: 0, longestStreak: 0, lastReadDate: null, freezeCount: 1 };

    let mergedStreak;
    if (localStreak.current >= (cloudStreak.currentStreak || 0)) {
      mergedStreak = {
        current: localStreak.current,
        longest: Math.max(localStreak.longest, cloudStreak.longestStreak || 0),
        lastReadDate: localStreak.lastReadDate,
        freezesAvailable: localStreak.freezesAvailable,
        freezeUsedThisWeek: localStreak.freezeUsedThisWeek,
      };
    } else {
      mergedStreak = {
        current: cloudStreak.currentStreak || 0,
        longest: Math.max(localStreak.longest, cloudStreak.longestStreak || 0),
        lastReadDate: cloudStreak.lastReadDate || localStreak.lastReadDate,
        freezesAvailable: cloudStreak.freezeCount ?? 1,
        freezeUsedThisWeek: false,
      };
    }

    // Settings: Firestore wins
    const mergedSettings: Settings = {
      ...localProgress.settings,
      darkMode: (cloudData.settings?.theme as Settings['darkMode']) || localProgress.settings.darkMode,
    };

    // Audio positions: keep higher per snippet
    const mergedAudioPositions: Record<string, number> = { ...audioPositions };
    if (cloudData.audioPositions) {
      for (const [id, time] of Object.entries(cloudData.audioPositions)) {
        if (!mergedAudioPositions[id] || time > mergedAudioPositions[id]) {
          mergedAudioPositions[id] = time;
        }
      }
    }

    // FTUE: true if either is true
    const mergedFtue = ftueCompleted || (cloudData.ftueCompleted ?? false);

    const mergedProgress: UserProgress = {
      currentSnippet: mergedCurrentDay,
      completedSnippets: mergedCompleted,
      streak: mergedStreak,
      settings: mergedSettings,
      readingHistory: mergedHistory,
      readingHistoryVersion: 2,
    };

    // Write merged result to both
    await saveProgress(mergedProgress);

    await updateDoc(docRef, {
      'progress.completedReadings': mergedReadings,
      'progress.currentDay': mergedCurrentDay,
      'progress.totalCompleted': mergedCompleted.length,
      'progress.lastCompletedAt': mergedStreak.lastReadDate,
      'streak.currentStreak': mergedStreak.current,
      'streak.longestStreak': mergedStreak.longest,
      'streak.lastReadDate': mergedStreak.lastReadDate,
      'streak.freezeCount': mergedStreak.freezesAvailable,
      audioPositions: mergedAudioPositions,
      ftueCompleted: mergedFtue,
      'profile.lastLoginAt': serverTimestamp(),
      'profile.platforms': arrayUnion(Platform.OS),
      syncedAt: serverTimestamp(),
    });

    // Restore FTUE if merged
    if (mergedFtue) {
      const ftueState = { hasSeenWelcome: true, hasCompletedFirstReading: true, hasSetupNotifications: true };
      await AsyncStorage.setItem(CONFIG.FTUE_KEY, JSON.stringify(ftueState));
    }

    // Save merged audio positions locally
    for (const [snippetId, time] of Object.entries(mergedAudioPositions)) {
      if (time > 0) {
        const key = `${CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX}${snippetId}`;
        await AsyncStorage.setItem(key, JSON.stringify({ time, hasListened: false }));
      }
    }

    await AsyncStorage.setItem(getMigrationKey(uid), 'true');
    AnalyticsEvents.dataMigrated('merge', mergedCompleted.length);
    return mergedProgress;
  } catch (error) {
    logger.error('firestoreSync.migration', error);
    // Migration failed - app continues with local data. Will retry on next foreground.
    return null;
  }
}

// --- Ongoing Sync Helpers ---

/** Fire-and-forget sync of a field to Firestore. Never blocks UI. */
export async function syncToFirestore(updates: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await updateDoc(getUserDocRef(user.uid), {
      ...updates,
      syncedAt: serverTimestamp(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';
    AnalyticsEvents.syncFailed(Object.keys(updates).join(','), msg);
  }
}

/** Sync progress after a reading is completed */
export function syncReadingCompleted(progress: UserProgress) {
  const user = auth.currentUser;
  if (!user) return;

  const docRef = getUserDocRef(user.uid);
  const localReadings = progressToFirestoreReadings(progress);

  // Use a transaction so we never overwrite and lose completions from another device.
  // (updateDoc on `progress.completedReadings` replaces the whole map.)
  runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists()) return;

    const cloudData = snap.data() as FirestoreUserDocument;
    const cloudReadings = cloudData.progress?.completedReadings || {};

    const mergedReadings: Record<string, string> = { ...cloudReadings };
    for (const [id, date] of Object.entries(localReadings)) {
      if (!mergedReadings[id]) mergedReadings[id] = date;
    }

    const mergedTotal = Object.keys(mergedReadings).length;
    const derivedCurrentDay = deriveCurrentDayFromReadings(mergedReadings);
    const cloudCurrentDay = cloudData.progress?.currentDay || 1;
    const mergedCurrentDay = Math.max(cloudCurrentDay, progress.currentSnippet, derivedCurrentDay);

    const mergedLastReadDate = maxIsoDate(
      cloudData.streak?.lastReadDate,
      progress.streak.lastReadDate
    );

    tx.update(docRef, {
      'progress.completedReadings': mergedReadings,
      'progress.totalCompleted': mergedTotal,
      'progress.currentDay': mergedCurrentDay,
      'progress.lastCompletedAt': mergedLastReadDate,

      // Best-effort, monotonic-ish updates. Migration handles more nuanced merges.
      'streak.currentStreak': Math.max(cloudData.streak?.currentStreak || 0, progress.streak.current),
      'streak.longestStreak': Math.max(cloudData.streak?.longestStreak || 0, progress.streak.longest),
      'streak.lastReadDate': mergedLastReadDate,
      'streak.freezeCount': Math.max(cloudData.streak?.freezeCount ?? 1, progress.streak.freezesAvailable),

      syncedAt: serverTimestamp(),
    });
  }).catch((error) => {
    const msg = error instanceof Error ? error.message : 'unknown';
    AnalyticsEvents.syncFailed('progress.completedReadings', msg);
  });
}

/** Sync settings change */
export function syncSettings(language: string, settings: Settings) {
  syncToFirestore({
    'settings.language': language,
    'settings.theme': settings.darkMode,
  });
}

/** Sync a batch of audio positions (debounced, called periodically) */
export function syncAudioPositions(positions: Record<string, number>) {
  if (Object.keys(positions).length === 0) return;
  syncToFirestore({ audioPositions: positions });
}

/** Pull latest data from Firestore and merge if needed. Returns updated progress or null. */
export async function pullFromFirestore(): Promise<UserProgress | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const docSnap = await getDoc(getUserDocRef(user.uid));
    if (!docSnap.exists()) return null;

    const cloudData = docSnap.data() as FirestoreUserDocument;
    const localProgress = await loadProgress();

    // Quick check: if cloud has more completed readings, merge
    const cloudTotal = Object.keys(cloudData.progress?.completedReadings || {}).length;
    const localTotal = localProgress.completedSnippets.length;

    if (cloudTotal <= localTotal) return null; // Local is already up-to-date or ahead

    // Merge cloud into local
    const cloudReadings = cloudData.progress?.completedReadings || {};
    const localReadings = progressToFirestoreReadings(localProgress);

    const mergedReadings: Record<string, string> = { ...localReadings };
    let hasNewData = false;
    for (const [id, date] of Object.entries(cloudReadings)) {
      if (!mergedReadings[id]) {
        mergedReadings[id] = date;
        hasNewData = true;
      }
    }

    if (!hasNewData) return null;

    const { completedSnippets, readingHistory } = firestoreReadingsToLocal(mergedReadings);

    const mergedProgress: UserProgress = {
      ...localProgress,
      currentSnippet: Math.max(
        localProgress.currentSnippet,
        cloudData.progress?.currentDay || 1,
        deriveCurrentDayFromReadings(mergedReadings)
      ),
      completedSnippets,
      readingHistory,
      streak: {
        ...localProgress.streak,
        longest: Math.max(localProgress.streak.longest, cloudData.streak?.longestStreak || 0),
      },
    };

    await saveProgress(mergedProgress);
    return mergedProgress;
  } catch (error) {
    logger.error('firestoreSync.pull', error);
    return null;
  }
}

/** Clear migration flag on sign-out so re-login triggers fresh migration */
export async function clearMigrationFlag(uid: string) {
  try {
    await AsyncStorage.removeItem(getMigrationKey(uid));
  } catch {
    // ignore
  }
}
