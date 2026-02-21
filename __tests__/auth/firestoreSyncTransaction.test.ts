jest.mock('@/utils/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test-uid' } },
  db: {},
}));

describe('Firestore syncReadingCompleted', () => {
  it('merges completedReadings via transaction (no overwrite)', async () => {
    const txUpdate = jest.fn();
    const txGet = jest.fn(async () => ({
      exists: () => true,
      data: () => ({
        progress: {
          completedReadings: { '1': '2025-01-01' },
          currentDay: 2,
        },
        streak: {
          currentStreak: 1,
          longestStreak: 1,
          lastReadDate: '2025-01-01',
          freezeCount: 1,
        },
      }),
    }));

    const runTransaction = jest.fn(async (_db: unknown, updateFunction: unknown) => {
      const fn = updateFunction as (tx: { get: typeof txGet; update: typeof txUpdate }) => Promise<void> | void;
      return fn({ get: txGet, update: txUpdate });
    });

    jest.doMock('firebase/firestore', () => ({
      doc: jest.fn(() => ({ _ref: true })),
      getDoc: jest.fn(),
      setDoc: jest.fn(),
      updateDoc: jest.fn(),
      serverTimestamp: jest.fn(() => 'SERVER_TS'),
      arrayUnion: jest.fn((x: unknown) => x),
      runTransaction,
    }));

    // Import after mocks
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { syncReadingCompleted } = require('@/services/firestoreSync');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { defaultProgress, defaultSettings } = require('@/utils/storage');

    const progress = {
      ...defaultProgress,
      currentSnippet: 3,
      completedSnippets: [1, 2],
      readingHistory: {
        '2025-01-01': [1],
        '2025-01-02': [2],
      },
      streak: {
        ...defaultProgress.streak,
        current: 2,
        longest: 2,
        lastReadDate: '2025-01-02',
      },
      settings: defaultSettings,
    };

    syncReadingCompleted(progress);
    expect(runTransaction).toHaveBeenCalledTimes(1);

    // Wait for the transaction to run
    await runTransaction.mock.results[0]!.value;

    expect(txUpdate).toHaveBeenCalledTimes(1);
    const updateArg = txUpdate.mock.calls[0]![1];

    expect(updateArg['progress.completedReadings']).toEqual({
      '1': '2025-01-01',
      '2': '2025-01-02',
    });
    expect(updateArg['progress.totalCompleted']).toBe(2);
    expect(updateArg['progress.currentDay']).toBe(3);
    expect(updateArg['progress.lastCompletedAt']).toBe('2025-01-02');
    expect(updateArg['streak.currentStreak']).toBe(2);
    expect(updateArg['streak.longestStreak']).toBe(2);
  });
});

