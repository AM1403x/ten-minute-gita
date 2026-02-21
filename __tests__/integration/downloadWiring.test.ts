/**
 * Integration tests for download system wiring.
 *
 * Verifies:
 * - Step 1: Download icon calls downloadSingleReading (no "Coming Soon" alert)
 * - Step 2: Reactive header with ActivityIndicator and checkmark-circle
 * - Step 3: Audio source resolution checks local downloads before CDN
 * - Step 4: Auto-download next 5 readings on completion
 * - Step 5: Auto-remove old downloads (cleanupOldDownloads)
 * - Step 6: Storage display visible outside Advanced accordion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

function readFile(relativePath: string): string {
  const fs = require('fs');
  const path = require('path');
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

// ── Step 1: Download icon triggers actual download ──────────────

describe('Step 1: Download icon triggers actual download', () => {
  const source = readFile('../../app/reading/[id].tsx');

  it('does NOT show "Coming Soon" alert for download button', () => {
    expect(source).not.toContain("'Coming Soon'");
  });

  it('calls downloadSingleReading on download icon press', () => {
    expect(source).toContain('downloadSingleReading(snippetId)');
  });

  it('guards against double-tap (no-op when downloading or downloaded)', () => {
    expect(source).toContain('!downloading && !downloaded');
  });
});

// ── Step 2: Reactive download state in header ───────────────────

describe('Step 2: Reactive download state in header', () => {
  const source = readFile('../../app/reading/[id].tsx');

  it('imports ActivityIndicator from react-native', () => {
    expect(source).toContain('ActivityIndicator');
  });

  it('shows ActivityIndicator while downloading', () => {
    expect(source).toContain('downloading');
    expect(source).toContain('<ActivityIndicator');
  });

  it('shows checkmark-circle icon when downloaded', () => {
    expect(source).toContain('checkmark-circle');
    expect(source).toContain('downloaded');
  });

  it('uses standalone HeaderDownloadIcon component with props (no stale params)', () => {
    // Download icon receives snippetId as prop — never reads useLocalSearchParams itself
    expect(source).toContain('function HeaderDownloadIcon({ snippetId, isContentLocked }');
    expect(source).toContain('<HeaderDownloadIcon snippetId={snippetId} isContentLocked={isContentLocked} />');
    expect(source).toContain('useDownloadManager()');
    expect(source).not.toContain('function HeaderDownloadIcon()');
  });

  it('hides download icon on locked content only when not downloaded', () => {
    expect(source).toContain('isContentLocked && !downloaded) return null');
  });

  it('re-renders header when snippetId changes (deps include snippetId)', () => {
    // useLayoutEffect deps must include snippetId so header updates on navigation
    const layoutStart = source.indexOf('useLayoutEffect(() =>');
    const layoutBlock = source.slice(layoutStart, layoutStart + 800);
    expect(layoutBlock).toContain('snippetId');
    expect(layoutBlock).toContain('isContentLocked');
  });
});

// ── Step 3: Audio source resolution priority ────────────────────

describe('Step 3: Audio source resolution priority', () => {
  const source = readFile('../../utils/audioSource.ts');

  it('resolveAudioSource checks local download before CDN', () => {
    const localIdx = source.indexOf('getLocalAudioPath');
    const cdnIdx = source.indexOf('AUDIO_CDN_BASE_URL');
    expect(localIdx).toBeGreaterThan(-1);
    expect(cdnIdx).toBeGreaterThan(-1);
    expect(localIdx).toBeLessThan(cdnIdx);
  });

  it('resolveAlignedJson checks local download before cache and CDN', () => {
    const localIdx = source.indexOf('getLocalAlignedJsonPath');
    const cacheIdx = source.indexOf('alignedJsonCache[cacheKey]');
    expect(localIdx).toBeGreaterThan(-1);
    expect(cacheIdx).toBeGreaterThan(-1);
    expect(localIdx).toBeLessThan(cacheIdx);
  });
});

// ── Step 4: Auto-download on reading completion ─────────────────

describe('Step 4: Auto-download on reading completion', () => {
  const source = readFile('../../app/reading/[id].tsx');

  it('reads @offline_auto_download preference in handleMarkComplete', () => {
    expect(source).toContain("'@offline_auto_download'");
  });

  it('downloads next readings after completion', () => {
    // Should reference downloadSingleReading in the auto-download block
    const markCompleteBlock = source.slice(
      source.indexOf('handleMarkComplete'),
      source.indexOf('navigateToPrev'),
    );
    expect(markCompleteBlock).toContain('downloadSingleReading(nextId)');
  });

  it('caps auto-download at snippet 239', () => {
    expect(source).toContain('Math.min(snippetId + 5, 239)');
  });

  it('skips already-downloaded snippets', () => {
    const markCompleteBlock = source.slice(
      source.indexOf('handleMarkComplete'),
      source.indexOf('navigateToPrev'),
    );
    expect(markCompleteBlock).toContain('!isDownloaded(nextId)');
  });

  it('respects disabled preference (val === false returns early)', () => {
    expect(source).toContain("val === 'false'");
  });
});

// ── Step 5: Auto-remove old downloads ───────────────────────────

describe('Step 5: Auto-remove old downloads', () => {
  it('cleanupOldDownloads exists in downloadStorage', () => {
    const source = readFile('../../utils/downloadStorage.ts');
    expect(source).toContain('export async function cleanupOldDownloads');
    expect(source).toContain("'@offline_auto_remove'");
  });

  it('cleanupOldDownloads is called on app startup', () => {
    const source = readFile('../../contexts/AppContext.tsx');
    expect(source).toContain('cleanupOldDownloads');
    // Called for both languages
    expect(source).toContain("cleanupOldDownloads(progress.readingHistory, progress.completedSnippets, 'en')");
    expect(source).toContain("cleanupOldDownloads(progress.readingHistory, progress.completedSnippets, 'hi')");
  });

  it('cleanupOldDownloads is called after marking complete', () => {
    const source = readFile('../../app/reading/[id].tsx');
    const markCompleteBlock = source.slice(
      source.indexOf('handleMarkComplete'),
      source.indexOf('navigateToPrev'),
    );
    expect(markCompleteBlock).toContain('cleanupOldDownloads');
  });

  it('AUTO_REMOVE_DAYS config constant is 7', () => {
    const { CONFIG } = require('@/constants/config');
    expect(CONFIG.AUTO_REMOVE_DAYS).toBe(7);
  });

  it('uses AUTO_REMOVE_DAYS from config (no magic number)', () => {
    const source = readFile('../../utils/downloadStorage.ts');
    expect(source).toContain('CONFIG.AUTO_REMOVE_DAYS');
  });
});

// ── Step 5b: cleanupOldDownloads unit tests ─────────────────────

describe('Step 5b: cleanupOldDownloads logic', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('does nothing when auto-remove is disabled', async () => {
    await AsyncStorage.setItem('@offline_auto_remove', 'false');

    const { cleanupOldDownloads } = require('@/utils/downloadStorage');
    // Should return without touching the index
    await cleanupOldDownloads({ '2025-01-01': [1] }, [1], 'en');

    // Index should not have been read (getItem only called for the toggle)
    const calls = (AsyncStorage.getItem as jest.Mock).mock.calls;
    const indexCalls = calls.filter((c: string[]) => c[0] === '@download_index');
    expect(indexCalls.length).toBe(0);
  });

  it('does nothing when no downloads exist', async () => {
    // auto-remove ON (default - key absent)
    const { cleanupOldDownloads } = require('@/utils/downloadStorage');
    await cleanupOldDownloads({ '2025-01-01': [1] }, [1], 'en');
    // No error thrown, no setItem for index
    const setCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    const indexSaves = setCalls.filter((c: string[]) => c[0] === '@download_index');
    expect(indexSaves.length).toBe(0);
  });
});

// ── Step 6: Settings has only toggles + storage footer ──────────

describe('Step 6: Settings has only toggles + storage footer', () => {
  const source = readFile('../../components/downloads/DownloadManager.tsx');

  it('has no Advanced accordion or Coming Soon alerts', () => {
    expect(source).not.toContain('advancedOpen');
    expect(source).not.toContain('advancedContent');
    expect(source).not.toContain('comingSoon');
    expect(source).not.toContain('chevron-forward');
  });

  it('has exactly two Switch toggles', () => {
    expect((source.match(/<Switch/g) || []).length).toBe(2);
  });

  it('storage footer shows when downloads exist', () => {
    expect(source).toContain('totalStorageUsed > 0');
    expect(source).toContain('storageFooter');
    expect(source).toContain('settings.offline.clearAllButton');
    expect(source).toContain('settings.offline.using');
  });
});

// ── Architecture: Shared download state via context ──────────────

describe('Architecture: Download state is shared via context', () => {
  it('DownloadManagerContext exists and exports provider + hook', () => {
    const source = readFile('../../contexts/DownloadManagerContext.tsx');
    expect(source).toContain('DownloadManagerProvider');
    expect(source).toContain('useDownloadManager');
    expect(source).toContain('createContext');
  });

  it('DownloadManagerProvider is in the provider chain (_layout.tsx)', () => {
    const source = readFile('../../app/_layout.tsx');
    expect(source).toContain('DownloadManagerProvider');
    // Check JSX nesting: AppProvider > DownloadManagerProvider > AudioPlayerProvider
    const jsxSection = source.slice(source.indexOf('return ('));
    const providerIdx = jsxSection.indexOf('<DownloadManagerProvider>');
    const appProviderIdx = jsxSection.indexOf('<AppProvider>');
    const audioProviderIdx = jsxSection.indexOf('<AudioPlayerProvider>');
    expect(providerIdx).toBeGreaterThan(appProviderIdx);
    expect(providerIdx).toBeLessThan(audioProviderIdx);
  });

  it('reading screen imports useDownloadManager from context (not hook)', () => {
    const source = readFile('../../app/reading/[id].tsx');
    expect(source).toContain("from '@/contexts/DownloadManagerContext'");
    expect(source).not.toContain("from '@/hooks/useDownloadManager'");
  });

  it('settings DownloadManager imports from context (not hook)', () => {
    const source = readFile('../../components/downloads/DownloadManager.tsx');
    expect(source).toContain("from '@/contexts/DownloadManagerContext'");
    expect(source).not.toContain("from '@/hooks/useDownloadManager'");
  });

  it('raw hook is not directly imported by any app/component file', () => {
    const fs = require('fs');
    const path = require('path');
    const glob = require('glob');
    const appFiles = glob.sync(path.resolve(__dirname, '../../{app,components}/**/*.{ts,tsx}'));
    for (const file of appFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes("from '@/hooks/useDownloadManager'") || content.includes('from "@/hooks/useDownloadManager"')) {
        const relative = path.relative(path.resolve(__dirname, '../..'), file);
        throw new Error(`${relative} imports directly from hooks/useDownloadManager — must use @/contexts/DownloadManagerContext`);
      }
    }
  });
});

