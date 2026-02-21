#!/usr/bin/env node
/**
 * Fix 5 transliteration issues found by verse integrity audit.
 * Applies identical fixes to both EN and HI JSON files.
 */

const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '../data/gita_snippets.json'),
  path.join(__dirname, '../data/gita_snippets_hindi.json'),
];

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const data = raw.snippets;
  const lang = file.includes('hindi') ? 'HI' : 'EN';
  let fixCount = 0;

  // === FIX 1: Snippet 2 — Move first line of verse 1.06 from block 1 to block 2 ===
  const s2 = data.find(s => s.id === 2);
  const old2 = s2.transliteration;
  s2.transliteration =
    "atra śhūrā maheṣhvāsā bhīmārjuna-samā yudhi\nyuyudhāno virāṭaśhcha drupadaśhcha mahā-rathaḥ\n\ndhṛiṣhṭaketuśhchekitānaḥ kāśhirājaśhcha vīryavān\npurujit kuntibhojaśhcha śhaibyaśhcha nara-puṅgavaḥ\n\nyudhāmanyuśhcha vikrānta uttamaujāśhcha vīryavān\nsaubhadro draupadeyāśhcha sarva eva mahā-rathāḥ";
  if (s2.transliteration !== old2) {
    console.log(`[${lang}] Fix 1: Snippet 2 — fixed verse 1.06 transliteration boundary`);
    fixCount++;
  }

  // === FIX 2: Snippet 31 — Merge 6 fragments into 3 proper blocks ===
  const s31 = data.find(s => s.id === 31);
  const old31 = s31.transliteration;
  s31.transliteration =
    "kāmātmānaḥ svarga-parā janma-karma-phala-pradām\nkriyā-viśeṣa-bahulāṁ bhogaiśvarya-gatiṁ prati\n\nbhogaiśvarya-prasaktānāṁ tayāpahṛita-chetasām\nvyavasāyātmikā buddhiḥ samādhau na vidhīyate\n\ntrai-guṇya-viṣhayā vedā nistrai-guṇyo bhavārjuna\nnirdvandvo nitya-sattva-stho niryoga-kṣhema ātmavān";
  if (s31.transliteration !== old31) {
    console.log(`[${lang}] Fix 2: Snippet 31 — merged 6 fragments into 3 blocks`);
    fixCount++;
  }

  // === FIX 3: Snippet 65 — Remove duplicate blocks, fix verse 4.29/4.30 boundary ===
  const s65 = data.find(s => s.id === 65);
  const old65 = s65.transliteration;
  s65.transliteration =
    "dravya-yajñās tapo-yajñā yoga-yajñās tathāpare\nswādhyāya-jñāna-yajñāśh cha yatayaḥ sanśhita-vratāḥ\n\napāne juhvati prāṇaṁ prāṇe 'pānaṁ tathāpare\nprāṇāpāna-gatī ruddhvā prāṇāyāma-parāyaṇāḥ\n\napare niyatāhārāḥ prāṇān prāṇeṣhu juhvati\nsarve 'pyete yajña-vido yajña-kṣhapita-kalmaṣhāḥ";
  if (s65.transliteration !== old65) {
    console.log(`[${lang}] Fix 3: Snippet 65 — removed duplicate blocks, fixed verse boundary`);
    fixCount++;
  }

  // === FIX 4: Snippet 138 — Remove stray Devanagari block ===
  const s138 = data.find(s => s.id === 138);
  const old138 = s138.transliteration;
  s138.transliteration =
    "pavanaḥ pavatām asmi rāmaḥ śhastra-bhṛitām aham\njhaṣhāṇāṁ makaraśh chāsmi srotasām asmi jāhnavī\n\nsargāṇām ādir antaśh cha madhyaṁ chaivāham arjuna\nadhyātma-vidyā vidyānāṁ vādaḥ pravadatām aham\n\nakṣharāṇām a-kāro 'smi dvandvaḥ sāmāsikasya cha\naham evākṣhayaḥ kālo dhātāhaṁ viśhvato-mukhaḥ";
  if (s138.transliteration !== old138) {
    console.log(`[${lang}] Fix 4: Snippet 138 — removed stray Devanagari block`);
    fixCount++;
  }

  // === FIX 5: Snippet 148 — Replace Devanagari block 0 with correct IAST ===
  const s148 = data.find(s => s.id === 148);
  const old148 = s148.transliteration;
  s148.transliteration =
    "anādi-madhyāntam ananta-vīryam ananta-bāhuṁ śhaśhi-sūrya-netram\npaśhyāmi tvāṁ dīpta-hutāśha-vaktram sva-tejasā viśhvam idaṁ tapantam\n\ndyāv ā-pṛithivyor idam antaraṁ hi\nvyāptaṁ tvayaikena diśhaśh cha sarvāḥ\ndṛiṣhṭvādbhutaṁ rūpam ugraṁ tavedaṁ\nloka-trayaṁ pravyathitaṁ mahātman\n\namī hi tvāṁ sura-saṅghā viśhanti\nkechid bhītāḥ prāñjalayo gṛiṇanti\nsvastīty uktvā maharṣhi-siddha-saṅghāḥ\nstuvanti tvāṁ stutibhiḥ puṣhkalābhiḥ";
  if (s148.transliteration !== old148) {
    console.log(`[${lang}] Fix 5: Snippet 148 — replaced Devanagari with IAST transliteration`);
    fixCount++;
  }

  // Write back
  fs.writeFileSync(file, JSON.stringify(raw, null, 2) + '\n');
  console.log(`[${lang}] Applied ${fixCount} fixes.\n`);
}

console.log('All fixes applied to both files.');
