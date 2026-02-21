import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { Snippet } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockPlayer: any;
let mockStatus: any;

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => mockStatus,
  setAudioModeAsync: jest.fn(async () => {}),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@/utils/audioSource', () => ({
  audioSource: {
    getAlignedData: jest.fn(async () => ({
      audio_file: 'test.m4a',
      snippet_key: 'test',
      language: 'en',
      duration_seconds: 300,
      total_source_words: 0,
      matched_words: 0,
      match_rate: 0,
      sections: [],
    })),
  },
  resolveAudioSource: jest.fn(async (snippet: { id: number }) => ({ uri: `test://${snippet.id}`, isLocal: true })),
}));

import { AudioPlayerProvider, useAudioPlayerContext } from '@/contexts/AudioPlayerContext';

class FakePlayer {
  playing = false;
  isLoaded = true;
  duration = 0;
  currentTime = 0;
  playbackRate = 1;

  play = jest.fn(() => { this.playing = true; });
  pause = jest.fn(() => { this.playing = false; });
  replace = jest.fn();
  seekTo = jest.fn(async (seconds: number) => { this.currentTime = seconds; });
  setPlaybackRate = jest.fn((rate: number) => { this.playbackRate = rate; });
  setActiveForLockScreen = jest.fn();
}

function makeSnippet(id: number): Snippet {
  return {
    id,
    title: `Day ${id}`,
    chapter: 1,
    verses: '1-1',
    sanskrit: '',
    transliteration: '',
    verseTranslations: [''],
    commentary: '',
    reflection: '',
    shortReflection: '',
  };
}

describe('Audio load gate (generation-gated polling)', () => {
  let ctx: ReturnType<typeof useAudioPlayerContext> | null = null;

  function CaptureContext() {
    ctx = useAudioPlayerContext();
    return null;
  }

  beforeEach(async () => {
    jest.useFakeTimers();

    mockPlayer = new FakePlayer();
    mockStatus = {
      id: 1,
      currentTime: 0,
      playbackState: '',
      timeControlStatus: '',
      reasonForWaitingToPlay: '',
      mute: false,
      duration: 0,
      playing: false,
      loop: false,
      didJustFinish: false,
      isBuffering: false,
      isLoaded: false,
      playbackRate: 1,
      shouldCorrectPitch: true,
    } as any;

    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    ctx = null;
  });

  it('Test 1: Happy path — new audio loads normally', async () => {
    mockPlayer.replace.mockImplementation(() => {
      mockPlayer.isLoaded = false;
      mockPlayer.duration = 0;
      mockPlayer.currentTime = 0;
      setTimeout(() => {
        mockPlayer.isLoaded = true;
        mockPlayer.duration = 300;
        mockPlayer.currentTime = 0;
      }, 100);
    });

    render(
      <AudioPlayerProvider>
        <CaptureContext />
      </AudioPlayerProvider>
    );

    await act(async () => {
      await ctx!.loadAndPlay(makeSnippet(1), 'en');
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(750); // load (100) + poll (50) + seek settle (80) + fresh-start delay (500)
    });

    expect(mockPlayer.seekTo).toHaveBeenCalled();
    expect(mockPlayer.seekTo.mock.calls[0][0]).toBe(0);
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('Test 2: iOS worst case — isLoaded stays true across replace', async () => {
    mockPlayer.isLoaded = true;
    mockPlayer.duration = 400;
    mockPlayer.currentTime = 234.5;

    mockPlayer.replace.mockImplementation(() => {
      // Simulate iOS worst-case: state remains stale across replace()
      setTimeout(() => {
        mockPlayer.duration = 350;
        mockPlayer.currentTime = 0;
      }, 200);
    });

    render(
      <AudioPlayerProvider>
        <CaptureContext />
      </AudioPlayerProvider>
    );

    await act(async () => {
      await ctx!.loadAndPlay(makeSnippet(2), 'en');
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(150);
    });

    expect(mockPlayer.seekTo).not.toHaveBeenCalled();
    expect(mockPlayer.play).not.toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(750); // poll + seek + fresh-start delay (500)
    });

    expect(mockPlayer.seekTo).toHaveBeenCalled();
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('Test 3: Rapid replace — only latest wins', async () => {
    mockPlayer.replace.mockImplementation(({ uri }: { uri: string }) => {
      mockPlayer.isLoaded = false;
      mockPlayer.duration = 0;
      mockPlayer.currentTime = 0;

      if (uri === 'test://2') {
        setTimeout(() => {
          mockPlayer.isLoaded = true;
          mockPlayer.duration = 350;
          mockPlayer.currentTime = 0;
        }, 100);
      }
    });

    render(
      <AudioPlayerProvider>
        <CaptureContext />
      </AudioPlayerProvider>
    );

    await act(async () => {
      await ctx!.loadAndPlay(makeSnippet(1), 'en');
      await ctx!.loadAndPlay(makeSnippet(2), 'en');
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(250);
    });

    expect(mockPlayer.replace).toHaveBeenCalledTimes(2);
    expect(mockPlayer.replace.mock.calls[0][0].uri).toBe('test://1');
    expect(mockPlayer.replace.mock.calls[1][0].uri).toBe('test://2');
    expect(mockPlayer.seekTo).toHaveBeenCalledTimes(1);
  });

  it('Test 4: User dismisses during load', async () => {
    mockPlayer.replace.mockImplementation(() => {
      mockPlayer.isLoaded = false;
      mockPlayer.duration = 0;
      mockPlayer.currentTime = 0;
      setTimeout(() => {
        mockPlayer.isLoaded = true;
        mockPlayer.duration = 300;
        mockPlayer.currentTime = 0;
      }, 100);
    });

    render(
      <AudioPlayerProvider>
        <CaptureContext />
      </AudioPlayerProvider>
    );

    await act(async () => {
      await ctx!.loadAndPlay(makeSnippet(3), 'en');
    });

    await act(async () => {
      ctx!.dismissPlayer();
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(250);
    });

    expect(mockPlayer.seekTo).not.toHaveBeenCalled();
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('Test 5: Load timeout', async () => {
    mockPlayer.replace.mockImplementation(() => {
      mockPlayer.isLoaded = false;
      mockPlayer.duration = 0;
      mockPlayer.currentTime = 0;
      // Never becomes ready
    });

    render(
      <AudioPlayerProvider>
        <CaptureContext />
      </AudioPlayerProvider>
    );

    await act(async () => {
      await ctx!.loadAndPlay(makeSnippet(4), 'en');
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(30100);
    });

    expect(mockPlayer.seekTo).not.toHaveBeenCalled();
    expect(mockPlayer.play).not.toHaveBeenCalled();
    expect(ctx!.uiState.playerState).toBe('off');
  });

  it('Test 6: Edge case — old audio was at time < 1.0', async () => {
    mockPlayer.isLoaded = true;
    mockPlayer.duration = 400;
    mockPlayer.currentTime = 0.3;

    mockPlayer.replace.mockImplementation(() => {
      // Worst-case stale state, but time<1 allows gate to consume.
    });

    render(
      <AudioPlayerProvider>
        <CaptureContext />
      </AudioPlayerProvider>
    );

    await act(async () => {
      await ctx!.loadAndPlay(makeSnippet(5), 'en');
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(650); // poll + seek + fresh-start delay (500)
    });

    expect(mockPlayer.seekTo).toHaveBeenCalled();
    expect(mockPlayer.play).toHaveBeenCalled();
  });
});
