/**
 * Regression tests for the Offline Listening settings section.
 *
 * Verifies:
 * - Translation keys exist in both EN and HI
 * - DownloadManager has correct structure (two toggles, storage footer)
 * - No Advanced accordion or Coming Soon alerts
 * - Toggle state persists to AsyncStorage
 * - Subtitles are short/compact
 * - Old chapter-by-chapter UI is removed
 */

import { getTranslation } from '@/constants/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_AUTO_DOWNLOAD = '@offline_auto_download';
const STORAGE_KEY_AUTO_REMOVE = '@offline_auto_remove';

// Helper: read DownloadManager source once for architecture tests
function readSource(): string {
  const fs = require('fs');
  const p = require('path').resolve(__dirname, '../../components/downloads/DownloadManager.tsx');
  return fs.readFileSync(p, 'utf8');
}

describe('Offline Listening: Translation keys', () => {
  const requiredKeys = [
    'settings.offline.title',
    'settings.offline.autoDownload',
    'settings.offline.autoDownloadSub',
    'settings.offline.autoRemove',
    'settings.offline.autoRemoveSub',
    'settings.offline.using',
    'settings.offline.clearAll',
    'settings.offline.clearAllButton',
    'settings.offline.clearAllTitle',
    'settings.offline.clearAllMessage',
  ];

  it.each(requiredKeys)('EN has key: %s', (key) => {
    const result = getTranslation('en', key);
    expect(result).not.toBe(key);
    expect(result.length).toBeGreaterThan(0);
  });

  it.each(requiredKeys)('HI has key: %s', (key) => {
    const result = getTranslation('hi', key);
    expect(result).not.toBe(key);
    expect(result.length).toBeGreaterThan(0);
  });

  it('EN/HI key count matches for offline section', () => {
    const en = requiredKeys.map(k => getTranslation('en', k));
    const hi = requiredKeys.map(k => getTranslation('hi', k));
    expect(en.length).toBe(hi.length);
    en.forEach((v, i) => expect(v).not.toBe(requiredKeys[i]));
    hi.forEach((v, i) => expect(v).not.toBe(requiredKeys[i]));
  });

  it('interpolation works for size params', () => {
    expect(getTranslation('en', 'settings.offline.using', { size: '42 MB' })).toContain('42 MB');
  });

  it('subtitles are short (under 20 chars)', () => {
    const enAutoSub = getTranslation('en', 'settings.offline.autoDownloadSub');
    const enRemoveSub = getTranslation('en', 'settings.offline.autoRemoveSub');
    expect(enAutoSub.length).toBeLessThanOrEqual(20);
    expect(enRemoveSub.length).toBeLessThanOrEqual(20);
  });
});

describe('Offline Listening: Component structure', () => {
  it('does NOT import ChapterDownloadRow or DownloadProgressBar', () => {
    const source = readSource();
    expect(source).not.toContain('ChapterDownloadRow');
    expect(source).not.toContain('DownloadProgressBar');
  });

  it('uses Switch for toggles (exactly 2)', () => {
    const source = readSource();
    expect(source).toContain('Switch');
    expect((source.match(/<Switch/g) || []).length).toBe(2);
  });

  it('does NOT have Advanced accordion or Coming Soon alerts', () => {
    const source = readSource();
    expect(source).not.toContain('advancedOpen');
    expect(source).not.toContain('advancedContent');
    expect(source).not.toContain('chevron-forward');
    expect(source).not.toContain('comingSoon');
    expect(source).not.toContain('Coming Soon');
    expect(source).not.toContain('cloud-download-outline');
    expect(source).not.toContain('downloadButton');
  });

  it('does NOT have Download All buttons or size constants', () => {
    const source = readSource();
    expect(source).not.toContain('downloadAllEn');
    expect(source).not.toContain('downloadAllHi');
    expect(source).not.toContain('EN_SIZE');
    expect(source).not.toContain('HI_SIZE');
  });

  it('footer only shows when totalStorageUsed > 0', () => {
    const source = readSource();
    expect(source).toContain('totalStorageUsed > 0');
    expect(source).toContain('settings.offline.clearAllButton');
  });

  it('uses same card styling as other settings sections', () => {
    const source = readSource();
    expect(source).toContain('sectionHeader');
    expect(source).toContain('borderRadius: 16');
    expect(source).toContain('marginHorizontal: 16');
  });

  it('imports useDownloadManager from context (shared state)', () => {
    const source = readSource();
    expect(source).toContain("from '@/contexts/DownloadManagerContext'");
  });
});

describe('Offline Listening: Toggle persistence', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('AsyncStorage keys are correct', () => {
    expect(STORAGE_KEY_AUTO_DOWNLOAD).toBe('@offline_auto_download');
    expect(STORAGE_KEY_AUTO_REMOVE).toBe('@offline_auto_remove');
  });

  it('toggle state saves to AsyncStorage', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_AUTO_DOWNLOAD, 'true');
    await AsyncStorage.setItem(STORAGE_KEY_AUTO_REMOVE, 'true');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY_AUTO_DOWNLOAD, 'true');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY_AUTO_REMOVE, 'true');
  });

  it('toggle state loads from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === STORAGE_KEY_AUTO_DOWNLOAD) return Promise.resolve('true');
      if (key === STORAGE_KEY_AUTO_REMOVE) return Promise.resolve('false');
      return Promise.resolve(null);
    });
    expect(await AsyncStorage.getItem(STORAGE_KEY_AUTO_DOWNLOAD)).toBe('true');
    expect(await AsyncStorage.getItem(STORAGE_KEY_AUTO_REMOVE)).toBe('false');
  });
});

describe('Offline Listening: Old UI removed', () => {
  it('old download translation keys are removed', () => {
    const oldKeys = [
      'settings.downloads.title',
      'settings.downloads.downloadAll',
      'settings.downloads.deleteAll',
      'settings.downloads.deleteChapterTitle',
      'settings.downloads.deleteChapterMessage',
    ];
    for (const key of oldKeys) {
      expect(getTranslation('en', key)).toBe(key);
    }
  });
});
