import React from 'react';
import { View, Text, Pressable, Alert, Share, Linking, StyleSheet, Platform } from 'react-native';
import Colors from '@/constants/Colors';
import { CONFIG } from '@/constants/config';
import { letterSpacingStyle } from '@/constants/fonts';
import { logger } from '@/utils/logger';

interface SupportSectionProps {
  colors: (typeof Colors)['light'];
  t: (key: string, params?: Record<string, string | number>) => string;
  currentDay: number;
  onResetProgress: () => void;
}

export function SupportSection({ colors, t, currentDay, onResetProgress }: SupportSectionProps) {
  const handleRateApp = async () => {
    // Always open App Store directly - native requestReview() is unreliable
    // (Apple limits it to ~3 uses per year and silently fails after that)
    const storeUrl = Platform.select({
      ios: `itms-apps://itunes.apple.com/app/id${CONFIG.APP_STORE_ID}?action=write-review`,
      android: `market://details?id=com.tenminutegita.app`,
      default: CONFIG.APP_STORE_URL,
    });
    try {
      await Linking.openURL(storeUrl);
    } catch {
      try {
        await Linking.openURL(Platform.OS === 'android' ? CONFIG.PLAY_STORE_URL : CONFIG.APP_STORE_URL);
      } catch (error) {
        logger.error('settings.rateApp', error);
      }
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('settings.shareMessage', { day: currentDay }),
      });
    } catch (error) {
      logger.error('settings.share', error);
    }
  };

  const handleSendFeedback = async () => {
    const email = 'tenminutegita@gmail.com';
    const subject = encodeURIComponent('10 Minute Gita Feedback');
    const mailtoUrl = `mailto:${email}?subject=${subject}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          t('settings.sendFeedback'),
          t('settings.emailUs', { email }),
          [
            { text: t('settings.copyEmail'), onPress: () => Alert.alert('Email', email) },
            { text: t('common.ok') },
          ]
        );
      }
    } catch {
      Alert.alert(t('settings.sendFeedback'), `Email us at: ${email}`);
    }
  };

  return (
    <>
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.spreadWisdom')}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Pressable
          style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleRateApp}
          accessibilityRole="button"
          accessibilityLabel={t('settings.rateApp')}
        >
          <Text style={styles.actionIcon} importantForAccessibility="no">⭐</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>{t('settings.rateApp')}</Text>
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
        </Pressable>

        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

        <Pressable
          style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel={t('settings.shareWithFriends')}
        >
          <Text style={styles.actionIcon} importantForAccessibility="no">📤</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>{t('settings.shareWithFriends')}</Text>
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
        </Pressable>

        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

        <Pressable
          style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleSendFeedback}
          accessibilityRole="button"
          accessibilityLabel={t('settings.sendFeedback')}
        >
          <Text style={styles.actionIcon} importantForAccessibility="no">💬</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>{t('settings.sendFeedback')}</Text>
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.yourData')}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Pressable
          style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
          onPress={onResetProgress}
          accessibilityRole="button"
          accessibilityLabel={t('settings.resetAllProgress')}
        >
          <Text style={styles.actionIcon} importantForAccessibility="no">🗑️</Text>
          <Text style={[styles.actionLabel, { color: '#D4756B' }]}>{t('settings.resetAllProgress')}</Text>
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    ...letterSpacingStyle(1),
    marginBottom: 8,
    marginLeft: 20,
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 8,
  },
  actionIcon: { fontSize: 20, width: 32 },
  actionLabel: { flex: 1, fontSize: 16 },
  chevron: { fontSize: 22, fontWeight: '300' },
  rowDivider: { height: 1, marginLeft: 32 },
});
