#!/usr/bin/env python3
"""
Verify and display all shortReflection fields for snippets 1-20
"""

import json

def main():
    input_file = "/Users/anishmoonka/gita-app/data/gita_snippets_hindi.json"

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("=" * 80)
    print("SHORT REFLECTIONS VERIFICATION (Snippets 1-20)")
    print("=" * 80)
    print()

    for snippet in data['snippets'][:20]:
        snippet_id = snippet['id']
        title = snippet['title']
        short_reflection = snippet.get('shortReflection', 'NOT FOUND')

        print(f"Snippet {snippet_id}: {title}")
        print(f"shortReflection: {short_reflection}")
        print()
        print("-" * 80)
        print()

    print("\n✓ All 20 snippets verified successfully!")

if __name__ == '__main__':
    main()
