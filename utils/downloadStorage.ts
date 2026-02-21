import { Paths, Directory, File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';
import { DownloadedReading } from '@/types/downloads';
import { getAudioFileKey } from '@/utils/audioMapping';
import { Snippet, ReadingHistory } from '@/types';

function getDownloadDir(language: string): Directory {
  return new Directory(Paths.document, 'audio', language);
}

function getLocalFile(snippetId: number, language: string, ext: string): File {
  const dir = getDownloadDir(language);
  return new File(dir, `${snippetId}${ext}`);
}

export async function getLocalAudioPath(snippetId: number, language: string): Promise<string | null> {
  const file = getLocalFile(snippetId, language, '.m4a');
  if (!file.exists) return null;
  // Guard against partial/incomplete downloads — valid M4A files are 1MB+
  const size = file.size ?? 0;
  return size > 500_000 ? file.uri : null;
}

export async function getLocalAlignedJsonPath(snippetId: number, language: string): Promise<string | null> {
  const file = getLocalFile(snippetId, language, '_aligned.json');
  if (!file.exists) return null;
  // Guard against partial downloads — valid aligned JSON files are 10KB+
  const size = file.size ?? 0;
  return size > 5_000 ? file.uri : null;
}

export async function downloadReading(
  snippet: Snippet,
  language: string,
  onProgress?: (progress: number) => void,
): Promise<DownloadedReading> {
  // Create parent audio/ dir first, then language subdir (skip if already exists)
  const parentDir = new Directory(Paths.document, 'audio');
  if (!parentDir.exists) parentDir.create();
  const dir = getDownloadDir(language);
  if (!dir.exists) dir.create();

  const fileKey = getAudioFileKey(snippet);
  const baseUrl = CONFIG.AUDIO_CDN_BASE_URL;

  const audioUrl = `${baseUrl}/${language}/${fileKey}.m4a`;
  const jsonUrl = `${baseUrl}/${language}/${fileKey}_aligned.json`;

  // Use File(dir, name) constructor for correct path joining
  const audioFile = getLocalFile(snippet.id, language, '.m4a');
  const jsonFile = getLocalFile(snippet.id, language, '_aligned.json');

  // Remove existing files before downloading (idempotent flag unreliable in Expo Go)
  if (audioFile.exists) audioFile.delete();
  if (jsonFile.exists) jsonFile.delete();

  // Download audio file
  onProgress?.(0);
  await File.downloadFileAsync(audioUrl, audioFile, { idempotent: true });
  onProgress?.(0.9);

  // Download aligned JSON
  await File.downloadFileAsync(jsonUrl, jsonFile, { idempotent: true });
  onProgress?.(1.0);

  const fileSize = audioFile.size ?? 0;

  return {
    snippetId: snippet.id,
    language: language as 'en' | 'hi',
    filePath: audioFile.uri,
    alignedJsonPath: jsonFile.uri,
    fileSize,
    downloadedAt: new Date().toISOString(),
  };
}

export async function deleteReading(snippetId: number, language: string): Promise<void> {
  const audioFile = getLocalFile(snippetId, language, '.m4a');
  if (audioFile.exists) audioFile.delete();
  const jsonFile = getLocalFile(snippetId, language, '_aligned.json');
  if (jsonFile.exists) jsonFile.delete();
}

export async function deleteAllDownloads(language: string): Promise<void> {
  const dir = getDownloadDir(language);
  if (dir.exists) {
    dir.delete();
  }
}

export async function getStorageUsed(): Promise<number> {
  let total = 0;
  for (const lang of ['en', 'hi']) {
    const dir = getDownloadDir(lang);
    if (!dir.exists) continue;
    const entries = dir.list();
    for (const entry of entries) {
      if (entry instanceof File) {
        total += entry.size ?? 0;
      }
    }
  }
  return total;
}

export async function loadDownloadIndex(): Promise<Record<string, DownloadedReading>> {
  try {
    const data = await AsyncStorage.getItem(CONFIG.DOWNLOAD_INDEX_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function saveDownloadIndex(index: Record<string, DownloadedReading>): Promise<void> {
  try {
    await AsyncStorage.setItem(CONFIG.DOWNLOAD_INDEX_KEY, JSON.stringify(index));
  } catch {
    // Storage write not critical
  }
}

/**
 * Remove downloads for readings completed more than AUTO_REMOVE_DAYS ago.
 * Respects the @offline_auto_remove toggle (default OFF).
 */
export async function cleanupOldDownloads(
  readingHistory: ReadingHistory,
  completedSnippets: number[],
  language: string,
): Promise<void> {
  const autoRemoveVal = await AsyncStorage.getItem('@offline_auto_remove');
  if (autoRemoveVal !== 'true') return; // default OFF when key absent

  const index = await loadDownloadIndex();
  const now = Date.now();
  const thresholdMs = CONFIG.AUTO_REMOVE_DAYS * 24 * 60 * 60 * 1000;

  // Invert readingHistory: snippetId → date string
  const snippetToDate: Record<number, string> = {};
  for (const [dateStr, snippetIds] of Object.entries(readingHistory)) {
    for (const sid of snippetIds) {
      snippetToDate[sid] = dateStr;
    }
  }

  let changed = false;
  for (const snippetId of completedSnippets) {
    const key = `${language}_${snippetId}`;
    if (!index[key]) continue;

    const completedDate = snippetToDate[snippetId];
    if (!completedDate) continue;

    const elapsed = now - new Date(completedDate).getTime();
    if (elapsed > thresholdMs) {
      await deleteReading(snippetId, language);
      delete index[key];
      changed = true;
    }
  }

  if (changed) {
    await saveDownloadIndex(index);
  }
}
