import React from 'react';
import { StyleSheet } from 'react-native';
import { FormattedText } from './FormattedText';
import { FONTS } from '@/constants/fonts';

interface ParagraphProps {
  text: string;
  fontSize: number;
  color: string;
  italicColor?: string;
  accentColor?: string;
  highlightQuery?: string;
}

export function Paragraph({ text, fontSize, color, italicColor, accentColor, highlightQuery }: ParagraphProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const isQuote = trimmed.startsWith('"') || trimmed.startsWith('\u201c');

  return (
    <FormattedText
      text={trimmed}
      color={color}
      italicColor={italicColor}
      highlightQuery={highlightQuery}
      style={[
        styles.paragraph,
        { fontSize, lineHeight: fontSize * 1.8, marginBottom: fontSize },
        isQuote && [styles.quote, { borderLeftColor: accentColor || '#E07A5F' }],
      ]}
    />
  );
}

const styles = StyleSheet.create({
  paragraph: { fontFamily: FONTS.serif },
  quote: { fontStyle: 'italic', paddingLeft: 16, borderLeftWidth: 3 },
});
