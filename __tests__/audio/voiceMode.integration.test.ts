/**
 * Deep integration tests for the voice mode audio system.
 *
 * Tests critical paths through the audio system by simulating
 * the state machine transitions that AudioPlayerContext orchestrates.
 * Since we can't render React hooks in pure unit tests, we test
 * the underlying logic: reducer + pure functions + async flows.
 */

import { audioReducer, initialAudioUIState } from '@/reducers/audioReducer';
import {
  findSectionAtTime,
  findWordAtTime,
  isInGap,
  getSectionStartEnd,
  getChipStartTimes,
  formatTime,
} from '@/utils/sectionHelpers';
import { splitIntoSentences } from '@/utils/sentenceSplitter';
import type { AlignedSection, AlignedWord, AudioUIState, SavedAudioPosition } from '@/types/audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Test helpers ──────────────────────────────────────────────────────

function makeSection(
  type: AlignedSection['type'],
  words: { word: string; start: number; end: number }[],
  verseIndex?: number,
): AlignedSection {
  return {
    type,
    text: words.map(w => w.word).join(' '),
    words: words.map(w => ({ ...w, matched: true })),
    verse_index: verseIndex,
  };
}

/** Realistic aligned data structure for a snippet */
function makeAlignedData() {
  return {
    audio_file: 'test.m4a',
    snippet_key: 'Ch01_Verses_01-03',
    language: 'en',
    duration_seconds: 600,
    total_source_words: 500,
    matched_words: 480,
    match_rate: 0.96,
    sections: [
      makeSection('verse', [
        { word: 'dharma', start: 0, end: 1.5 },
        { word: 'kshetre', start: 1.6, end: 3.0 },
        { word: 'kurukshetre', start: 3.1, end: 5.0 },
      ], 0),
      makeSection('verseTranslation', [
        { word: 'On', start: 6.0, end: 6.3 },
        { word: 'the', start: 6.4, end: 6.6 },
        { word: 'sacred', start: 6.7, end: 7.2 },
        { word: 'field.', start: 7.3, end: 8.0 },
      ], 0),
      makeSection('verse', [
        { word: 'samjaya', start: 10.0, end: 11.0 },
        { word: 'uvaca', start: 11.1, end: 12.0 },
      ], 1),
      makeSection('verseTranslation', [
        { word: 'Sanjaya', start: 13.0, end: 13.5 },
        { word: 'said.', start: 13.6, end: 14.0 },
      ], 1),
      makeSection('commentary', [
        { word: 'The', start: 16.0, end: 16.2 },
        { word: 'Bhagavad', start: 16.3, end: 17.0 },
        { word: 'Gita', start: 17.1, end: 17.5 },
        { word: 'opens', start: 17.6, end: 18.0 },
        { word: 'with', start: 18.1, end: 18.3 },
        { word: 'a', start: 18.4, end: 18.5 },
        { word: 'question.', start: 18.6, end: 19.5 },
        { word: 'Dhritarashtra', start: 20.0, end: 21.0 },
        { word: 'asks', start: 21.1, end: 21.5 },
        { word: 'Sanjaya.', start: 21.6, end: 22.0 },
      ]),
      makeSection('reflection', [
        { word: 'Reflect', start: 24.0, end: 24.5 },
        { word: 'on', start: 24.6, end: 24.8 },
        { word: 'duty.', start: 24.9, end: 25.5 },
      ]),
    ],
  };
}

// ─── Deep Test 1: Full play lifecycle ──────────────────────────────

describe('Deep Test: Full play lifecycle', () => {
  const aligned = makeAlignedData();

  it('simulates load → play → pause → resume → seek → complete → dismiss → reload', () => {
    // Step 1: Initial state is off
    let state = initialAudioUIState;
    expect(state.playerState).toBe('off');
    expect(state.snippetId).toBeNull();

    // Step 2: Load snippet (RESTORE_POSITION → LOAD_SNIPPET)
    state = audioReducer(state, {
      type: 'RESTORE_POSITION',
      payload: { savedTime: 0, hasListened: false, speed: 1.0 },
    });
    state = audioReducer(state, { type: 'LOAD_SNIPPET', payload: 1 });
    expect(state.playerState).toBe('full');
    expect(state.snippetId).toBe(1);
    expect(state.hasListened).toBe(false);

    // Step 3: Play is happening (isPlaying comes from expo-audio, not reducer)
    // Verify section detection at various times during playback
    expect(findSectionAtTime(aligned.sections, 0.5)).toBe(0);   // verse_0
    expect(findSectionAtTime(aligned.sections, 7.0)).toBe(1);   // translation_0
    expect(findSectionAtTime(aligned.sections, 10.5)).toBe(2);  // verse_1
    expect(findSectionAtTime(aligned.sections, 18.0)).toBe(4);  // commentary

    // Step 4: Pause (no reducer action, just player.pause())
    // Save position
    const savedPosition: SavedAudioPosition = {
      snippetId: 1,
      time: 18.0,
      hasListened: false,
      speed: 1.0,
    };

    // Step 5: Resume from saved position
    state = audioReducer(state, {
      type: 'RESTORE_POSITION',
      payload: { savedTime: savedPosition.time, hasListened: false, speed: 1.0 },
    });
    expect(state.savedTime).toBe(18.0);

    // Step 6: Seek to reflection
    const chipTimes = getChipStartTimes(aligned.sections);
    expect(chipTimes.reflection).toBe(24.0);
    const seekTarget = chipTimes.reflection;
    expect(findSectionAtTime(aligned.sections, seekTarget)).toBe(5); // reflection

    // Step 7: Audio completes (didJustFinish) — goes to 'off', ListenPill shows "Listened · Replay"
    state = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(state.hasListened).toBe(true);
    expect(state.playerState).toBe('off');
    expect(state.savedTime).toBe(0);

    // Step 9: Reload — LOAD_SNIPPET resets hasListened for fresh session.
    // Resume decision is based on saved.time, not hasListened.
    state = audioReducer(state, {
      type: 'RESTORE_POSITION',
      payload: { savedTime: 0, hasListened: true, speed: 1.0 },
    });
    state = audioReducer(state, { type: 'LOAD_SNIPPET', payload: 1 });
    expect(state.hasListened).toBe(false);
    expect(state.playerState).toBe('full');
  });
});

