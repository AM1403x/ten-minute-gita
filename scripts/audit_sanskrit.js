#!/usr/bin/env node
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

function analyzeSk(text) {
  if (text === undefined || text === null || text.trim() === '') {
    return { empty: true, lines: 0, hasDouble: false, contentLines: 0, speakers: 0 };
  }
  const lines = text.split('\n').filter(l => l.trim());
  const hasDouble = lines.some(l => /\|\|/.test(l));
  const speakers = lines.filter(l => /उवाच\s*\|/.test(l)).length;
  return { empty: false, lines: lines.length, contentLines: lines.length - speakers, speakers, hasDouble };
}

const results = [];
let complete = 0, incomplete = 0, missing = 0;

enData.snippets.forEach((en, i) => {
  const hi = hiData.snippets[i];
  const vr = parseVerseRange(en.verses);
  const enSk = analyzeSk(en.sanskrit);
  const hiSk = analyzeSk(hi.sanskrit);
  const expected = vr.count * 2;

  let status;
  if (enSk.empty) { status = 'missing'; missing++; }
  else if (enSk.hasDouble && enSk.contentLines >= expected * 0.8) { status = 'complete'; complete++; }
  else { status = 'incomplete'; incomplete++; }

  results.push({
    id: en.id, verses: en.verses, count: vr.count,
    status, enLines: enSk.contentLines || 0, hiLines: hiSk.contentLines || 0,
    expected, hasDouble: enSk.hasDouble
  });
});

console.log('=== AUDIT SUMMARY ===');
console.log('Complete:', complete);
console.log('Incomplete:', incomplete);
console.log('Missing:', missing);
console.log('Total:', results.length);
console.log();

console.log('=== INCOMPLETE SAMPLES (first 10) ===');
results.filter(r => r.status === 'incomplete').slice(0, 10).forEach(r => {
  console.log(`  #${r.id} (${r.verses}): ${r.enLines} content lines, expected ${r.expected}, has||=${r.hasDouble}`);
});
console.log();

console.log('=== COMPLETE SNIPPETS ===');
results.filter(r => r.status === 'complete').forEach(r => {
  console.log(`  #${r.id} (${r.verses}): ${r.enLines} content lines, expected ${r.expected}`);
});

fs.writeFileSync(path.join(__dirname, 'verse_audit_report.json'), JSON.stringify({
  summary: { total: results.length, complete, incomplete, missing },
  snippets: results
}, null, 2));
console.log('\nReport written to scripts/verse_audit_report.json');
