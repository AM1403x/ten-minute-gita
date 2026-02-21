import React, { useMemo, useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { MILESTONES } from '@/types';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  AppState as RNAppState,
  BackHandler,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanupOldDownloads } from '@/utils/downloadStorage';
import { scheduleDailyReminder } from '@/utils/notifications';
import Animated from 'react-native-reanimated';
import { SnippetContent } from '@/components/SnippetContent';
import { ReadingMenu } from '@/components/ReadingMenu';
import { NavigationControls } from '@/components/reading/NavigationControls';
import { useMidnightTimer } from '@/components/reading/MidnightTimer';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useSnippets } from '@/hooks/useSnippets';
import { useApp } from '@/contexts/AppContext';
import { getDateString } from '@/utils/storage';
import { useProgress } from '@/hooks/useProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFirstTimeUser } from '@/contexts/FTUEContext';
import { useAuth } from '@/contexts/AuthContext';
import { recordCompletionForAuthGate } from '@/utils/authGateStorage';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { CONFIG, getVoiceColors } from '@/constants/config';
import { getSearchHighlight } from '@/utils/searchHighlight';
import { trackScreenView } from '@/utils/sentry';
import { logger } from '@/utils/logger';
import { ShareCardModal } from '@/components/share';
import type { ShareCardContent } from '@/utils/shareCard';
import { useAudioPlayerContext } from '@/contexts/AudioPlayerContext';
import { useAudioPosition } from '@/hooks/useAudioPosition';
import { useAudioHighlight } from '@/hooks/useAudioHighlight';
import { ListenPill } from '@/components/audio/ListenPill';
import { FullPlayer } from '@/components/audio/FullPlayer';
import { MiniBar } from '@/components/audio/MiniBar';
import { BackToNarrationPill } from '@/components/audio/BackToNarrationPill';
import { FirstTimeTooltip } from '@/components/audio/FirstTimeTooltip';
import { SectionChips } from '@/components/audio/SectionChips';
import { ListenPillState, ChipType } from '@/types/audio';
import { getChipStartTimes } from '@/utils/sectionHelpers';
import { useAutoScroll } from '@/hooks/useAutoScroll';
// useAudioPositionPersistence removed — auto-save now runs in AudioPlayerContext
import { useDownloadManager } from '@/contexts/DownloadManagerContext';

let _lastConsumedHighlightId = 0;

