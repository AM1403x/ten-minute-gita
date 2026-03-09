#!/usr/bin/env python3
"""Extend tweet schedule to cover April 1-30, 2026.

Keeps existing March tweets (IDs 1-54), adds April tweets (IDs 55-114).
Days 207-236 shuffled randomly across April dates.
"""

import json
import random
import re
from pathlib import Path
from datetime import datetime, timedelta

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SNIPPETS_PATH = PROJECT_ROOT / "data" / "gita_snippets.json"
REFLECTIONS_PATH = PROJECT_ROOT / "data" / "short_reflections.json"
SCHEDULE_PATH = PROJECT_ROOT / "scripts" / "tweet_schedule.json"

snippets = json.load(open(SNIPPETS_PATH))["snippets"]
reflections = json.load(open(REFLECTIONS_PATH))


def clean_markdown(text: str) -> str:
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)
    text = text.replace("**", "")
    return text.strip()


def extract_best_paragraph(text: str, min_len=150, max_len=600) -> str:
    paragraphs = [clean_markdown(p.strip()) for p in text.split("\n\n") if p.strip()]
    candidates = []
    for p in paragraphs:
        if min_len <= len(p) <= max_len:
            score = 0
            if "you" in p.lower():
                score += 3
            if "?" in p:
                score += 2
            if "we" in p.lower():
                score += 1
            if p.count("ā") + p.count("ī") + p.count("ū") < 3:
                score += 2
            candidates.append((score, p))

    candidates.sort(key=lambda x: -x[0])
    if candidates:
        return candidates[0][1]

    if paragraphs:
        p = paragraphs[0]
        if len(p) > max_len:
            sentences = re.split(r"(?<=[.!?])\s+", p)
            result = ""
            for s in sentences:
                if len(result) + len(s) + 1 > max_len:
                    break
                result = result + " " + s if result else s
            return result
        return p
    return ""


def format_am_tweet(day: int) -> str:
    s = snippets[day - 1]
    r = reflections[day - 1]["shortReflection"]
    verses = s["verses"].replace(" ", "")
    header = f"Chapter {s['chapter']}, Verses {verses} (Day {day})"
    return f"{header}\n\n{r}"


def format_pm_tweet(day: int) -> str:
    s = snippets[day - 1]
    verses = s["verses"].replace(" ", "")
    header = f"Chapter {s['chapter']}, Verses {verses} (Day {day})"
    verse_trans = clean_markdown(s["verseTranslations"][0]).strip('"').strip()
    if len(verse_trans) > 200:
        sentences = re.split(r"(?<=[.!?])\s+", verse_trans)
        verse_trans = sentences[0] if sentences else verse_trans[:200]
    insight = extract_best_paragraph(s["reflection"], min_len=120, max_len=500)
    if not insight:
        insight = extract_best_paragraph(s["commentary"], min_len=120, max_len=500)
    return f'{header}\n\n"{verse_trans}"\n\n{insight}'


# Load existing schedule
schedule = json.load(open(SCHEDULE_PATH))
existing_count = len(schedule["tweets"])
next_id = max(t["id"] for t in schedule["tweets"]) + 1

print(f"Existing schedule: {existing_count} tweets (IDs 1-{next_id - 1})")

# April 1-30, Days 207-236
april_days = list(range(207, 237))  # 30 days
random.seed(43)  # Different seed from March (which used 42)
random.shuffle(april_days)

april_start = datetime(2026, 4, 1)
new_tweets = []

for i, day in enumerate(april_days):
    date = april_start + timedelta(days=i)
    date_str = date.strftime("%Y-%m-%d")

    am_tweet = format_am_tweet(day)
    new_tweets.append({
        "id": next_id + i * 2,
        "day": day,
        "date": date_str,
        "time": "08:00",
        "type": "short",
        "content": am_tweet,
        "chars": len(am_tweet),
    })

    pm_tweet = format_pm_tweet(day)
    new_tweets.append({
        "id": next_id + i * 2 + 1,
        "day": day,
        "date": date_str,
        "time": "20:00",
        "type": "long",
        "content": pm_tweet,
        "chars": len(pm_tweet),
    })

schedule["tweets"].extend(new_tweets)
schedule["extended_at"] = datetime.now().isoformat()

with open(SCHEDULE_PATH, "w") as f:
    json.dump(schedule, f, indent=2, ensure_ascii=False)

# Summary
short_new = [t for t in new_tweets if t["type"] == "short"]
long_new = [t for t in new_tweets if t["type"] == "long"]

print(f"\nAdded {len(new_tweets)} April tweets (IDs {next_id}-{next_id + len(new_tweets) - 1})")
print(f"Days 207-236 shuffled across April 1-30")
print(f"Short (AM): {len(short_new)} tweets, avg {sum(t['chars'] for t in short_new)//len(short_new)} chars")
print(f"Long (PM):  {len(long_new)} tweets, avg {sum(t['chars'] for t in long_new)//len(long_new)} chars")
print(f"Total schedule: {len(schedule['tweets'])} tweets (Mar 5 - Apr 30)")

# Preview day order
print(f"\nApril day order: {april_days}")
print(f"\nPreview first 4 April tweets:")
for t in new_tweets[:4]:
    print(f"\n📅 {t['date']} @ {t['time']} | Day {t['day']} | {t['type']} ({t['chars']}c)")
    print("─" * 55)
    print(t["content"][:200] + ("..." if len(t["content"]) > 200 else ""))
    print("─" * 55)
