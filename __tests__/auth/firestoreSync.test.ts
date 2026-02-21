/**
 * Firestore sync logic tests - data merge strategies
 */

describe('Firestore Sync - Merge Logic', () => {
  // Utility to simulate the merge logic from firestoreSync.ts

  interface ProgressData {
    completedReadings: Record<string, string>;
    currentDay: number;
  }

  interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastReadDate: string | null;
  }

  function mergeCompletedReadings(
    local: Record<string, string>,
    cloud: Record<string, string>
  ): Record<string, string> {
    const merged: Record<string, string> = { ...cloud };
    for (const [id, date] of Object.entries(local)) {
      if (!merged[id]) {
        merged[id] = date;
      }
    }
    return merged;
  }

  function mergeCurrentDay(localDay: number, cloudDay: number): number {
    return Math.max(localDay, cloudDay);
  }

  function mergeStreak(local: StreakData, cloud: StreakData): StreakData {
    if (local.currentStreak >= cloud.currentStreak) {
      return {
        currentStreak: local.currentStreak,
        longestStreak: Math.max(local.longestStreak, cloud.longestStreak),
        lastReadDate: local.lastReadDate,
      };
    }
    return {
      currentStreak: cloud.currentStreak,
      longestStreak: Math.max(local.longestStreak, cloud.longestStreak),
      lastReadDate: cloud.lastReadDate || local.lastReadDate,
    };
  }

  function mergeAudioPositions(
    local: Record<string, number>,
    cloud: Record<string, number>
  ): Record<string, number> {
    const merged: Record<string, number> = { ...local };
    for (const [id, time] of Object.entries(cloud)) {
      if (!merged[id] || time > merged[id]) {
        merged[id] = time;
      }
    }
    return merged;
  }

  describe('completedReadings union', () => {
    it('unions readings from both sources', () => {
      const local = { '1': '2025-01-01', '2': '2025-01-02', '3': '2025-01-03' };
      const cloud = { '1': '2025-01-01', '4': '2025-01-04', '5': '2025-01-05' };

      const merged = mergeCompletedReadings(local, cloud);
      expect(Object.keys(merged).sort()).toEqual(['1', '2', '3', '4', '5']);
    });

    it('keeps cloud date when both have same reading', () => {
      const local = { '1': '2025-01-10' };
      const cloud = { '1': '2025-01-01' };

      const merged = mergeCompletedReadings(local, cloud);
      expect(merged['1']).toBe('2025-01-01'); // cloud wins for existing
    });

    it('handles empty local', () => {
      const local = {};
      const cloud = { '1': '2025-01-01', '2': '2025-01-02' };

      const merged = mergeCompletedReadings(local, cloud);
      expect(Object.keys(merged)).toEqual(['1', '2']);
    });

    it('handles empty cloud', () => {
      const local = { '1': '2025-01-01', '2': '2025-01-02' };
      const cloud = {};

      const merged = mergeCompletedReadings(local, cloud);
      expect(Object.keys(merged)).toEqual(['1', '2']);
    });

    it('handles both empty', () => {
      const merged = mergeCompletedReadings({}, {});
      expect(merged).toEqual({});
    });
  });

  describe('currentDay max', () => {
    it('takes local when local is higher', () => {
      expect(mergeCurrentDay(10, 5)).toBe(10);
    });

    it('takes cloud when cloud is higher', () => {
      expect(mergeCurrentDay(3, 7)).toBe(7);
    });

    it('returns same when equal', () => {
      expect(mergeCurrentDay(5, 5)).toBe(5);
    });
  });

  describe('streak merge - highest current wins', () => {
    it('uses local streak when local is higher', () => {
      const local: StreakData = { currentStreak: 10, longestStreak: 10, lastReadDate: '2025-01-10' };
      const cloud: StreakData = { currentStreak: 5, longestStreak: 15, lastReadDate: '2025-01-05' };

      const merged = mergeStreak(local, cloud);
      expect(merged.currentStreak).toBe(10);
      expect(merged.longestStreak).toBe(15); // max of both
      expect(merged.lastReadDate).toBe('2025-01-10'); // local's date
    });

    it('uses cloud streak when cloud is higher', () => {
      const local: StreakData = { currentStreak: 3, longestStreak: 20, lastReadDate: '2025-01-03' };
      const cloud: StreakData = { currentStreak: 12, longestStreak: 12, lastReadDate: '2025-01-12' };

      const merged = mergeStreak(local, cloud);
      expect(merged.currentStreak).toBe(12);
      expect(merged.longestStreak).toBe(20); // max of both
      expect(merged.lastReadDate).toBe('2025-01-12');
    });

    it('uses local when equal (local >= cloud)', () => {
      const local: StreakData = { currentStreak: 5, longestStreak: 5, lastReadDate: '2025-01-05' };
      const cloud: StreakData = { currentStreak: 5, longestStreak: 5, lastReadDate: '2025-01-04' };

      const merged = mergeStreak(local, cloud);
      expect(merged.currentStreak).toBe(5);
      expect(merged.lastReadDate).toBe('2025-01-05'); // local wins on tie
    });
  });

  describe('audioPositions - higher position wins', () => {
    it('takes higher position per snippet', () => {
      const local = { '1': 100, '2': 50 };
      const cloud = { '1': 80, '2': 200, '3': 150 };

      const merged = mergeAudioPositions(local, cloud);
      expect(merged['1']).toBe(100);  // local higher
      expect(merged['2']).toBe(200);  // cloud higher
      expect(merged['3']).toBe(150);  // only in cloud
    });

    it('handles empty local', () => {
      const merged = mergeAudioPositions({}, { '1': 100 });
      expect(merged['1']).toBe(100);
    });

    it('handles empty cloud', () => {
      const merged = mergeAudioPositions({ '1': 100 }, {});
      expect(merged['1']).toBe(100);
    });
  });

  describe('scenario detection', () => {
    function detectScenario(
      cloudExists: boolean,
      cloudHasData: boolean,
      localHasData: boolean
    ): 'new_account' | 'pull_from_cloud' | 'merge' {
      if (!cloudExists) return 'new_account';
      if (!localHasData && cloudHasData) return 'pull_from_cloud';
      return 'merge';
    }

    it('detects new account (no cloud document)', () => {
      expect(detectScenario(false, false, true)).toBe('new_account');
      expect(detectScenario(false, false, false)).toBe('new_account');
    });

    it('detects pull from cloud (cloud has data, local empty)', () => {
      expect(detectScenario(true, true, false)).toBe('pull_from_cloud');
    });

    it('detects merge when both have data', () => {
      expect(detectScenario(true, true, true)).toBe('merge');
    });

    it('detects merge when cloud exists but empty, local has data', () => {
      expect(detectScenario(true, false, true)).toBe('merge');
    });
  });
});
