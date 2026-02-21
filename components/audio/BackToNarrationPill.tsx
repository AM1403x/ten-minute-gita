import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

interface BackToNarrationPillProps {
  direction: 'up' | 'down';
  onPress: () => void;
}

export function BackToNarrationPill({ direction, onPress }: BackToNarrationPillProps) {
  const vc = getVoiceColors(useAppColorScheme());

  return (
    <Pressable
      style={({ pressed }) => [styles.pill, { backgroundColor: vc.CORAL }, pressed && { opacity: 0.6 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Scroll to current narration"
    >
      <Ionicons name={direction === 'up' ? 'chevron-up' : 'chevron-down'} size={17} color={vc.WHITE} />
      <Text style={[styles.text, { color: vc.WHITE }]}>Now</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 17,
    elevation: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
