import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  onAuthStateChanged,
  signInWithCredential,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  EmailAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  deleteUser as firebaseDeleteUser,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/utils/firebaseConfig';

// Runtime import with fallback — @react-native-google-signin native module
// is not available in Expo Go (requires a development build).
let _GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
try {
  _GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  _GoogleSignin!.configure({
    iosClientId: '874503441995-k7aoaoq3h96pfj4qtfo81e62pahr6lpg.apps.googleusercontent.com',
    webClientId: '874503441995-2mgu0aqmmpq2g0n4lsplsu48l8674urm.apps.googleusercontent.com',
  });
} catch {
  // Google Sign-In native module unavailable — sign-in will fail gracefully at call time
}

function expoGoUnsupported(feature: string): never {
  const err = new Error(`${feature} is not supported in Expo Go. Use a development build.`);
  (err as any).code = 'app/expo-go-unsupported';
  throw err;
}

// --- Types ---

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string;
}

export interface AuthState {
  status: 'loading' | 'unauthenticated' | 'authenticated';
  user: AuthUser | null;
}

type AuthAction =
  | { type: 'SET_AUTHENTICATED'; user: AuthUser }
  | { type: 'SET_UNAUTHENTICATED' };

interface AuthContextType {
  authState: AuthState;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

// --- Reducer ---

const initialState: AuthState = {
  status: 'loading',
  user: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return { status: 'authenticated', user: action.user };
    case 'SET_UNAUTHENTICATED':
      return { status: 'unauthenticated', user: null };
    default:
      return state;
  }
}

// --- Helpers ---

function mapFirebaseUser(firebaseUser: FirebaseUser): AuthUser {
  const providers = firebaseUser.providerData;
  let providerId = 'password';
  if (providers.length > 0) {
    providerId = providers[0].providerId;
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    providerId,
  };
}

export function getFirebaseAuthErrorKey(code: string): string {
  switch (code) {
    case 'app/expo-go-unsupported':
      return 'auth.errorDevBuildRequired';
    case 'auth/network-request-failed':
      return 'auth.errorNetwork';
    case 'auth/invalid-email':
      return 'auth.errorInvalidEmail';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'auth.errorWrongPassword';
    case 'auth/email-already-in-use':
      return 'auth.errorEmailInUse';
    case 'auth/weak-password':
      return 'auth.errorWeakPassword';
    case 'auth/user-not-found':
      return 'auth.errorUserNotFound';
    default:
      return 'auth.errorGeneric';
  }
}

// --- Context ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, dispatch] = useReducer(authReducer, initialState);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        dispatch({ type: 'SET_AUTHENTICATED', user: mapFirebaseUser(firebaseUser) });
      } else {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    });
    return unsubscribe;
  }, []);

  const handleSignInWithGoogle = useCallback(async () => {
    if (Constants.appOwnership === 'expo' || !_GoogleSignin) {
      expoGoUnsupported('Google Sign-In');
    }
    if (Platform.OS === 'android') {
      await _GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const signInResult = await _GoogleSignin.signIn();
    const idToken = signInResult?.data?.idToken;
    if (!idToken) throw new Error('No ID token from Google Sign-In');
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  }, []);

  const handleSignInWithApple = useCallback(async () => {
    if (Constants.appOwnership === 'expo') {
      expoGoUnsupported('Apple Sign-In');
    }
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }
    // Avoid `import()` here: Jest (and some tooling) can choke on dynamic ESM imports.
    // The Platform guard above ensures these are only required on iOS.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AppleAuthentication = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Crypto = require('expo-crypto') as typeof import('expo-crypto');

    // Use a cryptographically-secure nonce (Math.random is not acceptable for auth nonces).
    const nonceBytes = await Crypto.getRandomBytesAsync(32);
    const nonce = Array.from(nonceBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce
    );

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const { identityToken } = appleCredential;
    if (!identityToken) throw new Error('No identity token from Apple');

    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
    const result = await signInWithCredential(auth, credential);

    // Apple only provides the name on the very first sign-in.
    // Wrap in try/catch so a profile update failure doesn't make sign-in appear to fail.
    if (appleCredential.fullName?.givenName && !result.user.displayName) {
      const name = [appleCredential.fullName.givenName, appleCredential.fullName.familyName]
        .filter(Boolean)
        .join(' ');
      try {
        await updateProfile(result.user, { displayName: name });
      } catch {
        // Profile update is best-effort — sign-in already succeeded
      }
    }
  }, []);

  const handleSignInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const handleSignUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Wrap in try/catch so account creation isn't reported as failed
    // when only the display name update fails
    try {
      await updateProfile(result.user, { displayName });
    } catch {
      // Profile update is best-effort — account was created successfully
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await firebaseSignOut(auth);
    try {
      await _GoogleSignin?.signOut();
    } catch {
      // Google sign-out may fail if user didn't sign in with Google
    }
  }, []);

  const handleResetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user signed in');

    // Delete Firestore user document first (needs auth to be valid)
    try {
      await deleteDoc(doc(db, 'users', user.uid));
    } catch {
      // Firestore doc may not exist — continue with auth deletion
    }

    // Attempt to delete the Firebase Auth account.
    // If the session is stale, re-authenticate silently and retry.
    try {
      await firebaseDeleteUser(user);
    } catch (e: any) {
      if (e?.code !== 'auth/requires-recent-login') throw e;

      // Re-authenticate based on provider
      const providerId = user.providerData[0]?.providerId;
      if (providerId === 'google.com' && _GoogleSignin) {
        // Silent re-auth via Google — gets a fresh token without user interaction
        const signInResult = await _GoogleSignin.signIn();
        const idToken = signInResult?.data?.idToken;
        if (idToken) {
          await reauthenticateWithCredential(user, GoogleAuthProvider.credential(idToken));
        }
      } else if (providerId === 'apple.com' && Platform.OS === 'ios') {
        const AppleAuthentication = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
        const Crypto = require('expo-crypto') as typeof import('expo-crypto');
        const nonceBytes = await Crypto.getRandomBytesAsync(32);
        const nonce = Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
        const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
        const appleCredential = await AppleAuthentication.signInAsync({
          requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
          nonce: hashedNonce,
        });
        if (appleCredential.identityToken) {
          const provider = new OAuthProvider('apple.com');
          await reauthenticateWithCredential(user, provider.credential({ idToken: appleCredential.identityToken, rawNonce: nonce }));
        }
      }
      // Retry deletion after re-auth
      await firebaseDeleteUser(user);
    }

    // Sign out of Google (best-effort, after deletion)
    try {
      await _GoogleSignin?.signOut();
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({
    authState,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithApple: handleSignInWithApple,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    deleteAccount: handleDeleteAccount,
  }), [authState, handleSignInWithGoogle, handleSignInWithApple, handleSignInWithEmail, handleSignUpWithEmail, handleSignOut, handleResetPassword, handleDeleteAccount]);

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
