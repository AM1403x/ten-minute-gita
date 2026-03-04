#!/usr/bin/env python3
"""Generate the tweet schedule for March 5-31, 2026.

AM (8:00): Short reflection tweet (existing shortReflection, <280 chars)
PM (20:00): Longer tweet with verse + deeper insight (Premium Plus, 500-1000 chars)
"""

import json
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
    """Strip markdown formatting for tweets."""
    text = re.sub(r"\*([^*]+)\*", r"\1", text)  # *italic*
    text = re.sub(r"_([^_]+)_", r"\1", text)  # _italic_
    text = text.replace("**", "")
    return text.strip()


def extract_best_paragraph(text: str, min_len=150, max_len=600) -> str:
    """Extract the best standalone paragraph from commentary/reflection."""
    paragraphs = [clean_markdown(p.strip()) for p in text.split("\n\n") if p.strip()]
    # Filter by length and skip very technical/Sanskrit-heavy ones
    candidates = []
    for p in paragraphs:
        if min_len <= len(p) <= max_len:
            # Prefer paragraphs that feel conversational
            score = 0
            if "you" in p.lower():
                score += 3
            if "?" in p:
                score += 2
            if "we" in p.lower():
                score += 1
            if p.count("ā") + p.count("ī") + p.count("ū") < 3:  # less Sanskrit
                score += 2
            candidates.append((score, p))

    candidates.sort(key=lambda x: -x[0])
    if candidates:
        return candidates[0][1]

    # Fallback: first paragraph, truncated
    if paragraphs:
        p = paragraphs[0]
        if len(p) > max_len:
            # Cut at last sentence boundary
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
    """Morning tweet: short reflection with header."""
    s = snippets[day - 1]
    r = reflections[day - 1]["shortReflection"]
    verses = s["verses"].replace(" ", "")  # "14.01 - 14.03" -> "14.01-14.03"
    # Match existing format from screenshots
    header = f"Chapter {s['chapter']}, Verses {verses} (Day {day})"
    return f"{header}\n\n{r}"


def format_pm_tweet(day: int) -> str:
    """Evening tweet: verse + deeper insight (longer format)."""
    s = snippets[day - 1]
    verses = s["verses"].replace(" ", "")

    header = f"Chapter {s['chapter']}, Verses {verses} (Day {day})"

    # Get first verse translation (cleaned)
    verse_trans = clean_markdown(s["verseTranslations"][0]).strip('"').strip()
    # Truncate if too long
    if len(verse_trans) > 200:
        sentences = re.split(r"(?<=[.!?])\s+", verse_trans)
        verse_trans = sentences[0] if sentences else verse_trans[:200]

    # Get best paragraph from reflection
    insight = extract_best_paragraph(s["reflection"], min_len=120, max_len=500)

    if not insight:
        # Fallback to commentary
        insight = extract_best_paragraph(s["commentary"], min_len=120, max_len=500)

    tweet = f'{header}\n\n"{verse_trans}"\n\n{insight}'

    return tweet


# Generate schedule: Mar 5 to Mar 31, 2026
schedule = {"tweets": [], "generated_at": datetime.now().isoformat()}

start_date = datetime(2026, 3, 5)
start_day = 180  # Continue from where the account left off

for i in range(27):  # 27 days
    date = start_date + timedelta(days=i)
    day = start_day + i
    date_str = date.strftime("%Y-%m-%d")

    # AM tweet
    am_tweet = format_am_tweet(day)
    schedule["tweets"].append(
        {
            "id": i * 2 + 1,
            "day": day,
            "date": date_str,
            "time": "08:00",
            "type": "short",
            "content": am_tweet,
            "chars": len(am_tweet),
        }
    )

    # PM tweet
    pm_tweet = format_pm_tweet(day)
    schedule["tweets"].append(
        {
            "id": i * 2 + 2,
            "day": day,
            "date": date_str,
            "time": "20:00",
            "type": "long",
            "content": pm_tweet,
            "chars": len(pm_tweet),
        }
    )

# Save
with open(SCHEDULE_PATH, "w") as f:
    json.dump(schedule, f, indent=2, ensure_ascii=False)

# Summary
print(f"Generated {len(schedule['tweets'])} tweets for {date_str}")
print(f"Days {start_day}-{start_day + 26}, Mar 5-31, 2026\n")

short_tweets = [t for t in schedule["tweets"] if t["type"] == "short"]
long_tweets = [t for t in schedule["tweets"] if t["type"] == "long"]

print(f"Short (AM): {len(short_tweets)} tweets, avg {sum(t['chars'] for t in short_tweets)//len(short_tweets)} chars")
print(f"Long (PM):  {len(long_tweets)} tweets, avg {sum(t['chars'] for t in long_tweets)//len(long_tweets)} chars")
print(f"\nSaved to: {SCHEDULE_PATH}")

# Preview first few
print("\n" + "=" * 60)
for t in schedule["tweets"][:6]:
    print(f"\n📅 {t['date']} @ {t['time']} | Day {t['day']} | {t['type']} ({t['chars']}c)")
    print("─" * 55)
    print(t["content"])
    print("─" * 55)
