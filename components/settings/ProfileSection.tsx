import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getFirebaseAuthErrorKey } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { AnalyticsEvents } from '@/services/analytics';

/** Derive a display name from email: "moonkanish@gmail.com" → "Moonkanish" */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0];
  if (!local) return email;
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

export function ProfileSection() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useLanguage();
  const { authState, signInWithGoogle, signInWithApple, signOut, deleteAccount } = useAuth();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOutConfirmTitle'),
      t('auth.signOutConfirmMessage'),
      [
        { text: t('auth.cancel'), style: 'cancel' },
        {
          text: t('auth.signOutConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              AnalyticsEvents.signedOut();
            } catch {
              // ignore
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('auth.deleteAccountTitle'),
      t('auth.deleteAccountMessage'),
      [
        { text: t('auth.cancel'), style: 'cancel' },
        {
          text: t('auth.deleteAccountConfirm'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch (e: any) {
              if (e?.code === 'auth/requires-recent-login') {
                Alert.alert(t('auth.deleteAccountError'), 'Please sign out and sign back in, then try again.');
              } else {
                Alert.alert(t('auth.deleteAccountError'));
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

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

  // Authenticated state
  if (authState.status === 'authenticated' && authState.user) {
    const { user } = authState;
    const displayName = user.displayName
      || (user.email ? nameFromEmail(user.email) : 'User');

    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.profileRow}>
          <UserAvatar
            photoURL={user.photoURL}
            displayName={user.displayName}
            email={user.email}
            uid={user.uid}
            size="medium"
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            {user.email && (
              <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
                {user.email}
              </Text>
            )}
          </View>
          <Pressable onPress={handleSignOut} hitSlop={8}>
            <Text style={styles.signOutText}>{t('auth.profileSignOut')}</Text>
          </Pressable>
        </View>
        <Pressable onPress={handleDeleteAccount} disabled={deleting} hitSlop={8} style={styles.deleteRow}>
          <Text style={styles.deleteText}>
            {deleting ? '...' : t('auth.deleteAccount')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Unauthenticated state — inline Google/Apple sign-in
  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.signInHeader}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
        </View>
        <View style={styles.signInInfo}>
          <Text style={[styles.signInPrompt, { color: colors.text }]}>
            {t('auth.profileSignInPrompt')}
          </Text>
          <Text style={[styles.signInDetail, { color: colors.textSecondary }]}>
            {t('auth.profileSignInDetail')}
          </Text>
        </View>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Google button */}
      <Pressable
        style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={handleGoogle}
        disabled={loading !== null}
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
          disabled={loading !== null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  signOutText: {
    color: '#D4756B',
    fontSize: 14,
  },
  deleteRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    alignItems: 'center',
  },
  deleteText: {
    color: '#D4756B',
    fontSize: 13,
  },
  signInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInInfo: {
    flex: 1,
  },
  signInPrompt: {
    fontSize: 15,
    fontWeight: '600',
  },
  signInDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
});
