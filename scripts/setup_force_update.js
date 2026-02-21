/**
 * One-time script to create the Firestore `config/appVersion` document.
 *
 * Usage:
 *   node scripts/setup_force_update.js
 *
 * Prerequisites: You must be signed into Firebase in the app (or temporarily
 * open Firestore rules to allow writes). After running, you can delete this script.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyAG5sx4PZJh9AW3UGvfog4U-tK-TPNTEk8',
  authDomain: 'minute-gita.firebaseapp.com',
  projectId: 'minute-gita',
  storageBucket: 'minute-gita.firebasestorage.app',
  messagingSenderId: '874503441995',
  appId: '1:874503441995:ios:3a71a51e1a03732b0647ce',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const data = {
  ios: {
    minimumVersion: '1.0.2', // No one forced yet — change to "1.1.0" once live on App Store
  },
  storeUrl: 'https://apps.apple.com/app/10-minute-gita/id6758332047',
  benefits: {
    en: [
      '☁️ Your progress now syncs across devices',
      '🔒 Sign in with Google or Apple',
      '🎧 Improved audio playback',
      '✨ Smoother reading experience',
    ],
    hi: [
      '☁️ आपकी प्रगति अब सभी उपकरणों पर सिंक होती है',
      '🔒 Google या Apple से साइन इन करें',
      '🎧 बेहतर ऑडियो अनुभव',
      '✨ सहज पठन अनुभव',
    ],
  },
};

async function main() {
  try {
    await setDoc(doc(db, 'config', 'appVersion'), data);
    console.log('✅ Created config/appVersion document in Firestore');
    console.log('');
    console.log('Current minimumVersion: 1.0.2 (no one forced yet)');
    console.log('Once 1.1.0 is live on the App Store, update it to "1.1.0" in Firebase Console:');
    console.log('  → https://console.firebase.google.com/project/minute-gita/firestore/databases/-default-/data/config/appVersion');
    process.exit(0);
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.error('❌ Permission denied. You need to temporarily allow writes to /config collection.');
      console.error('');
      console.error('Go to Firebase Console → Firestore → Rules, and add:');
      console.error('');
      console.error('  match /config/{docId} {');
      console.error('    allow read: if true;');
      console.error('    allow write: if true;  // TEMPORARY — remove after running this script');
      console.error('  }');
      console.error('');
      console.error('Then run this script again. After it succeeds, change write rule to:');
      console.error('    allow write: if false;');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main();
