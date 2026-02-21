import { useMemo, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAudioPlayerContext } from '@/contexts/AudioPlayerContext';
import { ChipType } from '@/types/audio';
import {
  findSectionAtTime,
  findWordAtTime,
  getSectionChipType,
  getSectionStartEnd,
  isInGap,
} from '@/utils/sectionHelpers';
import { logger } from '@/utils/logger';

interface AudioPositionState {
  currentSectionIndex: number;
  currentSectionType: string | null;
  currentChipType: ChipType | null;
  activeWordIndex: number;
  isInGap: boolean;
  progressPercent: number;
}

export function useAudioPosition(enabled: boolean = true): AudioPositionState {
  const { player, status, alignedData, uiState } = useAudioPlayerContext();
  const statusTime = status.currentTime;
  const duration = status.duration;
  const isActive = enabled && uiState.playerState !== 'off';

  // Use both direct polling AND status time for maximum reliability.
  // expo-audio's useAudioPlayerStatus can lag behind the actual playback position.
  const [polledTime, setPolledTime] = useState(0);
  const lastLogRef = useRef(0);
  // Keep a ref to status for dev logging inside the polling interval,
  // so status changes don't tear down and recreate the interval.
  const statusRef = useRef(status);
  statusRef.current = status;

  // Reset polledTime when snippet changes (alignedData changes) to avoid
  // stale position from previous snippet being used via the > 0 fallback
  const prevAlignedRef = useRef(alignedData);
  useEffect(() => {
    if (alignedData !== prevAlignedRef.current) {
      prevAlignedRef.current = alignedData;
      setPolledTime(0);
    }
  }, [alignedData]);

  useEffect(() => {
    if (!isActive || !player) {
      setPolledTime(0);
      return;
    }

    const poll = () => {
      try {
        const t = player.currentTime;
        if (typeof t === 'number' && !isNaN(t)) {
          setPolledTime(prev => (prev === t ? prev : t));
        }

        // DEV: Log diagnostics once per second to identify time source issues
        if (__DEV__) {
          const now = Date.now();
          if (now - lastLogRef.current > 1000) {
            lastLogRef.current = now;
            const s = statusRef.current;
            logger.warn(
              'AudioPosition',
              `polled=${typeof t === 'number' ? t.toFixed(2) : t} status=${s.currentTime.toFixed(2)} playing=${s.playing} loaded=${s.isLoaded}`,
            );
          }
        }
      } catch (e) {
        if (__DEV__) {
          logger.warn('AudioPosition', `poll error: ${e}`);
        }
      }
    };

    poll();

    const pollInterval = Platform.OS === 'android' ? 100 : 50;
    const interval = setInterval(poll, pollInterval);
    return () => clearInterval(interval);
  }, [isActive, player]);

  // Prefer polledTime (direct native player access) — it is more responsive.
  // Only fall back to statusTime when polledTime hasn't started yet.
  // Using Math.max broke seek-backward: after seeking earlier, the stale
  // higher value from one source kept the highlight stuck at the old position.
  const currentTime = polledTime > 0 ? polledTime : statusTime;

  return useMemo(() => {
    if (!alignedData || !isActive) {
      return {
        currentSectionIndex: -1,
        currentSectionType: null,
        currentChipType: null,
        activeWordIndex: -1,
        isInGap: false,
        progressPercent: 0,
      };
    }

    const sections = alignedData.sections;
    const sectionIndex = findSectionAtTime(sections, currentTime);
    const inGap = isInGap(sections, currentTime);

    // DEV: Log when we're in a no-section zone despite time advancing
    if (__DEV__ && sectionIndex < 0 && !inGap && currentTime > 0 && sections.length > 0) {
      const first = getSectionStartEnd(sections[0]);
      const last = getSectionStartEnd(sections[sections.length - 1]);
      logger.warn(
        'AudioPosition',
        `NO SECTION at t=${currentTime.toFixed(2)} ` +
        `firstSection=${first.start.toFixed(2)}-${first.end.toFixed(2)} ` +
        `lastSection=${last.start.toFixed(2)}-${last.end.toFixed(2)}`,
      );
    }

    let sectionType: string | null = null;
    let chipType: ChipType | null = null;
    let wordIndex = -1;

    if (sectionIndex >= 0) {
      const section = sections[sectionIndex];
      sectionType = section.type;
      chipType = getSectionChipType(section.type);
      wordIndex = findWordAtTime(section.words, currentTime);
    }

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return {
      currentSectionIndex: sectionIndex,
      currentSectionType: sectionType,
      currentChipType: chipType,
      activeWordIndex: wordIndex,
      isInGap: inGap,
      progressPercent,
    };
  }, [alignedData, isActive, currentTime, duration]);
}
