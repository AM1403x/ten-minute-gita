import React from 'react';
import { Text, TextInput, StyleProp, TextStyle } from 'react-native';
import { HighlightText } from './HighlightText';

export function FormattedText({
  text,
  style,
  color,
  italicColor,
  highlightQuery,
}: {
  text: string;
  style: StyleProp<TextStyle>;
  color: string;
  italicColor?: string;
  highlightQuery?: string;
}) {
  const hasItalics = /(?<!\*)\*(?!\*)/.test(text);

  // No italics and no highlight → use TextInput for native word selection & Look Up
  if (!hasItalics && (!highlightQuery || !highlightQuery.trim())) {
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

  const result: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Replace ** temporarily to avoid matching them
  remaining = remaining.replace(/\*\*/g, '§§BOLD§§');

  while (remaining.length > 0) {
    const match = remaining.match(/\*([^*]+)\*/);
    if (match && match.index !== undefined) {
      if (match.index > 0) {
        const before = remaining.substring(0, match.index).replace(/§§BOLD§§/g, '**');
        // Use HighlightText for non-italic segments so search highlights work
        if (highlightQuery && highlightQuery.trim()) {
          result.push(<HighlightText key={key++} text={before} query={highlightQuery} color={color} />);
        } else {
          result.push(<Text key={key++} style={{ color }}>{before}</Text>);
        }
      }
      result.push(
        <Text key={key++} style={{ color: italicColor || color, fontStyle: 'italic' }}>{match[1]}</Text>
      );
      remaining = remaining.substring(match.index + match[0].length);
    } else {
      const final = remaining.replace(/§§BOLD§§/g, '**');
      if (highlightQuery && highlightQuery.trim()) {
        result.push(<HighlightText key={key++} text={final} query={highlightQuery} color={color} />);
      } else {
        result.push(<Text key={key++} style={{ color }}>{final}</Text>);
      }
      break;
    }
  }

  return <Text selectable style={style}>{result}</Text>;
}
