import React from 'react';
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';

interface CoreControlsProps {
  isPlaying: boolean;
  isLoading?: boolean;
  hasListened?: boolean;
  onTogglePlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

export function CoreControls({
  isPlaying,
  isLoading,
  hasListened,
  onTogglePlayPause,
  onSkipBack,
  onSkipForward,
}: CoreControlsProps) {
  const { t } = useLanguage();
  const vc = getVoiceColors(useAppColorScheme());

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.skipButton,
          { borderColor: vc.BUTTON_BORDER },
          pressed && { backgroundColor: vc.BORDER_LIGHT },
        ]}
        onPress={onSkipBack}
        accessibilityLabel={t('voice.skipBack')}
        accessibilityRole="button"
      >
        <Text style={[styles.skipText, { color: vc.TEXT_DARK }]}>↺ 15</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.playButton,
          { backgroundColor: vc.CORAL, transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}
        onPress={onTogglePlayPause}
        accessibilityLabel={isPlaying ? t('voice.pause') : t('voice.play')}
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={vc.WHITE} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color={vc.WHITE}
            style={!isPlaying ? { marginLeft: 3 } : undefined}
          />
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.skipButton,
          { borderColor: vc.BUTTON_BORDER },
          pressed && { backgroundColor: vc.BORDER_LIGHT },
        ]}
        onPress={onSkipForward}
        accessibilityLabel={t('voice.skipForward')}
        accessibilityRole="button"
      >
        <Text style={[styles.skipText, { color: vc.TEXT_DARK }]}>15 ↻</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  skipButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 52,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(232, 114, 92, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
});
