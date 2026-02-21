import { useMemo, useState, useEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { isToday, isYesterday, getDateString } from '@/utils/storage';

export function useStreak() {
  const { state, useStreakFreeze } = useApp();
  const { streak } = state.progress;

  // Track current date to ensure memo recomputes when date changes
  const [currentDate, setCurrentDate] = useState(() => getDateString());
  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;

  // Update date when app resumes from background
  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setCurrentDate(getDateString());
      }
    });
    return () => subscription.remove();
  }, []);

  // Check for date change every minute (for midnight transition).
  // Uses a ref for comparison to avoid tearing down/recreating the interval on date change.
  useEffect(() => {
    const interval = setInterval(() => {
      const newDate = getDateString();
      if (newDate !== currentDateRef.current) {
        setCurrentDate(newDate);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const streakStatus = useMemo(() => {
    const { lastReadDate, current, longest, freezesAvailable, freezeUsedThisWeek } = streak;

    // Determine if streak is at risk
    let isAtRisk = false;
    let isBroken = false;
    let readToday = false;

    if (lastReadDate) {
      readToday = isToday(lastReadDate);
      const wasYesterday = isYesterday(lastReadDate);

      if (!readToday && !wasYesterday && current > 0) {
        // More than a day has passed - streak is broken
        isBroken = true;
      } else if (!readToday && wasYesterday) {
        // Haven't read today but read yesterday - at risk
        isAtRisk = true;
      }
    }

    return {
      current: isBroken ? 0 : current,
      longest,
      isAtRisk,
      isBroken,
      readToday,
      lastReadDate,
      canUseFreeze: freezesAvailable > 0 && !freezeUsedThisWeek && isAtRisk,
      freezesAvailable,
    };
  }, [streak, currentDate]);

  const getMotivationalMessage = () => {
    const { current, isAtRisk, readToday } = streakStatus;

    if (readToday) {
      if (current >= 100) return "Incredible dedication! You're a true seeker.";
      if (current >= 30) return "Amazing! A month of wisdom.";
      if (current >= 7) return "One week strong! Keep going.";
      return "Great job today!";
    }

    if (isAtRisk) {
      return `Don't break your ${current}-day streak!`;
    }

    if (current === 0) {
      return "Start your journey today.";
    }

    return "Continue your path to wisdom.";
  };

  return {
    ...streakStatus,
    useFreeze: useStreakFreeze,
    motivationalMessage: getMotivationalMessage(),
  };
}