// ── Architecture: Download storage safety ────────────────────────

describe('Architecture: Download storage safety', () => {
  it('File.downloadFileAsync uses idempotent: true (prevents DestinationAlreadyExists)', () => {
    const source = readFile('../../utils/downloadStorage.ts');
    const downloadCalls = source.match(/File\.downloadFileAsync\([^)]+\)/g) || [];
    expect(downloadCalls.length).toBeGreaterThanOrEqual(2); // audio + json
    for (const call of downloadCalls) {
      expect(call).toContain('idempotent: true');
    }
  });

  it('deletes existing files before downloading (Expo Go idempotent workaround)', () => {
    const source = readFile('../../utils/downloadStorage.ts');
    // Pre-delete must happen before downloadFileAsync
    const audioDeleteIdx = source.indexOf('if (audioFile.exists) audioFile.delete()');
    const jsonDeleteIdx = source.indexOf('if (jsonFile.exists) jsonFile.delete()');
    const firstDownloadIdx = source.indexOf('File.downloadFileAsync');
    expect(audioDeleteIdx).toBeGreaterThan(-1);
    expect(jsonDeleteIdx).toBeGreaterThan(-1);
    expect(audioDeleteIdx).toBeLessThan(firstDownloadIdx);
    expect(jsonDeleteIdx).toBeLessThan(firstDownloadIdx);
  });

  it('uses File(dir, name) constructor for safe path joining (no string concat)', () => {
    const source = readFile('../../utils/downloadStorage.ts');
    // Should use getLocalFile which uses new File(dir, name) pattern
    expect(source).toContain('new File(dir,');
    // Should NOT concatenate dir.uri with filename directly
    expect(source).not.toContain('dir.uri}${');
  });

  it('creates parent audio/ directory before language subdir', () => {
    const source = readFile('../../utils/downloadStorage.ts');
    // Parent dir must be created before the language subdir
    const parentCreate = source.indexOf("parentDir.create()");
    const dirCreate = source.indexOf("dir.create()");
    expect(parentCreate).toBeGreaterThan(-1);
    expect(dirCreate).toBeGreaterThan(-1);
    expect(parentCreate).toBeLessThan(dirCreate);
  });

  it('downloadSingleReading uses stateRef for latest state (no stale closure)', () => {
    const source = readFile('../../hooks/useDownloadManager.ts');
    expect(source).toContain('stateRef');
    expect(source).toContain('stateRef.current');
  });

  it('downloadSingleReading logs errors (not silent catch)', () => {
    const source = readFile('../../hooks/useDownloadManager.ts');
    expect(source).toContain("logger.error('downloadSingleReading'");
  });
});

