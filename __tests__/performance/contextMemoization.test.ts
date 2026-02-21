/**
 * Context Memoization — Static Analysis Tests
 *
 * Verifies that all context providers properly memoize their values to
 * prevent unnecessary re-renders in consumers. This is a static analysis
 * test that reads source files as strings and checks patterns — no runtime
 * rendering or provider tree mocking required.
 *
 * Rules enforced:
 *   1. Every context file that provides a value must import `useMemo`
 *      (or delegate to a hook that does — e.g. DownloadManagerContext).
 *   2. No context file passes an inline object literal as the context value
 *      (`value={{` pattern is forbidden; `value={variable}` is required).
 *   3. The `useDownloadManager` hook (which backs DownloadManagerContext)
 *      must memoize its return value with `useMemo`.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Context memoization', () => {
  const contextsDir = path.join(__dirname, '../../contexts');

  // Get all context files
  const contextFiles = fs
    .readdirSync(contextsDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => ({
      name: f,
      content: fs.readFileSync(path.join(contextsDir, f), 'utf-8'),
    }));

  // DownloadManagerContext delegates memoization to useDownloadManagerState(),
  // so it legitimately does not need its own useMemo import.
  const DELEGATED_CONTEXTS = ['DownloadManagerContext.tsx'];

  test.each(contextFiles)(
    '$name imports useMemo (or delegates memoization)',
    ({ name, content }) => {
      // Only check files that actually set a context value
      if (!content.includes('value={')) return;

      if (DELEGATED_CONTEXTS.includes(name)) {
        // For delegated contexts, verify the value comes from a hook call
        // (not an inline object), which is checked by the next test.
        return;
      }

      expect(content).toMatch(/useMemo/);
    },
  );

  test.each(contextFiles)(
    '$name does not pass inline objects to context value',
    ({ content }) => {
      const lines = content.split('\n');
      const inlineValueLines = lines.filter(
        (line) => line.includes('value={{') && !line.trim().startsWith('//'),
      );
      expect(inlineValueLines).toEqual([]);
    },
  );

  test('useDownloadManager hook memoizes return value', () => {
    const hookPath = path.join(__dirname, '../../hooks/useDownloadManager.ts');
    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toMatch(/useMemo/);
    // Should have `return useMemo(`, not a bare `return {`
    expect(content).toMatch(/return useMemo/);
  });
});