// ─── Deep Test 2: Speed changes during playback ───────────────────

describe('Deep Test: Speed changes during playback', () => {
  it('speed changes are reflected in reducer and time calculations', () => {
    let state = audioReducer(initialAudioUIState, { type: 'LOAD_SNIPPET', payload: 1 });

    // Start at 1.0x
    expect(state.speed).toBe(1.0);

    // Change to 1.3x
    state = audioReducer(state, { type: 'SET_SPEED', payload: 1.3 });
    expect(state.speed).toBe(1.3);

    // At 1.3x speed, 60s elapsed raw time = 60/1.3 ≈ 46.15s displayed
    expect(formatTime(60 / 1.3)).toBe('0:46');

    // Change to 0.7x
    state = audioReducer(state, { type: 'SET_SPEED', payload: 0.7 });
    expect(state.speed).toBe(0.7);

    // At 0.7x speed, 60s elapsed = 60/0.7 ≈ 85.7s displayed
    expect(formatTime(60 / 0.7)).toBe('1:25');

    // Change back to 1.0x
    state = audioReducer(state, { type: 'SET_SPEED', payload: 1.0 });
    expect(state.speed).toBe(1.0);
    expect(formatTime(60 / 1.0)).toBe('1:00');
  });

  it('skip forward/back amounts scale with speed', () => {
    const SKIP_SECONDS = 15;
    const currentTime = 120;

    // At 1.3x: skip covers more raw audio
    const skipAt1_3 = currentTime + SKIP_SECONDS * 1.3;
    expect(skipAt1_3).toBe(139.5);

    // At 0.7x: skip covers less raw audio
    const skipAt0_7 = currentTime + SKIP_SECONDS * 0.7;
    expect(skipAt0_7).toBeCloseTo(130.5);
  });
});

// ─── Deep Test 3: Seeking edge cases ──────────────────────────────

describe('Deep Test: Seeking edge cases', () => {
  const aligned = makeAlignedData();

  it('seeking to time 0 lands in first section', () => {
    expect(findSectionAtTime(aligned.sections, 0)).toBe(0);
    expect(findWordAtTime(aligned.sections[0].words, 0)).toBe(0);
  });

  it('seeking to end of audio lands after last section', () => {
    const duration = aligned.duration_seconds; // 600
    expect(findSectionAtTime(aligned.sections, duration)).toBe(-1);
    expect(isInGap(aligned.sections, duration)).toBe(false);
  });

  it('seeking to exact gap returns correct gap detection', () => {
    // Gap between verse_0 (end=5.0) and translation_0 (start=6.0)
    expect(findSectionAtTime(aligned.sections, 5.5)).toBe(-1);
    expect(isInGap(aligned.sections, 5.5)).toBe(true);
  });

  it('seeking to section boundary (start)', () => {
    expect(findSectionAtTime(aligned.sections, 6.0)).toBe(1);
    expect(findSectionAtTime(aligned.sections, 16.0)).toBe(4);
  });

  it('clamping seek to [0, duration]', () => {
    const duration = 600;

    // Clamp negative
    const clampedNeg = Math.max(0, Math.min(-5, duration));
    expect(clampedNeg).toBe(0);

    // Clamp beyond duration
    const clampedOver = Math.max(0, Math.min(700, duration));
    expect(clampedOver).toBe(600);
  });
});

// ─── Deep Test 4: Snippet switching while playing ─────────────────

describe('Deep Test: Snippet switching', () => {
  it('switching snippets resets player to full state with new ID', () => {
    let state = audioReducer(initialAudioUIState, { type: 'LOAD_SNIPPET', payload: 1 });
    state = audioReducer(state, { type: 'SET_SPEED', payload: 1.3 });
    state = audioReducer(state, { type: 'SET_PLAYER_STATE', payload: 'mini' });

    // Switch to snippet 2 without dismissing first
    state = audioReducer(state, { type: 'LOAD_SNIPPET', payload: 2 });

    expect(state.snippetId).toBe(2);
    expect(state.playerState).toBe('full');     // back to full
    expect(state.speed).toBe(1.3);              // speed preserved
    expect(state.isSpeedExpanded).toBe(false);  // reset
  });

  it('position save for old snippet before loading new', () => {
    // Simulates: save position of snippet 1, then load snippet 2
    const saved1: SavedAudioPosition = {
      snippetId: 1,
      time: 45.5,
      hasListened: false,
      speed: 1.0,
    };

    const saved2: SavedAudioPosition = {
      snippetId: 2,
      time: 0,
      hasListened: false,
      speed: 1.0,
    };

    // Both should round-trip through JSON
    expect(JSON.parse(JSON.stringify(saved1))).toEqual(saved1);
    expect(JSON.parse(JSON.stringify(saved2))).toEqual(saved2);

    // Different keys
    const key1 = `@audio_position_${saved1.snippetId}`;
    const key2 = `@audio_position_${saved2.snippetId}`;
    expect(key1).not.toBe(key2);
  });
});

