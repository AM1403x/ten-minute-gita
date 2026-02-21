#!/usr/bin/env python3
import json

# Read the JSON file
with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Short reflections for snippets 101-120
short_reflections = {
    101: "Which one are you right now? The person reaching out from crisis, the curious seeker, the one wanting something specific, or someone who just knows? Your answer matters less than your honesty about it.",

    102: "You worship what you give your attention to. Check your calendar, your screen time, your mental loops. That's your real religion, not what you say on Sunday.",

    103: "Notice how every achievement fades. The high of the promotion, the new relationship, the vacation glow—all temporary. Are you still chasing finite rewards and expecting infinite satisfaction?",

    104: "You're searching for something you're already experiencing. The awareness reading these words right now—that's what you've been looking for. Stop seeking and start noticing.",

    105: "Before your next significant action, pause and ask: Does this deepen my sense of being separate and alone, or does it connect me to something larger?",

    106: "List what you're gripping tightly—your job title, your relationship status, your bank balance, your body's appearance. Everything on that list will change or disappear. Now, what remains?",

    107: "Where does your mind go when it's idle? In traffic, before sleep, between tasks. Those automatic thoughts are building the highway your consciousness will travel when everything else falls away.",

    108: "Pick one mundane task today—dishes, email, commuting. Can you stay fully present in the activity while also aware of the awareness doing it? This split attention is the practice.",

    109: "Set a timer for 20 minutes. Turn off everything. No phone, no music, no task. Just sit with yourself. If this feels unbearable, you've found exactly where the work needs to happen.",

    110: "Try this: do something kind that no one will ever know about. Not your partner, not your journal, no one. Notice how differently your mind responds when there's zero possibility of recognition.",

    111: "Name one habit you've fully mastered—maybe patience with your kids, or staying calm in traffic. Now name one you're still failing at repeatedly. That unmastered lesson is why you're still here, in class.",

    112: "Look back ten years. What qualities did you have then that you've since outgrown? What new capacities have emerged? You're not fixed. You're a work in progress across a timeline much longer than this life.",

    113: "When you meet someone who seems totally different from you—different politics, lifestyle, background—look for the one thing you share: the fact that you're both aware, both conscious. That shared awareness is the only thing that's real.",

    114: "Next time you do something good, check your subtle scorecard. Are you expecting cosmic credits, good karma points, divine favor? That expectation is a chain. Try acting with no account balance in mind.",

    115: "Your spiritual practices—meditation, prayer, study, service—are they making you feel like a better person, or dissolving your need to be anyone at all? One path improves the character. The other ends the movie.",

    116: "Notice your first response when hearing a teaching you disagree with. Do you immediately look for flaws, or do you sit with the discomfort and ask what it might be revealing about your own resistance?",

    117: "Pick any object you can see right now. Instead of thinking 'I am here, looking at that,' try this: 'That object is appearing in consciousness.' Consciousness isn't in your head. Your head is in consciousness.",

    118: "Tonight before sleep, notice how your entire world dissolves—your to-do list, your worries, your identity. Tomorrow morning, notice how it all reconstructs. What remains constant through this daily death and rebirth?",

    119: "Track yourself for one day. Are you driven by endless activity, always chasing the next thing? Or by avoidance and resistance, defending against change? Both are exhausting. Neither is peace.",

    120: "You already have one thing you pursue with absolute devotion—check your actions, not your words. Your bank account, your body, your career, your family? The question isn't whether to be devoted, but to what."
}

# Update the snippets
updated_count = 0
for snippet in data['snippets']:
    if snippet['id'] in short_reflections:
        snippet['shortReflection'] = short_reflections[snippet['id']]
        print(f"Updated snippet {snippet['id']}: {snippet['title']}")
        updated_count += 1

# Write back to file
with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n✓ Successfully updated shortReflection for {updated_count} snippets (101-120)")