// ── Regression: expo-store-review safety ─────────────────────────

describe('Regression: expo-store-review is safely imported', () => {
  it('no top-level import of expo-store-review anywhere in app/', () => {
    const fs = require('fs');
    const path = require('path');
    const glob = require('glob');
    const appFiles = glob.sync(path.resolve(__dirname, '../../{app,components,contexts,hooks,utils}/**/*.{ts,tsx}'));
    for (const file of appFiles) {
      const content = fs.readFileSync(file, 'utf8');
      // Top-level: import ... from 'expo-store-review' or require('expo-store-review')
      const hasTopLevel = /^import\s+.*from\s+['"]expo-store-review['"]/m.test(content)
        || /(?<!import\()require\(\s*['"]expo-store-review['"]\s*\)/m.test(content);
      if (hasTopLevel) {
        throw new Error(`Top-level import of expo-store-review found in ${path.relative(path.resolve(__dirname, '../..'), file)} — must use dynamic import()`);
      }
    }
  });

  it('dynamic import() of expo-store-review has .catch() handler', () => {
    const source = readFile('../../app/reading/[id].tsx');
    // Find the import('expo-store-review') call and verify it chains .catch()
    const importPattern = /import\(\s*['"]expo-store-review['"]\s*\)\.then\([^)]*\)(?:[\s\S]*?)\.catch\(/;
    expect(importPattern.test(source)).toBe(true);
  });

  it('expo-store-review is only used with dynamic import() (never static)', () => {
    const source = readFile('../../app/reading/[id].tsx');
    const dynamicCount = (source.match(/import\(\s*['"]expo-store-review['"]\s*\)/g) || []).length;
    const staticCount = (source.match(/^import\s+.*from\s+['"]expo-store-review['"]/gm) || []).length;
    expect(dynamicCount).toBeGreaterThan(0);
    expect(staticCount).toBe(0);
  });

  it('store review call is wrapped in try/catch inside .then()', () => {
    const source = readFile('../../app/reading/[id].tsx');
    // The .then() handler should contain a try block
    const thenBlock = source.match(/import\(\s*['"]expo-store-review['"]\s*\)\.then\(async[^{]*\{([\s\S]*?)\}\)\.catch/);
    expect(thenBlock).not.toBeNull();
    expect(thenBlock![1]).toContain('try');
    expect(thenBlock![1]).toContain('catch');
  });
});
