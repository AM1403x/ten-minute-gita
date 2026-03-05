#!/usr/bin/env python3
"""
Post daily Bhagavad Gita reflections to X (Twitter) from @10minutegita.

Usage:
    python scripts/post_to_x.py                       # Post next unposted day
    python scripts/post_to_x.py --day 42              # Post specific day
    python scripts/post_to_x.py --day 42 --dry        # Preview without posting
    python scripts/post_to_x.py --thread 42           # Post day as a thread
    python scripts/post_to_x.py --scheduled           # Post next due scheduled tweet
    python scripts/post_to_x.py --scheduled --dry     # Preview next scheduled tweet
    python scripts/post_to_x.py --show-schedule       # Show upcoming scheduled tweets
    python scripts/post_to_x.py --history             # Show posting history
"""

import json
import os
import sys
import argparse
from datetime import datetime, timezone, timedelta

# Schedule times are in IST — always compare in IST
IST = timezone(timedelta(hours=5, minutes=30))
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv

load_dotenv(PROJECT_ROOT / ".env.x")

# --- Config ---
SNIPPETS_PATH = PROJECT_ROOT / "data" / "gita_snippets.json"
REFLECTIONS_PATH = PROJECT_ROOT / "data" / "short_reflections.json"
SCHEDULE_PATH = PROJECT_ROOT / "scripts" / "tweet_schedule.json"
POST_HISTORY_PATH = PROJECT_ROOT / "scripts" / ".x_post_history.json"
CHAR_LIMIT = 280

# --- Data Loading ---

def load_snippets():
    with open(SNIPPETS_PATH) as f:
        return json.load(f)["snippets"]

def load_reflections():
    with open(REFLECTIONS_PATH) as f:
        return json.load(f)

def load_schedule():
    with open(SCHEDULE_PATH) as f:
        return json.load(f)

def load_history():
    if POST_HISTORY_PATH.exists():
        with open(POST_HISTORY_PATH) as f:
            return json.load(f)
    return {"posts": []}

def save_history(history):
    with open(POST_HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=2)

# --- Tweet Formatting ---

def format_tweet(day: int, snippets: list, reflections: list) -> str:
    """Format a tweet from the day's short reflection."""
    snippet = snippets[day - 1]
    reflection = reflections[day - 1]["shortReflection"]
    verses = snippet["verses"]

    # Try full format first
    full = f"{reflection}\n\n— Bhagavad Gita {verses}\n#BhagavadGita #10MinuteGita"
    if len(full) <= CHAR_LIMIT:
        return full

    # Drop one hashtag
    shorter = f"{reflection}\n\n— Bhagavad Gita {verses}\n#BhagavadGita"
    if len(shorter) <= CHAR_LIMIT:
        return shorter

    # Drop all hashtags
    minimal = f"{reflection}\n\n— Bhagavad Gita {verses}"
    if len(minimal) <= CHAR_LIMIT:
        return minimal

    # Just the reflection (always fits — max 275 chars)
    return reflection

def format_thread(day: int, snippets: list, reflections: list) -> list[str]:
    """Format a thread: verse translation + reflection."""
    snippet = snippets[day - 1]
    reflection = reflections[day - 1]["shortReflection"]
    verses = snippet["verses"]
    title = snippet["title"]

    tweets = []

    # Tweet 1: Title + first verse translation
    verse_text = snippet["verseTranslations"][0]
    t1 = f"📖 {title}\n\n\"{verse_text}\"\n\n— Bhagavad Gita {verses}"
    if len(t1) > CHAR_LIMIT:
        max_verse = CHAR_LIMIT - len(f"📖 {title}\n\n\"...\"\n\n— Bhagavad Gita {verses}")
        verse_text = verse_text[:max_verse - 3] + "..."
        t1 = f"📖 {title}\n\n\"{verse_text}\"\n\n— Bhagavad Gita {verses}"
    tweets.append(t1)

    # Tweet 2: Short reflection
    t2 = f"{reflection}\n\n#BhagavadGita #10MinuteGita"
    if len(t2) > CHAR_LIMIT:
        t2 = reflection
    tweets.append(t2)

    return tweets

# --- Twitter API ---

