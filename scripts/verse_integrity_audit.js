#!/usr/bin/env node
/**
 * DEFINITIVE VERSE INTEGRITY AUDIT — Post-fix verification
 * Checks all 701 verses × 2 languages across 239 snippets
 */

const fs = require('fs');
const path = require('path');

const enRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gita_snippets.json'), 'utf8'));
const hiRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gita_snippets_hindi.json'), 'utf8'));
const enData = enRaw.snippets;
const hiData = hiRaw.snippets;

const issues = [];

function addIssue(check, snippetId, field, detail) {
  issues.push({ check, snippetId, field, detail });
}

// Chapter verse counts (sums to 701 — Ch13 includes verse 13.01 introductory question)
const CHAPTER_COUNTS = {
  1: 47, 2: 72, 3: 43, 4: 42, 5: 29, 6: 47, 7: 30, 8: 28,
  9: 34, 10: 42, 11: 55, 12: 20, 13: 35, 14: 27, 15: 20,
  16: 24, 17: 28, 18: 78
};
const TOTAL_VERSES = Object.values(CHAPTER_COUNTS).reduce((a, b) => a + b, 0); // 701

// ============================================================
// CHECK 1: Count match (sanskrit blocks vs transliteration blocks vs verseTranslations length)
// ============================================================
function check1CountMatch(data, lang) {
  for (const snippet of data) {
    const sanskritBlocks = snippet.sanskrit.split('\n\n').filter(b => b.trim());
    const translitBlocks = snippet.transliteration.split('\n\n').filter(b => b.trim());
    const vtLen = snippet.verseTranslations.length;
    if (sanskritBlocks.length !== translitBlocks.length || sanskritBlocks.length !== vtLen) {
      addIssue('CHECK1_COUNT_MISMATCH', snippet.id, lang,
        `sanskrit=${sanskritBlocks.length}, transliteration=${translitBlocks.length}, verseTranslations=${vtLen} (title: ${snippet.title}, verses: ${snippet.verses})`);
    }
  }
}

// ============================================================
// CHECK 2: No empty or too-short blocks
// ============================================================
function check2NoEmptyBlocks(data, lang) {
  for (const snippet of data) {
    const sanskritBlocks = snippet.sanskrit.split('\n\n').filter(b => b.trim());
    const translitBlocks = snippet.transliteration.split('\n\n').filter(b => b.trim());

    sanskritBlocks.forEach((block, i) => {
      if (block.trim().length < 10) {
        addIssue('CHECK2_SHORT_SANSKRIT', snippet.id, `${lang}.sanskrit[${i}]`,
          `Length=${block.trim().length}, content="${block.trim().substring(0, 50)}"`);
      }
    });

    translitBlocks.forEach((block, i) => {
      if (block.trim().length < 10) {
        addIssue('CHECK2_SHORT_TRANSLIT', snippet.id, `${lang}.transliteration[${i}]`,
          `Length=${block.trim().length}, content="${block.trim().substring(0, 50)}"`);
      }
    });

    snippet.verseTranslations.forEach((vt, i) => {
      if (vt.trim().length < 20) {
        addIssue('CHECK2_SHORT_TRANSLATION', snippet.id, `${lang}.verseTranslations[${i}]`,
          `Length=${vt.trim().length}, content="${vt.trim().substring(0, 50)}"`);
      }
    });
  }
}

// ============================================================
// CHECK 3: Sanskrit verse structure — must contain | or || (ASCII) or । or ॥ (Devanagari)
// ============================================================
function check3SanskritStructure(data, lang) {
  for (const snippet of data) {
    const sanskritBlocks = snippet.sanskrit.split('\n\n').filter(b => b.trim());
    sanskritBlocks.forEach((block, i) => {
      if (!block.includes('|') && !block.includes('।') && !block.includes('॥')) {
        addIssue('CHECK3_NO_DANDA', snippet.id, `${lang}.sanskrit[${i}]`,
          `No danda markers (| or ।/॥) found. Content: "${block.trim().substring(0, 80)}"`);
      }
    });
  }
}

// ============================================================
// CHECK 4: Transliteration must be Latin (no Devanagari characters)
// ============================================================
function check4TransliterationStructure(data, lang) {
  const devanagariRegex = /[\u0900-\u097F]/;
  for (const snippet of data) {
    const translitBlocks = snippet.transliteration.split('\n\n').filter(b => b.trim());
    translitBlocks.forEach((block, i) => {
      if (devanagariRegex.test(block)) {
        addIssue('CHECK4_DEVANAGARI_IN_TRANSLIT', snippet.id, `${lang}.transliteration[${i}]`,
          `Contains Devanagari characters. Content: "${block.trim().substring(0, 80)}"`);
      }
    });
  }
}

