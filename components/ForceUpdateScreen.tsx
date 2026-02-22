import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { ForceUpdateInfo } from '@/utils/versionCheck';

export function ForceUpdateScreen({ storeUrl, benefits }: ForceUpdateInfo) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useLanguage();

  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Ionicons name="sparkles" size={32} color={colors.accent} style={styles.icon} />

        <Text style={[styles.title, { color: colors.text }]}>
          {t('update.title')}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('update.subtitle')}
        </Text>

        {benefits.length > 0 && (
          <View style={styles.benefitsList}>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  {benefit}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.updateButton,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleUpdate}
        >
          <Text style={styles.updateButtonText}>{t('update.button')}</Text>
        </Pressable>
      </View>
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
    paddingBottom: 20,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  benefitsList: {
    alignSelf: 'stretch',
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 21,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  updateButton: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
