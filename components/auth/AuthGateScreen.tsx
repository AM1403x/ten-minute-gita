import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth, getFirebaseAuthErrorKey } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { GoogleIcon } from './GoogleIcon';

interface AuthGateScreenProps {
  streakCount: number;
  completedCount: number;
  onDevBypass?: () => void;
}

export function AuthGateScreen({ streakCount, completedCount, onDevBypass }: AuthGateScreenProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useLanguage();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const isExpoGo = Constants.appOwnership === 'expo';
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
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
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError(t(getFirebaseAuthErrorKey(e?.code || '')));
      }
    } finally {
      setLoading(null);
    }
  };

  // Build progress line: "4 readings · 1 day streak"
  const progressParts: string[] = [];
  if (completedCount > 0) progressParts.push(`${completedCount} ${t('auth.readingsLabel')}`);
  if (streakCount > 0) progressParts.push(`${streakCount} ${t('auth.streakLabel')}`);
  const progressLine = progressParts.join('  ·  ');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Lock icon — compact, no background */}
        <Ionicons name="lock-closed" size={32} color={colors.accent} style={styles.lockIcon} />

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {t('auth.requiredTitle')}
        </Text>

        {/* Progress line */}
        {progressLine.length > 0 && (
          <Text style={[styles.progressLine, { color: colors.accent }]}>
            {progressLine}
          </Text>
        )}

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('auth.requiredSubtitle')}
        </Text>

        {/* Error */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Google button */}
        <Pressable
          style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.card }]}
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
            style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.card }]}
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

      </View>

      {/* Dev bypass — always visible in dev */}
      {__DEV__ && onDevBypass && (
        <Pressable style={styles.devBypass} onPress={onDevBypass}>
          <Ionicons name="code-slash-outline" size={14} color="#999" />
          <Text style={styles.devBypassText}>Skip (Dev)</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  lockIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressLine: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    marginTop: -2,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    height: 56,
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
    fontSize: 17,
    fontWeight: '600',
  },
  devBypass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingBottom: 24,
  },
  devBypassText: {
    fontSize: 13,
    color: '#999',
  },
});
