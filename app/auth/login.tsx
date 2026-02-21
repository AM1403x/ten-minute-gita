import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, getFirebaseAuthErrorKey } from '@/contexts/AuthContext';
import { useLanguage, hiFontSize } from '@/contexts/LanguageContext';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import Colors from '@/constants/Colors';
import { letterSpacingStyle } from '@/constants/fonts';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t, language } = useLanguage();
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();

  const isExpoGo = Constants.appOwnership === 'expo';

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState<'google' | 'apple' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = mode === 'signIn' ? t('auth.loginTitle') : t('auth.signupTitle');
  const primaryCta = mode === 'signIn' ? t('auth.signIn') : t('auth.signUp');

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (mode === 'signUp' && !displayName.trim()) return false;
    return true;
  }, [email, password, displayName, mode]);

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleGoogle = async () => {
    setLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
      handleClose();
    } catch (e: any) {
      // User cancelled is not an error
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
      handleClose();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError(t(getFirebaseAuthErrorKey(e?.code || '')));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleEmail = async () => {
    if (!canSubmit) return;
    setLoading('email');
    setError(null);
    try {
      if (mode === 'signIn') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, displayName.trim());
      }
      handleClose();
    } catch (e: any) {
      setError(t(getFirebaseAuthErrorKey(e?.code || '')));
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async () => {
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError(t('auth.errorInvalidEmail'));
      return;
    }
    setLoading('email');
    setError(null);
    try {
      await resetPassword(emailTrimmed);
      Alert.alert(t('auth.sendResetEmail'), emailTrimmed);
    } catch (e: any) {
      setError(t(getFirebaseAuthErrorKey(e?.code || '')));
    } finally {
      setLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('auth.cancel')}
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        {/* Social */}
        <Pressable
          style={[
            styles.socialButton,
            { backgroundColor: '#FFFFFF', borderColor: colors.border },
            (loading !== null || isExpoGo) && { opacity: 0.6 },
          ]}
          onPress={handleGoogle}
          disabled={loading !== null || isExpoGo}
        >
          {loading === 'google' ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <>
              <View style={styles.iconContainer}>
                <GoogleIcon size={20} />
              </View>
              <Text style={styles.socialButtonText}>{t('auth.continueGoogle')}</Text>
            </>
          )}
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            style={[
              styles.socialButton,
              { backgroundColor: '#FFFFFF', borderColor: colors.border },
              (loading !== null || isExpoGo) && { opacity: 0.6 },
            ]}
            onPress={handleApple}
            disabled={loading !== null || isExpoGo}
          >
            {loading === 'apple' ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="logo-apple" size={22} color="#000000" />
                </View>
                <Text style={styles.socialButtonText}>{t('auth.continueApple')}</Text>
              </>
            )}
          </Pressable>
        )}

        {isExpoGo && (
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('auth.errorDevBuildRequired')}
          </Text>
        )}

        <View style={styles.orRow}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.orText, { color: colors.textSecondary }]}>{t('auth.or')}</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>

        {/* Email */}
        {mode === 'signUp' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.nameLabel')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colorScheme === 'dark' ? '#2B2B2B' : '#FFFFFF',
                  borderColor: colors.border,
                  fontSize: hiFontSize(16, language),
                },
              ]}
              autoCapitalize="words"
              autoCorrect={false}
              value={displayName}
              onChangeText={setDisplayName}
              editable={loading === null}
              underlineColorAndroid="transparent"
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('auth.emailLabel')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colorScheme === 'dark' ? '#2B2B2B' : '#FFFFFF',
                borderColor: colors.border,
                fontSize: hiFontSize(16, language),
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={loading === null}
            underlineColorAndroid="transparent"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('auth.passwordLabel')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colorScheme === 'dark' ? '#2B2B2B' : '#FFFFFF',
                borderColor: colors.border,
                fontSize: hiFontSize(16, language),
              },
            ]}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={loading === null}
            underlineColorAndroid="transparent"
          />
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
            (!canSubmit || loading !== null) && { opacity: 0.5 },
          ]}
          onPress={handleEmail}
          disabled={!canSubmit || loading !== null}
        >
          {loading === 'email' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{primaryCta}</Text>
          )}
        </Pressable>

        {mode === 'signIn' && (
          <Pressable
            style={styles.linkButton}
            onPress={handleReset}
            disabled={loading !== null}
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              {t('auth.forgotPassword')}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.linkButton}
          onPress={() => {
            setError(null);
            setPassword('');
            setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'));
          }}
          disabled={loading !== null}
        >
          <Text style={[styles.switchText, { color: colors.accent }]}>
            {mode === 'signIn' ? t('auth.toggleToSignUp') : t('auth.toggleToSignIn')}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  socialButton: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  socialButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoText: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  divider: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', ...letterSpacingStyle(0.8), marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchText: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    color: '#D4756B',
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
});

