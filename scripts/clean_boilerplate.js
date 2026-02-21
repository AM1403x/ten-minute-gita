/**
 * Script to clean podcast-style boilerplate from English commentary.
 *
 * Strategy:
 * - Only modify the FIRST paragraph (before the first \n\n)
 * - If the entire first paragraph is boilerplate, remove it and check the next paragraph too
 * - Within a paragraph, identify and remove boilerplate sentences from the beginning
 * - Be conservative: if a sentence mentions specific verse content, keep it
 * - Track all changes made
 */

const fs = require('fs');

const filePath = '/Users/anishmoonka/gita-app/data/gita_snippets.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Helper: split text into sentences
function splitSentences(text) {
  const sentences = [];
  let current = '';
  let i = 0;
  while (i < text.length) {
    current += text[i];
    if (text[i] === '.' || text[i] === '?' || text[i] === '!') {
      const next = text[i + 1];
      if (next === undefined || next === ' ' || next === '\n' || next === '"' || next === '*') {
        const lastWord = current.trim().split(/\s+/).pop() || '';
        if (lastWord.match(/^(Mr|Mrs|Ms|Dr|vs|etc|i\.e|e\.g|St|Ch|ch|Vol|No|Jr|Sr)\.$/i)) {
          i++;
          continue;
        }
        if (text[i] === '.' && text[i + 1] === '.' && text[i + 2] === '.') {
          i++;
          continue;
        }
        sentences.push(current.trim());
        current = '';
      }
    }
    i++;
  }
  if (current.trim()) {
    sentences.push(current.trim());
  }
  return sentences;
}

