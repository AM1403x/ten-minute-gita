import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, LayoutChangeEvent } from 'react-native';
import { getVoiceColors } from '@/constants/config';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { formatTime } from '@/utils/sectionHelpers';

interface ScrubBarProps {
  currentTime: number;
  duration: number;
  speed: number;
  onSeek: (time: number) => void;
}

const THUMB_SIZE = 22;
const THUMB_RADIUS = THUMB_SIZE / 2;

export function ScrubBar({ currentTime, duration, speed, onSeek }: ScrubBarProps) {
  const vc = getVoiceColors(useAppColorScheme());

  // Refs for gesture math — avoids stale closures and re-renders during drag
  const trackWidthRef = useRef(0);
  const trackXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  // Animated value (0–1) drives thumb + fill without re-renders
  const animProgress = useRef(new Animated.Value(0)).current;

  // Timestamp shown during drag (null = show currentTime from props)
  const [dragTime, setDragTime] = useState<number | null>(null);

  // Sync playback position → animated value when NOT dragging
  useEffect(() => {
    if (!isDraggingRef.current && duration > 0) {
      animProgress.setValue(currentTime / duration);
    }
  }, [currentTime, duration, animProgress]);

  const clampRatio = (pageX: number): number => {
    if (trackWidthRef.current <= 0) return 0;
    const rel = pageX - trackXRef.current;
    return Math.max(0, Math.min(1, rel / trackWidthRef.current));
  };

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        const ratio = clampRatio(evt.nativeEvent.pageX);
        animProgress.setValue(ratio);
        setDragTime(ratio * durationRef.current);
      },
      onPanResponderMove: (evt) => {
        const ratio = clampRatio(evt.nativeEvent.pageX);
        // Animated.setValue is synchronous and cheap — moves thumb instantly
        animProgress.setValue(ratio);
        setDragTime(ratio * durationRef.current);
      },
      onPanResponderRelease: (evt) => {
        const ratio = clampRatio(evt.nativeEvent.pageX);
        const time = ratio * durationRef.current;
        isDraggingRef.current = false;
        setDragTime(null);
        onSeekRef.current(time);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        setDragTime(null);
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [],
  );

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    event.target.measure((_x: number, _y: number, width: number, _h: number, pageX: number) => {
      trackXRef.current = pageX;
      trackWidthRef.current = width;
    });
  }, []);

  // Interpolate 0–1 → '0%' to '100%' for fill width and thumb left
  const fillWidth = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const thumbLeft = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const shownTime = dragTime !== null ? dragTime : currentTime;

  return (
    <View style={styles.container}>
      <View
        style={styles.trackContainer}
        onLayout={onTrackLayout}
        collapsable={false}
        {...panResponder.panHandlers}
      >
        {/* Track background */}
        <View style={[styles.track, { backgroundColor: vc.TRACK_BG }]}>
          {/* Fill bar — driven by Animated interpolation */}
          <Animated.View
            style={[styles.trackFill, { backgroundColor: vc.CORAL, width: fillWidth }]}
          />
        </View>
        {/* Thumb — positioned via Animated percentage */}
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: vc.CORAL, left: thumbLeft, marginLeft: -THUMB_RADIUS },
          ]}
        />
      </View>
      <View style={styles.timestamps}>
        <Text style={[styles.timestamp, { color: vc.TEXT_GREY }]}>
          {formatTime(shownTime / speed)}
        </Text>
        <Text style={[styles.timestamp, { color: vc.TEXT_GREY }]}>
          {formatTime(duration / speed)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  trackContainer: {
    height: 52,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    shadowColor: 'rgba(232, 114, 92, 0.4)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    top: 15,
  },
  timestamps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
});
