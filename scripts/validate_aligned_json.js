const fs = require('fs');
const path = require('path');

const VALID_SECTION_TYPES = new Set(['verse', 'verseTranslation', 'commentary', 'reflection']);
const REQUIRED_TOP_KEYS = ['audio_file', 'snippet_key', 'language', 'duration_seconds', 'sections'];
const REQUIRED_WORD_KEYS = ['word', 'start', 'end', 'matched'];

const dirs = [
  '/Users/anishmoonka/Desktop/gita_podcast/Audio_Hindi',
  '/Users/anishmoonka/Desktop/gita_podcast/Audio_English',
];

let totalFiles = 0;
let passCount = 0;
let failCount = 0;
const failures = [];

for (const dir of dirs) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('_aligned.json'));

  for (const file of files) {
    totalFiles++;
    const filePath = path.join(dir, file);
    const errors = [];

    // 1. Valid JSON
    let data;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      data = JSON.parse(raw);
    } catch (e) {
      errors.push(`Invalid JSON: ${e.message}`);
      failures.push({ file: `${path.basename(dir)}/${file}`, errors });
      failCount++;
      continue;
    }

    // 2. Required top-level keys
    for (const key of REQUIRED_TOP_KEYS) {
      if (!(key in data)) {
        errors.push(`Missing top-level key: ${key}`);
      }
    }

    // 3. snippet_key matches filename
    const expectedKey = file.replace('_aligned.json', '');
    if (data.snippet_key && data.snippet_key !== expectedKey) {
      errors.push(`snippet_key mismatch: file="${expectedKey}" content="${data.snippet_key}"`);
    }

    // 4. Corresponding .m4a exists in AAC directory
    if (data.audio_file) {
      const aacDir = dir.replace(/Audio_(English|Hindi)$/, 'Audio_$1_AAC');
      const m4aFile = data.audio_file.replace(/\.mp3$/, '.m4a');
      const m4aPath = path.join(aacDir, m4aFile);
      if (!fs.existsSync(m4aPath)) {
        errors.push(`Missing M4A: ${m4aFile} (expected at ${aacDir})`);
      }
    }

    // 5. Validate sections
    if (Array.isArray(data.sections)) {
      for (let si = 0; si < data.sections.length; si++) {
        const section = data.sections[si];
        const sLabel = `section[${si}]`;

        // Section type
        if (!section.type || !VALID_SECTION_TYPES.has(section.type)) {
          errors.push(`${sLabel}: invalid type "${section.type}"`);
        }

        // Section text
        if (typeof section.text !== 'string') {
          errors.push(`${sLabel}: missing or non-string text`);
        }

        // Words array
        if (!Array.isArray(section.words)) {
          errors.push(`${sLabel}: missing words array`);
          continue;
        }

        // No zero-word sections
        if (section.words.length === 0) {
          errors.push(`${sLabel} (${section.type}): zero words`);
          continue;
        }

        let prevEnd = -Infinity;
        for (let wi = 0; wi < section.words.length; wi++) {
          const w = section.words[wi];
          const wLabel = `${sLabel}.words[${wi}]`;

          // Required word keys
          for (const key of REQUIRED_WORD_KEYS) {
            if (!(key in w)) {
              errors.push(`${wLabel}: missing key "${key}"`);
            }
          }

          // word is non-empty string
          if (typeof w.word !== 'string' || w.word.length === 0) {
            errors.push(`${wLabel}: word is empty or not a string`);
          }

          // start/end are numbers
          if (typeof w.start !== 'number') {
            errors.push(`${wLabel}: start is not a number`);
          }
          if (typeof w.end !== 'number') {
            errors.push(`${wLabel}: end is not a number`);
          }

          // matched is boolean
          if (typeof w.matched !== 'boolean') {
            errors.push(`${wLabel}: matched is not a boolean`);
          }

          // Monotonically increasing: each word's start >= previous word's start
          if (typeof w.start === 'number' && w.start < prevEnd - 0.01) {
            // Allow tiny floating point tolerance
            errors.push(`${wLabel}: timestamp not monotonic (start=${w.start.toFixed(3)} < prevEnd=${prevEnd.toFixed(3)})`);
          }
          if (typeof w.end === 'number') {
            prevEnd = w.start; // Track start for monotonic check (start of each word should be >= start of prev)
          }
        }
      }
    } else if (data.sections !== undefined) {
      errors.push('sections is not an array');
    }

    if (errors.length > 0) {
      failCount++;
      failures.push({ file: `${path.basename(dir)}/${file}`, errors: errors.slice(0, 10) }); // Cap at 10 errors per file
    } else {
      passCount++;
    }
  }
}

console.log(`\n=== Aligned JSON Validation ===`);
console.log(`Total files checked: ${totalFiles}`);
console.log(`Pass: ${passCount}`);
console.log(`Fail: ${failCount}`);

if (failures.length > 0) {
  console.log(`\n--- Failures ---`);
  for (const f of failures) {
    console.log(`\n${f.file}:`);
    for (const e of f.errors) {
      console.log(`  - ${e}`);
    }
  }
}
