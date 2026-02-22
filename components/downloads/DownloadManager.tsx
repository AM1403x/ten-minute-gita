import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/Colors';
import { letterSpacingStyle } from '@/constants/fonts';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDownloadManager } from '@/contexts/DownloadManagerContext';

const STORAGE_KEY_AUTO_DOWNLOAD = '@offline_auto_download';
const STORAGE_KEY_AUTO_REMOVE = '@offline_auto_remove';

function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export function DownloadManager() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useLanguage();
  const { totalStorageUsed, deleteAll } = useDownloadManager();

  const [autoDownload, setAutoDownload] = useState(true);
  const [autoRemove, setAutoRemove] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_AUTO_DOWNLOAD).then((v) => {
      if (v !== null) setAutoDownload(v === 'true');
    }).catch(() => {});
    AsyncStorage.getItem(STORAGE_KEY_AUTO_REMOVE).then((v) => {
      if (v !== null) setAutoRemove(v === 'true');
    }).catch(() => {});
  }, []);

  const handleAutoDownloadToggle = (value: boolean) => {
    setAutoDownload(value);
    AsyncStorage.setItem(STORAGE_KEY_AUTO_DOWNLOAD, String(value)).catch(() => {});
  };

  const handleAutoRemoveToggle = (value: boolean) => {
    setAutoRemove(value);
    AsyncStorage.setItem(STORAGE_KEY_AUTO_REMOVE, String(value)).catch(() => {});
  };

  const handleClearAll = () => {
    Alert.alert(
      t('settings.offline.clearAllTitle'),
      t('settings.offline.clearAllMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.offline.clearAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAll('en');
              await deleteAll('hi');
            } catch {
              // Storage cleanup is best-effort
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.offline.title')}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Auto-download toggle */}
        <View style={styles.row}>
          <View style={styles.labelGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('settings.offline.autoDownload')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('settings.offline.autoDownloadSub')}
            </Text>
          </View>
          <Switch
            value={autoDownload}
            onValueChange={handleAutoDownloadToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={Platform.OS === 'ios' ? '#FFF' : colors.card}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Auto-remove toggle */}
        <View style={styles.row}>
          <View style={styles.labelGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('settings.offline.autoRemove')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('settings.offline.autoRemoveSub')}
            </Text>
          </View>
          <Switch
            value={autoRemove}
            onValueChange={handleAutoRemoveToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={Platform.OS === 'ios' ? '#FFF' : colors.card}
          />
        </View>

        {/* Storage footer — always visible when downloads exist */}
        {totalStorageUsed > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.storageFooter}>
              <Text style={[styles.storageCaption, { color: colors.textSecondary }]}>
                {t('settings.offline.using', { size: formatStorageSize(totalStorageUsed) })}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.clearButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleClearAll}
              >
                <Text style={styles.clearButtonText}>{t('settings.offline.clearAllButton')}</Text>
              </Pressable>
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
  labelGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: { fontSize: 16 },
  subtitle: { fontSize: 13, marginTop: 1 },
  divider: { height: 1, marginVertical: 8 },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  clearButtonText: {
    color: '#D4756B',
    fontSize: 12,
    fontWeight: '400',
  },
  storageFooter: {
    alignItems: 'center',
    paddingTop: 4,
  },
  storageCaption: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});