def get_client():
    """Create authenticated Twitter client."""
    import tweepy

    access_token = os.getenv("X_ACCESS_TOKEN")
    access_secret = os.getenv("X_ACCESS_TOKEN_SECRET")

    if not access_token or not access_secret:
        print("\n❌ Missing X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET in .env.x")
        print("\nTo generate them:")
        print("  1. Go to https://developer.x.com/en/portal/dashboard")
        print("  2. Select your app → Keys and Tokens")
        print("  3. Under 'Access Token and Secret', click 'Generate'")
        print("  4. Make sure app permissions are set to 'Read and Write'")
        print("  5. Paste the values into .env.x")
        sys.exit(1)

    client = tweepy.Client(
        consumer_key=os.getenv("X_CONSUMER_KEY"),
        consumer_secret=os.getenv("X_CONSUMER_SECRET"),
        access_token=access_token,
        access_token_secret=access_secret,
    )
    return client

def post_tweet(client, text: str, reply_to: str = None) -> str:
    """Post a tweet. Returns tweet ID."""
    kwargs = {"text": text}
    if reply_to:
        kwargs["in_reply_to_tweet_id"] = reply_to

    response = client.create_tweet(**kwargs)
    tweet_id = response.data["id"]
    return tweet_id

# --- Commands ---

def cmd_post(day: int, dry: bool):
    snippets = load_snippets()
    reflections = load_reflections()
    history = load_history()

    if day < 1 or day > 239:
        print(f"❌ Day must be 1-239, got {day}")
        sys.exit(1)

    tweet = format_tweet(day, snippets, reflections)

    print(f"\n📝 Day {day}: {snippets[day-1]['title']}")
    print(f"   Verses: {snippets[day-1]['verses']}")
    print(f"   Chars: {len(tweet)}")
    print(f"\n{'─' * 50}")
    print(tweet)
    print(f"{'─' * 50}")

    if dry:
        print("\n🔍 Dry run — not posted.")
        return

    client = get_client()
    tweet_id = post_tweet(client, tweet)

    history["posts"].append({
        "day": day,
        "tweet_id": tweet_id,
        "type": "single",
        "timestamp": datetime.now().isoformat(),
        "chars": len(tweet),
    })
    save_history(history)

    print(f"\n✅ Posted! https://x.com/10minutegita/status/{tweet_id}")

def cmd_thread(day: int, dry: bool):
    snippets = load_snippets()
    reflections = load_reflections()
    history = load_history()

    if day < 1 or day > 239:
        print(f"❌ Day must be 1-239, got {day}")
        sys.exit(1)

    tweets = format_thread(day, snippets, reflections)

    print(f"\n🧵 Thread for Day {day}: {snippets[day-1]['title']}")
    for i, t in enumerate(tweets):
        print(f"\n  Tweet {i+1} ({len(t)} chars):")
        print(f"  {'─' * 46}")
        for line in t.split('\n'):
            print(f"  {line}")
        print(f"  {'─' * 46}")

    if dry:
        print("\n🔍 Dry run — not posted.")
        return

    client = get_client()
    reply_to = None
    tweet_ids = []
    for t in tweets:
        tid = post_tweet(client, t, reply_to=reply_to)
        tweet_ids.append(tid)
        reply_to = tid

    history["posts"].append({
        "day": day,
        "tweet_ids": tweet_ids,
        "type": "thread",
        "timestamp": datetime.now().isoformat(),
    })
    save_history(history)

    print(f"\n✅ Thread posted! https://x.com/10minutegita/status/{tweet_ids[0]}")

