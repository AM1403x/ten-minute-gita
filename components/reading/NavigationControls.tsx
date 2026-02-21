import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

interface NavigationControlsProps {
  snippetId: number;
  totalSnippets: number;
  currentSnippet: number;
  isReviewMode: boolean;
  isNextDay: boolean;
  isFutureDay: boolean;
  canMarkComplete: boolean;
  colorScheme: 'light' | 'dark';
  colors: (typeof Colors)['light'];
  t: (key: string, params?: Record<string, string | number>) => string;
  onPrev: () => void;
  onNext: () => void;
  onMarkComplete: () => void;
  onGoToDay: (day: number) => void;
  safeAreaBottom?: number;
}

export function NavigationControls({
  snippetId,
  totalSnippets,
  currentSnippet,
  isReviewMode,
  isNextDay,
  isFutureDay,
  canMarkComplete,
  colorScheme,
  colors,
  t,
  onPrev,
  onNext,
  onMarkComplete,
  onGoToDay,
  safeAreaBottom = 0,
}: NavigationControlsProps) {
  return (
    <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(32, safeAreaBottom + 12) }]}>
      <View style={styles.navigation}>
        <Pressable
          style={[styles.navButton, snippetId <= 1 && styles.navButtonDisabled]}
          onPress={onPrev}
          disabled={snippetId <= 1}
          accessibilityLabel={t('reading.previous')}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.navButtonText,
              { color: snippetId > 1 ? colors.accent : colors.textSecondary },
            ]}
          >
            {t('reading.previous')}
          </Text>
        </Pressable>

        {isReviewMode ? (
          <View style={[styles.completedIndicator, { backgroundColor: colorScheme === 'dark' ? '#1B3D1B' : '#E8F5E9' }]}>
            <Text style={[styles.completedIndicatorText, { color: colorScheme === 'dark' ? '#81C784' : '#4CAF50' }]}>{t('reading.alreadyRead')}</Text>
          </View>
        ) : canMarkComplete ? (
          <Pressable
            style={({ pressed }) => [
              styles.completeButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onMarkComplete}
            accessibilityLabel={t('reading.markComplete')}
            accessibilityRole="button"
            testID="mark-complete"
          >
            <Text style={styles.completeButtonText}>{t('reading.markComplete')}</Text>
          </Pressable>
        ) : isFutureDay ? (
          <Pressable
            style={({ pressed }) => [
              styles.goToButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => onGoToDay(currentSnippet)}
          >
            <Text style={styles.goToButtonText}>{t('reading.goToDay', { day: currentSnippet })}</Text>
          </Pressable>
        ) : (
          <View style={[styles.previewIndicator, { backgroundColor: colors.card, borderColor: colors.textSecondary }]}>
            <Text style={[styles.previewIndicatorText, { color: colors.textSecondary }]}>
              {t('reading.notAvailable')}
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.navButton, snippetId >= totalSnippets && styles.navButtonDisabled]}
          onPress={onNext}
          disabled={snippetId >= totalSnippets}
          accessibilityLabel={t('reading.next')}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.navButtonText,
              { color: snippetId < totalSnippets ? colors.accent : colors.textSecondary },
            ]}
          >
            {t('reading.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: undefined,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  navButtonDisabled: { opacity: 0.5 },
  navButtonText: { fontSize: 14, fontWeight: '600' },
  completeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  completeButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  goToButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  goToButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  previewIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 2,
  },
  previewIndicatorText: { fontWeight: '600', fontSize: 14 },
  completedIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  completedIndicatorText: { color: '#4CAF50', fontWeight: '600', fontSize: 14 },
});
