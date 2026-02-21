import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Settings } from '@/types';
import Colors from '@/constants/Colors';
import { letterSpacingStyle } from '@/constants/fonts';
import { LanguageToggle } from '@/components/LanguageToggle';

interface AppearanceSettingsProps {
  settings: Settings;
  colorScheme: 'light' | 'dark';
  colors: (typeof Colors)['light'];
  t: (key: string, params?: Record<string, string | number>) => string;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

export function AppearanceSettings({ settings, colorScheme, colors, t, onUpdateSettings }: AppearanceSettingsProps) {
  const handleThemeChange = (theme: 'system' | 'light' | 'dark') => {
    onUpdateSettings({ darkMode: theme });
  };

  return (
    <>
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.appearance')}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>{t('settings.theme')}</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{colorScheme}</Text>
        </View>
        <View style={[styles.segmentedControl, { backgroundColor: colors.background }]}>
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <Pressable
              key={theme}
              style={[
                styles.segmentButton,
                settings.darkMode === theme && { backgroundColor: colors.accent },
              ]}
              onPress={() => handleThemeChange(theme)}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: settings.darkMode === theme ? '#FFF' : colors.text },
                ]}
              >
                {theme === 'system' ? t('settings.system') : theme === 'light' ? t('settings.light') : t('settings.dark')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.language')}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <LanguageToggle variant="expanded" />
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
  segmentedControl: { flexDirection: 'row', borderRadius: 10, padding: 4 },
  segmentButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentText: { fontSize: 14, fontWeight: '600' },
});
