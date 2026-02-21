// Firebase Analytics JS SDK doesn't work well in React Native.
// All functions are no-ops that keep the same interface for future use.

function noop() {}

export const AnalyticsEvents = {
  readingStarted: (_snippetId: number, _day: number) => noop(),

  readingCompleted: (_snippetId: number, _day: number, _seconds: number) => noop(),

  audioPlayed: (_snippetId: number, _lang: string) => noop(),

  audioCompleted: (_snippetId: number, _lang: string, _seconds: number) => noop(),

  authModalShown: (_type: 'dismissible' | 'mandatory') => noop(),

  authModalDismissed: (_dismissCount: number) => noop(),

  signInCompleted: (_method: 'google' | 'apple' | 'email') => noop(),

  signUpCompleted: (_method: 'google' | 'apple' | 'email') => noop(),

  signedOut: () => noop(),

  streakUpdated: (_current: number, _longest: number) => noop(),

  languageChanged: (_from: string, _to: string) => noop(),

  dataMigrated: (_scenario: 'new_account' | 'pull_from_cloud' | 'merge', _readingCount: number) => noop(),

  syncFailed: (_field: string, _error: string) => noop(),
};

export async function setAnalyticsUser(_uid: string, _providerId: string, _language: string) {
  // no-op
}

export async function clearAnalyticsUser() {
  // no-op
}
