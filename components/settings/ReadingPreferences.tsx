import React from 'react';
import { View, Text, Switch, Platform, StyleSheet, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { Settings } from '@/types';
import Colors from '@/constants/Colors';
import { FONTS, letterSpacingStyle } from '@/constants/fonts';

interface ReadingPreferencesProps {
  settings: Settings;
  colorScheme: 'light' | 'dark';
  colors: (typeof Colors)['light'];
  t: (key: string, params?: Record<string, string | number>) => string;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

export function ReadingPreferences({ settings, colorScheme, colors, t, onUpdateSettings }: ReadingPreferencesProps) {
  const handleFontSizeChange = (value: number) => {
    onUpdateSettings({ fontSize: Math.round(value) });
  };

  const handleContentToggle = (
    key: 'showSanskrit' | 'showTransliteration' | 'showTranslation',
    newValue: boolean
  ) => {
    const currentlyOn = [
      settings.showSanskrit,
      settings.showTransliteration,
      settings.showTranslation,
    ].filter(Boolean).length;

    if (!newValue && currentlyOn === 1) {
      Alert.alert(t('settings.cannotDisable'), t('settings.atLeastOneContent'));
      return;
    }

    onUpdateSettings({ [key]: newValue });
  };

  return (
    <>
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.readingPreferences')}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>{t('settings.fontSize')}</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>
            {settings.fontSize}px
          </Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={14}
          maximumValue={24}
          step={1}
          value={settings.fontSize}
          onValueChange={handleFontSizeChange}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />

        <View style={[styles.previewContainer, { backgroundColor: colors.background }]}>
          {settings.showSanskrit && (
            <Text style={[styles.previewSanskrit, { color: colors.text, fontSize: settings.fontSize + 2 }]}>
              धृतराष्ट्र उवाच |
            </Text>
          )}
          {settings.showTransliteration && (
            <Text style={[styles.previewTranslit, { color: colors.textSecondary, fontSize: settings.fontSize - 2 }]}>
              dhṛtarāṣṭra uvāca
            </Text>
          )}
          {settings.showTranslation && (
            <Text style={[styles.previewTranslation, { color: colors.text, fontSize: settings.fontSize }]}>
              Dhritarashtra said:
            </Text>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>{t('settings.showSanskrit')}</Text>
          <Switch
            value={settings.showSanskrit}
            onValueChange={(v) => handleContentToggle('showSanskrit', v)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={Platform.OS === 'ios' ? '#FFF' : colors.card}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>{t('settings.showTransliteration')}</Text>
          <Switch
            value={settings.showTransliteration}
            onValueChange={(v) => handleContentToggle('showTransliteration', v)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={Platform.OS === 'ios' ? '#FFF' : colors.card}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>{t('settings.showTranslation')}</Text>
          <Switch
            value={settings.showTranslation}
            onValueChange={(v) => handleContentToggle('showTranslation', v)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={Platform.OS === 'ios' ? '#FFF' : colors.card}
          />
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 8,
  },
  label: { fontSize: 16 },
  value: { fontSize: 16, fontWeight: '500' },
  slider: { width: '100%', height: 40 },
  divider: { height: 1, marginVertical: 8 },
  previewContainer: { padding: 16, borderRadius: 12, marginTop: 8, gap: 6 },
  previewSanskrit: { fontWeight: '500' },
  previewTranslit: { fontStyle: 'italic' },
  previewTranslation: { fontFamily: FONTS.serif },
});
