import React from 'react';
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';

interface MiniBarProps {
  isPlaying: boolean;
  isLoading?: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  onTogglePlayPause: () => void;
  onExpand: () => void;
  onDismiss: () => void;
}

export function MiniBar({
  isPlaying,
  isLoading,
  currentTime,
  duration,
  speed,
  onTogglePlayPause,
  onExpand,
  onDismiss,
}: MiniBarProps) {
  const { t } = useLanguage();
  const vc = getVoiceColors(useAppColorScheme());

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTimestamp = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: vc.CREAM }]}>
      {/* Playback row */}
      <Pressable style={styles.playbackRow} onPress={onExpand}>
        <Pressable
          style={[styles.playButton, { backgroundColor: vc.CORAL }]}
          onPress={(e) => {
            e.stopPropagation();
            onTogglePlayPause();
          }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? t('voice.pause') : t('voice.play')}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={vc.WHITE} />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={vc.WHITE} />
          )}
        </Pressable>

        <View style={styles.info}>
          <View style={[styles.progressTrack, { backgroundColor: vc.TRACK_BG }]}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: vc.CORAL }]} />
          </View>
        </View>

        <Text style={[styles.timestamp, { color: vc.TEXT_GREY }]}>{formatTimestamp(currentTime / speed)}</Text>

        <Pressable
          style={[styles.dismissButton, { backgroundColor: vc.TRACK_BG }]}
          onPress={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('voice.dismiss')}
          testID="dismiss-player"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={20} color={vc.TEXT_GREY} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    elevation: 10,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
