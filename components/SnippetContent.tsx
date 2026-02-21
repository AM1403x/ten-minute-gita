import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Snippet } from '@/types';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { HighlightText } from '@/components/snippet/HighlightText';
import { VerseBlock } from '@/components/snippet/VerseBlock';
import { Paragraph } from '@/components/snippet/Paragraph';
import { Divider } from '@/components/snippet/Divider';
import { LockedContent } from '@/components/snippet/LockedContent';
import { AudioVerseBlock } from '@/components/audio/AudioVerseBlock';
import { AudioParagraph } from '@/components/audio/AudioParagraph';
import { BreathingDots } from '@/components/audio/BreathingDots';
import { getVoiceColors } from '@/constants/config';
import { FONTS, letterSpacingStyle } from '@/constants/fonts';
import { AlignedData } from '@/types/audio';
import type { AudioHighlightState, WordHighlight } from '@/hooks/useAudioHighlight';

interface SnippetContentProps {
  snippet: Snippet;
  isContentLocked?: boolean;
  isPreviewLimited?: boolean;
  unlockTime?: string;
  lockMessage?: string;
  onScrollProgress?: (progress: number, minutesLeft: number) => void;
  highlightQuery?: string;
  highlightSection?: string;
  isAudioActive?: boolean;
  audioHighlight?: AudioHighlightState;
  alignedData?: AlignedData | null;
  onScrollRef?: (ref: ScrollView | null) => void;
  onUserScrollBegin?: () => void;
  onScrollY?: (y: number) => void;
  onActiveParagraphPageY?: (pageY: number) => void;
  renderFooter?: () => React.ReactNode;
  contentPaddingBottom?: number;
}

const WORDS_PER_MINUTE = 220;

