import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getFirebaseAuthErrorKey } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { AnalyticsEvents } from '@/services/analytics';
import { GoogleIcon } from './GoogleIcon';

interface AuthSheetProps {
  visible: boolean;
  dismissible: boolean;
  onDismiss: () => void;
  streakCount: number;
  completedCount: number;
}

export function AuthSheet({ visible, dismissible, onDismiss, streakCount, completedCount }: AuthSheetProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useLanguage();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isExpoGo = Constants.appOwnership === 'expo';

  useEffect(() => {
    if (visible) {
      AnalyticsEvents.authModalShown(dismissible ? 'dismissible' : 'mandatory');
      setError(null);
      setLoading(null);
    }
  }, [visible, dismissible]);

  const handleGoogle = async () => {
    setLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
      onDismiss();
    } catch (e: any) {
      if (e?.code !== 'SIGN_IN_CANCELLED' && e?.code !== '12501') {
        setError(t(getFirebaseAuthErrorKey(e?.code || '')));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    setLoading('apple');
    setError(null);
    try {
      await signInWithApple();
      onDismiss();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError(t(getFirebaseAuthErrorKey(e?.code || '')));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleDismiss = () => {
    if (dismissible) {
      AnalyticsEvents.authModalDismissed(0);
    }
    onDismiss();
  };

  const title = dismissible ? t('auth.saveProgress') : t('auth.requiredTitle');
  const subtitle = dismissible ? t('auth.subtitle') : t('auth.requiredSubtitle');

  // Build progress line: "1 reading · 1 day streak"
  const progressParts: string[] = [];
  if (completedCount > 0) progressParts.push(`${completedCount} ${t('auth.readingsLabel')}`);
  if (streakCount > 0) progressParts.push(`${streakCount} ${t('auth.streakLabel')}`);
  const progressLine = progressParts.join('  ·  ');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissible ? handleDismiss : () => {}}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissible ? handleDismiss : undefined}
        >
          <View style={[StyleSheet.absoluteFill, styles.overlayTint]} />
        </Pressable>

        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>

          {/* Progress line */}
          {progressLine.length > 0 && (
            <Text style={[styles.progressLine, { color: colors.accent }]}>
              {progressLine}
            </Text>
          )}

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>

          {/* Error */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Google button */}
          <Pressable
            style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={handleGoogle}
            disabled={loading !== null || isExpoGo}
          >
            {loading === 'google' ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <GoogleIcon size={22} />
                </View>
                <Text style={[styles.socialButtonText, { color: colors.text }]}>{t('auth.continueGoogle')}</Text>
              </>
            )}
          </Pressable>

          {/* Apple button (iOS only) */}
          {Platform.OS === 'ios' && (
            <Pressable
              style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={handleApple}
              disabled={loading !== null || isExpoGo}
            >
              {loading === 'apple' ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <View style={styles.iconContainer}>
                    <Ionicons name="logo-apple" size={24} color={colors.text} />
                  </View>
                  <Text style={[styles.socialButtonText, { color: colors.text }]}>{t('auth.continueApple')}</Text>
                </>
              )}
            </Pressable>
          )}

          {isExpoGo && (
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t('auth.errorDevBuildRequired')}
            </Text>
          )}

          {/* Dev bypass — Expo Go only */}
          {__DEV__ && isExpoGo && (
            <Pressable style={styles.devBypass} onPress={handleDismiss}>
              <Ionicons name="code-slash-outline" size={14} color="#888" />
              <Text style={styles.devBypassText}>Skip (Dev)</Text>
            </Pressable>
          )}

          {/* Not now */}
          {dismissible && (
            <Pressable style={styles.notNowButton} onPress={handleDismiss}>
              <Text style={[styles.notNowText, { color: colors.textSecondary }]}>
                {t('auth.notNow')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressLine: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notNowButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  notNowText: {
    fontSize: 15,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    marginTop: -2,
  },
  devBypass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  devBypassText: {
    fontSize: 13,
    color: '#888',
  },
});
