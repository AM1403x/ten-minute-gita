import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { HighlightText } from './HighlightText';
import { FONTS } from '@/constants/fonts';

interface VerseBlockProps {
  index: number;
  sanskrit: string;
  transliteration: string;
  translation: string;
  fontSize: number;
  colors: typeof import('@/constants/Colors').default.light;
  isLast: boolean;
  showSanskrit: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  highlightQuery?: string;
}

export function VerseBlock({
  sanskrit,
  transliteration,
  translation,
  fontSize,
  colors,
  isLast,
  showSanskrit,
  showTransliteration,
  showTranslation,
  highlightQuery,
}: VerseBlockProps) {
  return (
    <View style={[styles.verseBlock, !isLast && styles.verseBlockBorder, { borderBottomColor: colors.border }]}>
      {showSanskrit && sanskrit && (
        <TextInput
          value={sanskrit}
          editable={false}
          multiline
          scrollEnabled={false}
          underlineColorAndroid="transparent"
          style={[
            styles.sanskritText,
            { color: colors.text, fontSize: fontSize + 3, lineHeight: (fontSize + 3) * (Platform.OS === 'android' ? 1.8 : 1.5), padding: 0 }
          ]}
        />
      )}

      {showTransliteration && transliteration && (
        <TextInput
          value={transliteration}
          editable={false}
          multiline
          scrollEnabled={false}
          underlineColorAndroid="transparent"
          style={[
            styles.translitText,
            { color: colors.textSecondary, fontSize: fontSize - 2, lineHeight: (fontSize - 2) * 1.4, padding: 0 }
          ]}
        />
      )}

      {showTranslation && translation && (
        <View style={[styles.translationBox, { backgroundColor: colors.background }]}>
          <HighlightText
            text={translation}
            query={highlightQuery}
            color={colors.text}
            style={[styles.translationText, { fontSize, lineHeight: fontSize * 1.6 }]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  verseBlock: { paddingBottom: 20, marginBottom: 20 },
  verseBlockBorder: { borderBottomWidth: 1 },
  sanskritText: { fontFamily: FONTS.devanagari, marginBottom: 8 },
  translitText: { fontStyle: 'italic', marginBottom: 12 },
  translationBox: { padding: 12, borderRadius: 8, marginTop: 4 },
  translationText: { fontFamily: FONTS.serif },
});
