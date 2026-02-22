import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';
import type { SavedAudioPosition } from '@/types/audio';

const SAVE_INTERVAL_MS = 10000;

/**
 * Periodically saves audio position to AsyncStorage while playing.
 * Also saves on app background.
 * Uses refs for frequently-changing values to avoid tearing down effects.
 */
export function useAudioPositionPersistence(
  snippetId: number | null,
  currentTime: number,
  isPlaying: boolean,
  hasListened: boolean,
  speed: number,
) {
  const lastSaveTime = useRef(0);
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const hasListenedRef = useRef(hasListened);
  const speedRef = useRef(speed);

  // Keep refs in sync with latest values
  currentTimeRef.current = currentTime;
  isPlayingRef.current = isPlaying;
  hasListenedRef.current = hasListened;
  speedRef.current = speed;

  // Periodic save every 10 seconds while playing
  useEffect(() => {
    if (snippetId == null) return;

    const interval = setInterval(() => {
      if (!isPlayingRef.current) return;
      if (currentTimeRef.current === lastSaveTime.current) return;
      lastSaveTime.current = currentTimeRef.current;

      const key = `${CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX}${snippetId}`;
      const saved: SavedAudioPosition = {
        snippetId,
        time: currentTimeRef.current,
        hasListened: hasListenedRef.current,
        speed: speedRef.current,
      };
      AsyncStorage.setItem(key, JSON.stringify(saved)).catch(() => {});
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [snippetId]);

  // Save on app background
  useEffect(() => {
    if (snippetId == null) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && isPlayingRef.current) {
        const key = `${CONFIG.VOICE_MODE.POSITION_SAVE_KEY_PREFIX}${snippetId}`;
        const saved: SavedAudioPosition = {
          snippetId,
          time: currentTimeRef.current,
          hasListened: hasListenedRef.current,
          speed: speedRef.current,
        };
        AsyncStorage.setItem(key, JSON.stringify(saved)).catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [snippetId]);
}
