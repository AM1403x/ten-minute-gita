/**
 * Verify all auth translation keys exist in both English and Hindi
 */

import { en } from '@/constants/translations/en';
import { hi } from '@/constants/translations/hi';

describe('Auth Translation Keys', () => {
  const authKeys = Object.keys(en).filter(k => k.startsWith('auth.'));

  it('has auth translation keys in English', () => {
    expect(authKeys.length).toBeGreaterThan(0);
  });

  it.each(authKeys)('key "%s" exists in English', (key) => {
    expect((en as Record<string, unknown>)[key]).toBeDefined();
    expect(typeof (en as Record<string, unknown>)[key]).toBe('string');
  });

  it.each(authKeys)('key "%s" exists in Hindi', (key) => {
    expect((hi as Record<string, unknown>)[key]).toBeDefined();
    expect(typeof (hi as Record<string, unknown>)[key]).toBe('string');
  });

  it('English and Hindi have the same set of auth keys', () => {
    const enAuthKeys = Object.keys(en).filter(k => k.startsWith('auth.')).sort();
    const hiAuthKeys = Object.keys(hi).filter(k => k.startsWith('auth.')).sort();
    expect(enAuthKeys).toEqual(hiAuthKeys);
  });

  it('no auth string contains em dash or en dash', () => {
    for (const key of authKeys) {
      const enVal = (en as unknown as Record<string, string>)[key];
      const hiVal = (hi as unknown as Record<string, string>)[key];
      // em dash: \u2014, en dash: \u2013
      expect(enVal).not.toMatch(/[\u2013\u2014]/);
      expect(hiVal).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