// ============================================================
// CHECK 5: Word count sanity (Sanskrit vs transliteration) — ratio check with generous threshold
// Note: Sanskrit compounds split in transliteration, so translit often has MORE words.
// Only flag when transliteration has FEWER words than expected.
// ============================================================
function check5WordCountSanity(data, lang) {
  for (const snippet of data) {
    const sanskritBlocks = snippet.sanskrit.split('\n\n').filter(b => b.trim());
    const translitBlocks = snippet.transliteration.split('\n\n').filter(b => b.trim());
    const minLen = Math.min(sanskritBlocks.length, translitBlocks.length);
    for (let i = 0; i < minLen; i++) {
      const sWords = sanskritBlocks[i].trim().split(/\s+/).length;
      const tWords = translitBlocks[i].trim().split(/\s+/).length;
      // Only flag if transliteration has significantly fewer words than Sanskrit
      // (Sanskrit compounds are expected to expand in transliteration)
      if (tWords < sWords * 0.4 && Math.abs(sWords - tWords) > 3) {
        addIssue('CHECK5_TRANSLIT_TOO_SHORT', snippet.id, `${lang}.verse[${i}]`,
          `Sanskrit words=${sWords}, transliteration words=${tWords} (translit suspiciously short)`);
      }
    }
  }
}

// ============================================================
// CHECK 6: Cross-language identity
// ============================================================
function check6CrossLanguage() {
  for (const enSnippet of enData) {
    const hiSnippet = hiData.find(h => h.id === enSnippet.id);
    if (!hiSnippet) {
      addIssue('CHECK6_MISSING_HI', enSnippet.id, 'cross', `No Hindi snippet for id=${enSnippet.id}`);
      continue;
    }

    if (enSnippet.sanskrit !== hiSnippet.sanskrit) {
      addIssue('CHECK6_SANSKRIT_DIFF', enSnippet.id, 'cross', 'Sanskrit differs between EN and HI');
    }
    if (enSnippet.transliteration !== hiSnippet.transliteration) {
      addIssue('CHECK6_TRANSLIT_DIFF', enSnippet.id, 'cross', 'Transliteration differs between EN and HI');
    }
    if (enSnippet.verseTranslations.length !== hiSnippet.verseTranslations.length) {
      addIssue('CHECK6_VT_LENGTH', enSnippet.id, 'cross',
        `EN has ${enSnippet.verseTranslations.length}, HI has ${hiSnippet.verseTranslations.length} translations`);
    }
    if (enSnippet.verses !== hiSnippet.verses) {
      addIssue('CHECK6_VERSES_DIFF', enSnippet.id, 'cross',
        `EN="${enSnippet.verses}", HI="${hiSnippet.verses}"`);
    }
    if (enSnippet.chapter !== hiSnippet.chapter) {
      addIssue('CHECK6_CHAPTER_DIFF', enSnippet.id, 'cross',
        `EN=${enSnippet.chapter}, HI=${hiSnippet.chapter}`);
    }
  }

  for (const hiSnippet of hiData) {
    if (!enData.find(e => e.id === hiSnippet.id)) {
      addIssue('CHECK6_MISSING_EN', hiSnippet.id, 'cross', `No English snippet for id=${hiSnippet.id}`);
    }
  }
}

// ============================================================
// CHECK 7: All verses present (using data's own chapter counts)
// ============================================================
function check7AllVersesPresent(data, lang) {
  const allVerses = new Set();
  const verseSnippetMap = {};

  for (const snippet of data) {
    const verses = parseVerseRange(snippet.verses);
    for (const v of verses) {
      if (allVerses.has(v)) {
        addIssue('CHECK7_DUPLICATE_VERSE', snippet.id, lang,
          `Verse ${v} also in snippet ${verseSnippetMap[v]}`);
      }
      allVerses.add(v);
      verseSnippetMap[v] = snippet.id;
    }
  }

  if (allVerses.size !== TOTAL_VERSES) {
    addIssue('CHECK7_WRONG_TOTAL', 'ALL', lang,
      `Expected ${TOTAL_VERSES} verses, found ${allVerses.size}`);
  }

  const expectedVerses = buildExpectedVerseList();
  for (const expected of expectedVerses) {
    if (!allVerses.has(expected)) {
      addIssue('CHECK7_MISSING_VERSE', 'ALL', lang, `Missing verse ${expected}`);
    }
  }
  for (const actual of allVerses) {
    if (!expectedVerses.has(actual)) {
      addIssue('CHECK7_UNEXPECTED_VERSE', 'ALL', lang, `Unexpected verse ${actual}`);
    }
  }
}

