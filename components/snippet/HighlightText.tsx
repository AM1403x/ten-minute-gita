import React from 'react';
import { Text, TextInput, StyleSheet, StyleProp, TextStyle } from 'react-native';

export function HighlightText({ text, query, color, style }: { text: string; query?: string; color: string; style?: StyleProp<TextStyle> }) {
  // No active search highlight → use TextInput for native word-level selection & Look Up
  if (!query || !query.trim()) {
    return (
      <TextInput
        value={text}
        editable={false}
        multiline
        scrollEnabled={false}
        underlineColorAndroid="transparent"
        style={[{ color, padding: 0 }, style]}
      />
    );
  }

  // Active search highlight → use nested Text (copy-all only, but highlights are brief)
  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  let lastIdx = 0;
  let idx = lower.indexOf(qLower);
  let key = 0;

  while (idx !== -1) {
    if (idx > lastIdx) {
      parts.push(<Text key={key++} style={{ color }}>{text.slice(lastIdx, idx)}</Text>);
    }
    parts.push(
      <Text key={key++} style={{ color, fontWeight: '700', backgroundColor: 'rgba(224, 122, 95, 0.25)' }}>
        {text.slice(idx, idx + query.length)}
      </Text>
    );
    lastIdx = idx + query.length;
    idx = lower.indexOf(qLower, lastIdx);
  }
  if (lastIdx < text.length) {
    parts.push(<Text key={key++} style={{ color }}>{text.slice(lastIdx)}</Text>);
  }
  return <Text selectable style={style}>{parts}</Text>;
}