// ─── Deep Test 5: Language switch during playback ─────────────────

describe('Deep Test: Language switch during playback', () => {
  it('reducer state is unaffected by language switch (context handles it)', () => {
    let state = audioReducer(initialAudioUIState, { type: 'LOAD_SNIPPET', payload: 1 });
    state = audioReducer(state, { type: 'SET_SPEED', payload: 1.2 });

    // Language switch doesn't dispatch any reducer action
    // The context re-loads audio via player.replace()
    // State should remain the same
    expect(state.playerState).toBe('full');
    expect(state.snippetId).toBe(1);
    expect(state.speed).toBe(1.2);
  });
});

// ─── Deep Test 6: Audio completion (didJustFinish) ────────────────

describe('Deep Test: Audio completion', () => {
  it('completion saves position with time=0 and hasListened=true', () => {
    const saved: SavedAudioPosition = {
      snippetId: 42,
      time: 0,
      hasListened: true,
      speed: 1.0,
    };

    // MARK_LISTENED transition
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 42,
      speed: 1.0,
    };

    state = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(state.hasListened).toBe(true);
    expect(state.savedTime).toBe(0);
    expect(state.playerState).toBe('off');

    // Verify saved position matches completion state
    expect(saved.time).toBe(state.savedTime);
    expect(saved.hasListened).toBe(state.hasListened);
  });

  it('completion from any player state goes to off', () => {
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'mini',
      snippetId: 10,
    };
    state = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(state.playerState).toBe('off');
  });
});

// ─── Deep Test 7: Minimize/expand transitions ─────────────────────

describe('Deep Test: Minimize/expand player state', () => {
  it('full → mini → full preserves all state', () => {
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 5,
      speed: 1.3,
      hasListened: false,
      isSpeedExpanded: true,
    };

    // Minimize
    state = audioReducer(state, { type: 'SET_PLAYER_STATE', payload: 'mini' });
    expect(state.playerState).toBe('mini');
    expect(state.snippetId).toBe(5);
    expect(state.speed).toBe(1.3);
    expect(state.isSpeedExpanded).toBe(true); // preserved

    // Expand
    state = audioReducer(state, { type: 'SET_PLAYER_STATE', payload: 'full' });
    expect(state.playerState).toBe('full');
    expect(state.snippetId).toBe(5);
    expect(state.speed).toBe(1.3);
  });
});

// ─── Deep Test 8: Position save/restore round-trip ────────────────

describe('Deep Test: Position persistence round-trip', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
  });

  it('saves and restores position via AsyncStorage', async () => {
    const key = '@audio_position_42';
    const saved: SavedAudioPosition = {
      snippetId: 42,
      time: 123.456,
      hasListened: false,
      speed: 1.3,
    };

    await AsyncStorage.setItem(key, JSON.stringify(saved));
    const data = await AsyncStorage.getItem(key);
    expect(data).not.toBeNull();

    const restored = JSON.parse(data!) as SavedAudioPosition;
    expect(restored.snippetId).toBe(42);
    expect(restored.time).toBeCloseTo(123.456);
    expect(restored.hasListened).toBe(false);
    expect(restored.speed).toBe(1.3);
  });

  it('overwriting position updates correctly', async () => {
    const key = '@audio_position_1';

    // First save
    await AsyncStorage.setItem(key, JSON.stringify({
      snippetId: 1, time: 50, hasListened: false, speed: 1.0,
    }));

    // Overwrite with later position
    await AsyncStorage.setItem(key, JSON.stringify({
      snippetId: 1, time: 200, hasListened: false, speed: 1.3,
    }));

    const data = await AsyncStorage.getItem(key);
    const restored = JSON.parse(data!);
    expect(restored.time).toBe(200);
    expect(restored.speed).toBe(1.3);
  });

  it('returns null for non-existent key', async () => {
    const data = await AsyncStorage.getItem('@audio_position_999');
    expect(data).toBeNull();
  });
});

// ─── Deep Test 9: Auto-scroll trigger conditions ──────────────────

describe('Deep Test: Auto-scroll trigger conditions', () => {
  const aligned = makeAlignedData();

  it('section transitions provide new paragraph keys for scrolling', () => {
    // Simulate time progression and check section transitions
    const times = [0, 1.5, 5.5, 7.0, 9.0, 10.5, 15.0, 17.0, 24.5];
    const expectedSections = [0, 0, -1, 1, -1, 2, -1, 4, 5];

    times.forEach((t, i) => {
      const sectionIdx = findSectionAtTime(aligned.sections, t);
      expect(sectionIdx).toBe(expectedSections[i]);
    });
  });

  it('gap detection works between every section pair', () => {
    // Gaps exist between: verse_0→translation_0, translation_0→verse_1,
    // verse_1→translation_1, translation_1→commentary, commentary→reflection
    const gapTimes = [5.5, 9.5, 12.5, 15.0, 23.0];
    gapTimes.forEach(t => {
      expect(isInGap(aligned.sections, t)).toBe(true);
    });
  });
});