def cmd_scheduled(dry: bool):
    """Post the next due tweet from the schedule."""
    schedule = load_schedule()
    history = load_history()

    # Find posted schedule IDs
    posted_ids = {p["schedule_id"] for p in history["posts"] if "schedule_id" in p}

    now = datetime.now(IST).replace(tzinfo=None)  # Current time in IST (naive for comparison)
    now_str = now.strftime("%Y-%m-%d %H:%M")

    due_tweet = None
    for t in schedule["tweets"]:
        if t["id"] in posted_ids:
            continue
        tweet_dt_str = f"{t['date']} {t['time']}"
        tweet_dt = datetime.strptime(tweet_dt_str, "%Y-%m-%d %H:%M")
        if tweet_dt <= now:
            due_tweet = t
            break  # First unposted due tweet

    if not due_tweet:
        # Check if there's a future tweet coming
        next_tweet = None
        for t in schedule["tweets"]:
            if t["id"] not in posted_ids:
                next_tweet = t
                break
        if next_tweet:
            print(f"⏳ No tweets due yet. Next: {next_tweet['date']} @ {next_tweet['time']} (Day {next_tweet['day']})")
        else:
            print("✅ All scheduled tweets have been posted!")
        return

    content = due_tweet["content"]
    print(f"\n📅 Scheduled tweet #{due_tweet['id']}")
    print(f"   Day {due_tweet['day']} | {due_tweet['date']} @ {due_tweet['time']} | {due_tweet['type']} ({due_tweet['chars']}c)")
    print(f"\n{'─' * 55}")
    print(content)
    print(f"{'─' * 55}")

    if dry:
        print("\n🔍 Dry run — not posted.")
        return

    client = get_client()
    tweet_id = post_tweet(client, content)

    history["posts"].append({
        "schedule_id": due_tweet["id"],
        "day": due_tweet["day"],
        "tweet_id": tweet_id,
        "type": due_tweet["type"],
        "timestamp": datetime.now().isoformat(),
        "chars": due_tweet["chars"],
    })
    save_history(history)

    print(f"\n✅ Posted! https://x.com/10minutegita/status/{tweet_id}")

def cmd_show_schedule():
    """Show upcoming scheduled tweets."""
    schedule = load_schedule()
    history = load_history()
    posted_ids = {p["schedule_id"] for p in history["posts"] if "schedule_id" in p}

    now = datetime.now(IST).replace(tzinfo=None)

    print(f"\n📅 Tweet Schedule ({len(schedule['tweets'])} total)\n")
    print(f"{'#':>3} {'Date':>10} {'Time':>5} {'Day':>4} {'Type':>5} {'Chars':>5} {'Status':>8}")
    print(f"{'─' * 48}")

    for t in schedule["tweets"]:
        status = "✅ done" if t["id"] in posted_ids else "pending"
        tweet_dt = datetime.strptime(f"{t['date']} {t['time']}", "%Y-%m-%d %H:%M")
        if t["id"] not in posted_ids and tweet_dt <= now:
            status = "⏰ DUE"
        print(f"{t['id']:>3} {t['date']:>10} {t['time']:>5} {t['day']:>4} {t['type']:>5} {t['chars']:>5} {status:>8}")

    posted = len(posted_ids)
    remaining = len(schedule["tweets"]) - posted
    print(f"\n  Posted: {posted} | Remaining: {remaining}")

def cmd_history():
    history = load_history()
    if not history["posts"]:
        print("No posts yet.")
        return

    print(f"\n📊 Posting History ({len(history['posts'])} posts)\n")
    for p in history["posts"]:
        day = p["day"]
        ts = p["timestamp"][:16].replace("T", " ")
        ptype = p["type"]
        tid = p.get("tweet_id") or p.get("tweet_ids", ["?"])[0]
        sid = p.get("schedule_id", "-")
        print(f"  Day {day:>3} | {ptype:>7} | {ts} | #{sid} | {tid}")

def find_next_day():
    """Find the next unposted day."""
    history = load_history()
    posted_days = {p["day"] for p in history["posts"]}
    for day in range(1, 240):
        if day not in posted_days:
            return day
    return None

# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Post Gita reflections to X")
    parser.add_argument("--day", type=int, help="Day number (1-239)")
    parser.add_argument("--dry", action="store_true", help="Preview without posting")
    parser.add_argument("--thread", type=int, help="Post as thread (verse + reflection)")
    parser.add_argument("--scheduled", action="store_true", help="Post next due scheduled tweet")
    parser.add_argument("--show-schedule", action="store_true", help="Show scheduled tweets")
    parser.add_argument("--history", action="store_true", help="Show posting history")
    args = parser.parse_args()

    if args.history:
        cmd_history()
        return

    if args.show_schedule:
        cmd_show_schedule()
        return

    if args.scheduled:
        cmd_scheduled(args.dry)
        return

    if args.thread:
        cmd_thread(args.thread, args.dry)
        return

    day = args.day
    if day is None:
        day = find_next_day()
        if day is None:
            print("All 239 days have been posted!")
            return
        print(f"Next unposted day: {day}")

    cmd_post(day, args.dry)

if __name__ == "__main__":
    main()
