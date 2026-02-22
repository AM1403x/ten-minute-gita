import React, { useState } from 'react';
import { View, Text, Switch, Pressable, Alert, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Settings } from '@/types';
import Colors from '@/constants/Colors';
import { letterSpacingStyle } from '@/constants/fonts';
import {
  scheduleDailyReminder,
  cancelAllNotifications,
} from '@/utils/notifications';

interface NotificationSettingsProps {
  settings: Settings;
  colorScheme: 'light' | 'dark';
  colors: (typeof Colors)['light'];
  t: (key: string, params?: Record<string, string | number>) => string;
  currentSnippet: number;
  snippetTitle: string;
  streak: number;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

export function NotificationSettings({
  settings,
  colorScheme,
  colors,
  t,
  currentSnippet,
  snippetTitle,
  streak,
  onUpdateSettings,
}: NotificationSettingsProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);

  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const dayNum = currentSnippet;
  const notificationPreview = {
    title: streak === 0
      ? t('notifications.beginJourney')
      : t('notifications.dayReady', { day: dayNum }),
    body: streak === 0
      ? t('notifications.dayIntro', { day: 1, title: snippetTitle })
      : t('notifications.keepGoing', { title: snippetTitle, streak }),
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    if (enabled) {
      const scheduled = await scheduleDailyReminder(
        settings.notificationTime,
        currentSnippet,
        snippetTitle,
        streak
      );
      if (scheduled) {
        onUpdateSettings({ notificationsEnabled: true });
      } else {
        Alert.alert(t('settings.permissionRequired'), t('settings.enableNotifications'));
      }
    } else {
      try {
        await cancelAllNotifications();
      } catch {
        // Best-effort cancellation
      }
      onUpdateSettings({ notificationsEnabled: false });
    }
  };

  const handleTimeChange = async (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const newTime = `${hours}:${minutes}`;
      onUpdateSettings({ notificationTime: newTime });

      if (settings.notificationsEnabled) {
        try {
          await scheduleDailyReminder(newTime, currentSnippet, snippetTitle, streak);
        } catch {
          // Best-effort reschedule
        }
      }
    }
  };

  return (
    <>
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.dailyReminder')}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>{t('settings.remindMe')}</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleNotificationsChange}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={Platform.OS === 'ios' ? '#FFF' : colors.card}
          />
        </View>

        {settings.notificationsEnabled && (
          <>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text }]}>{t('settings.time')}</Text>
              <Pressable onPress={() => setShowTimePicker(true)}>
                <Text style={[styles.timeButton, { color: colors.accent }]}>
                  {formatTime(settings.notificationTime)}
                </Text>
              </Pressable>
            </View>

            {showTimePicker && Platform.OS === 'ios' && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={parseTime(settings.notificationTime)}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  locale="en-US"
                />
                <Pressable
                  style={[styles.pickerDone, { backgroundColor: colors.accent }]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.pickerDoneText}>{t('common.ok')}</Text>
                </Pressable>
              </View>
            )}
            {showTimePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={parseTime(settings.notificationTime)}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={handleTimeChange}
              />
            )}

            <View
              style={[
                styles.notificationPreview,
                { backgroundColor: colorScheme === 'dark' ? '#2D2D2D' : '#F5F5F5' },
              ]}
            >
              <Text style={[styles.previewHeader, { color: colors.textSecondary }]}>
                {t('settings.preview')}
              </Text>
              <Text style={[styles.notificationTitle, { color: colors.text }]}>
                {notificationPreview.title}
              </Text>
              <Text style={[styles.notificationBody, { color: colors.textSecondary }]}>
                {notificationPreview.body}
              </Text>
            </View>
          </>
        )}
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
  timeButton: { fontSize: 16, fontWeight: '600' },
  notificationPreview: { padding: 16, borderRadius: 12, marginTop: 12 },
  previewHeader: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  notificationTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  notificationBody: { fontSize: 13, lineHeight: 18 },
  pickerContainer: { alignItems: 'center', marginTop: 8 },
  pickerDone: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  pickerDoneText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