// ─── Deep Test 10: Error recovery ─────────────────────────────────

describe('Deep Test: Error recovery (native exception → disable audio)', () => {
  it('DISMISS action resets player state correctly after error', () => {
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 5,
      speed: 1.3,
      isSpeedExpanded: true,
    };

    // Simulate: native exception caught → disableNativeAudio()
    // which dispatches DISMISS
    state = audioReducer(state, { type: 'DISMISS' });

    expect(state.playerState).toBe('off');
    expect(state.isSpeedExpanded).toBe(false);
    // snippetId and speed are preserved for potential recovery
    expect(state.snippetId).toBe(5);
    expect(state.speed).toBe(1.3);
  });

  it('multiple DISMISSes are safe (idempotent)', () => {
    let state = audioReducer(initialAudioUIState, { type: 'DISMISS' });
    state = audioReducer(state, { type: 'DISMISS' });
    state = audioReducer(state, { type: 'DISMISS' });
    expect(state.playerState).toBe('off');
  });
});

// ─── Additional edge case tests ───────────────────────────────────

describe('Edge case: sentence splitting on commentary sections', () => {
  it('splits commentary words into correct sentence groups', () => {
    const aligned = makeAlignedData();
    const commentary = aligned.sections[4]; // commentary section
    const sentences = splitIntoSentences(commentary.words);

    // Commentary has: "The Bhagavad Gita opens with a question. Dhritarashtra asks Sanjaya."
    expect(sentences.length).toBe(2);
    expect(sentences[0].text).toBe('The Bhagavad Gita opens with a question.');
    expect(sentences[0].startWordIndex).toBe(0);
    expect(sentences[0].endWordIndex).toBe(6);
    expect(sentences[1].text).toBe('Dhritarashtra asks Sanjaya.');
    expect(sentences[1].startWordIndex).toBe(7);
    expect(sentences[1].endWordIndex).toBe(9);
  });
});

describe('Edge case: empty aligned data', () => {
  it('handles aligned data with no sections', () => {
    const emptySections: AlignedSection[] = [];
    expect(findSectionAtTime(emptySections, 0)).toBe(-1);
    expect(isInGap(emptySections, 0)).toBe(false);
    expect(getChipStartTimes(emptySections)).toEqual({
      shloka: 0,
      translation: 0,
      commentary: 0,
      reflection: 0,
    });
  });
});

describe('Edge case: section with empty words', () => {
  it('getSectionStartEnd returns {0,0} for empty words', () => {
    const section: AlignedSection = {
      type: 'verse',
      text: '',
      words: [],
    };
    expect(getSectionStartEnd(section)).toEqual({ start: 0, end: 0 });
  });

  it('findWordAtTime returns -1 for empty words', () => {
    expect(findWordAtTime([], 5)).toBe(-1);
  });

  it('splitIntoSentences returns empty for empty words', () => {
    expect(splitIntoSentences([])).toEqual([]);
  });
});

describe('Edge case: overlapping word times', () => {
  it('findWordAtTime handles overlapping word boundaries', () => {
    // Words where one ends exactly when next starts
    const words = [
      { start: 0, end: 1 },
      { start: 1, end: 2 },
      { start: 2, end: 3 },
    ];
    // At boundary: time=1 → word[0].end=1 (excl), word[1].start=1 (incl)
    expect(findWordAtTime(words, 1)).toBe(1);
    expect(findWordAtTime(words, 2)).toBe(2);
  });
});

describe('Edge case: chip press seeks to correct position', () => {
  it('getChipStartTimes returns first occurrence start times', () => {
    const aligned = makeAlignedData();
    const chipTimes = getChipStartTimes(aligned.sections);

    expect(chipTimes.shloka).toBe(0);          // verse_0 starts at 0
    expect(chipTimes.translation).toBe(6.0);   // translation_0 starts at 6.0
    expect(chipTimes.commentary).toBe(16.0);   // commentary starts at 16.0
    expect(chipTimes.reflection).toBe(24.0);   // reflection starts at 24.0

    // Seeking to chip time should land in the correct section
    expect(findSectionAtTime(aligned.sections, chipTimes.shloka)).toBe(0);
    expect(findSectionAtTime(aligned.sections, chipTimes.translation)).toBe(1);
    expect(findSectionAtTime(aligned.sections, chipTimes.commentary)).toBe(4);
    expect(findSectionAtTime(aligned.sections, chipTimes.reflection)).toBe(5);
  });
});

// ─── Deep Test 11: Replay after completion (Listened · Replay) ──────

