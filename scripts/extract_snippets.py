import json
import sys

# Read the file
with open('/Users/anishmoonka/gita-app/data/gita_snippets_hindi.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Extract snippets 141-160
for snippet in data['snippets']:
    if 141 <= snippet['id'] <= 160:
        print(f"\n{'='*80}")
        print(f"ID: {snippet['id']}")
        print(f"Title: {snippet['title']}")
        print(f"\nReflection:")
        reflection = snippet.get('reflection', 'NO REFLECTION FOUND')
        # Truncate if too long
        if len(reflection) > 500:
            print(reflection[:500] + "...")
        else:
            print(reflection)
        print(f"\nCurrent shortReflection:")
        print(snippet.get('shortReflection', 'NO SHORT REFLECTION'))
        print('='*80)
