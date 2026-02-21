#!/usr/bin/env python3
"""
Update shortReflection fields for snippets 41-60 in gita_snippets_hindi.json
These snippets have misaligned shortReflections that need to be corrected.
"""

import json
import sys

# File path
FILE_PATH = '/Users/anishmoonka/gita-app/data/gita_snippets_hindi.json'

# Short reflections to UPDATE for snippets that have misaligned content
SHORT_REFLECTIONS = {
    51: "जो इस शिक्षा पर विश्वास करके लगातार अभ्यास करते हैं, वे मुक्त हो जाते हैं। जो संदेह और दोष-दर्शन में फँसे रहते हैं, खो जाते हैं। आप किस सलाह को सुनकर भी टाल रहे हैं?",

    53: "काम धुएँ, धूल और गर्भ की तरह ज्ञान को ढकता है। कुछ इच्छाएँ हल्की हैं, कुछ जमी हुई हैं, कुछ गहरी जड़ें जमाए हैं। आज कौन सी इच्छा आपको बार-बार ठोकर खिला रही है?",

    55: "बुद्धि से परे उसे जानकर, आत्मा द्वारा आत्मा को स्थिर करके, इस काम रूपी शत्रु को मारो। रणभूमि आपके भीतर है। आज कौन सी लड़ाई आप टाल रहे हैं?",

    60: "कर्म मुझे लिप्त नहीं करते क्योंकि मुझे फल की इच्छा नहीं। जो यह जानता है वह बँधता नहीं। आपकी गतिविधि आपकी पहचान नहीं है। आज क्या होगा अगर आप पूर्ण ऊर्जा से करें पर शून्य आसक्ति से?"
}

def main():
    print(f"Reading {FILE_PATH}...")

    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    # Find and update snippets
    snippets = data.get('snippets', [])
    updated_count = 0

    for snippet in snippets:
        snippet_id = snippet.get('id')
        if snippet_id in SHORT_REFLECTIONS:
            old_value = snippet.get('shortReflection', 'NOT SET')
            snippet['shortReflection'] = SHORT_REFLECTIONS[snippet_id]
            print(f"  Updated snippet {snippet_id}")
            print(f"    Old: {old_value[:80] if old_value != 'NOT SET' else 'NOT SET'}...")
            print(f"    New: {SHORT_REFLECTIONS[snippet_id][:80]}...")
            updated_count += 1

    if updated_count == 0:
        print("No snippets were updated!")
        sys.exit(1)

    print(f"\nUpdated {updated_count} snippets")
    print(f"Writing back to {FILE_PATH}...")

    try:
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("✓ File updated successfully!")
    except Exception as e:
        print(f"Error writing file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
