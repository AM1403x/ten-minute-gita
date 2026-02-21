import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';
import { useLanguage } from '@/contexts/LanguageContext';

const { VOICE_MODE } = CONFIG;
// Tooltip is always a dark popover — use a fixed dark background so it's
// readable in both light and dark modes (dark mode's TEXT_DARK is actually light).
const TOOLTIP_BG = CONFIG.VOICE_COLORS.TEXT_DARK; // '#1A1A1A'
const TOOLTIP_TEXT = '#FFFFFF';

export function FirstTimeTooltip() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const opacity = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    AsyncStorage.getItem(VOICE_MODE.FIRST_TOOLTIP_KEY).then((value) => {
      if (cancelled) return;
      if (!value) {
        setVisible(true);
        AsyncStorage.setItem(VOICE_MODE.FIRST_TOOLTIP_KEY, 'true').catch(() => {});
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        timer = setTimeout(() => {
          if (cancelled) return;
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished && !cancelled) setVisible(false);
          });
        }, VOICE_MODE.TOOLTIP_DURATION_MS);
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      opacity.stopAnimation();
    };
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: TOOLTIP_BG }]}>
      <Text style={[styles.text, { color: TOOLTIP_TEXT }]}>
        {t('voice.tooltip')} {'\u2193'}
      </Text>
      <View style={styles.arrowContainer}>
        <View style={[styles.arrow, { borderTopColor: TOOLTIP_BG }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: -5,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