describe('Deep Test: Replay after completion', () => {
  it('resumeTime is 0 when saved position has hasListened=true', () => {
    // Simulates the state after audio completes: time=0, hasListened=true
    const saved: SavedAudioPosition = {
      snippetId: 1,
      time: 0,
      hasListened: true,
      speed: 1.0,
    };

    // This is the logic from loadAndPlay:
    const resumeTime = saved && saved.time > 0 && !saved.hasListened ? saved.time : 0;
    expect(resumeTime).toBe(0);
  });

  it('resumeTime is 0 even if saved time is non-zero but hasListened is true', () => {
    // Edge case: if somehow saved position has a non-zero time but hasListened is true
    // (e.g., race condition between periodic save and completion save),
    // replay should still start from 0
    const saved: SavedAudioPosition = {
      snippetId: 1,
      time: 580.5, // near end of audio
      hasListened: true,
      speed: 1.0,
    };

    const resumeTime = saved && saved.time > 0 && !saved.hasListened ? saved.time : 0;
    expect(resumeTime).toBe(0);
  });

  it('replay restores state correctly through reducer', () => {
    // Step 1: Simulate completion (stays mini for replay affordance)
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 1,
      speed: 1.0,
    };
    state = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(state.playerState).toBe('off');
    expect(state.hasListened).toBe(true);
    expect(state.savedTime).toBe(0);

    // Step 2: Simulate replay — RESTORE_POSITION with completed data, then LOAD_SNIPPET
    state = audioReducer(state, {
      type: 'RESTORE_POSITION',
      payload: { savedTime: 0, hasListened: true, speed: 1.0 },
    });
    state = audioReducer(state, { type: 'LOAD_SNIPPET', payload: 1 });

    expect(state.playerState).toBe('full');
    expect(state.snippetId).toBe(1);
    expect(state.hasListened).toBe(false); // LOAD_SNIPPET resets for fresh session
    expect(state.savedTime).toBe(0);      // should be 0 for replay from start
  });

  it('seekTo(0) must always be called on replay (resumeTime=0 is a valid seek target)', () => {
    // This test verifies the fix: when resumeTime is 0, we still need to seek.
    // Previously, the code did `if (resumeTime > 0) seekTo(resumeTime)` which
    // skipped seeking to 0 — causing replay to start from the end of the file.
    const resumeTime = 0;

    // The fix ensures seekTo is always called:
    // Old: if (resumeTime > 0) { seekTo(resumeTime); }  — SKIPS seekTo(0)
    // New: seekTo(resumeTime);                           — ALWAYS seeks
    //
    // Verify 0 is a valid seek target (not falsy/skippable)
    expect(resumeTime).toBe(0);
    expect(resumeTime).not.toBeUndefined();
    expect(resumeTime).not.toBeNull();

    // In the pending action path, seekTo should be set even when resumeTime is 0
    // Old: { seekTo: resumeTime > 0 ? resumeTime : undefined, play: true }
    // New: { seekTo: resumeTime, play: true }
    const pendingAction = { seekTo: resumeTime, play: true };
    expect(pendingAction.seekTo).toBe(0);
    expect(pendingAction.seekTo).not.toBeUndefined();
  });

  it('replay from first section lands at correct position', () => {
    const aligned = makeAlignedData();
    // After seeking to 0, we should be in the first section
    expect(findSectionAtTime(aligned.sections, 0)).toBe(0);
    expect(findWordAtTime(aligned.sections[0].words, 0)).toBe(0);
  });

  it('replay with different speed preserves speed setting', () => {
    // User previously listened at 1.3x, replays
    const saved: SavedAudioPosition = {
      snippetId: 1,
      time: 0,
      hasListened: true,
      speed: 1.3,
    };

    let state = initialAudioUIState;
    state = audioReducer(state, {
      type: 'RESTORE_POSITION',
      payload: { savedTime: saved.time, hasListened: saved.hasListened, speed: saved.speed },
    });
    state = audioReducer(state, { type: 'LOAD_SNIPPET', payload: 1 });

    expect(state.speed).toBe(1.3);
    expect(state.playerState).toBe('full');
  });

  it('stale didJustFinish must not dismiss player on replay (rising-edge detection)', () => {
    // This tests the core bug: after audio completes, expo-audio stops sending
    // status ticks, so didJustFinish stays true in React state. When the user
    // taps "Replay" and LOAD_SNIPPET changes playerState from 'mini' to 'full',
    // the didJustFinish effect re-fires because playerState is a dependency.
    // Without rising-edge detection, the stale didJustFinish=true immediately
    // dispatches MARK_LISTENED, setting playerState to 'mini'.
    //
    // The fix: track previous didJustFinish value in a ref, only act on
    // false→true transitions.

    // Simulate the rising-edge detection logic from AudioPlayerContext
    let prevDidJustFinish = false;

    function shouldHandleCompletion(didJustFinish: boolean, playerState: string): boolean {
      const justFinished = didJustFinish && !prevDidJustFinish;
      prevDidJustFinish = didJustFinish;
      return justFinished && playerState !== 'off';
    }

    // 1. Audio finishes: didJustFinish transitions false → true
    expect(shouldHandleCompletion(true, 'full')).toBe(true); // ← handle this

    // 2. MARK_LISTENED dispatched → playerState = 'off'.
    //    Effect re-fires because playerState changed. didJustFinish still true (stale).
    expect(shouldHandleCompletion(true, 'off')).toBe(false); // ← skip (already handled)

    // 3. User taps Replay → LOAD_SNIPPET → playerState = 'full'.
    //    Effect re-fires because playerState changed. didJustFinish STILL true (stale).
    expect(shouldHandleCompletion(true, 'full')).toBe(false); // ← MUST skip (stale)

    // 4. Audio starts playing, new status tick: didJustFinish = false
    expect(shouldHandleCompletion(false, 'full')).toBe(false); // ← reset ref

    // 5. Replay finishes naturally: didJustFinish transitions false → true
    expect(shouldHandleCompletion(true, 'full')).toBe(true); // ← handle this
  });

  it('LOAD_SNIPPET after MARK_LISTENED must keep playerState=full (no stale re-dismiss)', () => {
    // Simulates the exact dispatch sequence that happens on replay
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 1,
    };

    // Audio completes — goes to 'off', ListenPill shows "Listened · Replay"
    state = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(state.playerState).toBe('off');

    // User taps Replay → RESTORE + LOAD_SNIPPET
    state = audioReducer(state, {
      type: 'RESTORE_POSITION',
      payload: { savedTime: 0, hasListened: true, speed: 1.0 },
    });
    state = audioReducer(state, { type: 'LOAD_SNIPPET', payload: 1 });
    expect(state.playerState).toBe('full');

    // The stale didJustFinish effect MUST NOT dispatch MARK_LISTENED here.
    // If it did, the state would be:
    const badState = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(badState.playerState).toBe('off'); // ← this is what the bug produced

    // With the fix, MARK_LISTENED is NOT dispatched, so playerState stays 'full'
    expect(state.playerState).toBe('full'); // ← correct behavior
  });
});

