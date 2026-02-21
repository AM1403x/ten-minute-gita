import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Modal, AppState as RNAppState } from 'react-native';
import 'react-native-reanimated';

import { initSentry } from '@/utils/sentry';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

initSentry();
import { AppProvider, useApp } from '@/contexts/AppContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { FTUEProvider, useFirstTimeUser } from '@/contexts/FTUEContext';
import { AppErrorBoundary } from '@/components/ErrorBoundary';
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext';
import { DownloadManagerProvider } from '@/contexts/DownloadManagerContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useSyncManager } from '@/hooks/useSyncManager';
import { consumePendingAuthGate, isAuthGateMandatory, clearAuthGateState } from '@/utils/authGateStorage';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { AuthGateScreen } from '@/components/auth/AuthGateScreen';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { ForceUpdateScreen } from '@/components/ForceUpdateScreen';
import { scheduleDailyReminder } from '@/utils/notifications';
import { checkForceUpdate, ForceUpdateInfo } from '@/utils/versionCheck';
import { useSnippets } from '@/hooks/useSnippets';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/Colors';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'NotoSansDevanagari-Regular': require('../assets/fonts/NotoSansDevanagari-Regular.ttf'),
    'NotoSansDevanagari-Bold': require('../assets/fonts/NotoSansDevanagari-Bold.ttf'),
    'NotoSerif-Regular': require('../assets/fonts/NotoSerif-Regular.ttf'),
    'NotoSerif-Italic': require('../assets/fonts/NotoSerif-Italic.ttf'),
    'NotoSerif-Bold': require('../assets/fonts/NotoSerif-Bold.ttf'),
    'NotoSerif-BoldItalic': require('../assets/fonts/NotoSerif-BoldItalic.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <FTUEProvider>
            <AppProvider>
              <DownloadManagerProvider>
                <AudioPlayerProvider>
                  <RootLayoutNav />
                </AudioPlayerProvider>
              </DownloadManagerProvider>
            </AppProvider>
          </FTUEProvider>
        </LanguageProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

function RootLayoutNav() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const pathname = usePathname();
  useSyncManager();

  const { authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';
  const { state: appState } = useApp();
  const completedCount = appState.progress.completedSnippets.length;
  const streakCount = appState.progress.streak.current;
  const { t, language } = useLanguage();
  const { getSnippet } = useSnippets();

  // --- Force update check (highest priority gate) ---
  const [forceUpdate, setForceUpdate] = useState<ForceUpdateInfo | null>(null);
  useEffect(() => {
    const check = () => {
      checkForceUpdate(language).then(setForceUpdate).catch(() => {});
    };
    check();
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [language]);

  const {
    hasCompletedFirstReading,
    hasSetupNotifications,
    markNotificationsHandled,
    loaded: ftueLoaded,
  } = useFirstTimeUser();

  // --- Refresh daily reminder on startup + foreground ---
  // Keeps notification content in sync with current day/streak/language.
  const notifRefreshedRef = useRef(false);
  useEffect(() => {
    if (appState.isLoading) return;
    const { settings, currentSnippet, streak } = appState.progress;
    if (!settings.notificationsEnabled) return;

    const refresh = () => {
      const snippet = getSnippet(currentSnippet);
      const title = snippet?.title.replace(/^Day \d+:\s*/, '').replace(/^दिन \d+:\s*/, '') || '';
      scheduleDailyReminder(settings.notificationTime, currentSnippet, title, streak.current, t).catch(() => {});
    };

    // Refresh once on mount (cold start)
    if (!notifRefreshedRef.current) {
      notifRefreshedRef.current = true;
      refresh();
    }

    // Refresh when app returns to foreground
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [appState.isLoading, appState.progress.currentSnippet, appState.progress.streak.current, appState.progress.settings.notificationsEnabled]);

  // --- Notification prompt on home screen ---
  const isOnHomeScreen = pathname === '/' || pathname === '/index';
  const needsNotificationPrompt = ftueLoaded && hasCompletedFirstReading && !hasSetupNotifications;

  const handleNotificationDismiss = useCallback(() => {
    markNotificationsHandled();
  }, [markNotificationsHandled]);

  // --- Modal queue: notifications -> auth gate (home-only) ---
  const [activeModal, setActiveModal] = useState<'notifications' | 'authGate' | null>(null);
  const [authGateKind, setAuthGateKind] = useState<'dismissible' | 'mandatory'>('dismissible');
  const evaluatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Hide all overlays when not on home, when authenticated, while FTUE is loading, or while auth is still resolving.
    if (!isOnHomeScreen || isAuthenticated || !ftueLoaded || authState.status === 'loading') {
      setActiveModal(null);
      return () => { cancelled = true; };
    }

    // Priority 1: notification prompt (day 1 flow)
    if (needsNotificationPrompt) {
      setActiveModal('notifications');
      return () => { cancelled = true; };
    }

    // Priority 2: pending auth gate from the most recent completion (consume-once)
    if (evaluatingRef.current) return () => { cancelled = true; };
    evaluatingRef.current = true;

    consumePendingAuthGate().then((pending) => {
      if (cancelled) return;

      if (pending) {
        setAuthGateKind(pending.kind === 'mandatory' ? 'mandatory' : 'dismissible');
        setActiveModal('authGate');
        return;
      }

      // No pending flag: show mandatory gate if the user is past the dismissible limit
      return isAuthGateMandatory(false).then((mandatory) => {
        if (cancelled) return;
        if (mandatory) {
          setAuthGateKind('mandatory');
          setActiveModal('authGate');
        } else {
          setActiveModal(null);
        }
      });
    }).catch(() => {}).finally(() => {
      evaluatingRef.current = false;
    });

    return () => {
      cancelled = true;
      evaluatingRef.current = false;
    };
  }, [isOnHomeScreen, isAuthenticated, ftueLoaded, needsNotificationPrompt, completedCount, authState.status]);

  const handleAuthGateDismiss = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleDevBypass = useCallback(() => {
    clearAuthGateState().catch(() => {});
    setActiveModal(null);
  }, []);

  const customDarkTheme = useMemo(() => ({
    ...DarkTheme,
    dark: true as const,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      primary: colors.accent,
      border: colors.border,
      notification: colors.accent,
    },
  }), [colors.background, colors.card, colors.text, colors.accent, colors.border]);

  const customLightTheme = useMemo(() => ({
    ...DefaultTheme,
    dark: false as const,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      primary: colors.accent,
      border: colors.border,
      notification: colors.accent,
    },
  }), [colors.background, colors.card, colors.text, colors.accent, colors.border]);

  // Force update blocks the entire app
  if (forceUpdate) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
        <ForceUpdateScreen storeUrl={forceUpdate.storeUrl} benefits={forceUpdate.benefits} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="completed-readings"
          options={{
            headerShown: true,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="reading/[id]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerBackVisible: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>

      {/* Notification prompt on home screen */}
      <NotificationPrompt
        visible={activeModal === 'notifications' && isOnHomeScreen && authState.status === 'unauthenticated'}
        onDismiss={handleNotificationDismiss}
      />

      {/* Mandatory full-screen auth gate */}
      {activeModal === 'authGate' && isOnHomeScreen && authState.status === 'unauthenticated' && authGateKind === 'mandatory' && (
        <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => {}}>
          <AuthGateScreen streakCount={streakCount} completedCount={completedCount} onDevBypass={handleDevBypass} />
        </Modal>
      )}

      {/* Dismissible auth bottom sheet */}
      <AuthSheet
        visible={activeModal === 'authGate' && isOnHomeScreen && authState.status === 'unauthenticated' && authGateKind === 'dismissible'}
        dismissible={true}
        onDismiss={handleAuthGateDismiss}
        streakCount={streakCount}
        completedCount={completedCount}
      />
    </ThemeProvider>
  );
}
