import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress } from '@/hooks/useProgress';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDateString } from '@/utils/storage';

interface DayData {
  date: string;
  snippetId: number | null;
  hasReading: boolean;
  readingCount: number;
  isToday: boolean;
  isPast: boolean;
}

export function CalendarHeatmap() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t, tArray } = useLanguage();
  const router = useRouter();
  const { readingHistory } = useProgress();

  // Generate 12 weeks of calendar data ending at today
  // Orientation: Days as COLUMNS (S M T W T F S), Weeks as ROWS
  const { weeks, readDaysCount } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    const todayStr = getDateString(today);

    // Calculate start date: 11 weeks ago from start of current week
    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday of current week

    const startDate = new Date(startOfCurrentWeek);
    startDate.setDate(startDate.getDate() - (11 * 7)); // Go back 11 weeks

    const weeksData: DayData[][] = [];
    let readCount = 0;
    const currentDate = new Date(startDate);

    for (let week = 0; week < 12; week++) {
      const weekData: DayData[] = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = getDateString(currentDate);
        const isToday = dateStr === todayStr;
        const isPast = currentDate <= today;
        const readings = readingHistory[dateStr] ?? [];
        const snippetId = readings.length > 0 ? readings[readings.length - 1] : null;
        const hasReading = readings.length > 0 && isPast;
        const readingCount = readings.length;

        if (hasReading) {
          readCount++;
        }

        weekData.push({
          date: dateStr,
          snippetId,
          hasReading,
          readingCount,
          isToday,
          isPast,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeksData.push(weekData);
    }

    return { weeks: weeksData, readDaysCount: readCount };
  }, [readingHistory]);

  const handleDayPress = (day: DayData) => {
    if (day.hasReading && day.snippetId) {
      router.push(`/reading/${day.snippetId}?mode=review`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('calendar.readingHistory')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('calendar.daysTotal', { count: readDaysCount, dayWord: readDaysCount === 1 ? 'day' : 'days' })}
        </Text>
      </View>

      {/* Day labels row (S M T W T F S) */}
      <View style={styles.dayLabelsRow}>
        {tArray('calendar.dayLabels').map((day, index) => (
          <View key={index} style={styles.dayLabelCell}>
            <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Weeks as rows, days as columns */}
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const cellStyle = [
                styles.dayCell,
                {
                  backgroundColor: !day.isPast
                    ? 'transparent'
                    : day.hasReading
                    ? day.readingCount >= 3
                      ? colorScheme === 'dark' ? '#F0917E' : '#C4503A'
                      : day.readingCount >= 2
                      ? colorScheme === 'dark' ? '#E8937F' : '#D4644E'
                      : colors.accent
                    : colorScheme === 'dark'
                    ? '#404040'
                    : '#E8E8E8',
                },
                day.isToday && [styles.todayCell, { borderColor: colors.accent }],
              ];

              if (day.hasReading) {
                return (
                  <Pressable
                    key={dayIndex}
                    style={({ pressed }) => [
                      ...cellStyle,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleDayPress(day)}
                  />
                );
              }

              return <View key={dayIndex} style={cellStyle} />;
            })}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendCell,
              { backgroundColor: colorScheme === 'dark' ? '#404040' : '#E8E8E8' },
            ]}
          />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('calendar.noReading')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCell, { backgroundColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('calendar.read')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCell, styles.todayLegend, { borderColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('calendar.today')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  calendarGrid: {
    gap: 2,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 3,
    maxHeight: 22,
  },
  todayCell: {
    borderWidth: 1.5,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  todayLegend: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 9,
  },
});