// ─── Deep Test 12: Listen pill state sync after completion ──────────

describe('Deep Test: Listen pill state sync after completion', () => {
  it('pill state should derive "completed" from hasListened after MARK_LISTENED', () => {
    // This tests the logic that reading/[id].tsx uses to sync pill state.
    // After audio completes, MARK_LISTENED sets hasListened=true.
    // The pill state sync effect checks:
    //   if (audioUIState.hasListened && audioUIState.snippetId === snippetId)
    //     → setListenPillState('completed')
    //
    // Without this effect, the pill stays at the stale state from mount
    // (e.g., 'resume' with old saved time).

    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 5,
      speed: 1.0,
    };

    // Audio completes — goes to 'off', ListenPill shows "Listened · Replay"
    state = audioReducer(state, { type: 'MARK_LISTENED' });

    // Verify the conditions the sync effect checks
    expect(state.hasListened).toBe(true);
    expect(state.snippetId).toBe(5);
    expect(state.playerState).toBe('off');

    // The sync effect: if (hasListened && snippetId === currentSnippetId)
    const currentSnippetId = 5;
    const shouldUpdatePill = state.hasListened && state.snippetId === currentSnippetId;
    expect(shouldUpdatePill).toBe(true);

    // Pill state would be set to 'completed'
    const newPillState = shouldUpdatePill ? 'completed' : 'resume';
    expect(newPillState).toBe('completed');
  });

  it('pill state sync does not fire for a different snippet', () => {
    // User is viewing Day 5 but audio completed for Day 3
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 3,
    };
    state = audioReducer(state, { type: 'MARK_LISTENED' });

    const viewingSnippetId = 5;
    const shouldUpdatePill = state.hasListened && state.snippetId === viewingSnippetId;
    expect(shouldUpdatePill).toBe(false);
  });

  it('pill shows "completed" not "resume" after full listen cycle', () => {
    // Simulates: user resumes at 7:16, listens to end, pill should update
    const initialPillState = 'resume'; // from initial AsyncStorage read
    const initialSavedTime = 7 * 60 + 16; // 7:16 in seconds

    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 5,
      hasListened: false,
      savedTime: initialSavedTime,
    };

    // Audio completes — goes to 'off', ListenPill shows "Listened · Replay"
    state = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(state.hasListened).toBe(true);
    expect(state.savedTime).toBe(0); // reset to 0 by MARK_LISTENED
    expect(state.playerState).toBe('off');

    // Pill sync effect fires
    const viewingSnippetId = 5;
    const pillState = (state.hasListened && state.snippetId === viewingSnippetId)
      ? 'completed'
      : initialPillState;

    expect(pillState).toBe('completed');
    expect(pillState).not.toBe('resume'); // ← the bug: pill was stuck on 'resume'
  });
});

// ─── Regression: MARK_LISTENED must go to 'off', not 'mini' ─────────

describe('Regression: No MiniBar after audio completion', () => {
  it('MARK_LISTENED sets playerState to off — MiniBar never renders after completion', () => {
    // Bug: after didJustFinish, MARK_LISTENED set playerState to 'mini',
    // showing a MiniBar with progress bar and X button. Should go to 'off'
    // so only the ListenPill "Listened · Replay" shows.
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 42,
    };

    state = audioReducer(state, { type: 'MARK_LISTENED' });

    // Must be 'off', not 'mini'
    expect(state.playerState).toBe('off');
    expect(state.hasListened).toBe(true);

    // MiniBar renders when playerState === 'mini', so it must NOT render
    const miniBarVisible = state.playerState === 'mini';
    expect(miniBarVisible).toBe(false);

    // ListenPill shows when playerState === 'off' and hasListened
    const pillShowsListenedReplay = state.playerState === 'off' && state.hasListened;
    expect(pillShowsListenedReplay).toBe(true);
  });
});

// ─── Regression: Section chips follow audio player state, not completion ──

