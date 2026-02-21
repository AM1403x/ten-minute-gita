/**
 * Auth gate tests - event-driven + home-only modal queue.
 *
 * Source of truth:
 * - utils/authGateStorage.ts (persistent counter + pending flag)
 * - app/_layout.tsx (queue: notifications -> auth gate; home-only)
 *
 * Architecture:
 * - recordCompletionForAuthGate(isAuthenticated):
 *   - increments counter (post-install completions)
 *   - writes a pending flag with kind = dismissible (1-3) or mandatory (4+)
 * - app/_layout.tsx consumes pending flag ONLY when:
 *   - user is on home screen
 *   - FTUE state is loaded
 *   - user is unauthenticated
 *   - notification prompt is not visible
 * - Mandatory gate persists (count > AUTH_GATE_DISMISSIBLE_LIMIT)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  recordCompletionForAuthGate,
  consumePendingAuthGate,
  isAuthGateMandatory,
  clearAuthGateState,
} from '@/utils/authGateStorage';
import { CONFIG } from '@/constants/config';

// --- Helper: replicate modal queue decision from app/_layout.tsx ---

type ActiveModal = 'notifications' | 'authGate' | null;

interface ModalQueueInput {
  isOnHomeScreen: boolean;
  isAuthenticated: boolean;
  ftueLoaded: boolean;
  needsNotificationPrompt: boolean;
  pendingAuthGate: { kind: 'dismissible' | 'mandatory' } | null;
  isMandatory: boolean;
}

function evaluateModalQueue(input: ModalQueueInput): {
  activeModal: ActiveModal;
  authGateKind: 'dismissible' | 'mandatory';
} {
  if (!input.isOnHomeScreen || input.isAuthenticated || !input.ftueLoaded) {
    return { activeModal: null, authGateKind: 'dismissible' };
  }

  if (input.needsNotificationPrompt) {
    return { activeModal: 'notifications', authGateKind: 'dismissible' };
  }

  if (input.pendingAuthGate) {
    return { activeModal: 'authGate', authGateKind: input.pendingAuthGate.kind };
  }

  if (input.isMandatory) {
    return { activeModal: 'authGate', authGateKind: 'mandatory' };
  }

  return { activeModal: null, authGateKind: 'dismissible' };
}

beforeEach(() => {
  (AsyncStorage.clear as jest.Mock)();
});

describe('recordCompletionForAuthGate', () => {
  it('increments counter from 0 to 1', async () => {
    const count = await recordCompletionForAuthGate(false);
    expect(count).toBe(1);
  });

  it('increments counter across multiple calls', async () => {
    expect(await recordCompletionForAuthGate(false)).toBe(1);
    expect(await recordCompletionForAuthGate(false)).toBe(2);
    expect(await recordCompletionForAuthGate(false)).toBe(3);
    expect(await recordCompletionForAuthGate(false)).toBe(4);
  });

  it('sets pending flag with kind=dismissible for completions 1-3', async () => {
    await recordCompletionForAuthGate(false); // count=1
    const pending = await consumePendingAuthGate();
    expect(pending).toEqual({ kind: 'dismissible' });
  });

  it('sets pending flag with kind=mandatory for completion 4+', async () => {
    for (let i = 0; i < 3; i++) {
      await recordCompletionForAuthGate(false);
      await consumePendingAuthGate(); // clear pending
    }
    await recordCompletionForAuthGate(false); // count=4
    const pending = await consumePendingAuthGate();
    expect(pending).toEqual({ kind: 'mandatory' });
  });

  it('is a no-op for authenticated users', async () => {
    const count = await recordCompletionForAuthGate(true);
    expect(count).toBe(0);
    const pending = await consumePendingAuthGate();
    expect(pending).toBeNull();
  });
});

describe('consumePendingAuthGate', () => {
  it('returns null when no pending flag exists', async () => {
    expect(await consumePendingAuthGate()).toBeNull();
  });

  it('returns and clears the pending flag (consume-once)', async () => {
    await recordCompletionForAuthGate(false);

    const first = await consumePendingAuthGate();
    expect(first).toEqual({ kind: 'dismissible' });

    const second = await consumePendingAuthGate();
    expect(second).toBeNull();
  });

  it('handles malformed JSON gracefully', async () => {
    await AsyncStorage.setItem('@auth_gate_pending', 'not-json');
    expect(await consumePendingAuthGate()).toBeNull();
  });
});

describe('isAuthGateMandatory', () => {
  it('returns false when counter is 0', async () => {
    expect(await isAuthGateMandatory(false)).toBe(false);
  });

  it('returns false when counter <= dismissible limit', async () => {
    for (let i = 0; i < CONFIG.AUTH_GATE_DISMISSIBLE_LIMIT; i++) {
      await recordCompletionForAuthGate(false);
    }
    expect(await isAuthGateMandatory(false)).toBe(false);
  });

  it('returns true when counter > dismissible limit', async () => {
    for (let i = 0; i <= CONFIG.AUTH_GATE_DISMISSIBLE_LIMIT; i++) {
      await recordCompletionForAuthGate(false);
    }
    expect(await isAuthGateMandatory(false)).toBe(true);
  });

  it('returns false when authenticated regardless of counter', async () => {
    await AsyncStorage.setItem('@auth_gate_completions_v2', '10');
    expect(await isAuthGateMandatory(true)).toBe(false);
  });
});

describe('clearAuthGateState', () => {
  it('clears counter and pending flag', async () => {
    await recordCompletionForAuthGate(false);
    await recordCompletionForAuthGate(false);

    await clearAuthGateState();

    expect(await isAuthGateMandatory(false)).toBe(false);
    expect(await consumePendingAuthGate()).toBeNull();
    // Counter is back to 0
    const count = await recordCompletionForAuthGate(false);
    expect(count).toBe(1);
  });

  it('also clears old v1 keys', async () => {
    await AsyncStorage.setItem('@auth_gate_baseline_v1', '5');
    await AsyncStorage.setItem('@auth_gate_completions_v1', '3');

    await clearAuthGateState();

    expect(await AsyncStorage.getItem('@auth_gate_baseline_v1')).toBeNull();
    expect(await AsyncStorage.getItem('@auth_gate_completions_v1')).toBeNull();
  });
});

describe('Modal queue logic', () => {
  it('shows nothing when not on home screen', () => {
    const result = evaluateModalQueue({
      isOnHomeScreen: false,
      isAuthenticated: false,
      ftueLoaded: true,
      needsNotificationPrompt: false,
      pendingAuthGate: { kind: 'dismissible' },
      isMandatory: false,
    });
    expect(result.activeModal).toBeNull();
  });

  it('shows nothing when authenticated', () => {
    const result = evaluateModalQueue({
      isOnHomeScreen: true,
      isAuthenticated: true,
      ftueLoaded: true,
      needsNotificationPrompt: false,
      pendingAuthGate: { kind: 'mandatory' },
      isMandatory: true,
    });
    expect(result.activeModal).toBeNull();
  });

  it('shows nothing while FTUE state is still loading', () => {
    const result = evaluateModalQueue({
      isOnHomeScreen: true,
      isAuthenticated: false,
      ftueLoaded: false,
      needsNotificationPrompt: false,
      pendingAuthGate: { kind: 'dismissible' },
      isMandatory: false,
    });
    expect(result.activeModal).toBeNull();
  });

  it('notification prompt takes priority over auth gate', () => {
    const result = evaluateModalQueue({
      isOnHomeScreen: true,
      isAuthenticated: false,
      ftueLoaded: true,
      needsNotificationPrompt: true,
      pendingAuthGate: { kind: 'dismissible' },
      isMandatory: false,
    });
    expect(result.activeModal).toBe('notifications');
  });

  it('shows auth gate after notification prompt is dismissed', () => {
    const result = evaluateModalQueue({
      isOnHomeScreen: true,
      isAuthenticated: false,
      ftueLoaded: true,
      needsNotificationPrompt: false,
      pendingAuthGate: { kind: 'dismissible' },
      isMandatory: false,
    });
    expect(result.activeModal).toBe('authGate');
    expect(result.authGateKind).toBe('dismissible');
  });

  it('shows mandatory auth gate when no pending flag but counter is high', () => {
    const result = evaluateModalQueue({
      isOnHomeScreen: true,
      isAuthenticated: false,
      ftueLoaded: true,
      needsNotificationPrompt: false,
      pendingAuthGate: null,
      isMandatory: true,
    });
    expect(result.activeModal).toBe('authGate');
    expect(result.authGateKind).toBe('mandatory');
  });
});

