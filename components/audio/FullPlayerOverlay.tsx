import React, { useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, BackHandler, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChipType } from '@/types/audio';
import { ScrubBar } from './ScrubBar';
import { CoreControls } from './CoreControls';
import { SpeedControl } from './SpeedControl';
import { SpeedToggle } from './SpeedToggle';

interface FullPlayerOverlayProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  activeChip: ChipType | null;
  isSpeedExpanded: boolean;
  snippetId: number | null;
  onTogglePlayPause: () => void;
  onSeek: (time: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onChipPress: (chip: ChipType) => void;
  onSpeedChange: (speed: number) => void;
  onToggleSpeedPanel: () => void;
  onMinimize: () => void;
  onGoToReading: () => void;
}

export function FullPlayerOverlay({
  isPlaying,
  currentTime,
  duration,
  speed,
  isSpeedExpanded,
  snippetId,
  onTogglePlayPause,
  onSeek,
  onSkipBack,
  onSkipForward,
  onSpeedChange,
  onToggleSpeedPanel,
  onMinimize,
  onGoToReading,
}: FullPlayerOverlayProps) {
  const vc = getVoiceColors(useAppColorScheme());
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  // Android back button: minimize overlay instead of navigating away
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onMinimize();
      return true;
    });
    return () => sub.remove();
  }, [onMinimize]);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onMinimize} />
      <View style={[styles.sheet, { backgroundColor: vc.CREAM, paddingBottom: Math.max(40, insets.bottom + 16) }]}>
        {/* Minimize Handle */}
        <Pressable style={styles.handleArea} onPress={onMinimize}>
          <View style={[styles.handle, { backgroundColor: vc.HANDLE_GREY }]} />
        </Pressable>

        {/* Now Playing label */}
        {snippetId != null && (
          <Pressable style={styles.nowPlaying} onPress={onGoToReading}>
            <Text style={[styles.nowPlayingText, { color: vc.TEXT_GREY }]}>
              {t('reading.dayOfTotal', { day: snippetId, total: 239 })}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={vc.TEXT_GREY} />
          </Pressable>
        )}

        {/* Scrub Bar */}
        <ScrubBar currentTime={currentTime} duration={duration} speed={speed} onSeek={onSeek} />

        {/* Speed Slider (collapsible) */}
        <SpeedControl speed={speed} onSpeedChange={onSpeedChange} visible={isSpeedExpanded} />

        {/* Core Controls */}
        <CoreControls
          isPlaying={isPlaying}
          onTogglePlayPause={onTogglePlayPause}
          onSkipBack={onSkipBack}
          onSkipForward={onSkipForward}
        />

        {/* Speed Toggle */}
        <SpeedToggle speed={speed} isExpanded={isSpeedExpanded} onToggle={onToggleSpeedPanel} />

        {/* Go to Reading button */}
        <Pressable style={[styles.goToReading, { borderColor: vc.BORDER_LIGHT }]} onPress={onGoToReading}>
          <Ionicons name="book-outline" size={16} color={vc.CORAL} />
          <Text style={[styles.goToReadingText, { color: vc.CORAL }]}>{t('voice.goToReading')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 200,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40, // overridden by inline style with safe area
    paddingTop: 2,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  nowPlayingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  goToReading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 32,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  goToReadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