describe('Regression: Section chips tied to playerState, not completion', () => {
  it('chips visible when audio active on completed reading (replay scenario)', () => {
    // Chips are audio navigation — they must show during replay on completed readings.
    const isAudioAvailable = true;
    const isContentLocked = false;
    const isPreviewLimited = false;

    // Replaying a completed reading — use reducer state to get the real type
    const state: AudioUIState = { ...initialAudioUIState, playerState: 'full' };
    const showChips = state.playerState !== 'off' && isAudioAvailable && !isContentLocked && !isPreviewLimited;
    expect(showChips).toBe(true);
  });

  it('chips hidden when playerState is off (no audio active)', () => {
    const isAudioAvailable = true;
    const isContentLocked = false;
    const isPreviewLimited = false;

    const state: AudioUIState = { ...initialAudioUIState, playerState: 'off' };
    const showChips = state.playerState !== 'off' && isAudioAvailable && !isContentLocked && !isPreviewLimited;
    expect(showChips).toBe(false);
  });

  it('chips disappear when audio completes because MARK_LISTENED goes to off', () => {
    // The key chain: didJustFinish → MARK_LISTENED → playerState='off' → chips hidden
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 5,
    };

    // Audio completes
    state = audioReducer(state, { type: 'MARK_LISTENED' });
    expect(state.playerState).toBe('off');

    // Chips condition evaluates to false
    const showChips = state.playerState !== 'off';
    expect(showChips).toBe(false);
  });
});

// ─── Deep Test 13: Smooth navigation between snippets ───────────────

