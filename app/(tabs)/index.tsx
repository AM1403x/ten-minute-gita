import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { TodayCard } from '@/components/TodayCard';
import { StreakIndicator } from '@/components/StreakIndicator';
import { ReflectionTeaser } from '@/components/ReflectionTeaser';
import { LanguageToggle } from '@/components/LanguageToggle';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { useApp } from '@/contexts/AppContext';
import { useSnippets } from '@/hooks/useSnippets';
import { useStreak } from '@/hooks/useStreak';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFirstTimeUser } from '@/contexts/FTUEContext';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { trackScreenView } from '@/utils/sentry';
import { ShareCardModal } from '@/components/share';
import type { ShareCardContent } from '@/utils/shareCard';

export default function HomeScreen() {
  useEffect(() => { trackScreenView('Home'); }, []);
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { t, fadeAnim } = useLanguage();
  const { state } = useApp();
  const { getSnippet, getNextSnippet } = useSnippets();
  const { readToday } = useStreak();
  const {
    hasSeenWelcome,
    loaded: ftueLoaded,
    dismissWelcome,
  } = useFirstTimeUser();

  const currentSnippetId = state.progress.currentSnippet;
  const completedSnippets = state.progress.completedSnippets;

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareContent, setShareContent] = useState<ShareCardContent | null>(null);

  // Tooltip state - show after welcome is dismissed, auto-hide after 3s
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  const tooltipTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      tooltipTimers.current.forEach(clearTimeout);
    };
  }, []);

  const handleDismissWelcome = () => {
    dismissWelcome();
    // Show tooltip only if user hasn't completed any readings yet
    if (completedSnippets.length === 0) {
      const showTimer = setTimeout(() => {
        setShowTooltip(true);
        Animated.timing(tooltipAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        // Auto-dismiss after 3 seconds
        const hideTimer = setTimeout(() => {
          Animated.timing(tooltipAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start(() => setShowTooltip(false));
        }, 3000);
        tooltipTimers.current.push(hideTimer);
      }, 300);
      tooltipTimers.current.push(showTimer);
    }
  };

  const dismissTooltip = () => {
    Animated.timing(tooltipAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowTooltip(false));
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning');
    if (hour < 17) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  const handleStartStreak = () => {
    dismissTooltip();
    router.push(`/reading/${currentSnippetId}`);
  };

  const lastCompletedId = completedSnippets.length > 0
    ? Math.max(...completedSnippets)
    : 0;

  const lastCompletedSnippet = getSnippet(lastCompletedId);
  const currentSnippet = getSnippet(currentSnippetId);

  const displaySnippet = readToday ? lastCompletedSnippet : currentSnippet;
  const upNextSnippet = readToday ? currentSnippet : getNextSnippet(currentSnippetId);

  if (state.isLoading || !displaySnippet) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  const journeyText = readToday
    ? t('home.dayComplete', { day: lastCompletedId })
    : t('home.dayOfJourney', { day: currentSnippetId });

  const showWelcome = ftueLoaded && !hasSeenWelcome;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Welcome Banner - first time only (floating modal) */}
        <WelcomeBanner visible={showWelcome} onDismiss={handleDismissWelcome} />

        {/* Greeting + Journey Progress */}
        <View style={[styles.greeting, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <View>
            <Text style={[styles.greetingText, { color: colors.text }]}>
              {getGreeting()}
            </Text>
            <Text style={[
              styles.journeyText,
              { color: readToday ? colors.accent : colors.textSecondary }
            ]}>
              {journeyText}
            </Text>
          </View>
          {/* Hide language toggle when welcome banner is showing (it has its own) */}
          {!showWelcome && <LanguageToggle />}
        </View>

        {/* Today's Content Preview - MAIN FOCUS */}
        <View>
          <TodayCard
            snippet={displaySnippet}
            isCompleted={readToday}
            nextSnippet={upNextSnippet}
            onBeginReading={handleStartStreak}
          />
          {/* Tooltip hint - points to the reading button */}
          {showTooltip && (
            <Animated.View
              style={[
                styles.tooltip,
                {
                  backgroundColor: colors.accent,
                  opacity: tooltipAnim,
                  transform: [{
                    translateY: tooltipAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.tooltipText}>
                {t('ftue.tapToStart')}
              </Text>
              <View style={[styles.tooltipArrow, { borderBottomColor: colors.accent }]} />
            </Animated.View>
          )}
        </View>

        {/* Streak Indicator - Compact */}
        <StreakIndicator onStartStreak={handleStartStreak} />

        {/* Today's Reflection Teaser */}
        <ReflectionTeaser
          reflection={displaySnippet.shortReflection || displaySnippet.reflection}
          isCompleted={readToday}
          onShare={() => {
            const reflectionText = (displaySnippet.shortReflection || displaySnippet.reflection).split('\n\n')[0].trim();
            setShareContent({
              type: 'reflection',
              text: reflectionText,
              reference: t('reading.dayOfTotal', { day: displaySnippet.id, total: 239 }),
              dayNumber: displaySnippet.id,
            });
            setShareModalVisible(true);
          }}
        />
      </Animated.View>

      <ShareCardModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        content={shareContent}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  greeting: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
  },
  journeyText: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '500',
  },
  tooltip: {
    marginHorizontal: 20,
    marginTop: -4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    position: 'relative',
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
