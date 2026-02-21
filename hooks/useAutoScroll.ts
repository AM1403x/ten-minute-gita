import { useState, useRef, useCallback, useEffect } from 'react';
import type { ScrollView } from 'react-native';

const SCROLL_RESUME_DELAY_MS = 8000;
const SCROLL_AWAY_THRESHOLD = 250; // px — only show pill when scrolled this far from narration

// Where on screen (from top) the active paragraph should land after auto-scroll
const DESIRED_SCREEN_Y = 200;

interface UseAutoScrollOptions {
  scrollRef: React.MutableRefObject<ScrollView | null>;
  isAudioActive: boolean;
}

export function useAutoScroll({
  scrollRef,
  isAudioActive,
}: UseAutoScrollOptions) {
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isScrolledAway, setIsScrolledAway] = useState(false);
  const [narrationDirection, setNarrationDirection] = useState<'up' | 'down'>('down');
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollYRef = useRef(0);
  const lastTargetScrollY = useRef(0);
  const lastMeasuredPageY = useRef(0);

  // User started dragging — pause auto-scroll
  const onUserScrollBegin = useCallback(() => {
    setIsUserScrolling(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => {
      setIsUserScrolling(false);
      setIsScrolledAway(false);
    }, SCROLL_RESUME_DELAY_MS);
  }, []);

  // Track scroll position for pill direction calculation
  const onScrollPosition = useCallback((y: number) => {
    scrollYRef.current = y;
    // Update narration direction on every scroll so the pill arrow stays accurate
    const dir: 'up' | 'down' = y > lastTargetScrollY.current ? 'up' : 'down';
    setNarrationDirection(prev => prev !== dir ? dir : prev);
    if (!isUserScrolling) return;
    const distance = Math.abs(y - lastTargetScrollY.current);
    const far = distance > SCROLL_AWAY_THRESHOLD;
    setIsScrolledAway(prev => prev !== far ? far : prev);
  }, [isUserScrolling]);

  // Called by SnippetContent when the active paragraph's screen pageY is measured
  const onActiveParagraphPageY = useCallback((pageY: number) => {
    lastMeasuredPageY.current = pageY;
    const targetScrollY = scrollYRef.current + (pageY - DESIRED_SCREEN_Y);
    const clampedTarget = Math.max(0, targetScrollY);
    lastTargetScrollY.current = clampedTarget;

    if (!isUserScrolling && isAudioActive) {
      // After snippet change, suppress auto-scroll for 3s so the view starts at the top
      if (Date.now() < suppressUntilRef.current) return;
      // Don't micro-scroll when content is near the top — the header and first
      // verses are already visible, scrolling would just push the title off-screen.
      // Auto-scroll engages once narration reaches sections further down (commentary, etc.).
      if (scrollYRef.current < 20 && clampedTarget < DESIRED_SCREEN_Y) {
        return;
      }
      scrollRef.current?.scrollTo({ y: clampedTarget, animated: true });
    }
  }, [isUserScrolling, isAudioActive, scrollRef]);

  // Grace period after snippet change — suppresses auto-scroll so the view
  // doesn't jump away from the top when audio auto-plays on a fresh snippet.
  const suppressUntilRef = useRef(0);

  // Reset scroll tracking state — called when snippet changes to prevent
  // stale scrollYRef from causing auto-scroll to compute wrong targets.
  const resetScrollState = useCallback(() => {
    scrollYRef.current = 0;
    lastTargetScrollY.current = 0;
    lastMeasuredPageY.current = 0;
    setIsUserScrolling(false);
    setIsScrolledAway(false);
    suppressUntilRef.current = Date.now() + 3000;
  }, []);

  // Scroll back to narration position (for "Now" pill)
  const scrollBackToNarration = useCallback(() => {
    setIsUserScrolling(false);
    setIsScrolledAway(false);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    // Re-measure: compute target from last known pageY
    // Since we can't re-measure here directly, use the last target
    scrollRef.current?.scrollTo({ y: lastTargetScrollY.current, animated: true });
  }, [scrollRef]);

  // Reset when audio stops
  useEffect(() => {
    if (!isAudioActive) {
      setIsUserScrolling(false);
      setIsScrolledAway(false);
      lastTargetScrollY.current = 0;
    }
  }, [isAudioActive]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, []);

  return {
    showBackToNarration: isAudioActive && isUserScrolling && isScrolledAway,
    narrationDirection,
    onUserScrollBegin,
    onScrollPosition,
    onActiveParagraphPageY,
    scrollBackToNarration,
    resetScrollState,
  };
}
