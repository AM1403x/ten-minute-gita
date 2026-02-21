const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'utf8'));

console.log('SHORT REFLECTIONS FOR SNIPPETS 1-20\n');
console.log('='.repeat(80) + '\n');

for (let i = 0; i < 20; i++) {
  const snippet = data.snippets[i];
  console.log(`SNIPPET ${snippet.id}: ${snippet.title}`);
  console.log('-'.repeat(80));
  if (snippet.shortReflection) {
    console.log(snippet.shortReflection);
    console.log(`\nLength: ${snippet.shortReflection.length} characters`);
    const sentences = snippet.shortReflection.split(/[.!?]+/).filter(s => s.trim().length > 0);
    console.log(`Sentences: ${sentences.length}`);
  } else {
    console.log('❌ NO SHORT REFLECTION');
  }
  console.log('\n' + '='.repeat(80) + '\n');
}

console.log('SUMMARY');
console.log('-'.repeat(80));
const count = data.snippets.slice(0, 20).filter(s => s.shortReflection).length;
console.log(`✓ ${count}/20 snippets have shortReflection field`);
