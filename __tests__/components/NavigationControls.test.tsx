import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationControls } from '@/components/reading/NavigationControls';
import Colors from '@/constants/Colors';

const t = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'reading.previous': 'Previous',
    'reading.next': 'Next',
    'reading.markComplete': 'Mark Complete',
    'reading.alreadyRead': '✓ Already Read',
    'reading.comeBackTomorrow': 'Come Back Tomorrow',
    'reading.notAvailable': 'Not Available',
  };
  let val = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => { val = val.replace(`{{${k}}}`, String(v)); });
  }
  return val;
};

const baseProps = {
  snippetId: 5,
  totalSnippets: 239,
  currentSnippet: 5,
  isReviewMode: false,
  isNextDay: false,
  isFutureDay: false,
  canMarkComplete: true,
  colorScheme: 'light' as const,
  colors: Colors.light,
  t,
  onPrev: jest.fn(),
  onNext: jest.fn(),
  onMarkComplete: jest.fn(),
  onGoToDay: jest.fn(),
};

describe('NavigationControls', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Previous and Next buttons', () => {
    const { getByText } = render(<NavigationControls {...baseProps} />);
    expect(getByText('Previous')).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
  });

  it('shows Mark Complete when canMarkComplete is true', () => {
    const { getByText } = render(<NavigationControls {...baseProps} />);
    expect(getByText('Mark Complete')).toBeTruthy();
  });

  it('calls onMarkComplete when button pressed', () => {
    const { getByText } = render(<NavigationControls {...baseProps} />);
    fireEvent.press(getByText('Mark Complete'));
    expect(baseProps.onMarkComplete).toHaveBeenCalledTimes(1);
  });

  it('shows Already Read in review mode', () => {
    const { getByText } = render(
      <NavigationControls {...baseProps} isReviewMode={true} canMarkComplete={false} />
    );
    expect(getByText('✓ Already Read')).toBeTruthy();
  });

  it('shows Mark Complete even after reading today (no daily gate)', () => {
    const { getByText } = render(
      <NavigationControls {...baseProps} isNextDay={false} canMarkComplete={true} />
    );
    expect(getByText('Mark Complete')).toBeTruthy();
  });

  it('disables Previous on first snippet', () => {
    const onPrev = jest.fn();
    const { getByLabelText } = render(
      <NavigationControls {...baseProps} snippetId={1} onPrev={onPrev} />
    );
    fireEvent.press(getByLabelText('Previous'));
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('disables Next on last snippet', () => {
    const onNext = jest.fn();
    const { getByLabelText } = render(
      <NavigationControls {...baseProps} snippetId={239} onNext={onNext} />
    );
    fireEvent.press(getByLabelText('Next'));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('calls onPrev and onNext when enabled', () => {
    const { getByText } = render(<NavigationControls {...baseProps} />);
    fireEvent.press(getByText('Previous'));
    fireEvent.press(getByText('Next'));
    expect(baseProps.onPrev).toHaveBeenCalledTimes(1);
    expect(baseProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('shows Go To Day for future day', () => {
    const { getByText } = render(
      <NavigationControls
        {...baseProps}
        isFutureDay={true}
        canMarkComplete={false}
        snippetId={10}
        currentSnippet={5}
        t={(key, params) => {
          if (key === 'reading.goToDay') return `Go to Day ${params?.day}`;
          return t(key, params);
        }}
      />
    );
    expect(getByText('Go to Day 5')).toBeTruthy();
  });
});
