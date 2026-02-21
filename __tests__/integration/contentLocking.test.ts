/**
 * Content locking logic tests.
 * The reading screen determines content access based on:
 * - completedSnippets (REVIEW mode)
 * - currentSnippet match (CURRENT)
 * - snippetId > currentSnippet (FUTURE_DAY locked)
 *
 * These tests replicate the logic from reading/[id].tsx to verify correctness.
 */

import { getDateString } from '@/utils/storage';

// Replicate the content locking logic from reading/[id].tsx
function getContentState(params: {
  snippetId: number;
  completedSnippets: number[];
  currentSnippet: number;
  readingHistory: Record<string, number[]>;
  today: string;
}) {
  const { snippetId, completedSnippets, currentSnippet, readingHistory, today } = params;

  const isCompleted = completedSnippets.includes(snippetId);
  const isNextToRead = snippetId === currentSnippet;

  const isReviewMode = isCompleted;
  const canMarkComplete = isNextToRead && !isCompleted;
  const isNextDay = false;
  const isFutureDay = snippetId > currentSnippet && !isCompleted;
  const isContentLocked = isFutureDay;
  const isPreviewLimited = false;

  return {
    isReviewMode,
    canMarkComplete,
    isNextDay,
    isFutureDay,
    isContentLocked,
    isPreviewLimited,
  };
}

describe('Content locking logic', () => {
  const today = getDateString();

  it('today\'s reading — can mark complete', () => {
    const result = getContentState({
      snippetId: 5,
      completedSnippets: [1, 2, 3, 4],
      currentSnippet: 5,
      readingHistory: {},
      today,
    });

    expect(result.canMarkComplete).toBe(true);
    expect(result.isReviewMode).toBe(false);
    expect(result.isContentLocked).toBe(false);
    expect(result.isPreviewLimited).toBe(false);
  });

  it('already completed reading — review mode', () => {
    const result = getContentState({
      snippetId: 3,
      completedSnippets: [1, 2, 3, 4],
      currentSnippet: 5,
      readingHistory: {},
      today,
    });

    expect(result.isReviewMode).toBe(true);
    expect(result.canMarkComplete).toBe(false);
    expect(result.isContentLocked).toBe(false);
  });

  it('next reading after completing today — can mark complete (soft nudge)', () => {
    const result = getContentState({
      snippetId: 6,
      completedSnippets: [1, 2, 3, 4, 5],
      currentSnippet: 6,
      readingHistory: { [today]: [5] },
      today,
    });

    expect(result.isNextDay).toBe(false);
    expect(result.isPreviewLimited).toBe(false);
    expect(result.canMarkComplete).toBe(true);
  });

  it('future day — locked', () => {
    const result = getContentState({
      snippetId: 10,
      completedSnippets: [1, 2, 3],
      currentSnippet: 4,
      readingHistory: {},
      today,
    });

    expect(result.isFutureDay).toBe(true);
    expect(result.isContentLocked).toBe(true);
    expect(result.canMarkComplete).toBe(false);
  });

  it('day 1 fresh start — can mark complete', () => {
    const result = getContentState({
      snippetId: 1,
      completedSnippets: [],
      currentSnippet: 1,
      readingHistory: {},
      today,
    });

    expect(result.canMarkComplete).toBe(true);
    expect(result.isReviewMode).toBe(false);
    expect(result.isContentLocked).toBe(false);
  });

  it('last day (239) — can mark complete if current', () => {
    const allExcept239 = Array.from({ length: 238 }, (_, i) => i + 1);
    const result = getContentState({
      snippetId: 239,
      completedSnippets: allExcept239,
      currentSnippet: 239,
      readingHistory: {},
      today,
    });

    expect(result.canMarkComplete).toBe(true);
  });

  it('cannot re-complete already completed day', () => {
    const result = getContentState({
      snippetId: 5,
      completedSnippets: [1, 2, 3, 4, 5],
      currentSnippet: 6,
      readingHistory: { [today]: [5] },
      today,
    });

    expect(result.canMarkComplete).toBe(false);
    expect(result.isReviewMode).toBe(true);
  });

  it('reading after already read today — can mark complete (no daily gate)', () => {
    const result = getContentState({
      snippetId: 5,
      completedSnippets: [1, 2, 3, 4],
      currentSnippet: 5,
      readingHistory: { [today]: [4] },
      today,
    });

    expect(result.canMarkComplete).toBe(true);
    expect(result.isPreviewLimited).toBe(false);
  });

  it('can complete multiple readings in one day', () => {
    const result = getContentState({
      snippetId: 6,
      completedSnippets: [1, 2, 3, 4, 5],
      currentSnippet: 6,
      readingHistory: { [today]: [5] },
      today,
    });
    expect(result.canMarkComplete).toBe(true);
    expect(result.isContentLocked).toBe(false);
    expect(result.isPreviewLimited).toBe(false);
  });

  it('content two readings ahead stays locked', () => {
    const result = getContentState({
      snippetId: 7,
      completedSnippets: [1, 2, 3, 4, 5],
      currentSnippet: 6,
      readingHistory: { [today]: [5] },
      today,
    });
    expect(result.isFutureDay).toBe(true);
    expect(result.isContentLocked).toBe(true);
    expect(result.canMarkComplete).toBe(false);
  });
});
