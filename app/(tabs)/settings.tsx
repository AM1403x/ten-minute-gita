import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, Alert } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { useSnippets } from '@/hooks/useSnippets';
import { scheduleDailyReminder } from '@/utils/notifications';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFirstTimeUser } from '@/contexts/FTUEContext';
import { ReadingPreferences } from '@/components/settings/ReadingPreferences';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { SupportSection } from '@/components/settings/SupportSection';
import { DevTools } from '@/components/settings/DevTools';
import { DownloadManager } from '@/components/downloads/DownloadManager';
import { ProfileSection } from '@/components/settings/ProfileSection';

declare const __DEV__: boolean;

export default function SettingsScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { state, updateSettings, resetAllProgress, simulateProgress } = useApp();
  const { settings } = state.progress;
  const { getSnippet } = useSnippets();
  const { t, language } = useLanguage();
  const { resetFTUE, markFirstReadingComplete, markNotificationsHandled } = useFirstTimeUser();

  const currentSnippet = getSnippet(state.progress.currentSnippet);
  const snippetTitle = currentSnippet?.title.replace(/^Day \d+:\s*/, '') || '';

  // Reschedule notifications when language changes so content is localized
  useEffect(() => {
    if (settings.notificationsEnabled) {
      scheduleDailyReminder(
        settings.notificationTime,
        state.progress.currentSnippet,
        snippetTitle,
        state.progress.streak.current,
        t
      ).catch(() => { /* notification scheduling not critical */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, settings.notificationsEnabled, settings.notificationTime, state.progress.currentSnippet, snippetTitle, state.progress.streak.current, t]);

  const handleResetProgress = () => {
    const streakDays = state.progress.streak.current;
    const completedCount = state.progress.completedSnippets.length;

    Alert.alert(
      t('settings.resetJourney'),
      t('settings.resetWarning', { streak: streakDays, completed: completedCount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetEverything'),
          style: 'destructive',
          onPress: () => {
            resetAllProgress();
            resetFTUE();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <ProfileSection />

      <ReadingPreferences
        settings={settings}
        colorScheme={colorScheme}
        colors={colors}
        t={t}
        onUpdateSettings={updateSettings}
      />

      <AppearanceSettings
        settings={settings}
        colorScheme={colorScheme}
        colors={colors}
        t={t}
        onUpdateSettings={updateSettings}
      />

      <DownloadManager />

      <NotificationSettings
        settings={settings}
        colorScheme={colorScheme}
        colors={colors}
        t={t}
        currentSnippet={state.progress.currentSnippet}
        snippetTitle={snippetTitle}
        streak={state.progress.streak.current}
        onUpdateSettings={updateSettings}
      />

      <SupportSection
        colors={colors}
        t={t}
        currentDay={state.progress.currentSnippet}
        onResetProgress={handleResetProgress}
      />

      {__DEV__ && (
        <DevTools
          colorScheme={colorScheme}
          colors={colors}
          t={t}
          currentSnippet={state.progress.currentSnippet}
          currentStreak={state.progress.streak.current}
          onSimulateProgress={(day: number) => {
            simulateProgress(day);
            // Mark FTUE milestones as done so prompts don't appear at simulated days
            markFirstReadingComplete();
            markNotificationsHandled();
          }}
          onResetFTUE={resetFTUE}
        />
      )}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {t('settings.version')}
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {t('settings.madeWith')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 60 },
  footer: { alignItems: 'center', marginTop: 24, marginBottom: 40, gap: 4 },
  footerText: { fontSize: 12 },
});
