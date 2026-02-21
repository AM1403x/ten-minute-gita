#!/usr/bin/env node
/**
 * fix_transliteration.js
 *
 * Fixes incomplete transliterations in both gita_snippets.json and gita_snippets_hindi.json.
 * Uses authoritative verse data from complete_verses.json to replace truncated
 * transliteration text (which only has the first pāda of each verse).
 *
 * Unlike the Sanskrit fix, no format conversion is needed — the authoritative
 * transliterations are already in the correct format (plain text with newlines).
 * Verses are joined with \n\n separators to match the app's rendering split logic
 * (SnippetContent.tsx splits on /\n\n+/).
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
 * Check if a transliteration is already complete.
 * A complete transliteration for N verses should have at least 2*N content lines
 * (2 pādas per verse). Incomplete ones have only N lines (1 pāda per verse).
 * We also check for the authoritative romanization convention (śh, ch patterns)
 * as a secondary signal.
 */
function isComplete(text, expectedVerses) {
  if (!text || !text.trim()) return false;
  const lines = text.split('\n').filter(l => l.trim());
  // A complete snippet needs at least 2 content lines per verse
  // (speakers add extra lines, so >= 2*verses is a reasonable threshold)
  return lines.length >= expectedVerses * 2;
}

// Track stats
let fixed = 0;
let skipped = 0;
let errors = [];

for (let i = 0; i < enData.snippets.length; i++) {
  const enSnippet = enData.snippets[i];
  const hiSnippet = hiData.snippets[i];

  const verseRefs = parseVerseRange(enSnippet.verses);
  const verseCount = verseRefs.length;

  // Check if already has complete transliteration from authoritative source
  // We replace ALL to ensure consistency of romanization convention
  const verseParts = [];
  let allFound = true;

  for (const ref of verseRefs) {
    if (!completeVerses[ref]) {
      errors.push({ id: enSnippet.id, verses: enSnippet.verses, missing: ref });
      allFound = false;
      break;
    }
    const translit = completeVerses[ref].transliteration;
    if (!translit || !translit.trim()) {
      errors.push({ id: enSnippet.id, verses: enSnippet.verses, missing: ref + ' (no transliteration)' });
      allFound = false;
      break;
    }
    verseParts.push(translit.trim());
  }

  if (!allFound) continue;

  const newTransliteration = verseParts.join('\n\n');

  // Track whether this was actually a change
  const oldTranslit = enSnippet.transliteration || '';
  if (oldTranslit.trim() === newTransliteration.trim()) {
    skipped++;
    continue;
  }

  enData.snippets[i].transliteration = newTransliteration;
  hiData.snippets[i].transliteration = newTransliteration;
  fixed++;
}

// Write output
fs.writeFileSync(EN_PATH, JSON.stringify(enData, null, 2) + '\n', 'utf8');
fs.writeFileSync(HI_PATH, JSON.stringify(hiData, null, 2) + '\n', 'utf8');

console.log('=== TRANSLITERATION FIX RESULTS ===');
console.log('Fixed:', fixed);
console.log('Skipped (unchanged):', skipped);
console.log('Errors:', errors.length);
if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(e => console.log('  Snippet', e.id, '(' + e.verses + '): missing verse', e.missing));
}
console.log('\nFiles updated:');
console.log('  ', EN_PATH);
console.log('  ', HI_PATH);
