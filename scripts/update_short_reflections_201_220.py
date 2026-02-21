#!/usr/bin/env python3
"""
Update shortReflection field for snippets 201-220 in gita_snippets.json
"""

import json
import sys
from pathlib import Path

# Short reflections for snippets 201-220
SHORT_REFLECTIONS = {
    201: "Think of the last time success went to your head. Did achievement make you more grateful or more entitled? When we confuse our accomplishments with our identity, even doing good becomes a trap. Notice how your ego inflates when praised and deflates when criticized—that's the sign you're still bound by results, not liberated by action.",

    202: "You've built patterns through repetition—some serve you, most don't. Every time you chase the same comfort, avoid the same discomfort, or replay the same resentment, you're becoming an expert in that loop. What are you practicing daily? Generosity or bitterness? Presence or distraction? You're getting better at something—make sure it's what you actually want.",

    203: "Before big decisions, who do you consult? Your anxious thoughts? Your peer group? Or something deeper—a principle you'd defend even when inconvenient? Most of us outsource our moral compass, then wonder why we feel lost. Pick one choice you're facing and ask: what would wisdom say, not what would comfort or approval say?",

    204: "What do you truly have faith in—not what you say, but where your actions point? Track your time and money this week. That's your real theology. If your faith is in control, you'll be anxious when things feel uncertain. If it's in appearances, you'll be exhausted by performance. Faith isn't belief; it's where you rest when you're afraid.",

    205: "Look at the way you eat when no one's watching. Rushed? Mindless? Punishing or indulgent? Your relationship with food mirrors your relationship with life. Are you eating to live or living to eat? One small shift: before your next meal, pause and ask yourself what you're actually hungry for.",

    206: "You're more careful with your words in public than in private. But your inner monologue shapes everything. Is your self-talk harsh or kind? Cynical or hopeful? That voice becomes your reality. Mental discipline isn't about forced positivity—it's about not letting every passing thought rent space in your head.",

    207: "Notice how the pursuit of 'more' has contaminated even your good actions. You meditate to feel calmer. You give to feel generous. You help others to feel worthy. Every transaction keeps the ego alive. Try this: do something kind today with zero expectation of how it'll make you feel. Watch what happens when you stop measuring.",

    208: "Your speech reveals you. Do you speak to be heard or to connect? To assert or to understand? To wound or to heal? Before your next difficult conversation, ask: is what I'm about to say true, necessary, and kind? If it's only one or two of those, reconsider. Silence is also a choice.",

    209: "What do you do when no one's watching? That's your real character. Mental discipline is the hardest because no one sees it. You can fake outer composure while your thoughts spiral. But inner chaos eventually leaks out. One practice: when a harsh thought about yourself or someone else arises, notice it without feeding it. That's mental tapas.",

    210: "Check your giving. When you help someone, do you secretly wait for acknowledgment? When you donate, do you calculate the social credit? When you sacrifice, do you keep score? Real generosity leaves no trace, not even in your own memory. Give something today—money, time, attention—and practice forgetting you did it.",

    211: "Most of your suffering comes from doing the right thing for the wrong reason or the wrong way. You help, but with resentment. You give, but at the wrong moment. You speak truth, but harshly. Timing, intention, and method matter as much as the act itself. Today, ask before any action: is this the right thing, in the right way, at the right time?",

    212: "When anxiety about the future grips you, use two words: 'Tat' to release control of outcomes, 'Sat' to ground yourself in what's universally true and good. Not every decision requires perfect certainty. Some require surrender. Some require principle. Learning which is which is wisdom.",

    213: "How much of your life is performed on autopilot, obligations checked off without real presence? Faith is the ingredient that transforms routine into ritual, duty into devotion. Before one small action today—making coffee, answering an email, hugging your child—pause and ask: do I actually believe in the value of what I'm about to do?",

    214: "Look at your to-do list. How much is driven by genuine responsibility versus the need to prove yourself? Renunciation doesn't mean doing nothing; it means releasing the ownership that makes you a prisoner of results. What if you worked just as hard but cared less about who gets the credit? Try it for one day.",

    215: "You think spiritual practice is for beginners or the troubled. But even the wise need daily purification. Your mind accumulates dust—judgment, envy, self-importance—even when you're doing well. What practice have you let slide because you thought you'd outgrown it? Humility is knowing you never graduate.",

    216: "Think of the last time you avoided doing something difficult but necessary. Was it confusion about whether you should do it, or just that it seemed hard? Tamasic avoidance hides behind 'I don't know if I should.' Rajasic avoidance admits 'I know I should but don't want to.' Sattvic action says 'it must be done' and does it. Which are you?",

    217: "Watch yourself at work today. Do you lean into tasks you enjoy and recoil from what you find tedious? That's your ego, not wisdom, running the show. The wise person treats pleasant and unpleasant duties with equal steadiness. Not because they don't feel preference, but because they don't let preference decide their actions.",

    218: "Reflect on something you accomplished recently. Honestly assess: what percentage was your skill versus your body's health, the tools available, the timing, the help of others, sheer luck? When you see how little is actually 'you,' the ego's grip loosens. You're not as powerful as you think. And that's liberating, not limiting.",

    219: "You're so convinced you're the author of your life. But look closer at any decision. Wasn't there a prior thought that prompted it? And a feeling before that? And a circumstance that triggered the feeling? When you see action as a mechanism—knowledge, knower, object leading to instrument, action, doer—you realize you're not as in control as you thought. That's not nihilism; that's freedom.",

    220: "Sattvic knowledge sees the same Self in every being. Rajasic knowledge sees each person as separate, categorizing and comparing. Tamasic knowledge sees reality through the lens of your immediate wants and fears. Pay attention to how you see others today. Do you see them as versions of yourself, as competitors and strangers, or as obstacles or tools? That's the quality of your understanding."
}

def main():
    # Paths
    repo_root = Path("/Users/anishmoonka/gita-app")
    json_file = repo_root / "data" / "gita_snippets.json"

    if not json_file.exists():
        print(f"Error: File not found: {json_file}")
        sys.exit(1)

    # Read the JSON file
    print(f"Reading {json_file}...")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if "snippets" not in data:
        print("Error: 'snippets' key not found in JSON")
        sys.exit(1)

    # Update snippets 201-220
    updated_count = 0
    for snippet in data["snippets"]:
        snippet_id = snippet.get("id")
        if snippet_id in SHORT_REFLECTIONS:
            snippet["shortReflection"] = SHORT_REFLECTIONS[snippet_id]
            updated_count += 1
            print(f"✓ Updated snippet {snippet_id}")

    if updated_count != len(SHORT_REFLECTIONS):
        print(f"\nWarning: Expected to update {len(SHORT_REFLECTIONS)} snippets, but only updated {updated_count}")

    # Write back to file with proper formatting
    print(f"\nWriting updated data back to {json_file}...")
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Successfully updated {updated_count} snippets (201-220)")
    print("File saved with proper JSON formatting.")

if __name__ == "__main__":
    main()