function isBoilerplate(sentence) {
  const s = sentence.replace(/\*/g, '').trim();
  const lower = s.toLowerCase();

  if (lower.match(/^(so\s+)?(we\s+(had|have)\s+been\s+discussing)/)) return true;
  if (lower.match(/^(so\s+)?(we\s+are\s+(now\s+)?discussing)/)) return true;
  if (lower.match(/^(so\s+)?(we\s+will\s+be\s+discussing)/)) return true;
  if (lower.match(/^(so\s+)?(we'll\s+be\s+discussing)/)) return true;
  if (lower.match(/^(so\s+)?(we've\s+been\s+discussing)/)) return true;
  if (lower.match(/^(so\s+)?(we\s+have\s+completed\s+(discussion\s+on\s+)?chapter)/)) return true;
  if (lower.match(/^(so\s+)?(we\s+completed\s+chapter)/)) return true;
  if (lower.match(/^what is my purpose and destiny/)) return true;
  if (lower.match(/^unlike a car with its user/)) return true;
  if (lower.match(/^we experience life('s|s)? vicissitudes/)) return true;
  if (lower.match(/^the gita has been described as such a guide/)) return true;
  if (lower.match(/^shri purohit there is no comment/)) return true;
  if (lower.match(/^discussing chapter \d+/)) return true;
  if (lower.match(/^okay,?\s+(so\s+)?(we|i)\s+(had|have|will)\s+be(en)?\s+discussing/)) return true;
  if (lower.match(/^(so\s+)?so\s+far\s+we\s+have\s+discussed\s+chapter/)) return true;
  if (lower.match(/^just to remind (us|ourselves)/)) return true;
  if (lower.match(/^as we (discussed|have discussed) before/)) return true;
  if (lower.match(/^in that context,?\s+we('re| are) seeing chapter/)) return true;
  if (lower.match(/^as i said earlier/)) return true;
  if (lower.match(/^so let us continue/)) return true;
  // Short chapter intro: "Chapter 2, Sankhya Yoga, Yoga of Knowledge."
  if (lower.match(/^chapter\s+\d+,?\s+[\w\s]+(yoga|sannyasa)/i) && s.length < 120) return true;
  if (lower.match(/^so\s+far\s+(we\s+have\s+seen|in\s+bhagavad)/)) return true;
  if (lower.match(/^we\s+have\s+seen\s+so\s+far/)) return true;
  if (lower.match(/^(so\s+)?(we\s+have\s+started\s+discussing)/)) return true;
  if (lower.match(/^(so\s+)?(we\s+concluded\s+chapter)/)) return true;
  if (lower.match(/^we\s+have\s+come\s+to\s+the\s+final/)) return true;
  if (lower.match(/^and\s+now\s+we\s+will\s+be\s+starting/)) return true;
  if (lower.match(/^now\s+we('ll|\s+will)\s+be\s+starting/)) return true;
  if (lower.match(/^now\s+we('ll|\s+will)\s+be\s+discussing/)) return true;
  if (lower.match(/^we\s+are\s+coming\s+to\s+(the\s+)?(end|conclusion)/)) return true;
  if (lower.match(/^we\s+are\s+at\s+the\s+(end|conclusion)/)) return true;
  if (lower.match(/^this is (the|a|obviously\s+the) last chapter/)) return true;
  if (lower.match(/^this is obviously/)) return true;
  // "So we are concluding chapter nine today."
  if (lower.match(/^(so\s+)?we\s+are\s+concluding\s+chapter/)) return true;
  // "As we have been discussing last few times..."
  if (lower.match(/^as\s+we\s+have\s+been\s+discussing/)) return true;
  // "In the beginning of Bhagavad Gita, the first six chapters, we have learned..."
  if (lower.match(/^in the beginning of bhagavad gita,?\s+the\s+first\s+\w+\s+chapters/)) return true;

  return false;
}

function isRecapSentence(sentence) {
  const s = sentence.replace(/\*/g, '').trim();
  const lower = s.toLowerCase();

  if (lower.match(/^in the (first|last|previous)\s+\w+\s+(chapters?|verses?|classes?|sessions?)/)) return true;
  if (lower.match(/^so\s+far\s+(we|in)/)) return true;
  if (lower.match(/^we\s+have\s+seen\s+so\s+far/)) return true;
  if (lower.match(/^as\s+we\s+have\s+(seen|discussed|learned)/)) return true;
  if (lower.match(/^as\s+we\s+discussed\s*(before|last|earlier|,)/)) return true;
  if (lower.match(/^in\s+that\s+context/)) return true;
  if (lower.match(/^so\s+far\s+in\s+chapter/)) return true;
  if (lower.match(/^in\s+(our|the)\s+(last|previous)\s+(class|session|discussion)/)) return true;
  if (lower.match(/^we\s+have\s+discussed\s+so\s+many\s+times/)) return true;
  if (lower.match(/^so\s+those\s+of\s+you\s+who\s+remember/)) return true;
  if (lower.match(/^yoga\s+of\s+\w+\s+means\s+/)) return true;
  if (lower.match(/^in\s+chapter\s+\d+,?\s+(we|bhagavan|bhagawan|krishna)/)) return true;
  if (lower.match(/^the\s+last\s+chapter\s+(ended|concluded)/)) return true;
  if (lower.match(/^in\s+the\s+last\s+chapter\s+we\s+have/)) return true;
  if (lower.match(/^so\s+in\s+the\s+last\s+chapter/)) return true;
  if (lower.match(/^we\s+have\s+seen\s+in\s+bhagavad\s+gita/)) return true;
  if (lower.match(/^we\s+have\s+discussed\s+what\s+this\s+chapter/)) return true;
  if (lower.match(/^the\s+very\s+title\s+implies/)) return true;
  if (lower.match(/^just\s+to\s+remind\s+(ourselves|us)/)) return true;
  if (lower.match(/^up\s+till\s+now\s+in\s+bhagavad\s+gita/)) return true;
  if (lower.match(/^we\s+have\s+seen\s+that\s+bhagavan/)) return true;
  if (lower.match(/^and\s+we('ll|\s+will)\s+be\s+(entering|starting|discussing)/)) return true;
  if (lower.match(/^in\s+karma\s+yoga\s+we\s+have\s+seen/)) return true;
  if (lower.match(/^and\s+this\s+chapter\s+is/)) return true;
  if (lower.match(/^this is all about (knowledge|the|what)/)) return true;
  if (lower.match(/^the\s+chapter\s+opened\s+with/)) return true;
  if (lower.match(/^we\s+have\s+completed\s+discussion/)) return true;
  if (lower.match(/^that\s+thou\s+art\s+that\s+which/)) return true;
  if (lower.match(/^this is the last chapter/)) return true;
  if (lower.match(/^chapter\s+(nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|\d+),?\s+/)) return true;
  if (lower.match(/^so\s+far\s+we\s+have\s+seen/)) return true;
  if (lower.match(/^so\s+that\s+paradigm\s+shift/)) return true;
  if (lower.match(/^so\s+we\s+had\s+been\s+systematically/)) return true;
  if (lower.match(/^whichever\s+way\s+we\s+define/)) return true;

  return false;
}

function isSubstantive(sentence) {
  const s = sentence.replace(/\*/g, '').trim();
  const lower = s.toLowerCase();

  if (lower.match(/^(arjuna|krishna|bhagavan|duryodhana|dhritarashtra|sanjaya|bhishma|drona)\s+(said|tells|asks|replies|spoke|describes|explains|points)/)) return true;
  if (lower.match(/^(the\s+)?(truth|key|point|teaching|lesson|message|idea|concept|principle)\s+(here|is|of)/)) return true;
  if (s.match(/^["'"]/)) return true;
  if (lower.match(/^in\s+verse\s+\d+/)) return true;
  if (lower.match(/^verse\s+\d+/)) return true;
  if (lower.match(/^the\s+verse\s+(says|states|tells|begins|opens)/)) return true;

  return false;
}

// Clean boilerplate from a paragraph, return { cleaned, sentencesRemoved } or null if no changes
function cleanParagraph(para) {
  const sentences = splitSentences(para);
  if (sentences.length === 0) return null;

  if (!isBoilerplate(sentences[0])) return null;

  let removeCount = 0;
  for (let i = 0; i < sentences.length; i++) {
    const sent = sentences[i];

    if (i === 0 && isBoilerplate(sent)) {
      removeCount++;
      continue;
    }

    if (i > 0 && i < 5) {
      if (isBoilerplate(sent) || isRecapSentence(sent)) {
        if (isSubstantive(sent)) break;
        removeCount++;
        continue;
      }
    }

    break;
  }

  if (removeCount === 0) return null;

  if (removeCount >= sentences.length) {
    return { cleaned: null, sentencesRemoved: removeCount, allRemoved: true };
  }

  let remaining = sentences.slice(removeCount).join(' ');

  // Clean up dangling conjunctions at the start
  remaining = remaining.replace(/^(And\s+|So\s+|But\s+|Then\s+|Also\s+)/i, '');

  // Capitalize first letter (handle markdown formatting)
  if (remaining.length > 0) {
    if (remaining[0] === '*') {
      const match = remaining.match(/^\*+([a-z])/);
      if (match) {
        remaining = remaining.replace(/^\*+[a-z]/, (m) => m.slice(0, -1) + m.slice(-1).toUpperCase());
      }
    } else {
      remaining = remaining[0].toUpperCase() + remaining.slice(1);
    }
  }

  return { cleaned: remaining, sentencesRemoved: removeCount, allRemoved: false };
}

function cleanCommentary(snippet) {
  const commentary = snippet.commentary;
  const id = snippet.id;

  // Split into paragraphs
  const paragraphs = commentary.split('\n\n');
  let totalSentencesRemoved = 0;
  let modified = false;

  // Clean first paragraph
  const firstResult = cleanParagraph(paragraphs[0]);

  if (!firstResult) return null; // No boilerplate found

  if (firstResult.allRemoved) {
    // Entire first paragraph is boilerplate
    totalSentencesRemoved += firstResult.sentencesRemoved;

    if (paragraphs.length <= 1) return null; // Can't remove everything

    // Remove first paragraph
    paragraphs.shift();
    modified = true;

    // Check if the NEXT paragraph also starts with boilerplate
    const secondResult = cleanParagraph(paragraphs[0]);
    if (secondResult) {
      if (secondResult.allRemoved) {
        totalSentencesRemoved += secondResult.sentencesRemoved;
        if (paragraphs.length <= 1) {
          return null; // Can't remove everything
        }
        paragraphs.shift();
      } else {
        totalSentencesRemoved += secondResult.sentencesRemoved;
        paragraphs[0] = secondResult.cleaned;
      }
    }
  } else {
    totalSentencesRemoved += firstResult.sentencesRemoved;
    paragraphs[0] = firstResult.cleaned;
    modified = true;
  }

  if (!modified) return null;

  const newCommentary = paragraphs.join('\n\n');

  return {
    snippet_id: id,
    language: 'en',
    field: 'commentary',
    change_type: 'removed_boilerplate',
    sentences_removed: totalSentencesRemoved,
    old_length: commentary.length,
    new_length: newCommentary.length,
    audio_impact: 'commentary section changed \u2014 needs re-record',
    newCommentary: newCommentary
  };
}

// Process all snippets
const results = [];
let cleanedCount = 0;

for (const snippet of data.snippets) {
  const result = cleanCommentary(snippet);
  if (result) {
    snippet.commentary = result.newCommentary;
    cleanedCount++;

    const { newCommentary, ...changeEntry } = result;
    results.push(changeEntry);
  }
}

// Write the cleaned data back
fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`Total commentaries cleaned: ${cleanedCount}`);

// Write the change log
fs.writeFileSync('/Users/anishmoonka/gita-app/scripts/boilerplate_changes.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Change log written to scripts/boilerplate_changes.json');
