import { Platform } from 'react-native';

export const FONTS = {
  serif: Platform.select({
    ios: 'Georgia',
    default: 'NotoSerif-Regular',
  }),
  serifItalic: Platform.select({
    ios: 'Georgia',
    default: 'NotoSerif-Italic',
  }),
  serifBold: Platform.select({
    ios: 'Georgia',
    default: 'NotoSerif-Bold',
  }),
  serifBoldItalic: Platform.select({
    ios: 'Georgia',
    default: 'NotoSerif-BoldItalic',
  }),
  devanagari: Platform.select({
    ios: 'System',
    default: 'NotoSansDevanagari-Regular',
  }),
  devanagariBold: Platform.select({
    ios: 'System',
    default: 'NotoSansDevanagari-Bold',
  }),
} as const;

/**
 * Android applies letterSpacing after the last character, causing clipping.
 * Add paddingRight on Android to compensate.
 */
export function letterSpacingStyle(spacing: number) {
  return {
    letterSpacing: spacing,
    ...(Platform.OS === 'android' ? { paddingRight: spacing } : {}),
  };
}
