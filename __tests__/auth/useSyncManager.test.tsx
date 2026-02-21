import React from 'react';
import { render, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockAppStateHandler: ((nextState: string) => void) | null = null;

const mockDispatch = jest.fn();
const mockRemoveListener = jest.fn();

const mockRunMigration = jest.fn();
const mockPullFromFirestore = jest.fn();
const mockClearMigrationFlag = jest.fn();
const mockSyncReadingCompleted = jest.fn();

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn((_event: string, cb: (s: string) => void) => {
      mockAppStateHandler = cb;
      return { remove: mockRemoveListener };
    }),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    authState: {
      status: 'authenticated',
      user: {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: null,
        photoURL: null,
        providerId: 'google.com',
      },
    },
  }),
}));

jest.mock('@/contexts/AppContext', () => ({
  useApp: () => ({
    state: { progress: { completedSnippets: [] } },
    dispatch: mockDispatch,
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

jest.mock('@/services/analytics', () => ({
  setAnalyticsUser: jest.fn(),
  clearAnalyticsUser: jest.fn(),
}));

jest.mock('@/services/firestoreSync', () => ({
  runMigration: (...args: any[]) => mockRunMigration(...args),
  pullFromFirestore: (...args: any[]) => mockPullFromFirestore(...args),
  clearMigrationFlag: (...args: any[]) => mockClearMigrationFlag(...args),
  syncReadingCompleted: (...args: any[]) => mockSyncReadingCompleted(...args),
  getMigrationKey: (uid: string) => `@migration_complete_${uid}`,
}));

import { useSyncManager } from '@/hooks/useSyncManager';

function Harness() {
  useSyncManager();
  return null;
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useSyncManager foreground behavior', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockAppStateHandler = null;
    await (AsyncStorage.clear as jest.Mock)();
  });

  it('retries migration on foreground when migration flag is missing, then pulls', async () => {
    // Initial migration attempt fails (simulates transient network failure)
    mockRunMigration.mockRejectedValueOnce(new Error('network'));

    render(<Harness />);
    await flushMicrotasks();

    mockRunMigration.mockClear();
    mockPullFromFirestore.mockClear();
    mockDispatch.mockClear();

    const mergedProgress = { currentSnippet: 2 } as any;
    mockRunMigration.mockResolvedValueOnce(mergedProgress);
    mockPullFromFirestore.mockResolvedValueOnce(null);

    expect(mockAppStateHandler).not.toBeNull();
    await act(async () => {
      await mockAppStateHandler!('active');
      await Promise.resolve();
    });

    expect(mockRunMigration).toHaveBeenCalledTimes(1);
    expect(mockRunMigration).toHaveBeenCalledWith('u1', {
      email: 'u1@example.com',
      displayName: null,
      photoURL: null,
      providerId: 'google.com',
    });
    expect(mockPullFromFirestore).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_PROGRESS', payload: mergedProgress });
  });

  it('skips migration retry on foreground when migration flag is true, but still pulls', async () => {
    mockRunMigration.mockResolvedValueOnce(null); // initial auth effect

    render(<Harness />);
    await flushMicrotasks();

    mockRunMigration.mockClear();
    mockPullFromFirestore.mockClear();
    mockDispatch.mockClear();

    await AsyncStorage.setItem('@migration_complete_u1', 'true');

    const pulledProgress = { currentSnippet: 10 } as any;
    mockPullFromFirestore.mockResolvedValueOnce(pulledProgress);

    expect(mockAppStateHandler).not.toBeNull();
    await act(async () => {
      await mockAppStateHandler!('active');
      await Promise.resolve();
    });

    expect(mockRunMigration).not.toHaveBeenCalled();
    expect(mockPullFromFirestore).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_PROGRESS', payload: pulledProgress });
  });

  it('still attempts migration and pull if reading the migration flag throws', async () => {
    mockRunMigration.mockResolvedValueOnce(null); // initial auth effect

    render(<Harness />);
    await flushMicrotasks();

    mockRunMigration.mockClear();
    mockPullFromFirestore.mockClear();
    mockDispatch.mockClear();

    // Force the flag read to throw for this uid
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === '@migration_complete_u1') throw new Error('AsyncStorage down');
      return null;
    });

    const mergedProgress = { currentSnippet: 3 } as any;
    mockRunMigration.mockResolvedValueOnce(mergedProgress);
    mockPullFromFirestore.mockResolvedValueOnce(null);

    expect(mockAppStateHandler).not.toBeNull();
    await act(async () => {
      await mockAppStateHandler!('active');
      await Promise.resolve();
    });

    expect(mockRunMigration).toHaveBeenCalledTimes(1);
    expect(mockPullFromFirestore).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_PROGRESS', payload: mergedProgress });
  });
});
