import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChipType } from '@/types/audio';

const CHIP_TYPES: ChipType[] = ['shloka', 'translation', 'commentary', 'reflection'];

interface SectionChipsProps {
  activeChip: ChipType | null;
  onChipPress: (chip: ChipType) => void;
}

export const SectionChips = React.memo(function SectionChips({ activeChip, onChipPress }: SectionChipsProps) {
  const { t } = useLanguage();
  const vc = getVoiceColors(useAppColorScheme());

  const chipLabels: Record<ChipType, string> = {
    shloka: t('voice.shloka'),
    translation: t('voice.translation'),
    commentary: t('voice.commentary'),
    reflection: t('voice.reflection'),
  };

  const getChipStatus = (chip: ChipType): 'active' | 'past' | 'future' => {
    if (!activeChip) return 'future';
    if (chip === activeChip) return 'active';
    const activeIndex = CHIP_TYPES.indexOf(activeChip);
    const chipIndex = CHIP_TYPES.indexOf(chip);
    return chipIndex < activeIndex ? 'past' : 'future';
  };

  return (
    <View style={styles.container}>
      {CHIP_TYPES.map((chip) => {
        const status = getChipStatus(chip);
        return (
          <Pressable
            key={chip}
            style={[
              styles.chip,
              status === 'active' && [styles.chipActive, { backgroundColor: vc.CORAL }],
              status === 'past' && { backgroundColor: vc.TRACK_BG },
              status === 'future' && { backgroundColor: vc.CHIP_BG },
            ]}
            onPress={() => onChipPress(chip)}
            accessibilityRole="button"
            accessibilityLabel={chipLabels[chip]}
          >
            <Text
              style={[
                styles.chipText,
                status === 'active' && { color: vc.WHITE, fontWeight: '700' },
                status === 'past' && { color: vc.CHIP_TEXT_PAST },
                status === 'future' && { color: vc.TEXT_GREY },
              ]}
            >
              {chipLabels[chip]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 14,
  },
  chipActive: {},
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
