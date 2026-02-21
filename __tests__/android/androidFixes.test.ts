/**
 * Android Fixes Regression Tests
 *
 * Verifies that Android-specific fixes from the ANDROID_FIX_PLAN.md
 * are correctly implemented and won't regress.
 */
import fs from 'fs';
import path from 'path';

// ── 1. Font constants ──────────────────────────────────────────────

describe('Font constants (constants/fonts.ts)', () => {
  // We need to test with different Platform.OS values, so we isolate imports.

  afterEach(() => {
    jest.resetModules();
  });

  it('FONTS.serif returns a string', () => {
    const { FONTS } = require('@/constants/fonts');
    expect(typeof FONTS.serif).toBe('string');
    expect(FONTS.serif.length).toBeGreaterThan(0);
  });

  it('FONTS.devanagari returns a string', () => {
    const { FONTS } = require('@/constants/fonts');
    expect(typeof FONTS.devanagari).toBe('string');
    expect(FONTS.devanagari.length).toBeGreaterThan(0);
  });

  it('FONTS.serifItalic returns a string', () => {
    const { FONTS } = require('@/constants/fonts');
    expect(typeof FONTS.serifItalic).toBe('string');
  });

  it('FONTS.serifBold returns a string', () => {
    const { FONTS } = require('@/constants/fonts');
    expect(typeof FONTS.serifBold).toBe('string');
  });

  it('FONTS.devanagariBold returns a string', () => {
    const { FONTS } = require('@/constants/fonts');
    expect(typeof FONTS.devanagariBold).toBe('string');
  });

  it('letterSpacingStyle(2) returns object with letterSpacing: 2', () => {
    const { letterSpacingStyle } = require('@/constants/fonts');
    const result = letterSpacingStyle(2);
    expect(result).toHaveProperty('letterSpacing', 2);
  });

  it('letterSpacingStyle(1) returns object with letterSpacing: 1', () => {
    const { letterSpacingStyle } = require('@/constants/fonts');
    const result = letterSpacingStyle(1);
    expect(result).toHaveProperty('letterSpacing', 1);
  });

  it('letterSpacingStyle returns an object (not undefined or null)', () => {
    const { letterSpacingStyle } = require('@/constants/fonts');
    const result = letterSpacingStyle(0.5);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.letterSpacing).toBe(0.5);
  });
});

// ── 2. Config constants ─────────────────────────────────────────────

describe('Config constants (constants/config.ts)', () => {
  it('CONFIG.PLAY_STORE_URL exists and contains play.google.com', () => {
    const { CONFIG } = require('@/constants/config');
    expect(CONFIG.PLAY_STORE_URL).toBeDefined();
    expect(typeof CONFIG.PLAY_STORE_URL).toBe('string');
    expect(CONFIG.PLAY_STORE_URL).toContain('play.google.com');
  });

  it('CONFIG.PLAY_STORE_URL contains the correct package name', () => {
    const { CONFIG } = require('@/constants/config');
    expect(CONFIG.PLAY_STORE_URL).toContain('com.tenminutegita.app');
  });

  it('CONFIG.APP_STORE_URL exists and contains apple.com', () => {
    const { CONFIG } = require('@/constants/config');
    expect(CONFIG.APP_STORE_URL).toBeDefined();
    expect(CONFIG.APP_STORE_URL).toContain('apple.com');
  });

  it('CONFIG.SWIPE_ACTIVE_OFFSET_X is a number > 0', () => {
    const { CONFIG } = require('@/constants/config');
    expect(typeof CONFIG.SWIPE_ACTIVE_OFFSET_X).toBe('number');
    expect(CONFIG.SWIPE_ACTIVE_OFFSET_X).toBeGreaterThan(0);
  });

  it('app.json has android.versionCode', () => {
    const appJson = require('../../app.json');
    expect(appJson.expo.android.versionCode).toBeDefined();
    expect(typeof appJson.expo.android.versionCode).toBe('number');
    expect(appJson.expo.android.versionCode).toBeGreaterThanOrEqual(1);
  });

  it('app.json has android.playStoreUrl', () => {
    const appJson = require('../../app.json');
    expect(appJson.expo.android.playStoreUrl).toBeDefined();
    expect(appJson.expo.android.playStoreUrl).toContain('play.google.com');
  });
});

