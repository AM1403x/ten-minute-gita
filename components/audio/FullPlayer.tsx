import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { ScrubBar } from './ScrubBar';
import { CoreControls } from './CoreControls';
import { SpeedControl } from './SpeedControl';
import { SpeedToggle } from './SpeedToggle';

interface FullPlayerProps {
  isPlaying: boolean;
  isLoading?: boolean;
  hasListened?: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  isSpeedExpanded: boolean;
  safeAreaBottom?: number;
  onTogglePlayPause: () => void;
  onSeek: (time: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleSpeedPanel: () => void;
  onMinimize: () => void;
}

export function FullPlayer({
  isPlaying,
  isLoading,
  hasListened,
  currentTime,
  duration,
  speed,
  isSpeedExpanded,
  onTogglePlayPause,
  onSeek,
  onSkipBack,
  onSkipForward,
  onSpeedChange,
  onToggleSpeedPanel,
  onMinimize,
  safeAreaBottom = 0,
}: FullPlayerProps) {
  const vc = getVoiceColors(useAppColorScheme());

  return (
    <View style={[styles.container, { backgroundColor: vc.CREAM, paddingBottom: Math.max(32, safeAreaBottom + 12) }]}>
      {/* Scrub Bar */}
      <ScrubBar currentTime={currentTime} duration={duration} speed={speed} onSeek={onSeek} />

      {/* Speed Slider (collapsible) */}
      <SpeedControl speed={speed} onSpeedChange={onSpeedChange} visible={isSpeedExpanded} />

      {/* Core Controls */}
      <CoreControls
        isPlaying={isPlaying}
        isLoading={isLoading}
        hasListened={hasListened}
        onTogglePlayPause={onTogglePlayPause}
        onSkipBack={onSkipBack}
        onSkipForward={onSkipForward}
      />

      {/* Speed Toggle */}
      <SpeedToggle speed={speed} isExpanded={isSpeedExpanded} onToggle={onToggleSpeedPanel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
    paddingTop: 2,
  },
});
