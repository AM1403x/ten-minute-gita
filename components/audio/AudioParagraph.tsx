import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Paragraph } from '@/components/snippet/Paragraph';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

interface AudioParagraphProps {
  text: string;
  fontSize: number;
  color: string;
  italicColor?: string;
  accentColor?: string;
  highlightQuery?: string;
  isHighlighted: boolean;
}

export const AudioParagraph = React.memo(function AudioParagraph({
  text,
  fontSize,
  color,
  italicColor,
  accentColor,
  highlightQuery,
  isHighlighted,
}: AudioParagraphProps) {
  const vc = getVoiceColors(useAppColorScheme());

  return (
    <View style={isHighlighted ? [styles.highlighted, { backgroundColor: vc.CORAL_GLOW }] : undefined}>
      <Paragraph
        text={text}
        fontSize={fontSize}
        color={color}
        italicColor={italicColor}
        accentColor={accentColor}
        highlightQuery={highlightQuery}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  highlighted: {
    borderRadius: 8,
    paddingHorizontal: 4,
    marginHorizontal: -4,
  },
});
