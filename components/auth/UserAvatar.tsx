import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface UserAvatarProps {
  photoURL: string | null;
  displayName: string | null;
  email: string | null;
  uid: string;
  size: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: 32,
  medium: 48,
  large: 64,
} as const;

const FONT_SIZES = {
  small: 14,
  medium: 20,
  large: 28,
} as const;

// Curated palette: medium-brightness tones that read well with white text
// on both light (white) and dark (gray) card backgrounds.
const AVATAR_COLORS = [
  '#C06C5A', // terracotta
  '#5A9E95', // teal
  '#8878AD', // lavender
  '#5E8FAD', // steel blue
  '#B08555', // amber
  '#6A9B7E', // sage
];

function getColorFromUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(displayName: string | null, email: string | null): string {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

export function UserAvatar({ photoURL, displayName, email, uid, size }: UserAvatarProps) {
  const dimension = SIZES[size];
  const fontSize = FONT_SIZES[size];

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          styles.image,
          { width: dimension, height: dimension, borderRadius: dimension / 2 },
        ]}
      />
    );
  }

  const bgColor = getColorFromUid(uid);
  const initials = getInitials(displayName, email);

  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
