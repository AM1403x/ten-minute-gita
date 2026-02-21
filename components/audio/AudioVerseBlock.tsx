import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { HighlightText } from '@/components/snippet/HighlightText';
import { AlignedWord } from '@/types/audio';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { FONTS } from '@/constants/fonts';

interface AudioVerseBlockProps {
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
  verseWords?: AlignedWord[];
  activeWordIndex: number;
  isTranslationActive: boolean;
}

export const AudioVerseBlock = React.memo(function AudioVerseBlock({
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
  verseWords,
  activeWordIndex,
  isTranslationActive,
}: AudioVerseBlockProps) {
  const vc = getVoiceColors(useAppColorScheme());
  const canHighlight = verseWords && activeWordIndex >= 0;

  const renderSanskrit = () => {
    if (!canHighlight) {
      return (
        <TextInput
          value={sanskrit}
          editable={false}
          multiline
          scrollEnabled={false}
          underlineColorAndroid="transparent"
          style={[
            styles.sanskritText,
            { color: colors.text, fontSize: fontSize + 3, lineHeight: (fontSize + 3) * (Platform.OS === 'android' ? 1.8 : 1.5), padding: 0 },
          ]}
        />
      );
    }

    // Split Sanskrit into lines, then words, preserving line breaks.
    // Punctuation-only tokens (dandas |, verse numbers ||१||) are NOT in the
    // aligned audio data, so they must be skipped when mapping word indices.
    const lines = sanskrit.split('\n');
    let globalWordIdx = 0;

    return (
      <Text
        style={[
          styles.sanskritText,
          { color: colors.text, fontSize: fontSize + 3, lineHeight: (fontSize + 3) * 1.8 },
        ]}
      >
        {lines.map((line, lineIdx) => {
          const lineWords = line.split(/\s+/).filter((w) => w);
          const lineElements = lineWords.map((word, wordPos) => {
            // Dandas, double dandas, verse numbers (e.g. |, ||१-३७||, ॥३॥) are punctuation-only
            const isPunctuation = /^[|।॥\d०-९\-–]+$/.test(word);
            const isActive = !isPunctuation && globalWordIdx === activeWordIndex;
            if (!isPunctuation) globalWordIdx++;
            return (
              <Text
                key={`${lineIdx}-${wordPos}`}
                style={
                  isActive
                    ? {
                        backgroundColor: vc.CORAL_GLOW,
                        color: vc.CORAL,
                        fontWeight: '700',
                      }
                    : undefined
                }
              >
                {word}
                {' '}
              </Text>
            );
          });
          return (
            <React.Fragment key={lineIdx}>
              {lineElements}
              {lineIdx < lines.length - 1 ? '\n' : null}
            </React.Fragment>
          );
        })}
      </Text>
    );
  };

  return (
    <View
      style={[
        styles.verseBlock,
        !isLast && styles.verseBlockBorder,
        { borderBottomColor: colors.border },
      ]}
    >
      {showSanskrit && sanskrit && renderSanskrit()}

      {showTransliteration && transliteration && (
        <TextInput
          value={transliteration}
          editable={false}
          multiline
          scrollEnabled={false}
          underlineColorAndroid="transparent"
          style={[
            styles.translitText,
            {
              color: colors.textSecondary,
              fontSize: fontSize - 2,
              lineHeight: (fontSize - 2) * 1.4,
              padding: 0,
            },
          ]}
        />
      )}

      {showTranslation && translation && (
        <View
          style={[
            styles.translationBox,
            { backgroundColor: colors.background },
            isTranslationActive && { backgroundColor: vc.CORAL_GLOW },
          ]}
        >
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
});

const styles = StyleSheet.create({
  verseBlock: { paddingBottom: 20, marginBottom: 20 },
  verseBlockBorder: { borderBottomWidth: 1 },
  sanskritText: { fontFamily: FONTS.devanagari, marginBottom: 8 },
  translitText: { fontStyle: 'italic', marginBottom: 12 },
  translationBox: { padding: 12, borderRadius: 8, marginTop: 4 },
  translationText: { fontFamily: FONTS.serif },
});