export function SnippetContent({ snippet, isContentLocked = false, isPreviewLimited = false, unlockTime, lockMessage, onScrollProgress, highlightQuery, highlightSection, isAudioActive = false, audioHighlight, alignedData, onScrollRef, onUserScrollBegin, onScrollY, onActiveParagraphPageY, renderFooter, contentPaddingBottom }: SnippetContentProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const vc = getVoiceColors(colorScheme);
  const { t, language } = useLanguage();
  const { state } = useApp();
  const { fontSize, showSanskrit, showTransliteration, showTranslation } = state.progress.settings;

  const scrollRef = useRef<ScrollView>(null);
  const [isHighlightActive, setIsHighlightActive] = useState(!!highlightQuery);
  const pendingScroll = useRef<string | null>(null);

  useEffect(() => {
    if (!highlightQuery) {
      setIsHighlightActive(false);
      return;
    }
    setIsHighlightActive(true);
    pendingScroll.current = highlightSection && highlightSection !== 'Title' ? highlightSection : null;
    const fadeTimer = setTimeout(() => setIsHighlightActive(false), 3500);
    return () => clearTimeout(fadeTimer);
  }, [highlightQuery, highlightSection]);

  const onSectionLayout = useCallback((section: string, y: number) => {
    if (pendingScroll.current === section && scrollRef.current) {
      pendingScroll.current = null;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
      }, 300);
    }
  }, []);

  const totalWordCount = useMemo(() => {
    const allText = [
      snippet.sanskrit, snippet.transliteration,
      snippet.verseTranslations.join(' '),
      snippet.commentary || '', snippet.reflection,
    ].join(' ');
    return allText.split(/\s+/).filter(word => word.length > 0).length;
  }, [snippet]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    onScrollY?.(contentOffset.y);
    if (onScrollProgress) {
      const scrollableHeight = contentSize.height - layoutMeasurement.height;
      if (scrollableHeight > 0) {
        const progress = Math.min(100, Math.round((contentOffset.y / scrollableHeight) * 100));
        const wordsRemaining = Math.round(totalWordCount * (1 - progress / 100));
        const minutesLeft = Math.max(1, Math.ceil(wordsRemaining / WORDS_PER_MINUTE));
        onScrollProgress(progress, minutesLeft);
      } else {
        onScrollProgress(100, 0);
      }
    }
  };

  const sanskritVerses = useMemo(() => snippet.sanskrit.split(/\n\n+/).filter(v => v.trim()), [snippet.sanskrit]);
  const translitVerses = useMemo(() => snippet.transliteration.split(/\n\n+/).filter(v => v.trim()), [snippet.transliteration]);

  const commentaryParagraphs = useMemo(() => {
    if (!snippet.commentary) return [];
    return snippet.commentary.split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(p => p.length > 0);
  }, [snippet.commentary]);

  const reflectionParagraphs = useMemo(() => {
    return snippet.reflection.split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(p => p.length > 0);
  }, [snippet.reflection]);

  const displayTitle = snippet.title.replace(/^(Day \d+:\s*|दिन\s*\d+[:\s]*)/, '');
  const verseCount = Math.max(sanskritVerses.length, snippet.verseTranslations.length);

  // Audio: map verse_index → audio section indices
  const verseSectionMap = useMemo(() => {
    if (!isAudioActive || !alignedData) return null;
    const map = new Map<number, { verseSectionIdx: number; translationSectionIdx: number }>();
    for (let i = 0; i < alignedData.sections.length; i++) {
      const s = alignedData.sections[i];
      const vi = s.verse_index;
      if (vi !== undefined) {
        const existing = map.get(vi) || { verseSectionIdx: -1, translationSectionIdx: -1 };
        if (s.type === 'verse') {
          existing.verseSectionIdx = i;
        } else if (s.type === 'verseTranslation') {
          existing.translationSectionIdx = i;
        }
        map.set(vi, existing);
      }
    }
    return map;
  }, [isAudioActive, alignedData]);

  // Audio: find commentary and reflection section indices
  const commentarySectionIdx = useMemo(() => {
    if (!alignedData) return -1;
    return alignedData.sections.findIndex(s => s.type === 'commentary');
  }, [alignedData]);

  const reflectionSectionIdx = useMemo(() => {
    if (!alignedData) return -1;
    return alignedData.sections.findIndex(s => s.type === 'reflection');
  }, [alignedData]);

  // Audio: determine which commentary paragraph is active
  const activeCommentaryParagraph = useMemo(() => {
    if (!isAudioActive || !audioHighlight || audioHighlight.highlightType !== 'sentence') return -1;
    if (audioHighlight.sectionIndex !== commentarySectionIdx) return -1;
    const { startWordIndex } = audioHighlight.sentenceRange;
    let wordOffset = 0;
    for (let i = 0; i < commentaryParagraphs.length; i++) {
      const paraWordCount = commentaryParagraphs[i].split(/\s+/).filter(w => w).length;
      if (startWordIndex < wordOffset + paraWordCount) return i;
      wordOffset += paraWordCount;
    }
    return commentaryParagraphs.length - 1;
  }, [isAudioActive, audioHighlight, commentarySectionIdx, commentaryParagraphs]);

  // Audio: determine which reflection paragraph is active
  const activeReflectionParagraph = useMemo(() => {
    if (!isAudioActive || !audioHighlight || audioHighlight.highlightType !== 'sentence') return -1;
    if (audioHighlight.sectionIndex !== reflectionSectionIdx) return -1;
    const { startWordIndex } = audioHighlight.sentenceRange;
    let wordOffset = 0;
    for (let i = 0; i < reflectionParagraphs.length; i++) {
      const paraWordCount = reflectionParagraphs[i].split(/\s+/).filter(w => w).length;
      if (startWordIndex < wordOffset + paraWordCount) return i;
      wordOffset += paraWordCount;
    }
    return reflectionParagraphs.length - 1;
  }, [isAudioActive, audioHighlight, reflectionSectionIdx, reflectionParagraphs]);

  // Audio: determine which verse block is active (verse or verseTranslation playing)
  const activeVerseIndex = useMemo(() => {
    if (!isAudioActive || !audioHighlight || !verseSectionMap) return -1;
    if (audioHighlight.highlightType !== 'word' && audioHighlight.highlightType !== 'sentence') return -1;
    const sectionIdx = audioHighlight.sectionIndex;
    for (const [vi, mapping] of verseSectionMap) {
      if (mapping.verseSectionIdx === sectionIdx || mapping.translationSectionIdx === sectionIdx) {
        return vi;
      }
    }
    return -1;
  }, [isAudioActive, audioHighlight, verseSectionMap]);

  // Refs for paragraph Views — used to measure() exact screen position for auto-scroll
  const paragraphRefs = useRef<Map<string, View>>(new Map());
  const setParagraphRef = useCallback((key: string, node: View | null) => {
    if (node) {
      paragraphRefs.current.set(key, node);
    } else {
      paragraphRefs.current.delete(key);
    }
  }, []);

  // Measure active paragraph's screen Y and report to parent for auto-scroll
  const lastMeasuredKey = useRef<string | null>(null);
  // Reset when snippet changes so auto-scroll fires for the new snippet's first active section
  const snippetIdForReset = snippet.id;
  useEffect(() => {
    lastMeasuredKey.current = null;
  }, [snippetIdForReset]);

  useEffect(() => {
    if (!isAudioActive || !onActiveParagraphPageY) return;

    // Determine the active paragraph key
    let activeKey: string | null = null;
    if (activeCommentaryParagraph >= 0) {
      activeKey = `commentary_${activeCommentaryParagraph}`;
    } else if (activeReflectionParagraph >= 0) {
      activeKey = `reflection_${activeReflectionParagraph}`;
    } else if (activeVerseIndex >= 0) {
      activeKey = `verse_${activeVerseIndex}`;
    }

    if (!activeKey || activeKey === lastMeasuredKey.current) return;
    lastMeasuredKey.current = activeKey;

    const node = paragraphRefs.current.get(activeKey);
    if (!node) return;

    // measure() gives us the absolute screen coordinates
    node.measure((_x: number, _y: number, _w: number, _h: number, _pageX: number, pageY: number) => {
      if (pageY != null) {
        onActiveParagraphPageY(pageY);
      }
    });
  }, [isAudioActive, activeCommentaryParagraph, activeReflectionParagraph, activeVerseIndex, onActiveParagraphPageY]);

  return (
    <ScrollView
      ref={(node) => {
        (scrollRef as React.MutableRefObject<ScrollView | null>).current = node;
        onScrollRef?.(node);
      }}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.contentContainer, contentPaddingBottom != null && { paddingBottom: contentPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onScrollBeginDrag={onUserScrollBegin}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.chapterLabel, { color: colors.accent }]}>
          {t('common.chapter')} {snippet.chapter}
        </Text>
        <Text style={[styles.versesLabel, { color: colors.textSecondary }]}>
          {t('common.verses')} {snippet.verses}
        </Text>
        <HighlightText
          text={displayTitle}
          query={isHighlightActive ? highlightQuery : undefined}
          color={colors.text}
          style={[styles.title, { fontSize: fontSize + 6, lineHeight: (fontSize + 6) * 1.3 }]}
        />
      </View>

      {/* Verses */}
      {isContentLocked ? (
        <>
          <View style={[styles.versesContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.versesAccent, { backgroundColor: colors.accent }]} />
            <View style={styles.versesContent}>
              <Text selectable style={[styles.sanskritPreview, { color: colors.text, fontSize: fontSize + 3, lineHeight: (fontSize + 3) * 1.5 }]}>
                {sanskritVerses[0]?.split('\n')[0] || ''}...
              </Text>
            </View>
          </View>
          <Divider color={colors.border} />
          <LockedContent colors={colors} colorScheme={colorScheme} message={lockMessage || t('snippet.completeEarlier')} />
        </>
      ) : (
        <>
          <View
            ref={(node) => setParagraphRef('verses', node)}
            style={[styles.versesContainer, { backgroundColor: colors.card }]}
            onLayout={(e) => {
              onSectionLayout('Verse', e.nativeEvent.layout.y);
            }}
          >
            <View style={[styles.versesAccent, { backgroundColor: colors.accent }]} />
            <View style={styles.versesContent}>
              {Array.from({ length: verseCount }).map((_, index) => {
                if (isAudioActive && verseSectionMap) {
                  const verseAudio = verseSectionMap.get(index);
                  const vIdx = verseAudio?.verseSectionIdx ?? -1;
                  const tIdx = verseAudio?.translationSectionIdx ?? -1;
                  const isVersePlaying = audioHighlight?.highlightType === 'word' && audioHighlight.sectionIndex === vIdx;
                  const isTranslationPlaying = audioHighlight?.highlightType === 'sentence' && audioHighlight.sectionIndex === tIdx;
                  const verseWords = vIdx >= 0 ? alignedData?.sections[vIdx].words : undefined;
                  const activeWordIdx = isVersePlaying ? (audioHighlight as WordHighlight).activeWordIndex : -1;

                  return (
                    <View key={index} ref={(node) => setParagraphRef(`verse_${index}`, node)} collapsable={false}>
                      <AudioVerseBlock
                        sanskrit={sanskritVerses[index] || ''}
                        transliteration={translitVerses[index] || ''}
                        translation={snippet.verseTranslations[index] || ''}
                        fontSize={fontSize}
                        colors={colors}
                        isLast={index === verseCount - 1}
                        showSanskrit={showSanskrit}
                        showTransliteration={showTransliteration}
                        showTranslation={showTranslation}
                        highlightQuery={isHighlightActive ? highlightQuery : undefined}
                        verseWords={verseWords}
                        activeWordIndex={activeWordIdx}
                        isTranslationActive={isTranslationPlaying}
                      />
                    </View>
                  );
                }

                return (
                  <VerseBlock
                    key={index}
                    index={index}
                    sanskrit={sanskritVerses[index] || ''}
                    transliteration={translitVerses[index] || ''}
                    translation={snippet.verseTranslations[index] || ''}
                    fontSize={fontSize}
                    colors={colors}
                    isLast={index === verseCount - 1}
                    showSanskrit={showSanskrit}
                    showTransliteration={showTransliteration}
                    showTranslation={showTranslation}
                    highlightQuery={isHighlightActive ? highlightQuery : undefined}
                  />
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* Commentary + Reflection */}
      {isPreviewLimited && !isContentLocked ? (
        <>
          {commentaryParagraphs.length > 0 && (
            <>
              <Divider color={colors.border} />
              <View style={[styles.commentarySection, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>📖</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('snippet.commentary')}</Text>
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>{t('snippet.preview')}</Text>
                  </View>
                </View>
                <View style={styles.commentaryContent}>
                  {commentaryParagraphs.slice(0, 3).map((para, index) => (
                    <Paragraph key={index} text={para} fontSize={fontSize} color={colors.text} italicColor={colors.accent} accentColor={colors.accent} />
                  ))}
                </View>
              </View>
            </>
          )}
          <Divider color={colors.border} />
          <LockedContent colors={colors} colorScheme={colorScheme} unlockTime={unlockTime} />
        </>
      ) : !isContentLocked ? (
        <>
          {isAudioActive && audioHighlight?.highlightType === 'gap' && <BreathingDots />}

          {commentaryParagraphs.length > 0 && (
            <>
              <Divider color={colors.border} />
              <View style={[styles.commentarySection, { backgroundColor: colors.card }]} onLayout={(e) => {
                onSectionLayout('Commentary', e.nativeEvent.layout.y);
              }}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>📖</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('snippet.commentary')}</Text>
                </View>
                <View style={styles.commentaryContent}>
                  {commentaryParagraphs.map((para, index) => {
                    if (isAudioActive) {
                      return (
                        <View key={index} ref={(node) => setParagraphRef(`commentary_${index}`, node)} collapsable={false}>
                          <AudioParagraph
                            text={para}
                            fontSize={fontSize}
                            color={colors.text}
                            italicColor={colors.accent}
                            accentColor={colors.accent}
                            highlightQuery={isHighlightActive ? highlightQuery : undefined}
                            isHighlighted={index === activeCommentaryParagraph}
                          />
                        </View>
                      );
                    }
                    return (
                      <Paragraph
                        key={index}
                        text={para}
                        fontSize={fontSize}
                        color={colors.text}
                        italicColor={colors.accent}
                        accentColor={colors.accent}
                        highlightQuery={isHighlightActive ? highlightQuery : undefined}
                      />
                    );
                  })}
                </View>
              </View>
            </>
          )}

          <Divider color={colors.border} />

          <View
            style={[styles.reflectionSection, { backgroundColor: colors.card }]}
            onLayout={(e) => {
              onSectionLayout('Reflection', e.nativeEvent.layout.y);
            }}
          >
            <View style={styles.reflectionHeader}>
              <Text style={styles.reflectionEmoji}>🪷</Text>
              <Text style={[styles.reflectionTitle, { color: colors.accent }]}>{t('snippet.reflection')}</Text>
            </View>
            {reflectionParagraphs.map((para, index) => (
              <View
                key={index}
                ref={(node) => setParagraphRef(`reflection_${index}`, node)}
                collapsable={false}
                style={isAudioActive && index === activeReflectionParagraph ? [styles.reflectionHighlighted, { backgroundColor: vc.CORAL_GLOW }] : undefined}
              >
                <HighlightText
                  text={para}
                  query={isHighlightActive ? highlightQuery : undefined}
                  color={colors.text}
                  style={[
                    styles.reflectionText,
                    { fontSize, lineHeight: fontSize * 1.7 * (language === 'hi' ? 1.1 : 1), marginBottom: index < reflectionParagraphs.length - 1 ? fontSize : 0 },
                  ]}
                />
              </View>
            ))}
          </View>

          <Text style={[styles.attribution, { color: colors.textSecondary }]}>
            {t('snippet.inspiredBy')}
          </Text>
        </>
      ) : null}

      {renderFooter?.()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 80 },
  header: { marginBottom: 24 },
  chapterLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', ...letterSpacingStyle(2), marginBottom: 4 },
  versesLabel: { fontSize: 13, marginBottom: 10 },
  title: { fontWeight: '700', fontFamily: FONTS.serif },
  versesContainer: { borderRadius: 16, flexDirection: 'row', overflow: 'hidden', marginBottom: 8 },
  versesAccent: { width: 4 },
  versesContent: { flex: 1, padding: 20 },
  sanskritPreview: { fontFamily: FONTS.devanagari, opacity: 0.7 },
  commentarySection: { borderRadius: 16, padding: 20, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionEmoji: { fontSize: 20, marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  commentaryContent: {},
  reflectionSection: { borderRadius: 16, padding: 20, marginBottom: 24 },
  reflectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  reflectionEmoji: { fontSize: 22, marginRight: 10 },
  reflectionTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', ...letterSpacingStyle(1) },
  reflectionText: { fontFamily: FONTS.serifItalic, fontStyle: 'italic' },
  reflectionHighlighted: { borderRadius: 8, paddingHorizontal: 4, marginHorizontal: -4 },
  attribution: { fontSize: 11, textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },
  previewBadge: { backgroundColor: '#FF9800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  previewBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
