/**
 * AuthContext unit tests - error mapping
 */

import { getFirebaseAuthErrorKey } from '@/contexts/AuthContext';

describe('AuthContext', () => {
  describe('getFirebaseAuthErrorKey', () => {
    it('maps network-request-failed to correct translation key', () => {
      expect(getFirebaseAuthErrorKey('auth/network-request-failed')).toBe('auth.errorNetwork');
    });

    it('maps expo-go-unsupported to dev build required key', () => {
      expect(getFirebaseAuthErrorKey('app/expo-go-unsupported')).toBe('auth.errorDevBuildRequired');
    });

    it('maps email-specific error codes correctly', () => {
      expect(getFirebaseAuthErrorKey('auth/invalid-email')).toBe('auth.errorInvalidEmail');
      expect(getFirebaseAuthErrorKey('auth/wrong-password')).toBe('auth.errorWrongPassword');
      expect(getFirebaseAuthErrorKey('auth/invalid-credential')).toBe('auth.errorWrongPassword');
      expect(getFirebaseAuthErrorKey('auth/email-already-in-use')).toBe('auth.errorEmailInUse');
      expect(getFirebaseAuthErrorKey('auth/weak-password')).toBe('auth.errorWeakPassword');
      expect(getFirebaseAuthErrorKey('auth/user-not-found')).toBe('auth.errorUserNotFound');
    });

    it('returns generic error for unknown codes', () => {
      expect(getFirebaseAuthErrorKey('auth/some-unknown-error')).toBe('auth.errorGeneric');
    });

    it('returns generic error for empty string', () => {
      expect(getFirebaseAuthErrorKey('')).toBe('auth.errorGeneric');
    });
  });
});
