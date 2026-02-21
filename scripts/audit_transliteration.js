#!/usr/bin/env node
/**
 * audit_transliteration.js
 *
 * Audits transliteration completeness across all 239 snippets.
 * Checks line counts against expected (2 pādas per verse + speaker lines).
 */

const fs = require('fs');
const path = require('path');
const enData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'gita_snippets.json'), 'utf8'));
const hiData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'gita_snippets_hindi.json'), 'utf8'));

function parseVerseRange(v) {
  const m = v.trim().match(/(\d+)\.(\d+)\s*-\s*(\d+)\.(\d+)/);
  if (m) return { ch: +m[1], start: +m[2], end: +m[4], count: +m[4] - +m[2] + 1 };
  const m2 = v.trim().match(/(\d+)\.(\d+)/);
  return { ch: +m2[1], start: +m2[2], end: +m2[2], count: 1 };
}

function analyzeTranslit(text) {
  if (text === undefined || text === null || text.trim() === '') {
    return { empty: true, lines: 0, contentLines: 0, speakers: 0 };
  }
  const lines = text.split('\n').filter(l => l.trim());
  // Speaker lines in transliteration: contain "uvācha" or "uvāca"
  const speakers = lines.filter(l => /uv[aā]ch?a/i.test(l) && l.trim().split(/\s+/).length <= 4).length;
  return { empty: false, lines: lines.length, contentLines: lines.length - speakers, speakers };
}

const results = [];
let complete = 0, incomplete = 0, missing = 0;

enData.snippets.forEach((en, i) => {
  const hi = hiData.snippets[i];
  const vr = parseVerseRange(en.verses);
  const enT = analyzeTranslit(en.transliteration);
  const hiT = analyzeTranslit(hi.transliteration);
  const expected = vr.count * 2; // 2 pādas per verse

  let status;
  if (enT.empty) { status = 'missing'; missing++; }
  else if (enT.contentLines >= expected * 0.8) { status = 'complete'; complete++; }
  else { status = 'incomplete'; incomplete++; }

  // Check EN/HI match
  const match = en.transliteration === hi.transliteration;

  results.push({
    id: en.id, verses: en.verses, count: vr.count,
    status, enLines: enT.contentLines || 0, hiLines: hiT.contentLines || 0,
    expected, speakers: enT.speakers, enHiMatch: match
  });
});

console.log('=== TRANSLITERATION AUDIT SUMMARY ===');
console.log('Complete:', complete);
console.log('Incomplete:', incomplete);
console.log('Missing:', missing);
console.log('Total:', results.length);

const mismatches = results.filter(r => !r.enHiMatch);
console.log('\nEN/HI mismatches:', mismatches.length);
if (mismatches.length > 0) {
  mismatches.forEach(r => console.log('  #' + r.id + ' (' + r.verses + ')'));
}

console.log('\n=== INCOMPLETE SAMPLES (first 10) ===');
results.filter(r => r.status === 'incomplete').slice(0, 10).forEach(r => {
  console.log('  #' + r.id + ' (' + r.verses + '): ' + r.enLines + ' content lines, expected ' + r.expected + ', speakers=' + r.speakers);
});

console.log('\n=== MISSING ===');
results.filter(r => r.status === 'missing').forEach(r => {
  console.log('  #' + r.id + ' (' + r.verses + ')');
});

fs.writeFileSync(path.join(__dirname, 'translit_audit_report.json'), JSON.stringify({
  summary: { total: results.length, complete, incomplete, missing, enHiMismatches: mismatches.length },
  snippets: results
}, null, 2));
console.log('\nReport written to scripts/translit_audit_report.json');
