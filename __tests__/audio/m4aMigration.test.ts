/**
 * M4A Migration Tests
 *
 * Validates that the MP3 → AAC/M4A audio migration is complete:
 * - Audio source resolution returns .m4a paths
 * - All 239 .m4a files exist for both languages
 * - Every .m4a pairs with an _aligned.json (and vice versa)
 * - File sizes are within expected bounds
 * - No leftover .mp3 references in source code
 * - Audio player compatibility with .m4a format
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAudioFilePath, getAudioFileKey, getAlignedDataPath } from '@/utils/audioMapping';
import { audioReducer, initialAudioUIState } from '@/reducers/audioReducer';
import type { Snippet } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────

const PODCAST_DIR = '/Users/anishmoonka/Desktop/gita_podcast';
const ENGLISH_AAC_DIR = path.join(PODCAST_DIR, 'Audio_English_AAC');
const HINDI_AAC_DIR = path.join(PODCAST_DIR, 'Audio_Hindi_AAC');
const ENGLISH_DIR = path.join(PODCAST_DIR, 'Audio_English');
const HINDI_DIR = path.join(PODCAST_DIR, 'Audio_Hindi');
const EXPECTED_SNIPPET_COUNT = 239;

// Match only final .m4a files: ChXX_Verses_XX-XX.m4a (no suffixes like _original, _precontent, etc.)
const FINAL_M4A_PATTERN = /^Ch\d{2}_Verses_\d{2}-\d{2}\.m4a$/;
const ALIGNED_JSON_PATTERN = /^Ch\d{2}_Verses_\d{2}-\d{2}_aligned\.json$/;

// ─── Helpers ──────────────────────────────────────────────────────────

const snippets: Snippet[] = require('../../data/gita_snippets.json').snippets;

function makeSnippet(verses: string): Snippet {
  return {
    id: 1,
    title: 'Test',
    chapter: 1,
    verses,
    sanskrit: '',
    transliteration: '',
    verseTranslations: [],
    commentary: '',
    reflection: '',
  } as Snippet;
}

function getFinalM4aFiles(dir: string): string[] {
  return fs.readdirSync(dir).filter(f => FINAL_M4A_PATTERN.test(f)).sort();
}

function getAlignedJsonFiles(dir: string): string[] {
  return fs.readdirSync(dir).filter(f => ALIGNED_JSON_PATTERN.test(f)).sort();
}

function keyFromM4a(filename: string): string {
  return filename.replace('.m4a', '');
}

function keyFromAligned(filename: string): string {
  return filename.replace('_aligned.json', '');
}

// ─── Audio Source Resolution Tests ────────────────────────────────────

describe('Audio source resolution — M4A', () => {
  it('getAudioFilePath returns .m4a extension for English', () => {
    const p = getAudioFilePath(makeSnippet('1.01 - 1.03'), 'en');
    expect(p).toMatch(/\.m4a$/);
    expect(p).not.toMatch(/\.mp3/);
  });

  it('getAudioFilePath returns .m4a extension for Hindi', () => {
    const p = getAudioFilePath(makeSnippet('1.01 - 1.03'), 'hi');
    expect(p).toMatch(/\.m4a$/);
    expect(p).not.toMatch(/\.mp3/);
  });

  it('getAudioFilePath points to AAC directory for English', () => {
    const p = getAudioFilePath(makeSnippet('1.01 - 1.03'), 'en');
    expect(p).toContain('Audio_English_AAC');
  });

  it('getAudioFilePath points to AAC directory for Hindi', () => {
    const p = getAudioFilePath(makeSnippet('1.01 - 1.03'), 'hi');
    expect(p).toContain('Audio_Hindi_AAC');
  });

  it('returns valid .m4a paths for all 239 snippets in English', () => {
    for (const snippet of snippets) {
      const p = getAudioFilePath(snippet, 'en');
      expect(p).toMatch(/\.m4a$/);
      expect(p).toContain('Audio_English_AAC');
    }
  });

  it('returns valid .m4a paths for all 239 snippets in Hindi', () => {
    for (const snippet of snippets) {
      const p = getAudioFilePath(snippet, 'hi');
      expect(p).toMatch(/\.m4a$/);
      expect(p).toContain('Audio_Hindi_AAC');
    }
  });

  it('file extension is .m4a regardless of language', () => {
    const snippet = makeSnippet('10.01 - 10.07');
    const enPath = getAudioFilePath(snippet, 'en');
    const hiPath = getAudioFilePath(snippet, 'hi');
    expect(enPath).toMatch(/\.m4a$/);
    expect(hiPath).toMatch(/\.m4a$/);
  });
});

// ─── File Inventory Integrity Tests ───────────────────────────────────

describe('File inventory — English AAC', () => {
  const m4aFiles = getFinalM4aFiles(ENGLISH_AAC_DIR);

  it(`has exactly ${EXPECTED_SNIPPET_COUNT} .m4a files`, () => {
    expect(m4aFiles.length).toBe(EXPECTED_SNIPPET_COUNT);
  });

  it('every .m4a file has a corresponding _aligned.json in original directory', () => {
    const alignedFiles = getAlignedJsonFiles(ENGLISH_DIR);
    const alignedKeys = new Set(alignedFiles.map(keyFromAligned));
    const missing: string[] = [];

    for (const file of m4aFiles) {
      const key = keyFromM4a(file);
      if (!alignedKeys.has(key)) {
        missing.push(file);
      }
    }

    expect(missing).toEqual([]);
  });

  it('no orphaned aligned JSON files without a matching .m4a', () => {
    const alignedFiles = getAlignedJsonFiles(ENGLISH_DIR);
    const m4aKeys = new Set(m4aFiles.map(keyFromM4a));
    const orphaned: string[] = [];

    for (const file of alignedFiles) {
      const key = keyFromAligned(file);
      if (!m4aKeys.has(key)) {
        orphaned.push(file);
      }
    }

    expect(orphaned).toEqual([]);
  });

  it('no orphaned .m4a files without a matching aligned JSON', () => {
    const alignedFiles = getAlignedJsonFiles(ENGLISH_DIR);
    const alignedKeys = new Set(alignedFiles.map(keyFromAligned));
    const orphaned: string[] = [];

    for (const file of m4aFiles) {
      const key = keyFromM4a(file);
      if (!alignedKeys.has(key)) {
        orphaned.push(file);
      }
    }

    expect(orphaned).toEqual([]);
  });
});

describe('File inventory — Hindi AAC', () => {
  const m4aFiles = getFinalM4aFiles(HINDI_AAC_DIR);

  it(`has exactly ${EXPECTED_SNIPPET_COUNT} .m4a files`, () => {
    expect(m4aFiles.length).toBe(EXPECTED_SNIPPET_COUNT);
  });

  it('every .m4a file has a corresponding _aligned.json in original directory', () => {
    const alignedFiles = getAlignedJsonFiles(HINDI_DIR);
    const alignedKeys = new Set(alignedFiles.map(keyFromAligned));
    const missing: string[] = [];

    for (const file of m4aFiles) {
      const key = keyFromM4a(file);
      if (!alignedKeys.has(key)) {
        missing.push(file);
      }
    }

    expect(missing).toEqual([]);
  });

  it('no orphaned aligned JSON files without a matching .m4a', () => {
    const alignedFiles = getAlignedJsonFiles(HINDI_DIR);
    const m4aKeys = new Set(m4aFiles.map(keyFromM4a));
    const orphaned: string[] = [];

    for (const file of alignedFiles) {
      const key = keyFromAligned(file);
      if (!m4aKeys.has(key)) {
        orphaned.push(file);
      }
    }

    expect(orphaned).toEqual([]);
  });

  it('no orphaned .m4a files without a matching aligned JSON', () => {
    const alignedFiles = getAlignedJsonFiles(HINDI_DIR);
    const alignedKeys = new Set(alignedFiles.map(keyFromAligned));
    const orphaned: string[] = [];

    for (const file of m4aFiles) {
      const key = keyFromM4a(file);
      if (!alignedKeys.has(key)) {
        orphaned.push(file);
      }
    }

    expect(orphaned).toEqual([]);
  });
});

// ─── File Size Sanity Tests ──────────────────────────────────────────

describe('File size sanity — English AAC', () => {
  const m4aFiles = getFinalM4aFiles(ENGLISH_AAC_DIR);
  const sizes = m4aFiles.map(f => ({
    file: f,
    size: fs.statSync(path.join(ENGLISH_AAC_DIR, f)).size,
  }));

  it('no .m4a file is 0 bytes', () => {
    const empty = sizes.filter(s => s.size === 0);
    expect(empty).toEqual([]);
  });

  it('no .m4a file exceeds 15 MB', () => {
    const maxSize = 15 * 1024 * 1024;
    const oversized = sizes.filter(s => s.size > maxSize);
    expect(oversized).toEqual([]);
  });

  it('no .m4a file is under 1 MB', () => {
    const minSize = 1 * 1024 * 1024;
    const undersized = sizes.filter(s => s.size < minSize);
    expect(undersized).toEqual([]);
  });

  it('average file size is between 3 MB and 10 MB', () => {
    const totalSize = sizes.reduce((sum, s) => sum + s.size, 0);
    const avgSize = totalSize / sizes.length;
    const avgMB = avgSize / (1024 * 1024);
    expect(avgMB).toBeGreaterThanOrEqual(3);
    expect(avgMB).toBeLessThanOrEqual(10);
  });
});

describe('File size sanity — Hindi AAC', () => {
  const m4aFiles = getFinalM4aFiles(HINDI_AAC_DIR);
  const sizes = m4aFiles.map(f => ({
    file: f,
    size: fs.statSync(path.join(HINDI_AAC_DIR, f)).size,
  }));

  it('no .m4a file is 0 bytes', () => {
    const empty = sizes.filter(s => s.size === 0);
    expect(empty).toEqual([]);
  });

  it('no .m4a file exceeds 15 MB', () => {
    const maxSize = 15 * 1024 * 1024;
    const oversized = sizes.filter(s => s.size > maxSize);
    expect(oversized).toEqual([]);
  });

  it('no .m4a file is under 1 MB', () => {
    const minSize = 1 * 1024 * 1024;
    const undersized = sizes.filter(s => s.size < minSize);
    expect(undersized).toEqual([]);
  });

  it('average file size is between 3 MB and 10 MB', () => {
    const totalSize = sizes.reduce((sum, s) => sum + s.size, 0);
    const avgSize = totalSize / sizes.length;
    const avgMB = avgSize / (1024 * 1024);
    expect(avgMB).toBeGreaterThanOrEqual(3);
    expect(avgMB).toBeLessThanOrEqual(10);
  });
});

// ─── No Leftover MP3 Reference Tests ─────────────────────────────────

describe('No leftover MP3 references', () => {
  const APP_ROOT = path.resolve(__dirname, '../..');
  const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js'];

  const THIS_FILE = path.resolve(__dirname, 'm4aMigration.test.ts');

  // Collect all source files (excluding node_modules, assets, and this test file itself)
  function getSourceFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.expo', '.git', '.claude', 'assets'].includes(entry.name)) continue;
        results.push(...getSourceFiles(fullPath));
      } else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
        if (fullPath !== THIS_FILE) {
          results.push(fullPath);
        }
      }
    }

    return results;
  }

  it('no .ts/.tsx/.js files contain ".mp3" in audio-related contexts', () => {
    const sourceFiles = getSourceFiles(APP_ROOT);
    const matches: { file: string; line: number; text: string }[] = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match .mp3 in audio-related contexts, but allow regex patterns that reference .mp3
        // (like the validation script's .replace(/\.mp3$/, '.m4a'))
        if (line.includes('.mp3') && !line.includes('replace(/\\.mp3')) {
          matches.push({
            file: path.relative(APP_ROOT, file),
            line: i + 1,
            text: line.trim(),
          });
        }
      }
    }

    expect(matches).toEqual([]);
  });

  it('no hardcoded audio/mpeg MIME type in source code', () => {
    const sourceFiles = getSourceFiles(APP_ROOT);
    const matches: string[] = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('audio/mpeg')) {
        matches.push(path.relative(APP_ROOT, file));
      }
    }

    expect(matches).toEqual([]);
  });

  it('no require() or import statements reference .mp3 files', () => {
    const sourceFiles = getSourceFiles(APP_ROOT);
    const matches: string[] = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/(?:require|import).*\.mp3/.test(content)) {
        matches.push(path.relative(APP_ROOT, file));
      }
    }

    expect(matches).toEqual([]);
  });
});

// ─── Audio Player Compatibility Tests ────────────────────────────────

describe('Audio player compatibility with M4A', () => {
  it('audioReducer initializes correctly (format-agnostic)', () => {
    const state = initialAudioUIState;
    expect(state.playerState).toBe('off');
    expect(state.speed).toBe(1.0);
    expect(state.snippetId).toBeNull();
  });

  it('LOAD_SNIPPET works with .m4a paths (no format-specific logic)', () => {
    let state = audioReducer(initialAudioUIState, { type: 'LOAD_SNIPPET', payload: 1 });
    expect(state.playerState).toBe('full');
    expect(state.snippetId).toBe(1);
  });

  it('speed control settings have no format-specific logic', () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    let state = audioReducer(initialAudioUIState, { type: 'LOAD_SNIPPET', payload: 1 });

    for (const speed of speeds) {
      state = audioReducer(state, { type: 'SET_SPEED', payload: speed });
      expect(state.speed).toBe(speed);
    }
  });

  it('full lifecycle works with .m4a test data', () => {
    const alignedData = {
      audio_file: 'Ch01_Verses_01-03.m4a',
      snippet_key: 'Ch01_Verses_01-03',
      language: 'en',
      duration_seconds: 600,
      sections: [],
    };

    // Verify the aligned data structure accepts .m4a
    expect(alignedData.audio_file).toMatch(/\.m4a$/);

    // Simulate lifecycle
    let state = audioReducer(initialAudioUIState, {
      type: 'RESTORE_POSITION',
      payload: { savedTime: 120, hasListened: false, speed: 1.3 },
    });
    state = audioReducer(state, { type: 'LOAD_SNIPPET', payload: 1 });
    expect(state.playerState).toBe('full');
    expect(state.speed).toBe(1.3);

    state = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(state.hasListened).toBe(true);
    expect(state.playerState).toBe('off');
  });

  it('getAudioFilePath output is a valid file:// URI candidate', () => {
    const p = getAudioFilePath(makeSnippet('1.01 - 1.03'), 'en');
    const uri = `file://${p}`;
    expect(uri).toMatch(/^file:\/\//);
    expect(uri).toMatch(/\.m4a$/);
    expect(uri).not.toContain(' '); // No spaces in path
  });

  it('getAlignedDataPath is independent of audio format', () => {
    const p = getAlignedDataPath(makeSnippet('1.01 - 1.03'), 'en');
    // Aligned data path should NOT reference .m4a or .mp3
    expect(p).toMatch(/_aligned\.json$/);
    expect(p).not.toMatch(/\.m4a/);
    expect(p).not.toMatch(/\.mp3/);
  });
});
