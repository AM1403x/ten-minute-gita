import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = Platform.select({
  ios: {
    apiKey: 'AIzaSyAG5sx4PZJh9AW3UGvfog4U-tK-TPNTEk8',
    authDomain: 'minute-gita.firebaseapp.com',
    projectId: 'minute-gita',
    storageBucket: 'minute-gita.firebasestorage.app',
    messagingSenderId: '874503441995',
    appId: '1:874503441995:ios:3a71a51e1a03732b0647ce',
  },
  android: {
    apiKey: 'AIzaSyAOQULgNdz8Cu2qRP-26f_k-954xj-xRE0',
    authDomain: 'minute-gita.firebaseapp.com',
    projectId: 'minute-gita',
    storageBucket: 'minute-gita.firebasestorage.app',
    messagingSenderId: '874503441995',
    appId: '1:874503441995:android:be337ddab04a3ecd0647ce',
  },
  default: {
    // Fallback (e.g. web). Prefer iOS config since it is already in use.
    apiKey: 'AIzaSyAG5sx4PZJh9AW3UGvfog4U-tK-TPNTEk8',
    authDomain: 'minute-gita.firebaseapp.com',
    projectId: 'minute-gita',
    storageBucket: 'minute-gita.firebasestorage.app',
    messagingSenderId: '874503441995',
    appId: '1:874503441995:ios:3a71a51e1a03732b0647ce',
  },
});

const app = getApps().length ? getApp() : initializeApp(firebaseConfig!);

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fast Refresh / duplicate eval: reuse the already-initialized instance.
    if (msg.includes('auth/already-initialized') || msg.includes('already been initialized')) {
      return getAuth(app);
    }
    throw e;
  }
})();

export const db = getFirestore(app);
