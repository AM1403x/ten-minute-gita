import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayerContext } from '@/contexts/AudioPlayerContext';
import { useAudioPosition } from '@/hooks/useAudioPosition';
import { MiniBar } from './MiniBar';
import { FullPlayerOverlay } from './FullPlayerOverlay';
import { getChipStartTimes } from '@/utils/sectionHelpers';
import { ChipType } from '@/types/audio';

export function GlobalAudioUI() {
  const {
    status: audioStatus,
    uiState: audioUIState,
    alignedData,
    togglePlayPause,
    seek,
    skipForward,
    skipBack,
    setSpeed,
    minimizePlayer,
    dismissPlayer,
    toggleSpeedPanel,
  } = useAudioPlayerContext();

  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOnReadingScreen = pathname.startsWith('/reading/');

  // On tab screens, position MiniBar above the tab bar (49px + safe area).
  // On other screens (completed-readings), just above safe area.
  const isOnTabScreen = pathname === '/' || pathname === '/progress' || pathname === '/settings';
  const miniBarBottom = isOnTabScreen ? 49 + insets.bottom : insets.bottom;

  const audioPosition = useAudioPosition(audioUIState.playerState !== 'off' && !isOnReadingScreen);
  const { currentChipType } = audioPosition;

  const handleChipPress = (chip: ChipType) => {
    if (alignedData) {
      const chipTimes = getChipStartTimes(alignedData.sections);
      seek(chipTimes[chip]);
    }
  };

  if (audioUIState.playerState === 'off') return null;

  // Reading screen manages its own audio UI (FullPlayer, ListenPill, etc.)
  if (isOnReadingScreen) return null;

  return (
    <>
      {audioUIState.playerState === 'mini' && (
        <View style={[styles.miniBarContainer, { bottom: miniBarBottom }]}>
          <MiniBar
            isPlaying={audioStatus.playing}
            currentTime={audioStatus.currentTime}
            duration={audioStatus.duration}
            speed={audioUIState.speed}
            onTogglePlayPause={togglePlayPause}
            onExpand={() => {
              if (audioUIState.snippetId != null) {
                router.push(`/reading/${audioUIState.snippetId}`);
              }
            }}
            onDismiss={dismissPlayer}
          />
        </View>
      )}

      {audioUIState.playerState === 'full' && (
        <FullPlayerOverlay
          isPlaying={audioStatus.playing}
          currentTime={audioStatus.currentTime}
          duration={audioStatus.duration}
          speed={audioUIState.speed}
          activeChip={currentChipType}
          isSpeedExpanded={audioUIState.isSpeedExpanded}
          snippetId={audioUIState.snippetId}
          onTogglePlayPause={togglePlayPause}
          onSeek={seek}
          onSkipBack={skipBack}
          onSkipForward={skipForward}
          onChipPress={handleChipPress}
          onSpeedChange={setSpeed}
          onToggleSpeedPanel={toggleSpeedPanel}
          onMinimize={minimizePlayer}
          onGoToReading={() => {
            minimizePlayer();
            if (audioUIState.snippetId != null) {
              router.push(`/reading/${audioUIState.snippetId}`);
            }
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  miniBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
  },
});
