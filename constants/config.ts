import { Platform } from 'react-native';

export const CONFIG = {
  // Streak logic
  GRACE_PERIOD_HOURS: 4,

  // Gesture thresholds
  SWIPE_ACTIVE_OFFSET_X: Platform.OS === 'android' ? 50 : 30,
  SWIPE_FAIL_OFFSET_Y: 10,

  // Timer
  TIMER_UPDATE_INTERVAL_MS: 60000,

  // Storage keys
  STORAGE_KEY: '@gita_app_progress',
  FTUE_KEY: '@ftue_state',
  LANGUAGE_KEY: '@language',
  DOWNLOAD_INDEX_KEY: '@download_index',
  AUTH_GATE_DISMISSIBLE_LIMIT: 3, // dismissible prompts for first N post-install completions
  AUTO_REMOVE_DAYS: 7,

  // Audio CDN
  AUDIO_CDN_BASE_URL: 'https://pub-ec8478f2d8da4504a375135b1577cdd4.r2.dev/audio',
  DOWNLOADS_ENABLED: true,

  // App Store
  APP_STORE_ID: '6758332047',
  APP_STORE_URL: 'https://apps.apple.com/app/10-minute-gita/id6758332047',
  PLAY_STORE_URL: 'https://play.google.com/store/apps/details?id=com.tenminutegita.app',
  // Voice mode
  VOICE_MODE: {
    SKIP_SECONDS: 15,
    SPEED_MIN: 0.5,
    SPEED_MAX: 1.5,
    SPEED_STEP: 0.1,
    SPEED_DEFAULT: 1.0,
    SENTENCE_MAX_WORDS: 30,
    AUTOSCROLL_OFFSET_RATIO: 0.33,
    BACK_TO_NARRATION_THRESHOLD: 200,
    TOOLTIP_DURATION_MS: 3500,
    BREATHING_DOT_COUNT: 3,
    POSITION_SAVE_KEY_PREFIX: '@audio_position_',
    FIRST_TOOLTIP_KEY: '@audio_tooltip_shown',
    UPDATE_INTERVAL_MS: 100,
  },

  // Voice mode colors
  VOICE_COLORS: {
    CORAL: '#E8725C',
    CORAL_LIGHT: '#FFF0ED',
    CORAL_GLOW: 'rgba(232, 114, 92, 0.15)',
    CREAM: '#FDFAF7',
    TEXT_DARK: '#1A1A1A',
    TEXT_GREY: '#888888',
    TRACK_BG: '#e8e0dd',
    GREEN_COMPLETE: '#7BC4A8',
    BORDER_LIGHT: '#f0e8e5',
    SECTION_BG: '#faf7f5',
    WHITE: '#FFFFFF',
    CHIP_BG: '#f5f0ed',
    HANDLE_GREY: '#dddddd',
    LABEL_GREY: '#bbbbbb',
    CHIP_TEXT_PAST: '#aaaaaa',
    BUTTON_BORDER: '#e0d8d5',
  },

  // Share card
  SHARE_CARD: {
    SIZE: 1080,
    WATERMARK_OPACITY: 0.5,
    MAX_TEXT_LINES: 8,
    TEXT_SCALE_MIN: 1.0,
    TEXT_SCALE_MAX: 1.3,
    TEXT_SCALE_STEP: 0.15,
    PADDING: 80,
    GRADIENTS: [
      {
        name: 'Saffron Sunrise',
        colors: ['#E07A5F', '#C45B3E'] as [string, string],
        start: { x: 0, y: 0 } as { x: number; y: number },
        end: { x: 1, y: 1 } as { x: number; y: number },
      },
      {
        name: 'Sacred Dusk',
        colors: ['#2C3E6B', '#7B5EA7'] as [string, string],
        start: { x: 0, y: 0 } as { x: number; y: number },
        end: { x: 1, y: 1 } as { x: number; y: number },
      },
      {
        name: 'Lotus Dawn',
        colors: ['#D4A0A0', '#F5E6CA'] as [string, string],
        start: { x: 0, y: 0 } as { x: number; y: number },
        end: { x: 0.5, y: 1 } as { x: number; y: number },
      },
      {
        name: 'Forest Wisdom',
        colors: ['#2D6A4F', '#95D5B2'] as [string, string],
        start: { x: 0, y: 0 } as { x: number; y: number },
        end: { x: 1, y: 1 } as { x: number; y: number },
      },
      {
        name: 'Midnight Gold',
        colors: ['#1B1B2F', '#C6963C'] as [string, string],
        start: { x: 0, y: 0 } as { x: number; y: number },
        end: { x: 0.5, y: 1 } as { x: number; y: number },
      },
      {
        name: 'Ocean Depth',
        colors: ['#0D324D', '#7F5A83'] as [string, string],
        start: { x: 0, y: 0 } as { x: number; y: number },
        end: { x: 1, y: 1 } as { x: number; y: number },
      },
      {
        name: 'Clay Earth',
        colors: ['#8B5E3C', '#D4A574'] as [string, string],
        start: { x: 0, y: 0 } as { x: number; y: number },
        end: { x: 1, y: 1 } as { x: number; y: number },
      },
      {
        name: 'Peacock',
        colors: ['#004E64', '#25A18E'] as [string, string],
        start: { x: 0, y: 0 } as { x: number; y: number },
        end: { x: 1, y: 1 } as { x: number; y: number },
      },
    ],
  },
} as const;

const VOICE_COLORS_DARK = {
  CORAL: '#E8725C',
  CORAL_LIGHT: '#3D2520',
  CORAL_GLOW: 'rgba(232, 114, 92, 0.20)',
  CREAM: '#1E1B18',
  TEXT_DARK: '#F5F5F5',
  TEXT_GREY: '#999999',
  TRACK_BG: '#3A3330',
  GREEN_COMPLETE: '#7BC4A8',
  BORDER_LIGHT: '#3A3330',
  SECTION_BG: '#2A2520',
  WHITE: '#FFFFFF',
  CHIP_BG: '#2A2520',
  HANDLE_GREY: '#555555',
  LABEL_GREY: '#888888',
  CHIP_TEXT_PAST: '#777777',
  BUTTON_BORDER: '#4A4340',
} as const;

export function getVoiceColors(colorScheme: 'light' | 'dark') {
  return colorScheme === 'dark' ? VOICE_COLORS_DARK : CONFIG.VOICE_COLORS;
}

export type Config = typeof CONFIG;
