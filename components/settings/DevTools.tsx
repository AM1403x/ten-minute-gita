import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { letterSpacingStyle } from '@/constants/fonts';

interface DevToolsProps {
  colorScheme: 'light' | 'dark';
  colors: (typeof Colors)['light'];
  t: (key: string, params?: Record<string, string | number>) => string;
  currentSnippet: number;
  currentStreak: number;
  onSimulateProgress: (day: number) => void;
  onResetFTUE: () => void;
}

export function DevTools({
  colorScheme,
  colors,
  t,
  currentSnippet,
  currentStreak,
  onSimulateProgress,
  onResetFTUE,
}: DevToolsProps) {
  const [simulateDay, setSimulateDay] = useState('');

  const handleSimulateProgress = () => {
    const day = parseInt(simulateDay, 10);
    if (isNaN(day) || day < 1 || day > 239) {
      Alert.alert('Invalid Day', 'Please enter a number between 1 and 239');
      return;
    }
    Alert.alert(
      'Simulate Progress',
      `This will set your progress to Day ${day} with ${day} completed readings and a ${day}-day streak. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate',
          onPress: () => {
            onSimulateProgress(day);
            setSimulateDay('');
            Alert.alert('Done', `Progress set to Day ${day}`);
          },
        },
      ]
    );
  };

  return (
    <>
      <Text style={[styles.sectionHeader, { color: '#FF9800' }]}>
        Dev Tools
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderWidth: 1, borderColor: '#FF9800' },
        ]}
      >
        <Text style={[styles.devNote, { color: colors.textSecondary }]}>
          Only visible in development
        </Text>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>
            Current: Day {currentSnippet} | Streak: {currentStreak}
          </Text>
        </View>

        <View style={styles.simulateRow}>
          <TextInput
            style={[
              styles.simulateInput,
              {
                color: colors.text,
                backgroundColor: colorScheme === 'dark' ? '#404040' : '#F5F5F5',
                borderColor: colors.border,
              },
            ]}
            placeholder="Day (1-239)"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            value={simulateDay}
            onChangeText={setSimulateDay}
            underlineColorAndroid="transparent"
          />
          <Pressable
            style={({ pressed }) => [
              styles.simulateButton,
              { backgroundColor: '#FF9800', opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleSimulateProgress}
          >
            <Text style={styles.simulateButtonText}>Simulate</Text>
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Pressable
          style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => {
            onResetFTUE();
            Alert.alert('Done', 'First-time experience reset. Go to the Home tab to see the welcome banner.');
          }}
        >
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>
            {t('ftue.resetFTUE')}
          </Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 8,
  },
  label: { fontSize: 16 },
  divider: { height: 1, marginVertical: 8 },
  devNote: { fontSize: 11, fontStyle: 'italic', marginBottom: 8 },
  simulateRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  simulateInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  simulateButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulateButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 8,
  },
  actionIcon: { fontSize: 20, width: 32 },
  actionLabel: { flex: 1, fontSize: 16 },
});
