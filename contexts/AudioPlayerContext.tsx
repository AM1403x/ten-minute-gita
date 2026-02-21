import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, useState, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
// Type-only imports — erased at compile time, no runtime module access
import type { AudioPlayer } from 'expo-audio';
import type { AudioStatus } from 'expo-audio';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Snippet } from '@/types';
import { AlignedData, AudioUIState, PlayerState, SavedAudioPosition } from '@/types/audio';
import { audioReducer, initialAudioUIState } from '@/reducers/audioReducer';
import { audioSource, resolveAudioSource } from '@/utils/audioSource';
import { CONFIG } from '@/constants/config';
import { useLanguage } from '@/contexts/LanguageContext';
import { logger } from '@/utils/logger';

// Runtime import with fallback — expo-audio native module may not be available in Expo Go
let _useAudioPlayer: typeof import('expo-audio').useAudioPlayer | null = null;
let _useAudioPlayerStatus: typeof import('expo-audio').useAudioPlayerStatus | null = null;
let _setAudioModeAsync: typeof import('expo-audio').setAudioModeAsync | null = null;
let expoAudioAvailable = false;

try {
  const ea = require('expo-audio');
  _useAudioPlayer = ea.useAudioPlayer;
  _useAudioPlayerStatus = ea.useAudioPlayerStatus;
  _setAudioModeAsync = ea.setAudioModeAsync;
  expoAudioAvailable = true;
} catch {
  // expo-audio native module not available — voice mode will be disabled
}

interface AudioPlayerContextType {
  player: AudioPlayer | null;
  status: AudioStatus;
  uiState: AudioUIState;
  alignedData: AlignedData | null;
  isAudioAvailable: boolean;
  currentSnippetId: number | null;
  loadAndPlay: (snippet: Snippet, language: 'en' | 'hi') => Promise<void>;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  setSpeed: (rate: number) => void;
  expandPlayer: () => void;
  minimizePlayer: () => void;
  dismissPlayer: () => void;
  toggleSpeedPanel: () => void;
  loadSavedPosition: (snippetId: number) => Promise<SavedAudioPosition | null>;
}

const defaultStatus: AudioStatus = {
  id: 0,
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
};

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

// No-op provider when expo-audio isn't available
const noopAsync = async () => {};
const noop = () => {};
const noopLoadSavedPosition = async (): Promise<SavedAudioPosition | null> => null;

const fallbackValue: AudioPlayerContextType = {
  player: null,
  status: defaultStatus,
  uiState: initialAudioUIState,
  alignedData: null,
  isAudioAvailable: false,
  currentSnippetId: null,
  loadAndPlay: noopAsync as any,
  togglePlayPause: noop,
  seek: noop,
  skipForward: noop,
  skipBack: noop,
  setSpeed: noop,
  expandPlayer: noop,
  minimizePlayer: noop,
  dismissPlayer: noop,
  toggleSpeedPanel: noop,
  loadSavedPosition: noopLoadSavedPosition,
};

function AudioPlayerFallback({ children }: { children: React.ReactNode }) {
  return (
    <AudioPlayerContext value={fallbackValue}>
      {children}
    </AudioPlayerContext>
  );
}

