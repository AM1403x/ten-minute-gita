import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Modal, TouchableWithoutFeedback } from 'react-native';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface WelcomeBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export function WelcomeBanner({ visible, onDismiss }: WelcomeBannerProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [visible, reducedMotion]);

  const handleDismiss = () => {
    if (reducedMotion) {
      onDismiss();
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  const warmBg = colorScheme === 'dark' ? '#2A2420' : '#FFF8F0';
  const languageRowBg = colorScheme === 'dark' ? '#3A3028' : '#FFF0E0';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <TouchableWithoutFeedback>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: warmBg,
                  transform: [{ scale: scaleAnim }],
                  shadowColor: '#000',
                },
              ]}
            >
              <Text style={styles.emoji}>🙏</Text>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('ftue.welcome')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('ftue.description')}
              </Text>

              <View style={[styles.languageRow, { backgroundColor: languageRowBg }]}>
                <Text style={[styles.languageLabel, { color: colors.textSecondary }]}>
                  {t('ftue.chooseLanguage')}
                </Text>
                <LanguageToggle />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.continueButton,
                  { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel={t('ftue.getStarted')}
                testID="ftue-get-started"
              >
                <Text style={styles.continueText}>{t('ftue.getStarted')}</Text>
              </Pressable>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  languageLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  continueButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
