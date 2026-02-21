import { getFirebaseAuthErrorKey } from '@/contexts/AuthContext';
import { en } from '@/constants/translations/en';

describe('getFirebaseAuthErrorKey', () => {
  const cases: Array<{ code: string; expectedKey: string }> = [
    { code: 'app/expo-go-unsupported', expectedKey: 'auth.errorDevBuildRequired' },
    { code: 'auth/network-request-failed', expectedKey: 'auth.errorNetwork' },
    { code: 'auth/invalid-email', expectedKey: 'auth.errorInvalidEmail' },
    { code: 'auth/wrong-password', expectedKey: 'auth.errorWrongPassword' },
    { code: 'auth/invalid-credential', expectedKey: 'auth.errorWrongPassword' },
    { code: 'auth/email-already-in-use', expectedKey: 'auth.errorEmailInUse' },
    { code: 'auth/weak-password', expectedKey: 'auth.errorWeakPassword' },
    { code: 'auth/user-not-found', expectedKey: 'auth.errorUserNotFound' },
  ];

  it.each(cases)('maps "%s" to "%s"', ({ code, expectedKey }) => {
    expect(getFirebaseAuthErrorKey(code)).toBe(expectedKey);
    expect((en as unknown as Record<string, unknown>)[expectedKey]).toBeDefined();
  });

  it('falls back to generic for unknown codes', () => {
    expect(getFirebaseAuthErrorKey('some/unknown-code')).toBe('auth.errorGeneric');
    expect((en as unknown as Record<string, unknown>)['auth.errorGeneric']).toBeDefined();
  });
});