/** Standalone header component — owns its own hooks so it re-renders independently. */
function HeaderDownloadIcon({ snippetId, isContentLocked }: { snippetId: number; isContentLocked: boolean }) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { isDownloaded, downloadSingleReading, getDownloadProgress } = useDownloadManager();

  if (!CONFIG.DOWNLOADS_ENABLED) return null;

  const downloaded = isDownloaded(snippetId);
  const progress = getDownloadProgress(snippetId);
  const downloading = progress !== null;

  // Locked content: show green tick if downloaded, hide otherwise
  if (isContentLocked && !downloaded) return null;

  return (
    <Pressable
      onPress={() => {
        if (!downloading && !downloaded) {
          downloadSingleReading(snippetId);
        }
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {downloading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : downloaded ? (
        <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
      ) : (
        <Ionicons name="cloud-download-outline" size={22} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

export default function ReadingScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t, language } = useLanguage();
  const { hasCompletedFirstReading, markFirstReadingComplete } = useFirstTimeUser();
  const { authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';
  const { isDownloaded, downloadSingleReading } = useDownloadManager();
  const insets = useSafeAreaInsets();

  const snippetId = parseInt(id || '1', 10);

  const { getSnippet } = useSnippets();
  const { markComplete, state } = useApp();
  const { completedSnippets, currentSnippet, readingHistory } = state.progress;
  const { totalSnippets } = useProgress();

  const snippet = useMemo(() => getSnippet(snippetId), [snippetId, getSnippet]);

  useEffect(() => {
    trackScreenView('Reading', { day: snippetId });
  }, [snippetId]);

  // Read search highlight — module-level counter ensures each setSearchHighlight
  // is consumed exactly once, regardless of component mount/unmount/remount.
  const [searchHighlight, setSearchHighlightState] = useState<{ query: string; section: string } | null>(() => {
    const h = getSearchHighlight();
    if (h && h.id !== _lastConsumedHighlightId) {
      _lastConsumedHighlightId = h.id;
      return { query: h.query, section: h.section };
    }
    return null;
  });
  const isCompleted = completedSnippets.includes(snippetId);
  const isNextToRead = snippetId === currentSnippet;

  // Track current date - updates on focus, app resume, and midnight
  const [today, setToday] = useState(() => getDateString());

  // Update date when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setToday(getDateString());
    }, [])
  );


  // Update date when app resumes from background
  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setToday(getDateString());
      }
    });
    return () => subscription.remove();
  }, []);

  // Update date at midnight (check every minute).
  // Uses a ref to avoid tearing down/recreating the interval when date changes.
  const todayRef = useRef(today);
  todayRef.current = today;

  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = getDateString();
      if (currentDate !== todayRef.current) {
        setToday(currentDate);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const hasReadToday = today in readingHistory;

  const isReviewMode = isCompleted;
  const canMarkComplete = isNextToRead && !isCompleted;
  const isNextDay = false;
  const isFutureDay = snippetId > currentSnippet && !isCompleted;
  const showPreviewBadge = false;
  const showLockedBadge = isFutureDay;
  const isContentLocked = isFutureDay;
  const isPreviewLimited = false;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)');
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 17 }}>Back</Text>
        </Pressable>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <HeaderDownloadIcon snippetId={snippetId} isContentLocked={isContentLocked} />
          <ReadingMenu />
        </View>
      ),
    });
  }, [navigation, router, colors.accent, snippetId, isContentLocked]);

  const timeUntilMidnight = useMidnightTimer();

  const [showMilestone, setShowMilestone] = useState(false);
  const [achievedMilestone, setAchievedMilestone] = useState<number | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareContent, setShareContent] = useState<ShareCardContent | null>(null);
  const [bottomAreaH, setBottomAreaH] = useState(0);

  // Audio player
  const {
    player: audioPlayer,
    status: audioStatus,
    uiState: audioUIState,
    alignedData,
    isAudioAvailable,
    loadAndPlay,
    togglePlayPause,
    seek,
    skipForward,
    skipBack,
    setSpeed,
    expandPlayer,
    minimizePlayer,
    dismissPlayer,
    toggleSpeedPanel,
    loadSavedPosition,
  } = useAudioPlayerContext();
  // Only run expensive 50ms position polling and highlighting when this snippet's audio is active
  const isHighlightEnabled = audioUIState.playerState !== 'off' && audioUIState.snippetId === snippetId;
  const audioPosition = useAudioPosition(isHighlightEnabled);
  const { currentChipType } = audioPosition;
  const { highlight: audioHighlight } = useAudioHighlight(audioPosition, isHighlightEnabled);

  const [listenPillState, setListenPillState] = useState<ListenPillState>('fresh');
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSavedTime, setAudioSavedTime] = useState(0);
  const [pillLoadedForId, setPillLoadedForId] = useState(0);

  // Synchronous reset: when snippetId changes, immediately hide the pill
  // to prevent a flash of stale state from the previous snippet.
  // React processes this before painting — the user never sees stale data.
  const [prevSnippetId, setPrevSnippetId] = useState(snippetId);
  if (prevSnippetId !== snippetId) {
    setPrevSnippetId(snippetId);
    setPillLoadedForId(0);
    setListenPillState('fresh');
    setAudioSavedTime(0);
    setAudioDuration(0);
  }

  const isAudioActiveForThisSnippet = audioUIState.playerState !== 'off' && audioUIState.snippetId === snippetId;
  const isAudioLoading = isAudioActiveForThisSnippet && !audioStatus.isLoaded;
  const isAudioActive = isAudioActiveForThisSnippet;
  const isPillReady = pillLoadedForId === snippetId;
  const showListenPillArea = isAudioAvailable && !isAudioActiveForThisSnippet && !isContentLocked && !isPreviewLimited;
  const isPillVisible = showListenPillArea && isPillReady;

  // Load saved audio position to determine listen pill state
  useEffect(() => {
    let cancelled = false;
    loadSavedPosition(snippetId).then((saved) => {
      if (cancelled) return;
      logger.warn('ReadingScreen', `pill state load: snippetId=${snippetId} saved=${JSON.stringify(saved)}`);
      if (saved) {
        if (saved.hasListened) {
          setListenPillState('completed');
        } else if (saved.time > 0) {
          setListenPillState('resume');
          setAudioSavedTime(saved.time);
        } else {
          setListenPillState('fresh');
        }
        if (saved.hasListened || saved.time > 0) {
          setAudioDuration(0); // Will be updated from aligned data
        }
      } else {
        setListenPillState('fresh');
      }
      setPillLoadedForId(snippetId);
    }).catch(() => {
      if (cancelled) return;
      setListenPillState('fresh');
      setPillLoadedForId(snippetId);
    });
    return () => { cancelled = true; };
  }, [snippetId, loadSavedPosition]);

  // Update audio duration from aligned data when loaded
  useEffect(() => {
    if (alignedData && audioUIState.snippetId === snippetId) {
      setAudioDuration(alignedData.duration_seconds);
    }
  }, [alignedData, audioUIState.snippetId, snippetId]);

  // Sync listen pill after audio completion for the current snippet.
  // The initial load effect (above) reads from AsyncStorage on mount, but
  // if the user completes audio within this session, the pill state is stale.
  useEffect(() => {
    if (audioUIState.hasListened && audioUIState.snippetId === snippetId) {
      setListenPillState('completed');
    }
  }, [audioUIState.hasListened, audioUIState.snippetId, snippetId]);

  const handleListenPress = useCallback(() => {
    if (snippet) {
      logger.warn('ReadingScreen', `handleListenPress: pillState=${listenPillState} snippetId=${snippet.id}`);
      loadAndPlay(snippet, language).catch(() => {
        // Audio load failed — silently degrade
      });
    }
  }, [snippet, language, loadAndPlay, listenPillState]);

  // Close button on FullPlayer: pause audio, save position, show "Resume" pill.
  // Uses refs for audioStatus to avoid recreating this callback every 50ms during playback.
  const audioStatusRef = useRef(audioStatus);
  audioStatusRef.current = audioStatus;
  const audioUIStateRef = useRef(audioUIState);
  audioUIStateRef.current = audioUIState;

  const handleClosePlayer = useCallback(() => {
    const currentTime = audioStatusRef.current.currentTime;
    dismissPlayer();
    if (currentTime > 0) {
      setListenPillState('resume');
      setAudioSavedTime(currentTime / (audioUIStateRef.current.speed || 1));
    }
  }, [dismissPlayer]);

  // Auto-play: only on the current unread snippet (today's reading opened from home).
  // Already-completed readings and preview/future days never auto-play.
  // Skip if audio is already active for this snippet (e.g., returning from Home).
  const autoPlayTriggered = useRef(false);
  useEffect(() => {
    if (autoPlayTriggered.current) return;
    if (isAudioActiveForThisSnippet) { autoPlayTriggered.current = true; return; }
    if (!snippet || !isAudioAvailable || isContentLocked || isPreviewLimited) return;
    if (!canMarkComplete) return;
    autoPlayTriggered.current = true;
    logger.warn('ReadingScreen', `auto-play triggering for snippetId=${snippet.id}`);
    loadAndPlay(snippet, language).catch(() => {
      // Audio load failed — silently degrade. disableNativeAudio() already ran inside loadAndPlay.
    });
  }, [snippet, isAudioAvailable, isContentLocked, isPreviewLimited, canMarkComplete, loadAndPlay, language, isAudioActiveForThisSnippet]);

  const handleChipPress = useCallback((chip: ChipType) => {
    if (alignedData) {
      const chipTimes = getChipStartTimes(alignedData.sections);
      seek(chipTimes[chip]);
    }
  }, [alignedData, seek]);

  // Auto-scroll for audio mode
  const snippetScrollRef = useRef<ScrollView | null>(null);

  const handleScrollRef = useCallback((ref: ScrollView | null) => {
    snippetScrollRef.current = ref;
  }, []);

  const { showBackToNarration, narrationDirection, onUserScrollBegin, onScrollPosition, onActiveParagraphPageY, scrollBackToNarration, resetScrollState } = useAutoScroll({
    scrollRef: snippetScrollRef as React.MutableRefObject<ScrollView | null>,
    isAudioActive,
  });

  // Scroll to top when navigating between snippets (Next/Previous).
  // useLayoutEffect runs before paint — prevents one stale frame at old scroll position.
  // Also reset auto-scroll tracking so stale scrollYRef doesn't cause
  // auto-scroll to compute wrong targets from the previous snippet's position.
  useLayoutEffect(() => {
    snippetScrollRef.current?.scrollTo({ y: 0, animated: false });
    resetScrollState();
    // Android backup: scrollTo during layout can be dropped by the native ScrollView
    if (Platform.OS === 'android') {
      requestAnimationFrame(() => {
        snippetScrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }
  }, [snippetId, resetScrollState]);

  // Audio position is auto-saved by AudioPlayerContext every 1s while playing.
  // No need for useAudioPositionPersistence here.

  // Dismiss audio when navigating away from the reading screen.
  // Audio should ONLY exist on the reading screen — leaving stops it completely.
  const playerStateRef = useRef(audioUIState.playerState);
  playerStateRef.current = audioUIState.playerState;
  const dismissPlayerRef = useRef(dismissPlayer);
  dismissPlayerRef.current = dismissPlayer;

  useFocusEffect(
    useCallback(() => {
      logger.warn('ReadingScreen', `reading screen FOCUSED, snippetId=${snippetId}`);
      return () => {
        // On blur: dismiss audio completely (stop playback, reset to 'off')
        logger.warn('ReadingScreen', `reading screen BLUR, playerState=${playerStateRef.current} snippetId=${snippetId}`);
        if (playerStateRef.current !== 'off') {
          dismissPlayerRef.current();
        }
      };
    }, [])
  );

  // Android back button: minimize full player instead of navigating away
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (audioUIState.playerState === 'full') {
        minimizePlayer();
        return true; // consume the event
      }
      if (audioUIState.playerState === 'mini') {
        dismissPlayer();
        return true; // consume the event
      }
      return false; // let default behavior handle it
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [audioUIState.playerState, minimizePlayer, dismissPlayer]);

  // Background color: cream when audio active, normal otherwise
  const vc = getVoiceColors(colorScheme);
  const backgroundColor = isAudioActive ? vc.CREAM : colors.background;

  const showReadingProgress = canMarkComplete;

  const handleScrollProgress = (progress: number, minutes: number) => {
    setReadingProgress(progress);
    setMinutesLeft(minutes);
  };

  const navigateHome = () => {
    router.replace('/');
  };

  const handleMarkComplete = () => {
    if (!canMarkComplete) return;

    const newCompletedCount = completedSnippets.length + 1;
    const milestone = MILESTONES.find(m => m === newCompletedCount);

    markComplete(snippetId);

    // Reschedule notification with next day's content (fire-and-forget)
    if (state.progress.settings.notificationsEnabled) {
      const nextId = Math.min(snippetId + 1, 239);
      const nextSnippet = getSnippet(nextId);
      const nextTitle = nextSnippet?.title.replace(/^Day \d+:\s*/, '').replace(/^दिन \d+:\s*/, '') || '';
      scheduleDailyReminder(
        state.progress.settings.notificationTime,
        nextId,
        nextTitle,
        state.progress.streak.current,
        t
      ).catch(() => {});
    }

    // Auto-download next 5 readings in background (fire-and-forget)
    AsyncStorage.getItem('@offline_auto_download').then((val) => {
      if (val === 'false') return; // default ON when key absent
      const maxId = Math.min(snippetId + 5, 239);
      for (let nextId = snippetId + 1; nextId <= maxId; nextId++) {
        if (!isDownloaded(nextId)) {
          downloadSingleReading(nextId).catch(() => {});
        }
      }
    }).catch(() => {});

    // Auto-remove old downloads in background (fire-and-forget)
    cleanupOldDownloads(readingHistory, completedSnippets, language).catch(() => {});

    if (!hasCompletedFirstReading && newCompletedCount === 1) {
      markFirstReadingComplete();
    }

    // Prompt for App Store rating at Day 3 or Day 7
    if (newCompletedCount === 3 || newCompletedCount === 7) {
      import('expo-store-review').then(async (StoreReview) => {
        try {
          if (await StoreReview.isAvailableAsync()) {
            await StoreReview.requestReview();
          }
        } catch { /* store review not critical */ }
      }).catch(() => { /* native module not available (e.g. Expo Go) */ });
    }

    const reflectionText = snippet?.shortReflection || snippet?.verseTranslations?.[0] || '';
    const sanskritFirst = snippet?.sanskrit?.split('\n')[0] || '';
    const ref = `${t('common.chapter')} ${snippet?.chapter} · ${t('common.verses')} ${snippet?.verses}`;
    setShareContent({
      type: 'reflection',
      text: reflectionText,
      sanskrit: sanskritFirst,
      reference: ref,
      dayNumber: snippetId,
    });

    if (milestone) {
      setAchievedMilestone(milestone);
      setShowMilestone(true);
    } else {
      setShareModalVisible(true);
    }

    // Record completion for auth gate (consumed on home screen)
    if (!isAuthenticated) {
      recordCompletionForAuthGate(false).catch(() => {});
    }
  };

  const navigateToPrev = () => {
    if (snippetId > 1) {
      if (audioUIState.playerState !== 'off') dismissPlayer();
      router.setParams({ id: String(snippetId - 1) });
    }
  };

  const navigateToNext = () => {
    if (snippetId < totalSnippets) {
      if (audioUIState.playerState !== 'off') dismissPlayer();
      router.setParams({ id: String(snippetId + 1) });
    }
  };

  const { onGestureEvent, onGestureEnd, animatedStyle, resetSwipe } = useSwipeNavigation(navigateToPrev, navigateToNext);

  // Cancel any in-flight swipe animation when snippet changes
  useLayoutEffect(() => {
    resetSwipe();
  }, [snippetId, resetSwipe]);

  if (!snippet) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {t('reading.snippetNotFound')}
        </Text>
      </View>
    );
  }

  const progressPercent = Math.round((snippetId / totalSnippets) * 100);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor }]}>
        {/* Progress bar */}
        <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: colors.accent, width: `${progressPercent}%` },
            ]}
          />
        </View>

        {/* Snippet indicator */}
        <View style={styles.snippetIndicator}>
          <Text style={[styles.snippetNumber, { color: colors.textSecondary }]}>
            {t('reading.dayOfTotal', { day: snippetId, total: totalSnippets })}
          </Text>

          {isReviewMode && (
            <View style={[styles.modeBadge, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.modeBadgeText}>{t('reading.completed')}</Text>
            </View>
          )}

          {canMarkComplete && (
            <View style={styles.readingProgressContainer}>
              <View style={[styles.readingProgressBg, { backgroundColor: colorScheme === 'dark' ? '#404040' : '#E8E8E8' }]}>
                <View
                  style={[
                    styles.readingProgressFill,
                    { backgroundColor: colors.accent, width: `${readingProgress}%` },
                  ]}
                />
              </View>
              <Text style={[styles.readingProgressText, { color: colors.textSecondary }]}>
                {readingProgress}%{minutesLeft > 0 ? ` (${minutesLeft} min left)` : ''}
              </Text>
            </View>
          )}

          {showPreviewBadge && (
            <View style={[styles.modeBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.modeBadgeText}>{t('snippet.preview')}</Text>
            </View>
          )}

          {showLockedBadge && (
            <View style={[styles.modeBadge, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.modeBadgeText}>🔒 Locked</Text>
            </View>
          )}
        </View>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onEnded={onGestureEnd}
          activeOffsetX={[-CONFIG.SWIPE_ACTIVE_OFFSET_X, CONFIG.SWIPE_ACTIVE_OFFSET_X]}
          failOffsetY={[-CONFIG.SWIPE_FAIL_OFFSET_Y, CONFIG.SWIPE_FAIL_OFFSET_Y]}
        >
          <Animated.View style={[styles.contentWrapper, animatedStyle]}>
            <SnippetContent
              snippet={snippet}
              isContentLocked={isContentLocked}
              isPreviewLimited={isPreviewLimited}
              unlockTime={isNextDay ? timeUntilMidnight : undefined}
              lockMessage={isFutureDay ? t('reading.completeDayFirst', { day: currentSnippet }) : undefined}
              onScrollProgress={showReadingProgress ? handleScrollProgress : undefined}
              highlightQuery={searchHighlight?.query}
              highlightSection={searchHighlight?.section}
              isAudioActive={isAudioActive}
              audioHighlight={audioHighlight}
              alignedData={alignedData}
              onScrollRef={handleScrollRef}
              onUserScrollBegin={onUserScrollBegin}
              onScrollY={onScrollPosition}
              onActiveParagraphPageY={onActiveParagraphPageY}
            />
          </Animated.View>
        </PanGestureHandler>

        {/* ListenPill - floating above fixed bottom area */}
        {showListenPillArea && (
          <View
            style={[
              styles.listenPillContainer,
              { bottom: bottomAreaH + 8 },
              (!isPillVisible || showMilestone || shareModalVisible) && { opacity: 0, pointerEvents: 'none' },
            ]}
          >
            {listenPillState === 'fresh' && <FirstTimeTooltip />}
            <ListenPill
              pillState={listenPillState}
              duration={audioDuration}
              savedTime={audioSavedTime}
              onPress={handleListenPress}
            />
          </View>
        )}

        {/* Back-to-narration pill - floating above fixed bottom area */}
        {showBackToNarration && (
          <View style={[styles.pillFloating, { bottom: bottomAreaH + 8 }]}>
            <BackToNarrationPill direction={narrationDirection} onPress={scrollBackToNarration} />
          </View>
        )}

        {/* Fixed bottom area - always pinned */}
        <View
          style={[styles.bottomFixed, { backgroundColor, borderTopColor: colors.border }]}
          onLayout={(e) => setBottomAreaH(e.nativeEvent.layout.height)}
        >
          {audioUIState.playerState !== 'off' && (
            <>
              {/* Drag handle - visual separator, minimizes player when full */}
              <Pressable
                style={styles.handleArea}
                onPress={audioUIState.playerState === 'full' ? minimizePlayer : undefined}
              >
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </Pressable>

              {/* Close X button — pauses audio, returns to Resume pill */}
              {audioUIState.playerState === 'full' && (
                <Pressable
                  style={[styles.closeCircle, { backgroundColor: vc.TRACK_BG }]}
                  onPress={handleClosePlayer}
                  hitSlop={8}
                  accessibilityLabel="Close player"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={14} color={vc.TEXT_GREY} />
                </Pressable>
              )}

              {isAudioAvailable && !isContentLocked && !isPreviewLimited && (
                <SectionChips activeChip={currentChipType} onChipPress={handleChipPress} />
              )}
            </>
          )}

          {audioUIState.playerState === 'full' && (
            <FullPlayer
              isPlaying={audioStatus.playing}
              isLoading={isAudioLoading}
              hasListened={audioUIState.hasListened}
              currentTime={audioStatus.currentTime}
              duration={audioStatus.duration}
              speed={audioUIState.speed}
              isSpeedExpanded={audioUIState.isSpeedExpanded}
              safeAreaBottom={insets.bottom}
              onTogglePlayPause={togglePlayPause}
              onSeek={seek}
              onSkipBack={skipBack}
              onSkipForward={skipForward}
              onSpeedChange={setSpeed}
              onToggleSpeedPanel={toggleSpeedPanel}
              onMinimize={minimizePlayer}
            />
          )}

          {audioUIState.playerState === 'mini' && (
            <MiniBar
              isPlaying={audioStatus.playing}
              isLoading={isAudioLoading}
              currentTime={audioStatus.currentTime}
              duration={audioStatus.duration}
              speed={audioUIState.speed}
              onTogglePlayPause={togglePlayPause}
              onExpand={expandPlayer}
              onDismiss={dismissPlayer}
            />
          )}

          {audioUIState.playerState !== 'full' && (
            <NavigationControls
              snippetId={snippetId}
              totalSnippets={totalSnippets}
              currentSnippet={currentSnippet}
              isReviewMode={isReviewMode}
              isNextDay={isNextDay}
              isFutureDay={isFutureDay}
              canMarkComplete={canMarkComplete}
              colorScheme={colorScheme}
              colors={colors}
              t={t}
              onPrev={navigateToPrev}
              onNext={navigateToNext}
              onMarkComplete={handleMarkComplete}
              onGoToDay={(day) => router.setParams({ id: String(day) })}
              safeAreaBottom={insets.bottom}
            />
          )}
        </View>

        {showMilestone && achievedMilestone && (
          <View style={styles.milestoneOverlay} accessibilityViewIsModal={true}>
            <View style={[styles.milestoneCard, { backgroundColor: colors.card }]}>
              <Text style={styles.milestoneEmoji}>🎉</Text>
              <Text style={[styles.milestoneTitle, { color: colors.text }]}>
                {achievedMilestone === 1 && t('milestone.firstStep')}
                {achievedMilestone === 3 && t('milestone.threeDays')}
                {achievedMilestone === 7 && t('milestone.oneWeek')}
                {achievedMilestone === 30 && t('milestone.oneMonth')}
                {achievedMilestone === 100 && t('milestone.hundredDays')}
                {achievedMilestone === 239 && t('milestone.journeyComplete')}
              </Text>
              <Text style={[styles.milestoneText, { color: colors.textSecondary }]}>
                {achievedMilestone === 1 && t('milestone.journeyBegins')}
                {achievedMilestone === 3 && t('milestone.builtMomentum')}
                {achievedMilestone === 7 && t('milestone.weekOfWisdom')}
                {achievedMilestone === 30 && t('milestone.monthDedication')}
                {achievedMilestone === 100 && t('milestone.hundredGrowth')}
                {achievedMilestone === 239 && t('milestone.completedGita')}
              </Text>
              <Pressable
                onPress={() => {
                  setShowMilestone(false);
                  setAchievedMilestone(null);
                  setShareModalVisible(true);
                }}
                style={[styles.shareVerseButton, { backgroundColor: colors.accent }]}
                accessibilityLabel={t('share.shareVerse')}
                accessibilityRole="button"
              >
                <Ionicons name="share-outline" size={18} color="#FFF" />
                <Text style={styles.shareVerseButtonText}>{t('share.shareVerse')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowMilestone(false);
                  setAchievedMilestone(null);
                  navigateHome();
                }}
                accessibilityLabel={achievedMilestone === 239 ? t('milestone.hariOm') : t('milestone.keepGoing')}
                accessibilityRole="button"
                testID="milestone-keep-going"
              >
                <Text style={[styles.milestoneContinue, { color: colors.accent }]}>
                  {achievedMilestone === 239 ? t('milestone.hariOm') : t('milestone.keepGoing')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        <ShareCardModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            navigateHome();
          }}
          content={shareContent}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: { height: 4, width: '100%' },
  progressBar: { height: '100%' },
  snippetIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  snippetNumber: { fontSize: 14, fontWeight: '500' },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  readingProgressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readingProgressBg: { width: 80, height: 6, borderRadius: 3, overflow: 'hidden' },
  readingProgressFill: { height: '100%', borderRadius: 3 },
  readingProgressText: { fontSize: 12, fontWeight: '500' },
  timerBanner: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  timerText: { fontSize: 13, fontWeight: '500' },
  modeBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  contentWrapper: { flex: 1 },
  listenPillContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  pillFloating: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
    elevation: 25,
  },
  bottomFixed: {
    borderTopWidth: 1,
    overflow: 'visible',
  },
  handleArea: {
    alignItems: 'center' as const,
    paddingVertical: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeCircle: {
    position: 'absolute' as const,
    top: -13,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 100 },
  milestoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneCard: { padding: 32, borderRadius: 20, alignItems: 'center', marginHorizontal: 32 },
  milestoneEmoji: { fontSize: 64, marginBottom: 16 },
  milestoneTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  milestoneText: { fontSize: 16, textAlign: 'center' },
  shareVerseButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 20 },
  shareVerseButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  milestoneContinue: { fontSize: 18, fontWeight: '600', marginTop: 16 },
});
