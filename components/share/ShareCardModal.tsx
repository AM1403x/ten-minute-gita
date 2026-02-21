import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ShareCard } from './ShareCard';
import { captureAndShare } from '@/utils/shareCard';
import type { ShareCardContent } from '@/utils/shareCard';
import { CONFIG } from '@/constants/config';
import Colors from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { logger } from '@/utils/logger';

const CARD_SIZE = CONFIG.SHARE_CARD.SIZE;
const PREVIEW_SIZE = 280;
const SCALE = PREVIEW_SIZE / CARD_SIZE;

interface ShareCardModalProps {
  visible: boolean;
  onClose: () => void;
  content: ShareCardContent | null;
}

export function ShareCardModal({ visible, onClose, content }: ShareCardModalProps) {
  const cardRef = useRef<View>(null);
  const [gradientIndex, setGradientIndex] = useState(0);
  const [textScale, setTextScale] = useState(1.15);
  const [sharing, setSharing] = useState(false);
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useLanguage();

  if (!content) return null;

  const handleShare = async () => {
    setSharing(true);
    try {
      await captureAndShare(cardRef);
    } catch (e) {
      logger.error('ShareCardModal', e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>

          <Text style={[styles.title, { color: colors.text }]}>
            {t('share.title')}
          </Text>

          {/* Preview — scaled down card */}
          <View style={styles.previewContainer}>
            <View style={{
              width: CARD_SIZE,
              height: CARD_SIZE,
              transform: [{ scale: SCALE }],
              transformOrigin: 'top left',
            }}>
              <ShareCard ref={cardRef} content={content} gradientIndex={gradientIndex} textScale={textScale} />
            </View>
          </View>

          {/* Gradient selector */}
          <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
            {t('share.selectStyle')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradientRow}>
            {CONFIG.SHARE_CARD.GRADIENTS.map((g, i) => (
              <Pressable key={i} onPress={() => setGradientIndex(i)}>
                <View style={[
                  styles.gradientThumbFrame,
                  i === gradientIndex
                    ? { borderColor: colors.accent }
                    : { borderColor: 'transparent' },
                ]}>
                  <LinearGradient
                    colors={[...g.colors]}
                    start={g.start}
                    end={g.end}
                    style={styles.gradientThumb}
                  />
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* Text size control */}
          <View style={styles.textSizeRow}>
            <Text style={[styles.selectorLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
              {t('share.textSize')}
            </Text>
            <View style={styles.textSizeControls}>
              <Pressable
                onPress={() => setTextScale(s => Math.max(CONFIG.SHARE_CARD.TEXT_SCALE_MIN, +(s - CONFIG.SHARE_CARD.TEXT_SCALE_STEP).toFixed(1)))}
                style={[styles.textSizeBtn, { backgroundColor: colorScheme === 'dark' ? '#404040' : '#E8E8E8' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.textSizeBtnLabel, { color: colors.text, fontSize: 15 }]}>A−</Text>
              </Pressable>
              <Pressable
                onPress={() => setTextScale(s => Math.min(CONFIG.SHARE_CARD.TEXT_SCALE_MAX, +(s + CONFIG.SHARE_CARD.TEXT_SCALE_STEP).toFixed(1)))}
                style={[styles.textSizeBtn, { backgroundColor: colorScheme === 'dark' ? '#404040' : '#E8E8E8' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.textSizeBtnLabel, { color: colors.text, fontSize: 15 }]}>A+</Text>
              </Pressable>
            </View>
          </View>

          {/* Share button */}
          <Pressable
            onPress={handleShare}
            disabled={sharing}
            style={[styles.shareButton, { backgroundColor: colors.accent, opacity: sharing ? 0.6 : 1 }]}
          >
            <Ionicons name="share-outline" size={20} color="#FFF" />
            <Text style={styles.shareButtonText}>{t('share.button')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  previewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  gradientRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  gradientThumbFrame: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientThumb: {
    width: 48,
    height: 48,
    borderRadius: 11,
  },
  textSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  textSizeControls: {
    flexDirection: 'row',
    gap: 12,
  },
  textSizeBtn: {
    width: 40,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeBtnLabel: {
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
