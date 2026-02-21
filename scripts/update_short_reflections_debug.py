#!/usr/bin/env python3
import json

# Read the JSON file
with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'r') as f:
    data = json.load(f)

print(f"Total snippets: {len(data['snippets'])}")

# Check if snippet 101 exists
for snippet in data['snippets']:
    if snippet['id'] == 101:
        print(f"\nFound snippet 101:")
        print(f"  Title: {snippet['title']}")
        print(f"  Has shortReflection field: {'shortReflection' in snippet}")
        if 'shortReflection' in snippet:
            print(f"  Current value: {snippet.get('shortReflection')}")
        break

# Short reflections for snippets 101-120
short_reflections = {
    101: "Which one are you right now? The person reaching out from crisis, the curious seeker, the one wanting something specific, or someone who just knows? Your answer matters less than your honesty about it.",
    102: "You worship what you give your attention to. Check your calendar, your screen time, your mental loops. That's your real religion, not what you say on Sunday."
}

# Update the snippets
updated_count = 0
for snippet in data['snippets']:
    if snippet['id'] in short_reflections:
        snippet['shortReflection'] = short_reflections[snippet['id']]
        updated_count += 1
        print(f"Updated snippet {snippet['id']}: {short_reflections[snippet['id']][:50]}...")

print(f"\nTotal snippets updated: {updated_count}")

# Write back to file
with open('/Users/anishmoonka/gita-app/data/gita_snippets_test.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Written to test file: gita_snippets_test.json")