// ============================================================
// CHECK 8: Chapter boundaries
// ============================================================
function check8ChapterBoundaries(data, lang) {
  const chapterVerses = {};
  for (const snippet of data) {
    const verses = parseVerseRange(snippet.verses);
    for (const v of verses) {
      const [ch] = v.split('.').map(Number);
      if (!chapterVerses[ch]) chapterVerses[ch] = new Set();
      chapterVerses[ch].add(v);
    }
  }

  for (const [chapter, expectedCount] of Object.entries(CHAPTER_COUNTS)) {
    const ch = parseInt(chapter);
    const actual = chapterVerses[ch] ? chapterVerses[ch].size : 0;
    if (actual !== expectedCount) {
      addIssue('CHECK8_CHAPTER_COUNT', 'ALL', lang,
        `Chapter ${ch}: expected ${expectedCount} verses, found ${actual}`);
    }
  }
}

// ============================================================
// HELPERS
// ============================================================
function parseVerseRange(versesStr) {
  const results = [];
  const parts = versesStr.split(' - ');
  if (parts.length === 1) {
    results.push(normalizeVerseNum(parts[0].trim()));
  } else {
    const [startCh, startV] = parts[0].trim().split('.').map(Number);
    const [, endV] = parts[1].trim().split('.').map(Number);
    for (let v = startV; v <= endV; v++) {
      results.push(`${startCh}.${String(v).padStart(2, '0')}`);
    }
  }
  return results;
}

function normalizeVerseNum(v) {
  const [ch, verse] = v.split('.').map(Number);
  return `${ch}.${String(verse).padStart(2, '0')}`;
}

function buildExpectedVerseList() {
  const verses = new Set();
  for (const [ch, count] of Object.entries(CHAPTER_COUNTS)) {
    for (let v = 1; v <= count; v++) {
      verses.add(`${parseInt(ch)}.${String(v).padStart(2, '0')}`);
    }
  }
  return verses;
}

// ============================================================
// RUN ALL CHECKS
// ============================================================
console.log('=== VERSE INTEGRITY AUDIT (Post-Fix) ===\n');

check1CountMatch(enData, 'EN');
check1CountMatch(hiData, 'HI');
console.log('Check 1 (Count match): done');

check2NoEmptyBlocks(enData, 'EN');
check2NoEmptyBlocks(hiData, 'HI');
console.log('Check 2 (No empty blocks): done');

check3SanskritStructure(enData, 'EN');
check3SanskritStructure(hiData, 'HI');
console.log('Check 3 (Sanskrit structure): done');

check4TransliterationStructure(enData, 'EN');
check4TransliterationStructure(hiData, 'HI');
console.log('Check 4 (Transliteration structure): done');

check5WordCountSanity(enData, 'EN');
check5WordCountSanity(hiData, 'HI');
console.log('Check 5 (Word count sanity): done');

check6CrossLanguage();
console.log('Check 6 (Cross-language identity): done');

check7AllVersesPresent(enData, 'EN');
check7AllVersesPresent(hiData, 'HI');
console.log('Check 7 (All verses present): done');

check8ChapterBoundaries(enData, 'EN');
check8ChapterBoundaries(hiData, 'HI');
console.log('Check 8 (Chapter boundaries): done');

// ============================================================
// REPORT
// ============================================================
console.log(`\n=== RESULTS: ${issues.length} issues ===\n`);

if (issues.length > 0) {
  const byCheck = {};
  for (const issue of issues) {
    if (!byCheck[issue.check]) byCheck[issue.check] = [];
    byCheck[issue.check].push(issue);
  }
  for (const [check, checkIssues] of Object.entries(byCheck)) {
    console.log(`\n--- ${check} (${checkIssues.length}) ---`);
    for (const issue of checkIssues) {
      console.log(`  Snippet ${issue.snippetId} [${issue.field}]: ${issue.detail}`);
    }
  }
} else {
  console.log('ALL CHECKS PASSED — ZERO ISSUES');
}

// Stats
let enBlocks = 0, hiBlocks = 0, enVT = 0, hiVT = 0, enTranslit = 0, hiTranslit = 0;
for (const s of enData) {
  enBlocks += s.sanskrit.split('\n\n').filter(b => b.trim()).length;
  enTranslit += s.transliteration.split('\n\n').filter(b => b.trim()).length;
  enVT += s.verseTranslations.length;
}
for (const s of hiData) {
  hiBlocks += s.sanskrit.split('\n\n').filter(b => b.trim()).length;
  hiTranslit += s.transliteration.split('\n\n').filter(b => b.trim()).length;
  hiVT += s.verseTranslations.length;
}

console.log(`\n=== STATS ===`);
console.log(`EN: ${enData.length} snippets, ${enBlocks} sanskrit blocks, ${enTranslit} transliterations, ${enVT} translations`);
console.log(`HI: ${hiData.length} snippets, ${hiBlocks} sanskrit blocks, ${hiTranslit} transliterations, ${hiVT} translations`);
console.log(`Expected: ${TOTAL_VERSES} verses per language`);

process.exit(issues.length > 0 ? 1 : 0);
