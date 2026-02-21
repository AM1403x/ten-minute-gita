import React, { useMemo, useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Keyboard,
  BackHandler,
  Platform,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useSnippets } from '@/hooks/useSnippets';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import Colors from '@/constants/Colors';
import { letterSpacingStyle } from '@/constants/fonts';
import { setSearchHighlight } from '@/utils/searchHighlight';

interface ReadingItem {
  id: number;
  title: string;
  chapter: number;
  verses: string;
}

interface SearchResult extends ReadingItem {
  matchContext: string; // snippet of text around the match
  matchSource: string; // where the match was found
}

// Extract a snippet of text around the match, with the match highlighted context
function extractContext(text: string, query: string, maxLen: number = 120): string | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return null;

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  let snippet = text.slice(start, end).replace(/\n+/g, ' ').trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

export default function CompletedReadingsScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useLanguage();
  const router = useRouter();
  const navigation = useNavigation();
  const { state } = useApp();
  const { getSnippet } = useSnippets();
  const { completedSnippets } = state.progress;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('completedList.allReadings'),
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerBackVisible: false,
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)/progress');
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 17 }}>Back</Text>
        </Pressable>
      ),
    });
  }, [navigation, router, colors, t]);

  // Android: dismiss keyboard on back press before navigating
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      // If keyboard is up (search input focused), dismiss it first
      Keyboard.dismiss();
      return false; // let default back navigation proceed
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(text), 200);
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  // Build full list sorted by most recent
  const allReadings = useMemo((): ReadingItem[] => {
    return [...completedSnippets]
      .sort((a, b) => b - a)
      .map((id) => {
        const snippet = getSnippet(id);
        if (!snippet) return null;
        return {
          id,
          title: snippet.title,
          chapter: snippet.chapter,
          verses: snippet.verses,
        };
      })
      .filter((item): item is ReadingItem => item !== null);
  }, [completedSnippets, getSnippet]);

  // Search with context extraction
  const searchResults = useMemo((): SearchResult[] => {
    const q = debouncedQuery.trim();
    if (!q) {
      return allReadings.map(item => ({
        ...item,
        matchContext: '',
        matchSource: '',
      }));
    }

    const results: SearchResult[] = [];
    const lowered = q.toLowerCase();

    for (const item of allReadings) {
      const snippet = getSnippet(item.id);
      if (!snippet) continue;

      // Search in order of priority: title, verses, commentary, reflection
      const sources: { text: string; label: string }[] = [
        { text: snippet.title, label: 'Title' },
        { text: (snippet.verseTranslations ?? []).join(' '), label: 'Verse' },
        { text: snippet.commentary, label: 'Commentary' },
        { text: snippet.reflection, label: 'Reflection' },
      ];

      let matched = false;
      for (const source of sources) {
        const context = extractContext(source.text, q);
        if (context) {
          results.push({
            ...item,
            matchContext: context,
            matchSource: source.label,
          });
          matched = true;
          break; // show first match source only
        }
      }

      // Also try Sanskrit and transliteration
      if (!matched && snippet.sanskrit.toLowerCase().includes(lowered)) {
        const context = extractContext(snippet.sanskrit, q);
        if (context) {
          results.push({ ...item, matchContext: context, matchSource: 'Sanskrit' });
          matched = true;
        }
      }
      if (!matched && snippet.transliteration.toLowerCase().includes(lowered)) {
        const context = extractContext(snippet.transliteration, q);
        if (context) {
          results.push({ ...item, matchContext: context, matchSource: 'Transliteration' });
        }
      }
    }

    // Sort: title matches first, then by day descending
    results.sort((a, b) => {
      const aTitle = a.matchSource === 'Title' ? 0 : 1;
      const bTitle = b.matchSource === 'Title' ? 0 : 1;
      if (aTitle !== bTitle) return aTitle - bTitle;
      return b.id - a.id;
    });

    return results;
  }, [allReadings, debouncedQuery, getSnippet]);

  const isSearching = debouncedQuery.trim().length > 0;

  // Render highlighted text — splits text around query match
  const HighlightedText = useCallback(({ text, highlight, color }: { text: string; highlight: string; color: string }) => {
    if (!highlight.trim()) return <Text style={[styles.contextText, { color }]}>{text}</Text>;

    const parts: React.ReactNode[] = [];
    const lower = text.toLowerCase();
    const hLower = highlight.toLowerCase();
    let lastIndex = 0;

    let idx = lower.indexOf(hLower);
    while (idx !== -1) {
      if (idx > lastIndex) {
        parts.push(
          <Text key={lastIndex} style={[styles.contextText, { color }]}>
            {text.slice(lastIndex, idx)}
          </Text>
        );
      }
      parts.push(
        <Text key={idx} style={[styles.contextText, styles.highlight, { color: colors.text }]}>
          {text.slice(idx, idx + highlight.length)}
        </Text>
      );
      lastIndex = idx + highlight.length;
      idx = lower.indexOf(hLower, lastIndex);
    }
    if (lastIndex < text.length) {
      parts.push(
        <Text key={lastIndex} style={[styles.contextText, { color }]}>
          {text.slice(lastIndex)}
        </Text>
      );
    }
    return <Text>{parts}</Text>;
  }, [colors.text]);

  const renderItem = useCallback(({ item }: { item: SearchResult }) => (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => {
        Keyboard.dismiss();
        if (isSearching) {
          setSearchHighlight(debouncedQuery, item.matchSource);
        }
        router.push(`/reading/${item.id}?mode=review`);
      }}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.dayLabel, { color: colors.accent }]}>
          {t('common.dayNum', { day: item.id })}
        </Text>
        <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('common.chapter')} {item.chapter} · {item.verses}
        </Text>
        {isSearching && item.matchContext !== '' && (
          <View style={[styles.contextContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.matchSource, { color: colors.accent }]}>
              {item.matchSource}
            </Text>
            <HighlightedText
              text={item.matchContext}
              highlight={debouncedQuery}
              color={colors.textSecondary}
            />
          </View>
        )}
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  ), [colors, t, router, isSearching, debouncedQuery, HighlightedText]);

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Search bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('completedList.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={handleQueryChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            underlineColorAndroid="transparent"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <Text style={[styles.clearButton, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Result count when searching */}
        {isSearching && (
          <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
            {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
          </Text>
        )}

        {/* Results */}
        <FlatList
          data={searchResults}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('completedList.noResults')}
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 44,
  },
  clearButton: {
    fontSize: 18,
    paddingLeft: 8,
  },
  resultCount: {
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowContent: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  contextContainer: {
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
  },
  matchSource: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    ...letterSpacingStyle(0.5),
    marginBottom: 3,
  },
  contextText: {
    fontSize: 13,
    lineHeight: 18,
  },
  highlight: {
    fontWeight: '700',
    backgroundColor: 'rgba(224, 122, 95, 0.2)',
  },
  chevron: {
    fontSize: 22,
    marginLeft: 8,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
  },
});
