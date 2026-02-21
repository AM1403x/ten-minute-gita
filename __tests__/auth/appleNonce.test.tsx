// Don't `requireActual('react-native')` here: it pulls in TurboModules (DevMenu) that
// don't exist in Jest and will crash the suite. We only need Platform.OS for the
// Apple codepath.
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (spec: any) => spec.ios ?? spec.default,
  },
}));

jest.mock('@react-native-google-signin/google-signin');
jest.mock('firebase/app');
jest.mock('firebase/auth');
jest.mock('firebase/firestore');
jest.mock('expo-constants', () => ({ appOwnership: null }));
jest.mock('expo-apple-authentication');
jest.mock('expo-crypto');

import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as Crypto from 'expo-crypto';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function ExposeAppleSignIn({ onReady }: { onReady: (fn: () => Promise<void>) => void }) {
  const { signInWithApple } = useAuth();
  useEffect(() => {
    onReady(signInWithApple);
  }, [signInWithApple, onReady]);
  return null;
}

describe('Apple Sign-In nonce', () => {
  it('uses cryptographically secure random bytes (not Math.random)', async () => {
    const randomSpy = jest.spyOn(Math, 'random');
    const bytesSpy = jest.spyOn(Crypto, 'getRandomBytesAsync');
    const digestSpy = jest.spyOn(Crypto, 'digestStringAsync');

    let signInWithAppleFn: (() => Promise<void>) | null = null;

    await act(async () => {
      TestRenderer.create(
        <AuthProvider>
          <ExposeAppleSignIn onReady={(fn) => { signInWithAppleFn = fn; }} />
        </AuthProvider>
      );
    });

    expect(signInWithAppleFn).not.toBeNull();

    // Isolate calls from the actual sign-in flow.
    randomSpy.mockClear();
    bytesSpy.mockClear();
    digestSpy.mockClear();

    await act(async () => {
      await signInWithAppleFn!();
    });

    expect(bytesSpy).toHaveBeenCalledWith(32);
    expect(digestSpy).toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
  });
});