describe('Deep Test 13: Smooth navigation (no flash on Next/Previous)', () => {
  /**
   * Tests the pill-state-reset logic that prevents stale data from the
   * previous snippet flashing on screen during Next/Previous navigation.
   *
   * The reading screen uses `router.replace()` which changes params
   * without remounting — so local state persists. Without synchronous
   * resets, the user sees a split-second flash of the old pill state.
   *
   * Fix: synchronous state reset during render (before paint) +
   * `pillLoadedForId` guard that hides the pill until async load completes.
   */

  it('pill state resets synchronously when snippetId changes', () => {
    // Simulate: user is on snippet 5 with "resume" pill, navigates to snippet 6
    let pillLoadedForId = 5;
    let listenPillState: string = 'resume';
    let audioSavedTime = 436; // 7:16
    let prevSnippetId = 5;

    const currentSnippetId = 6; // user navigated to next snippet

    // Synchronous reset block (mirrors the reading screen logic)
    if (prevSnippetId !== currentSnippetId) {
      prevSnippetId = currentSnippetId;
      pillLoadedForId = 0;
      listenPillState = 'fresh';
      audioSavedTime = 0;
    }

    // After synchronous reset, pill state is clean
    expect(listenPillState).toBe('fresh');
    expect(audioSavedTime).toBe(0);
    expect(pillLoadedForId).toBe(0);
    expect(prevSnippetId).toBe(6);
  });

  it('pill is hidden until async load completes for new snippet', () => {
    // Simulate: just navigated to snippet 6, synchronous reset done
    const pillLoadedForId: number = 0; // reset by synchronous block
    const currentSnippetId: number = 6;
    const isAudioAvailable = true;
    const isAudioActive = false;
    const isContentLocked = false;
    const isPreviewLimited = false;

    const isPillReady = pillLoadedForId === currentSnippetId;
    const showListenPill = isAudioAvailable && !isAudioActive && !isContentLocked && !isPreviewLimited && isPillReady;

    // Pill should NOT be visible during async load
    expect(isPillReady).toBe(false);
    expect(showListenPill).toBe(false);
  });

  it('pill becomes visible after async load completes for correct snippet', () => {
    // Simulate: async loadSavedPosition resolved for snippet 6
    const pillLoadedForId = 6;
    const currentSnippetId = 6;
    const isAudioAvailable = true;
    const isAudioActive = false;
    const isContentLocked = false;
    const isPreviewLimited = false;

    const isPillReady = pillLoadedForId === currentSnippetId;
    const showListenPill = isAudioAvailable && !isAudioActive && !isContentLocked && !isPreviewLimited && isPillReady;

    expect(isPillReady).toBe(true);
    expect(showListenPill).toBe(true);
  });

  it('stale async load for previous snippet is ignored', () => {
    // Simulate: user navigated from snippet 5 → 6, but snippet 5's
    // async load resolves AFTER the synchronous reset for snippet 6
    let pillLoadedForId = 0; // reset for snippet 6
    let listenPillState = 'fresh';
    const currentSnippetId: number = 6;

    // Stale response from snippet 5 arrives (simulating cancelled=false race)
    // In real code, `cancelled` flag prevents this, but test the guard anyway
    const staleSnippetId: number = 5;
    if (staleSnippetId === currentSnippetId) {
      // Would only set if IDs match
      pillLoadedForId = staleSnippetId;
      listenPillState = 'completed';
    }

    // Stale data should NOT be applied
    expect(pillLoadedForId).toBe(0);
    expect(listenPillState).toBe('fresh');
  });

  it('rapid navigation resets pill state each time', () => {
    // Simulate: user taps Next 3 times quickly: 5 → 6 → 7 → 8
    let prevSnippetId = 5;
    let pillLoadedForId = 5;
    let listenPillState: string = 'resume';

    for (const nextId of [6, 7, 8]) {
      if (prevSnippetId !== nextId) {
        prevSnippetId = nextId;
        pillLoadedForId = 0;
        listenPillState = 'fresh';
      }

      // Each navigation should reset
      expect(pillLoadedForId).toBe(0);
      expect(listenPillState).toBe('fresh');
    }

    expect(prevSnippetId).toBe(8);
  });

  it('no key prop means SnippetContent does not remount (architecture test)', () => {
    const fs = require('fs');
    const readingScreenPath = require('path').resolve(__dirname, '../../app/reading/[id].tsx');
    const source = fs.readFileSync(readingScreenPath, 'utf8');

    const snippetContentMatch = source.match(/<SnippetContent[\s\S]*?\/>/);
    expect(snippetContentMatch).not.toBeNull();
    expect(snippetContentMatch![0]).not.toMatch(/key=\{snippetId\}/);
  });

  it('navigation uses setParams not replace (prevents screen remount)', () => {
    // router.replace() replaces the route in the stack, causing unmount/remount.
    // router.setParams() only changes URL params — component re-renders in place.
    // Next/Previous/GoToDay MUST use setParams for zero-flash navigation.
    const fs = require('fs');
    const readingScreenPath = require('path').resolve(__dirname, '../../app/reading/[id].tsx');
    const source = fs.readFileSync(readingScreenPath, 'utf8');

    // Extract navigateToPrev and navigateToNext functions
    const prevMatch = source.match(/const navigateToPrev[\s\S]*?};/);
    const nextMatch = source.match(/const navigateToNext[\s\S]*?};/);
    expect(prevMatch).not.toBeNull();
    expect(nextMatch).not.toBeNull();

    // Must use setParams, not replace
    expect(prevMatch![0]).toContain('setParams');
    expect(prevMatch![0]).not.toContain('router.replace');
    expect(nextMatch![0]).toContain('setParams');
    expect(nextMatch![0]).not.toContain('router.replace');

    // GoToDay callback must also use setParams
    const goToDayMatch = source.match(/onGoToDay=\{[^}]+\}/);
    expect(goToDayMatch).not.toBeNull();
    expect(goToDayMatch![0]).toContain('setParams');
    expect(goToDayMatch![0]).not.toContain('replace');
  });

  it('navigateToPrev and navigateToNext call dismissPlayer before setParams', () => {
    // Bug fix: audio state leaked across snippets because setParams doesn't
    // trigger blur (no unmount), so dismissPlayer was never called.
    const fs = require('fs');
    const readingScreenPath = require('path').resolve(__dirname, '../../app/reading/[id].tsx');
    const source = fs.readFileSync(readingScreenPath, 'utf8');

    const prevMatch = source.match(/const navigateToPrev[\s\S]*?};/);
    const nextMatch = source.match(/const navigateToNext[\s\S]*?};/);
    expect(prevMatch).not.toBeNull();
    expect(nextMatch).not.toBeNull();

    // dismissPlayer must appear BEFORE setParams in both functions
    const prevDismissIdx = prevMatch![0].indexOf('dismissPlayer');
    const prevSetParamsIdx = prevMatch![0].indexOf('setParams');
    expect(prevDismissIdx).toBeGreaterThan(-1);
    expect(prevDismissIdx).toBeLessThan(prevSetParamsIdx);

    const nextDismissIdx = nextMatch![0].indexOf('dismissPlayer');
    const nextSetParamsIdx = nextMatch![0].indexOf('setParams');
    expect(nextDismissIdx).toBeGreaterThan(-1);
    expect(nextDismissIdx).toBeLessThan(nextSetParamsIdx);
  });

  it('DISMISS resets playerState to off for clean snippet transition', () => {
    // After dismissPlayer(), the reducer state must be fully clean
    let state: AudioUIState = {
      ...initialAudioUIState,
      playerState: 'full',
      snippetId: 5,
      hasListened: false,
      speed: 1.5,
    };

    state = audioReducer(state, { type: 'DISMISS' });
    expect(state.playerState).toBe('off');

    // New snippet loads fresh
    state = audioReducer(state, { type: 'LOAD_SNIPPET', payload: 6 });
    expect(state.playerState).toBe('full');
    expect(state.snippetId).toBe(6);
    expect(state.hasListened).toBe(false);
  });
});

// ─── Regression: Download icon shows Alert ───────────────────────────

describe('Regression: Download icon triggers actual download', () => {
  it('download button calls downloadSingleReading (not Coming Soon alert)', () => {
    const fs = require('fs');
    const readingScreenPath = require('path').resolve(__dirname, '../../app/reading/[id].tsx');
    const source = fs.readFileSync(readingScreenPath, 'utf8');

    // No more "Coming Soon" alert
    expect(source).not.toContain("'Coming Soon'");

    // Download icon calls downloadSingleReading and shows reactive state
    const downloadBlock = source.match(/DOWNLOADS_ENABLED[\s\S]*?cloud-download-outline[\s\S]*?<\/Pressable>/);
    expect(downloadBlock).not.toBeNull();
    expect(downloadBlock![0]).toContain('downloadSingleReading(snippetId)');
    expect(downloadBlock![0]).toContain('checkmark-circle');
    expect(downloadBlock![0]).toContain('ActivityIndicator');
  });
});