// Active provider — only rendered when expo-audio is available
function AudioPlayerProviderActive({ children }: { children: React.ReactNode }) {
  const player = _useAudioPlayer!(null, { updateInterval: CONFIG.VOICE_MODE.UPDATE_INTERVAL_MS });
  const status = _useAudioPlayerStatus!(player);
  const [uiState, dispatch] = useReducer(audioReducer, initialAudioUIState);
  const [alignedData, setAlignedData] = useState<AlignedData | null>(null);
  const currentSnippetRef = useRef<Snippet | null>(null);
  const currentLanguageRef = useRef<'en' | 'hi'>('en');
  const currentUriRef = useRef<string | null>(null);
  const pendingActionRef = useRef<{ seekTo?: number; play: boolean } | null>(null);
  const pendingSpeedRef = useRef<number | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusPlayingRef = useRef(false);
  const statusCurrentTimeRef = useRef(0);
  const wantsToPlayRef = useRef(false);
  // Set when didJustFinish fires — prevents dismissPlayer from overwriting the
  // completion handler's { time: 0 } save with the end-of-track position.
  const justCompletedRef = useRef(false);
  // Generation counter: each player.replace() call increments this. The ready
  // poll checks it so that only the latest replace()'s pending action is consumed.
  const loadGenerationRef = useRef(0);
  // Handle for the polling interval that waits for new audio to be ready.
  const readyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { language } = useLanguage();

  // Native module guard: the JS module may load but native calls can still throw
  // FunctionCallException if the native shared object is missing (e.g. Expo Go).
  // On first failure, disable all audio to prevent repeated crashes.
  const nativeDisabledRef = useRef(false);
  const [audioAvailable, setAudioAvailable] = useState(true);

  const disableNativeAudio = useCallback(() => {
    if (nativeDisabledRef.current) return;
    nativeDisabledRef.current = true;
    setAudioAvailable(false);
    wantsToPlayRef.current = false;
    pendingActionRef.current = null;
    pendingSpeedRef.current = null;
    if (readyPollRef.current) {
      clearInterval(readyPollRef.current);
      readyPollRef.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    dispatch({ type: 'DISMISS' });
    logger.warn('AudioPlayer', 'Native audio module unavailable — voice mode disabled');
  }, []);

  // Keep refs in sync for use in callbacks that shouldn't re-fire on every tick.
  // Refs always hold the latest value — critical for savePosition in dismissPlayer.
  statusPlayingRef.current = status.playing;
  statusCurrentTimeRef.current = status.currentTime;
  const uiSnippetIdRef = useRef(uiState.snippetId);
  const uiHasListenedRef = useRef(uiState.hasListened);
  const uiSpeedRef = useRef(uiState.speed);
  const uiPlayerStateRef = useRef(uiState.playerState);
  uiSnippetIdRef.current = uiState.snippetId;
  uiHasListenedRef.current = uiState.hasListened;
  uiSpeedRef.current = uiState.speed;
  uiPlayerStateRef.current = uiState.playerState;

  // In-memory position cache — eliminates async race between save (on dismiss) and load (on return)
  const positionCacheRef = useRef<Map<number, SavedAudioPosition>>(new Map());

  // ── AUTO-SAVE: continuously persist position while playing ──
  // Runs in the context (never unmounts), polls player.currentTime directly
  // from the native player every second. Writes to BOTH in-memory cache and
  // AsyncStorage. This is the PRIMARY save mechanism — dismissPlayer's save
  // is just a final "flush" before pause.
  useEffect(() => {
    if (nativeDisabledRef.current) return;
    if (uiState.playerState === 'off' || !status.playing) return;

    const interval = setInterval(() => {
      try {
        const time = player.currentTime;
        const sid = uiSnippetIdRef.current;
        if (sid == null || time <= 0) return;

        const saved: SavedAudioPosition = {
          snippetId: sid,
          time,
          hasListened: uiHasListenedRef.current,
          speed: uiSpeedRef.current,
        };
        positionCacheRef.current.set(sid, saved);
        const key = `${CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX}${sid}`;
        AsyncStorage.setItem(key, JSON.stringify(saved)).catch(() => {});
        logger.warn('AudioPlayer', `autoSave: time=${time.toFixed(1)} snippetId=${sid}`);
      } catch (e) {
        logger.warn('AudioPlayer', `autoSave: FAILED ${e}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player, uiState.playerState, status.playing]);

  // Configure audio mode on mount and enable pitch correction
  useEffect(() => {
    _setAudioModeAsync!({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {
      logger.warn('AudioPlayer', 'Failed to set audio mode');
    });
    // Enable pitch correction so speed changes don't shift voice pitch
    try {
      player.shouldCorrectPitch = true;
    } catch {
      // Not critical — pitch may shift at non-1x speeds
    }
  }, [player]);

  // Poll player's native properties directly after replace() until new audio
  // is ready.  Unlike React's status.isLoaded (which may skip the false→true
  // cycle on iOS — the KVO publisher only emits isLoaded:true when
  // AVPlayerItem.status == .readyToPlay), player.isLoaded accesses the native
  // getter which reliably returns false for a newly-created AVPlayerItem until
  // it finishes loading.  A generation counter ensures rapid replace() calls
  // cancel previous polls — only the latest generation's action is consumed.
  const startReadyPoll = useCallback((generation: number) => {
    if (readyPollRef.current) {
      clearInterval(readyPollRef.current);
      readyPollRef.current = null;
    }

    readyPollRef.current = setInterval(() => {
      // Superseded by a newer replace() call
      if (loadGenerationRef.current !== generation) {
        clearInterval(readyPollRef.current!);
        readyPollRef.current = null;
        return;
      }
      // User dismissed while loading
      if (uiPlayerStateRef.current === 'off') {
        clearInterval(readyPollRef.current!);
        readyPollRef.current = null;
        return;
      }

      try {
        // Direct native access — not React status (which may lag or skip states)
        const loaded = player.isLoaded;
        const dur = player.duration;
        const time = player.currentTime;

        // Ready when: loaded + valid duration + time near start.
        // The time<1.0 guard is defense-in-depth: if the native bridge is async
        // and old state briefly leaks through, this prevents consuming the action
        // on old audio that was playing at a position > 1s.  For old audio at <1s,
        // it fires immediately — harmless because seek-to-0 on audio already near
        // 0 is a no-op.
        if (loaded && dur > 0 && time < 1.0) {
          clearInterval(readyPollRef.current!);
          readyPollRef.current = null;

          // Clear load timeout
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
          }

          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          // Stop the retry mechanism — this poll handles play() after seek.
          wantsToPlayRef.current = false;

          if (action) {
            logger.warn('AudioPlayer', `readyPoll: consuming action gen=${generation} ${JSON.stringify(action)}`);

            (async () => {
              try {
                if (action.seekTo != null) {
                  const target = Math.max(0, action.seekTo);
                  for (let attempt = 1; attempt <= 6; attempt++) {
                    try { await player.seekTo(target); } catch { /* transient */ }
                    await new Promise(r => setTimeout(r, 80));
                    let current = 0;
                    try { current = player.currentTime; } catch { current = 0; }
                    const ok = target === 0
                      ? current < 0.35
                      : Math.abs(current - target) < 0.5;
                    if (ok) {
                      logger.warn('AudioPlayer', `readyPoll: seek applied attempt=${attempt} target=${target} current=${current}`);
                      break;
                    }
                    if (attempt === 6) {
                      logger.warn('AudioPlayer', `readyPoll: seek did not stick target=${target} current=${current}`);
                    }
                  }
                }
                if (action.play) {
                  // Brief pause before fresh starts so the user can visually
                  // orient on the shloka text before narration begins.
                  if (!action.seekTo) {
                    await new Promise(r => setTimeout(r, 500));
                  }
                  player.play();
                }
              } catch {
                disableNativeAudio();
              }
            })();
          }

          // Apply deferred speed
          if (pendingSpeedRef.current != null) {
            const rate = pendingSpeedRef.current;
            pendingSpeedRef.current = null;
            try {
              player.shouldCorrectPitch = true;
              player.setPlaybackRate(rate);
            } catch { disableNativeAudio(); }
          }
        }
      } catch {
        clearInterval(readyPollRef.current!);
        readyPollRef.current = null;
        disableNativeAudio();
      }
    }, 50);
  }, [player, disableNativeAudio]);

  // Retry mechanism: poll direct player properties and retry play()
  useEffect(() => {
    if (nativeDisabledRef.current) return;
    if (uiState.playerState === 'off') {
      wantsToPlayRef.current = false;
      return;
    }
    if (!wantsToPlayRef.current) return;

    let retries = 0;
    const maxRetries = 10;

    const interval = setInterval(() => {
      if (nativeDisabledRef.current || !wantsToPlayRef.current || retries >= maxRetries) {
        clearInterval(interval);
        wantsToPlayRef.current = false;
        return;
      }

      try {
        if (player.playing) {
          wantsToPlayRef.current = false;
          clearInterval(interval);
          return;
        }

        // Don't attempt playback while a pending seek/play action is waiting
        // for the new source to be ready. This prevents starting on stale audio
        // in the iOS worst-case (isLoaded stays true across replace()).
        if (pendingActionRef.current) {
          return;
        }

        if (player.isLoaded && !player.playing) {
          player.play();
          retries++;
        }
      } catch {
        clearInterval(interval);
        disableNativeAudio();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [player, uiState.playerState, disableNativeAudio]);

  // Handle audio completion.
  // Only act on the rising edge (false → true) of didJustFinish to avoid
  // stale-state re-fires: after completion, expo-audio stops sending status
  // ticks so didJustFinish stays true in React state. When playerState later
  // changes (e.g. Replay tap), this effect would re-fire on the stale true
  // and immediately dismiss the player. The ref prevents that.
  const prevDidJustFinishRef = useRef(false);
  useEffect(() => {
    const justFinished = status.didJustFinish && !prevDidJustFinishRef.current;
    prevDidJustFinishRef.current = status.didJustFinish;

    // Guard: only mark listened if audio actually played (duration > 0 and
    // position advanced). A failed load can trigger didJustFinish with zeros.
    if (justFinished && uiState.playerState !== 'off' && status.duration > 0) {
      logger.warn('AudioPlayer', `didJustFinish: marking listened, snippetId=${uiState.snippetId} playerState=${uiState.playerState} duration=${status.duration}`);
      wantsToPlayRef.current = false;
      justCompletedRef.current = true;
      dispatch({ type: 'MARK_LISTENED' });
      if (uiState.snippetId != null) {
        const saved: SavedAudioPosition = {
          snippetId: uiState.snippetId,
          time: 0,
          hasListened: true,
          speed: uiState.speed,
        };
        positionCacheRef.current.set(uiState.snippetId, saved);
        const key = `${CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX}${uiState.snippetId}`;
        AsyncStorage.setItem(key, JSON.stringify(saved)).catch(() => {});
      }
    }
  }, [status.didJustFinish, status.duration, uiState.playerState, uiState.snippetId, uiState.speed]);

  // Switch audio when language changes mid-playback
  useEffect(() => {
    if (nativeDisabledRef.current) return;
    if (language === currentLanguageRef.current) return;
    if (!currentSnippetRef.current || uiState.playerState === 'off') {
      currentLanguageRef.current = language;
      return;
    }

    const snippet = currentSnippetRef.current;
    const wasPlaying = statusPlayingRef.current;
    const savedTime = statusCurrentTimeRef.current;

    currentLanguageRef.current = language;

    // Clear any previous load timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    (async () => {
      // Phase 1: Data loading — errors should NOT kill native audio
      let aligned: AlignedData;
      let uri: string;

      try {
        aligned = await audioSource.getAlignedData(snippet, language);
      } catch (e) {
        logger.warn('AudioPlayer', `language switch: aligned data load failed: ${e}`);
        return;
      }

      setAlignedData(aligned);

      try {
        const source = await resolveAudioSource(snippet, language);
        uri = source.uri;
      } catch (e) {
        logger.warn('AudioPlayer', `language switch: audio source resolve failed: ${e}`);
        return;
      }

      // Phase 2: Native player calls — errors indicate broken native module
      try {
        currentUriRef.current = uri;

        pendingActionRef.current = {
          seekTo: savedTime > 0 ? savedTime : undefined,
          play: wasPlaying,
        };
        if (wasPlaying) {
          wantsToPlayRef.current = true;
        }
        const generation = ++loadGenerationRef.current;
        player.replace({ uri });

        if (Platform.OS === 'android') {
          try { player.play(); } catch { /* will be caught by ready poll */ }
        }

        startReadyPoll(generation);

        // Load timeout for language switch — dismiss if audio never loads
        loadTimeoutRef.current = setTimeout(() => {
          loadTimeoutRef.current = null;
          if (pendingActionRef.current) {
            pendingActionRef.current = null;
            wantsToPlayRef.current = false;
            logger.warn('AudioPlayer', 'Language-switch audio load timed out after 30s');
            dispatch({ type: 'DISMISS_PLAYER' });
          }
        }, 30000);

        try {
          player.setActiveForLockScreen(true, {
            title: snippet.title,
            artist: '10 Minute Gita',
          }, {
            showSeekForward: true,
            showSeekBackward: true,
          });
        } catch {
          // Lock screen controls not available in Expo Go
        }
      } catch {
        disableNativeAudio();
      }
    })();
  }, [language, player, uiState.playerState, startReadyPoll, disableNativeAudio]);

  // Final flush on dismiss/pause — reads player.currentTime directly.
  // If it can't get a positive time, skips the save entirely
  // (the auto-save above already persisted a recent position).
  const savePosition = useCallback(() => {
    const sid = uiSnippetIdRef.current;
    if (sid == null) return;

    // Read time directly from the native player — most accurate source.
    let time = 0;
    try {
      const directTime = player.currentTime;
      if (typeof directTime === 'number' && !isNaN(directTime)) {
        time = directTime;
      }
    } catch {
      // Native access failed
    }
    // Fallback to status ref
    if (time <= 0) {
      time = statusCurrentTimeRef.current;
    }
    // Never overwrite a good auto-saved position with 0.
    if (time <= 0) {
      logger.warn('AudioPlayer', 'savePosition: skipping — time is 0, auto-save has good data');
      return;
    }

    const saved: SavedAudioPosition = {
      snippetId: sid,
      time,
      hasListened: uiHasListenedRef.current,
      speed: uiSpeedRef.current,
    };
    logger.warn('AudioPlayer', `savePosition: ${JSON.stringify(saved)}`);
    positionCacheRef.current.set(sid, saved);
    const key = `${CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX}${sid}`;
    AsyncStorage.setItem(key, JSON.stringify(saved)).catch(() => {});
  }, [player]);

  const loadSavedPosition = useCallback(async (snippetId: number): Promise<SavedAudioPosition | null> => {
    // Check in-memory cache first — handles race where dismiss save hasn't flushed to AsyncStorage yet
    const cached = positionCacheRef.current.get(snippetId);
    if (cached) {
      logger.warn('AudioPlayer', `loadSavedPosition: snippetId=${snippetId} CACHE HIT ${JSON.stringify(cached)}`);
      return cached;
    }

    const key = `${CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX}${snippetId}`;
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data) as SavedAudioPosition;
        logger.warn('AudioPlayer', `loadSavedPosition: snippetId=${snippetId} ASYNC_STORAGE ${JSON.stringify(parsed)}`);
        return parsed;
      }
    } catch {
      // Storage read not critical
    }
    logger.warn('AudioPlayer', `loadSavedPosition: snippetId=${snippetId} NOT FOUND`);
    return null;
  }, []);

  const loadAndPlay = useCallback(async (snippet: Snippet, language: 'en' | 'hi') => {
    if (nativeDisabledRef.current) return;

    // Phase 1: Data loading — network/file errors should NOT kill native audio
    let aligned: AlignedData;
    let saved: SavedAudioPosition | null = null;
    let uri: string;

    try {
      aligned = await audioSource.getAlignedData(snippet, language);
    } catch (e) {
      logger.warn('AudioPlayer', `loadAndPlay: aligned data load failed: ${e}`);
      return;
    }

    setAlignedData(aligned);
    currentSnippetRef.current = snippet;
    currentLanguageRef.current = language;
    justCompletedRef.current = false;

    saved = await loadSavedPosition(snippet.id);

    try {
      const source = await resolveAudioSource(snippet, language);
      uri = source.uri;
    } catch (e) {
      logger.warn('AudioPlayer', `loadAndPlay: audio source resolve failed: ${e}`);
      return;
    }

    const rawSavedTime = saved?.time;
    const normalizedSavedTime = typeof rawSavedTime === 'number' ? rawSavedTime : Number(rawSavedTime);
    let resumeTime = Number.isFinite(normalizedSavedTime) && normalizedSavedTime > 0 ? normalizedSavedTime : 0;
    // Defense-in-depth: if saved position is near the end of the track
    // (e.g. stale save from dismiss-after-completion), start from beginning.
    if (resumeTime > 0 && aligned && resumeTime > aligned.duration_seconds - 3) {
      logger.warn('AudioPlayer', `loadAndPlay: clamping near-end resume ${resumeTime.toFixed(1)}s to 0 (duration=${aligned.duration_seconds.toFixed(1)}s)`);
      resumeTime = 0;
    }
    logger.warn('AudioPlayer', `loadAndPlay: resumeTime=${resumeTime} saved=${JSON.stringify(saved)} uri=${uri}`);

    // Phase 2: Native player calls — errors here indicate broken native module
    try {
      // Always reload via player.replace() — seeking on a stale/paused player
      // is unreliable in expo-audio. A fresh load + pending action ensures the
      // seek executes on a newly-loaded player where it reliably takes effect.
      pendingActionRef.current = {
        seekTo: resumeTime,
        play: true,
      };
      currentUriRef.current = uri;
      wantsToPlayRef.current = true;

      // Clear any previous load timeout before starting a new one
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      // Start generation-gated poll: increments the generation counter so any
      // previous poll stops, then polls player's native properties directly
      // until the new audio is confirmed loaded.
      const generation = ++loadGenerationRef.current;
      player.replace({ uri });

      // On Android, ExoPlayer may not start buffering until play() is called.
      // Calling play() sets playWhenReady=true so it auto-plays once buffered.
      // The ready poll will still handle seeking before audio actually starts.
      if (Platform.OS === 'android') {
        try { player.play(); } catch { /* will be caught by ready poll */ }
      }

      startReadyPoll(generation);

      // Load timeout: if audio doesn't load within 30s, reset player state.
      // CDN audio on Android emulators can be slow to buffer.
      loadTimeoutRef.current = setTimeout(() => {
        loadTimeoutRef.current = null;
        if (pendingActionRef.current) {
          pendingActionRef.current = null;
          wantsToPlayRef.current = false;
          logger.warn('AudioPlayer', 'Audio load timed out after 30s');
          dispatch({ type: 'DISMISS_PLAYER' });
        }
      }, 30000);

      if (saved?.speed && saved.speed !== 1.0) {
        dispatch({ type: 'SET_SPEED', payload: saved.speed });
        // Defer speed application — will be applied when audio finishes loading
        pendingSpeedRef.current = saved.speed;
      }

      // LOAD_SNIPPET must fire BEFORE RESTORE_POSITION — LOAD_SNIPPET resets
      // hasListened to false, so dispatching it after RESTORE_POSITION would
      // clobber the restored hasListened=true for previously-completed audio.
      dispatch({ type: 'LOAD_SNIPPET', payload: snippet.id });

      if (saved) {
        dispatch({
          type: 'RESTORE_POSITION',
          payload: {
            savedTime: saved.time,
            hasListened: saved.hasListened,
            speed: saved.speed ?? 1.0,
          },
        });
      }

      try {
        player.setActiveForLockScreen(true, {
          title: snippet.title,
          artist: '10 Minute Gita',
        }, {
          showSeekForward: true,
          showSeekBackward: true,
        });
      } catch {
        // Lock screen controls not available in Expo Go
      }
    } catch {
      disableNativeAudio();
    }
  }, [player, loadSavedPosition, startReadyPoll, disableNativeAudio]);

  // Use refs for status values in callbacks to avoid recreating them on every
  // audio tick. Without this, skipForward/skipBack/seek/togglePlayPause change
  // identity ~10x/sec, causing the entire context value to change and all
  // consumers to re-render during playback.
  const statusDurationRef = useRef(status.duration);
  statusDurationRef.current = status.duration;

  const togglePlayPause = useCallback(() => {
    if (nativeDisabledRef.current) return;
    try {
      if (statusPlayingRef.current || player.playing) {
        wantsToPlayRef.current = false;
        player.pause();
        savePosition();
      } else {
        wantsToPlayRef.current = true;
        player.play();
      }
    } catch {
      disableNativeAudio();
    }
  }, [player, savePosition, disableNativeAudio]);

  const seek = useCallback((time: number) => {
    if (nativeDisabledRef.current) return;
    try {
      const clampedTime = Math.max(0, Math.min(time, statusDurationRef.current || 0));
      player.seekTo(clampedTime);
    } catch {
      disableNativeAudio();
    }
  }, [player, disableNativeAudio]);

  const skipForward = useCallback(() => {
    seek(statusCurrentTimeRef.current + CONFIG.VOICE_MODE.SKIP_SECONDS * uiSpeedRef.current);
  }, [seek]);

  const skipBack = useCallback(() => {
    seek(statusCurrentTimeRef.current - CONFIG.VOICE_MODE.SKIP_SECONDS * uiSpeedRef.current);
  }, [seek]);

  const setSpeed = useCallback((rate: number) => {
    if (nativeDisabledRef.current) return;
    dispatch({ type: 'SET_SPEED', payload: rate });
    try {
      if (player.isLoaded) {
        player.shouldCorrectPitch = true;
        player.setPlaybackRate(rate);
      } else {
        // Defer until audio is loaded
        pendingSpeedRef.current = rate;
      }
    } catch {
      disableNativeAudio();
    }
  }, [player, disableNativeAudio]);

  const expandPlayer = useCallback(() => {
    dispatch({ type: 'SET_PLAYER_STATE', payload: 'full' as PlayerState });
  }, []);

  const minimizePlayer = useCallback(() => {
    dispatch({ type: 'SET_PLAYER_STATE', payload: 'mini' as PlayerState });
  }, []);

  const dismissPlayer = useCallback(() => {
    wantsToPlayRef.current = false;
    pendingActionRef.current = null;
    pendingSpeedRef.current = null;
    if (readyPollRef.current) {
      clearInterval(readyPollRef.current);
      readyPollRef.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    // Save position BEFORE pausing — player.currentTime is most reliable
    // while the player is still in an active (playing/paused) state.
    // After pause(), some native implementations reset currentTime to 0.
    // Skip save if audio just completed — the completion handler already saved
    // { time: 0 } and we don't want to overwrite it with end-of-track position.
    if (justCompletedRef.current) {
      logger.warn('AudioPlayer', 'dismissPlayer: skipping save — audio just completed');
    } else {
      logger.warn('AudioPlayer', `dismissPlayer: about to save. statusRef=${statusCurrentTimeRef.current} snippetId=${uiSnippetIdRef.current} hasListened=${uiHasListenedRef.current}`);
      savePosition();
    }
    justCompletedRef.current = false;
    if (!nativeDisabledRef.current) {
      try {
        player.pause();
      } catch {
        nativeDisabledRef.current = true;
        setAudioAvailable(false);
      }
    }
    dispatch({ type: 'DISMISS_PLAYER' });
  }, [player, savePosition]);

  const toggleSpeedPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_SPEED_PANEL' });
  }, []);

  const value = useMemo<AudioPlayerContextType>(() => ({
    player,
    status,
    uiState,
    alignedData,
    isAudioAvailable: audioAvailable,
    currentSnippetId: uiState.snippetId,
    loadAndPlay,
    togglePlayPause,
    seek,
    skipForward,
    skipBack,
    setSpeed,
    expandPlayer,
    minimizePlayer,
    dismissPlayer,
    toggleSpeedPanel,
    loadSavedPosition,
  }), [player, status, uiState, alignedData, audioAvailable, loadAndPlay, togglePlayPause, seek, skipForward, skipBack, setSpeed, expandPlayer, minimizePlayer, dismissPlayer, toggleSpeedPanel, loadSavedPosition]);

  return (
    <AudioPlayerContext value={value}>
      {children}
    </AudioPlayerContext>
  );
}

/**
 * Error boundary that wraps AudioPlayerProviderActive.
 * If expo-audio's hooks crash during render (e.g. native module error),
 * this catches the error and gracefully falls back to the no-audio provider
 * instead of crashing the entire app.
 */
class AudioProviderErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('AudioProvider', error);
    // Mark expo-audio as unavailable so we don't retry
    expoAudioAvailable = false;
  }

  render() {
    if (this.state.hasError) {
      return <AudioPlayerFallback>{this.props.children}</AudioPlayerFallback>;
    }
    return this.props.children;
  }
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  if (!expoAudioAvailable) {
    return <AudioPlayerFallback>{children}</AudioPlayerFallback>;
  }
  return (
    <AudioProviderErrorBoundary>
      <AudioPlayerProviderActive>{children}</AudioPlayerProviderActive>
    </AudioProviderErrorBoundary>
  );
}

export function useAudioPlayerContext(): AudioPlayerContextType {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayerContext must be used within AudioPlayerProvider');
  }
  return context;
}
