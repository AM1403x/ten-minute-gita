#!/usr/bin/env node
/**
 * fix_sanskrit.js
 *
 * Fixes incomplete Sanskrit verses in both gita_snippets.json and gita_snippets_hindi.json.
 * Uses authoritative verse data from complete_verses.json to replace truncated
 * Sanskrit text (which only has the first pāda of each verse).
 *
 * Format conventions (matching existing complete snippets):
 *   - Speaker attributions: "[name] उवाच |" on own line
 *   - First pāda: "[text] |"
 *   - Second pāda: "[text] ||"
 *   - Verses separated by \n\n
 *
 * Handles two data formats from the authoritative source:
 *   a) Properly split: "speaker\n\npāda1।\n\npāda2।।N।।"
 *   b) Concatenated: "speaker_pāda1।pāda2।।N।।" (no newlines)
 */

const fs = require('fs');
const path = require('path');

const EN_PATH = path.join(__dirname, '..', 'data', 'gita_snippets.json');
const HI_PATH = path.join(__dirname, '..', 'data', 'gita_snippets_hindi.json');
const VERSES_PATH = path.join(__dirname, 'complete_verses.json');

const enData = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const hiData = JSON.parse(fs.readFileSync(HI_PATH, 'utf8'));
const completeVerses = JSON.parse(fs.readFileSync(VERSES_PATH, 'utf8'));

function parseVerseRange(versesStr) {
  const m = versesStr.trim().match(/(\d+)\.(\d+)\s*-\s*(\d+)\.(\d+)/);
  if (m) {
    const ch = parseInt(m[1]);
    const start = parseInt(m[2]);
    const end = parseInt(m[4]);
    const refs = [];
    for (let v = start; v <= end; v++) {
      refs.push(ch + '.' + v);
    }
    return refs;
  }
  const m2 = versesStr.trim().match(/(\d+)\.(\d+)/);
  return [parseInt(m2[1]) + '.' + parseInt(m2[2])];
}

/**
 * Convert a verse from the authoritative format to the snippet format.
 *
 * Algorithm:
 * 1. Remove verse number marker (।।N.N।। or ।।N.N।)
 * 2. Normalize to single line (collapse newlines)
 * 3. Extract speaker attribution if present (text ending in उवाच)
 * 4. Split remaining text at single danda (।) to get two pādas
 * 5. Format with | and || markers
 */
function convertVerse(rawSanskrit) {
  let text = rawSanskrit;

  // 1. Remove verse number marker at end: ।।N.N।। or ।।N.N।
  text = text.replace(/।।[\d.]+।।?\s*$/, '');

  // 2. Normalize: collapse all whitespace/newlines to single space
  text = text.replace(/\s+/g, ' ').trim();

  // 3. Remove any trailing dandas left over
  text = text.replace(/।+\s*$/, '').trim();

  // 4. Extract speaker attribution using whitelist of known Gita speakers.
  // Only these characters speak in the Bhagavad Gita.
  // "भगवानुवाच" uses vowel sign ु (U+0941), not standalone उ (U+0909).
  // Must avoid false positives like "तमुवाच" (verse 2.10) or "उवाच पार्थ" (verse 1.25).
  const SPEAKER_PATTERNS = [
    /^(धृतराष्ट्र उवाच)\s*/,
    /^(सञ्जय उवाच)\s*/,
    /^(संजय उवाच)\s*/,
    /^(अर्जुन उवाच)\s*/,
    /^(श्री\s*भगवान[उु]वाच)\s*/,
    /^(श्रीभगवान[उु]वाच)\s*/,
  ];
  let speaker = '';
  for (const pat of SPEAKER_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      speaker = m[1].trim();
      text = text.substring(m[0].length).trim();
      break;
    }
  }

  // 5. Split at single danda (।) to get two pādas
  // After removing verse number, the text is: "pāda1।pāda2" or "pāda1। pāda2"
  const dandaIdx = text.indexOf('।');
  let pada1, pada2;

  if (dandaIdx >= 0) {
    pada1 = text.substring(0, dandaIdx).trim();
    pada2 = text.substring(dandaIdx + 1).trim();
    // Clean any remaining dandas from pada2
    pada2 = pada2.replace(/।+\s*$/, '').trim();
  } else {
    // No danda found — verse text may use spaces only
    // Try to split roughly in half by word count
    const words = text.split(/\s+/);
    const mid = Math.ceil(words.length / 2);
    pada1 = words.slice(0, mid).join(' ');
    pada2 = words.slice(mid).join(' ');
  }

  // 6. Build result
  let result = '';
  if (speaker) result += speaker + ' |\n';
  result += pada1 + ' |\n';
  result += pada2 + ' ||';

  return result;
}

// Track stats
let fixed = 0;
let skipped = 0;
let errors = [];

for (let i = 0; i < enData.snippets.length; i++) {
  const enSnippet = enData.snippets[i];
  const hiSnippet = hiData.snippets[i];

  // Check if already complete (has || markers using ASCII pipe)
  const hasDoubleBar = /\|\|/.test(enSnippet.sanskrit);
  if (hasDoubleBar) {
    skipped++;
    continue;
  }

  const verseRefs = parseVerseRange(enSnippet.verses);
  const verseParts = [];
  let allFound = true;

  for (const ref of verseRefs) {
    if (!completeVerses[ref]) {
      errors.push({ id: enSnippet.id, verses: enSnippet.verses, missing: ref });
      allFound = false;
      break;
    }
    verseParts.push(convertVerse(completeVerses[ref].sanskrit));
  }

  if (!allFound) continue;

  const newSanskrit = verseParts.join('\n\n');
  enData.snippets[i].sanskrit = newSanskrit;
  hiData.snippets[i].sanskrit = newSanskrit;
  fixed++;
}

// Write output
fs.writeFileSync(EN_PATH, JSON.stringify(enData, null, 2) + '\n', 'utf8');
fs.writeFileSync(HI_PATH, JSON.stringify(hiData, null, 2) + '\n', 'utf8');

console.log('=== FIX RESULTS ===');
console.log('Fixed:', fixed);
console.log('Skipped (already complete):', skipped);
console.log('Errors:', errors.length);
if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(e => console.log('  Snippet', e.id, '(' + e.verses + '): missing verse', e.missing));
}
console.log('\nFiles updated:');
console.log('  ', EN_PATH);
console.log('  ', HI_PATH);
