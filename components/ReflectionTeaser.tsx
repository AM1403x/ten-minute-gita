import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguage, hiFontSize, hiLineHeight } from '@/contexts/LanguageContext';
import { FONTS, letterSpacingStyle } from '@/constants/fonts';

interface ReflectionTeaserProps {
  reflection: string;
  isCompleted?: boolean;
  onShare?: () => void;
}

export function ReflectionTeaser({ reflection, isCompleted = false, onShare }: ReflectionTeaserProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t, language } = useLanguage();

  // Show full first paragraph without truncation
  const firstParagraph = reflection.split('\n\n')[0].trim();

  // Change label based on completion status
  const label = isCompleted ? t('reflection.reflectOnToday') : t('reflection.todaysReflection');

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.lotus}>🪷</Text>
          <Text style={[styles.label, { color: colors.accent }]}>
            {label}
          </Text>
        </View>
        {onShare && (
          <Pressable
            onPress={onShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={20} color={colors.accent} />
          </Pressable>
        )}
      </View>
      <Text style={[styles.text, { color: colors.text, fontSize: hiFontSize(15, language), lineHeight: hiLineHeight(hiFontSize(15, language), language) }]}>
        {firstParagraph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lotus: {
    fontSize: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    ...letterSpacingStyle(1),
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: FONTS.serifItalic,
    fontStyle: 'italic',
  },
});
