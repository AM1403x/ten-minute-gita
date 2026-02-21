import { Platform } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { db } from '@/utils/firebaseConfig';
import { logger } from '@/utils/logger';

export interface ForceUpdateInfo {
  storeUrl: string;
  benefits: string[];
}

/**
 * Compare two semver strings (e.g. "1.0.2" vs "1.1.0").
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const av = aParts[i] || 0;
    const bv = bParts[i] || 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

const DEFAULT_STORE_URL = 'https://apps.apple.com/app/10-minute-gita/id6758332047';

/**
 * Check Firestore `config/appVersion` to see if a force update is required.
 * Returns update info if the installed version is below minimumVersion, or null.
 * iOS only — Android launches at 1.1.0 so no legacy users.
 */
export async function checkForceUpdate(language: string): Promise<ForceUpdateInfo | null> {
  if (Platform.OS !== 'ios') return null;

  try {
    const docSnap = await getDoc(doc(db, 'config', 'appVersion'));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    const minimumVersion = data?.ios?.minimumVersion;
    if (!minimumVersion) return null;

    const installedVersion = Constants.expoConfig?.version || '0.0.0';
    if (compareVersions(installedVersion, minimumVersion) >= 0) return null;

    // Installed version is below minimum — force update
    const storeUrl = data?.storeUrl || DEFAULT_STORE_URL;
    const benefitsMap = data?.benefits || {};
    const benefits: string[] = benefitsMap[language] || benefitsMap['en'] || [];

    return { storeUrl, benefits };
  } catch (error) {
    logger.error('versionCheck', error);
    return null;
  }
}
