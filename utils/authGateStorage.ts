import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';

const COUNTER_KEY = '@auth_gate_completions_v2';
const PENDING_KEY = '@auth_gate_pending';

// Old keys to clean up on reset
const OLD_KEYS = ['@auth_gate_baseline_v1', '@auth_gate_completions_v1'];

export interface PendingAuthGate {
  kind: 'dismissible' | 'mandatory';
}

/**
 * Increment the post-install completion counter.
 * Called from handleMarkComplete in reading/[id].tsx.
 * Returns the new count (0 for authenticated users).
 */
export async function recordCompletionForAuthGate(isAuthenticated: boolean): Promise<number> {
  if (isAuthenticated) return 0;

  try {
    const raw = await AsyncStorage.getItem(COUNTER_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    const count = Number.isNaN(parsed) ? 0 : Math.max(parsed, 0);
    const newCount = count + 1;

    await AsyncStorage.setItem(COUNTER_KEY, String(newCount));
    const kind: PendingAuthGate['kind'] =
      newCount <= CONFIG.AUTH_GATE_DISMISSIBLE_LIMIT ? 'dismissible' : 'mandatory';
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ kind }));
    return newCount;
  } catch {
    return 0;
  }
}

/**
 * Read and clear the pending auth gate flag (consume-once).
 * Called from app/_layout.tsx when the home screen is visible.
 */
export async function consumePendingAuthGate(): Promise<PendingAuthGate | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw) as PendingAuthGate;
  } catch {
    return null;
  }
}

/**
 * Check if the user is past the dismissible limit (for mandatory full-screen gate).
 */
export async function isAuthGateMandatory(isAuthenticated: boolean): Promise<boolean> {
  if (isAuthenticated) return false;
  try {
    const raw = await AsyncStorage.getItem(COUNTER_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    const count = Number.isNaN(parsed) ? 0 : Math.max(parsed, 0);
    return count > CONFIG.AUTH_GATE_DISMISSIBLE_LIMIT;
  } catch {
    return false;
  }
}

/**
 * Clear all auth gate state. Called during resetAllProgress and simulateProgress.
 */
export async function clearAuthGateState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([COUNTER_KEY, PENDING_KEY, ...OLD_KEYS]);
  } catch {
    // Storage cleanup failure is non-critical
  }
}
