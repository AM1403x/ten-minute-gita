import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CONFIG } from '@/constants/config';
import { FONTS } from '@/constants/fonts';
import type { ShareCardContent } from '@/utils/shareCard';

const SIZE = CONFIG.SHARE_CARD.SIZE;
const PAD = CONFIG.SHARE_CARD.PADDING;

interface ShareCardProps {
  content: ShareCardContent;
  gradientIndex: number;
  textScale?: number;
}

export const ShareCard = React.forwardRef<View, ShareCardProps>(
  ({ content, gradientIndex, textScale = 1 }, ref) => {
    const gradient = CONFIG.SHARE_CARD.GRADIENTS[gradientIndex];
    const isLightBg = gradientIndex === 2;
    const textColor = isLightBg ? '#3D2C2C' : '#FFFFFF';
    const subtextColor = isLightBg ? 'rgba(61,44,44,0.7)' : 'rgba(255,255,255,0.75)';
    const watermarkColor = isLightBg ? `rgba(61,44,44,${CONFIG.SHARE_CARD.WATERMARK_OPACITY})` : `rgba(255,255,255,${CONFIG.SHARE_CARD.WATERMARK_OPACITY})`;

    return (
      <View ref={ref} style={styles.container} collapsable={false}>
        <LinearGradient
          colors={[...gradient.colors]}
          start={gradient.start}
          end={gradient.end}
          style={styles.gradient}
        >
          {/* Decorative top */}
          <Text style={[styles.decorTop, { color: subtextColor }]}>॥</Text>

          {/* Main content */}
          <View style={styles.contentArea}>
            {content.type === 'verse' && content.sanskrit && (
              <Text
                style={[styles.sanskrit, { color: subtextColor }]}
                numberOfLines={2}
              >
                {content.sanskrit.split('\n')[0]}
              </Text>
            )}
            <Text
              style={[styles.mainText, {
                color: textColor,
                fontSize: (content.type === 'reflection' ? 36 : 44) * textScale,
                lineHeight: (content.type === 'reflection' ? 52 : 64) * textScale,
              }]}
              numberOfLines={content.type === 'reflection' ? 12 : CONFIG.SHARE_CARD.MAX_TEXT_LINES}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {content.text}
            </Text>
          </View>

          {/* Reference */}
          <Text style={[styles.reference, { color: subtextColor }]}>
            {content.type === 'reflection' ? `Day ${content.dayNumber} of 239` : content.reference}
          </Text>

          {/* Watermark */}
          <Text style={[styles.watermark, { color: watermarkColor }]}>
            10 Minute Gita
          </Text>
        </LinearGradient>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: PAD,
  },
  decorTop: {
    fontSize: 40,
    position: 'absolute',
    top: PAD,
  },
  contentArea: {
    alignItems: 'center',
    maxWidth: SIZE - PAD * 2,
    maxHeight: SIZE - PAD * 2 - 140,
    overflow: 'hidden',
  },
  sanskrit: {
    fontSize: 28,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 40,
  },
  mainText: {
    fontSize: 44,
    fontFamily: FONTS.serif,
    textAlign: 'center',
    lineHeight: 64,
  },
  reference: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    position: 'absolute',
    bottom: PAD + 48,
  },
  watermark: {
    fontSize: 20,
    fontWeight: '300',
    position: 'absolute',
    bottom: PAD,
  },
});