// ── 3. Rate App store URL logic ─────────────────────────────────────

describe('Rate App store URL logic', () => {
  it('SupportSection.tsx contains android-specific market:// URL', () => {
    const filePath = path.resolve(__dirname, '../../components/settings/SupportSection.tsx');
    const source = fs.readFileSync(filePath, 'utf8');
    // Verify the Platform.select block has an explicit 'android' key with market:// URL
    expect(source).toContain('market://details?id=com.tenminutegita.app');
  });

  it('SupportSection.tsx fallback uses PLAY_STORE_URL for Android', () => {
    const filePath = path.resolve(__dirname, '../../components/settings/SupportSection.tsx');
    const source = fs.readFileSync(filePath, 'utf8');
    // The fallback catch block should check Platform.OS for the right store URL
    expect(source).toContain('CONFIG.PLAY_STORE_URL');
  });

  it('SupportSection.tsx does NOT use APP_STORE_URL as the default fallback for android', () => {
    const filePath = path.resolve(__dirname, '../../components/settings/SupportSection.tsx');
    const source = fs.readFileSync(filePath, 'utf8');
    // Should NOT have `default: CONFIG.APP_STORE_URL` as the android: key in Platform.select
    // The android key should use market:// URL, not CONFIG.APP_STORE_URL
    expect(source).toMatch(/android:\s*[`'"]market:\/\//);
  });
});

// ── 4. Auth modal back handler ──────────────────────────────────────

describe('Auth modal back handler (AuthSheet.tsx)', () => {
  it('onRequestClose is never undefined when dismissible=false', () => {
    const filePath = path.resolve(__dirname, '../../components/auth/AuthSheet.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    // Find the onRequestClose prop on the Modal — handle nested braces like () => {}
    const onRequestCloseMatch = source.match(/onRequestClose=\{(.+?\})\}/);
    expect(onRequestCloseMatch).toBeTruthy();

    const expression = onRequestCloseMatch![1];
    // When dismissible is false, it should use () => {} not undefined
    // The pattern should be: dismissible ? handleDismiss : () => {}
    expect(expression).not.toContain('undefined');
    expect(expression).toContain('() => {}');
  });

  it('AuthSheet uses platform-specific paddingBottom', () => {
    const filePath = path.resolve(__dirname, '../../components/auth/AuthSheet.tsx');
    const source = fs.readFileSync(filePath, 'utf8');
    // Should have Platform.OS check for paddingBottom instead of hardcoded 44
    expect(source).toMatch(/paddingBottom:\s*Platform\.OS\s*===\s*['"]ios['"]/);
  });
});

// ── 5. Console.log audit ────────────────────────────────────────────

describe('Console.log audit', () => {
  it('contexts/AudioPlayerContext.tsx has no bare console.log calls', () => {
    const filePath = path.resolve(__dirname, '../../contexts/AudioPlayerContext.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    // Split into lines and check each for bare console.log (not inside comments)
    const lines = source.split('\n');
    const consoleLogLines = lines.filter((line, idx) => {
      const trimmed = line.trim();
      // Skip comment lines
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
      return /\bconsole\.(log|warn|error)\b/.test(line);
    });

    expect(consoleLogLines).toEqual([]);
  });

  it('app/reading/[id].tsx has no bare console.log calls', () => {
    const filePath = path.resolve(__dirname, '../../app/reading/[id].tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    const lines = source.split('\n');
    const consoleLogLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
      return /\bconsole\.(log|warn|error)\b/.test(line);
    });

    expect(consoleLogLines).toEqual([]);
  });
});

// ── 6. CDN fetch timeout ────────────────────────────────────────────

describe('CDN fetch timeout (utils/audioSource.ts)', () => {
  it('contains AbortController usage for fetch timeout', () => {
    const filePath = path.resolve(__dirname, '../../utils/audioSource.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('AbortController');
  });

  it('uses signal option in fetch call', () => {
    const filePath = path.resolve(__dirname, '../../utils/audioSource.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('signal: controller.signal');
  });

  it('has a setTimeout to abort the controller', () => {
    const filePath = path.resolve(__dirname, '../../utils/audioSource.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    // Should have a timeout that calls controller.abort()
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*controller\.abort\(\)/);
  });

  it('clears the timeout after fetch completes', () => {
    const filePath = path.resolve(__dirname, '../../utils/audioSource.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('clearTimeout(timeoutId)');
  });
});

// ── 7. No remaining Georgia/System fontFamily ───────────────────────

describe('Font migration completeness', () => {
  const componentDirs = [
    'components',
    'app',
  ];

  it('no remaining fontFamily: "Georgia" in components or app directories', () => {
    const rootDir = path.resolve(__dirname, '../..');
    let violations: string[] = [];

    for (const dir of componentDirs) {
      const fullDir = path.join(rootDir, dir);
      if (!fs.existsSync(fullDir)) continue;
      scanForPattern(fullDir, /fontFamily:\s*['"]Georgia['"]/, violations);
    }

    expect(violations).toEqual([]);
  });

  it('no remaining fontFamily: "System" in components or app directories', () => {
    const rootDir = path.resolve(__dirname, '../..');
    let violations: string[] = [];

    for (const dir of componentDirs) {
      const fullDir = path.join(rootDir, dir);
      if (!fs.existsSync(fullDir)) continue;
      scanForPattern(fullDir, /fontFamily:\s*['"]System['"]/, violations);
    }

    expect(violations).toEqual([]);
  });
});

// ── 8. BackHandler integration ──────────────────────────────────────

describe('BackHandler integration', () => {
  it('app/reading/[id].tsx imports BackHandler', () => {
    const filePath = path.resolve(__dirname, '../../app/reading/[id].tsx');
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('BackHandler');
  });

  it('app/reading/[id].tsx imports Platform', () => {
    const filePath = path.resolve(__dirname, '../../app/reading/[id].tsx');
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toMatch(/import\s*\{[^}]*Platform[^}]*\}\s*from\s*['"]react-native['"]/);
  });

  it('app/(tabs)/_layout.tsx has BackHandler for exit guard', () => {
    const filePath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('BackHandler');
    expect(source).toContain('hardwareBackPress');
  });
});

// ── 9. letterSpacing helper usage ───────────────────────────────────

describe('letterSpacing helper usage', () => {
  it('no remaining bare letterSpacing in component files (outside fonts.ts)', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const violations: string[] = [];

    // Check the specific files that were listed in the fix plan
    const filesToCheck = [
      'components/SnippetContent.tsx',
      'components/TodayCard.tsx',
      'components/ReflectionTeaser.tsx',
      'components/settings/SupportSection.tsx',
      'components/settings/ReadingPreferences.tsx',
      'components/settings/AppearanceSettings.tsx',
      'components/settings/DevTools.tsx',
      'components/settings/NotificationSettings.tsx',
      'components/downloads/DownloadManager.tsx',
      'app/auth/login.tsx',
      'app/completed-readings.tsx',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const source = fs.readFileSync(fullPath, 'utf8');
      // Look for bare letterSpacing: <number> that is NOT inside a spread
      // The pattern `letterSpacing:` should only appear via `...letterSpacingStyle()`
      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match bare `letterSpacing: <number>` but not inside a function definition
        if (/letterSpacing:\s*[\d.]/.test(line) && !line.includes('letterSpacingStyle')) {
          violations.push(`${relPath}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// ── Helper: recursively scan directory for pattern ──────────────────

function scanForPattern(dir: string, pattern: RegExp, violations: string[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, __tests__, etc.
      if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === '.git') continue;
      scanForPattern(fullPath, pattern, violations);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      // Skip the fonts.ts file itself (it defines the replacements)
      if (entry.name === 'fonts.ts') continue;
      const source = fs.readFileSync(fullPath, 'utf8');
      if (pattern.test(source)) {
        violations.push(fullPath);
      }
    }
  }
}
