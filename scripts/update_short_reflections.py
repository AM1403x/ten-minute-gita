#!/usr/bin/env python3
import json

# Read the JSON file
with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Define short reflections for snippets 181-200
short_reflections = {
    181: "Notice how even your 'good' qualities can trap you. Do you cling to your clarity and peace? Feel superior when you're healthy and focused? The real freedom isn't in maximizing your best states—it's in recognizing who's watching all your states without getting caught in any of them.",

    182: "Trace your actions back to their source today. Are you acting from clarity, compulsion, or avoidance? That restless drive to achieve, acquire, keep moving—that's not you being productive. That's one part of you hijacking the whole system. What would happen if you just... stopped?",

    183: "When do all your senses convey clear knowledge? When are you compulsively starting new projects, unable to rest? You're constantly shifting between clarity, restlessness, and dullness. The one who can name which state is active is already beginning to stand outside all three.",

    184: "If you died tonight, what would the texture of your mind be—clarity, restlessness, or dullness? This isn't morbid; it's diagnostic. You're cultivating tendencies with every choice. What baseline are you building? What one small choice today moves you toward clarity?",

    185: "Your pursuit of knowledge can become its own trap. Even the joy of understanding can chain you. Can you observe your actions and think: 'My patterns are doing this, not the essential me'? That split-second of distance changes everything.",

    186: "That moment you said something hurtful? Your patterns were acting. That creative breakthrough? Patterns again. Practice this: when you catch yourself saying 'I did this,' pause and reframe—'My conditioning did this.' Notice the space that opens up between you and your experience.",

    187: "When you're in a clear state, do you grasp at it, fearing its loss? When you feel dull or agitated, do you fight it? Try letting each state arise and pass without the second layer of reaction—without wanting the good or pushing away the bad. Who's watching both?",

    188: "Choose one activity today and do it completely—but without the sense that 'I am doing this.' Let your hands move, let your mind think, but rest as the awareness where it all happens. Does this diminish the work? Usually it improves it. You have nothing to prove.",

    189: "Where have you been growing roots into things that won't last? Your job, your city, your social status—you're establishing yourself as if these were permanent. At the end of each day, identify one thing you clung to and consciously release it. What remains of you then?",

    190: "Notice how much energy goes into seeking temporary refuges—in achievements, relationships, entertainment—only to find yourself seeking again tomorrow. When you feel buffeted by praise and blame, success and failure, pause and ask: Who's aware of both? Who remains unchanged?",

    191: "Every experience you have is consciousness experiencing through you. Try this: as you see, hear, taste, touch, or smell anything today, remind yourself that awareness is the true experiencer. What changes in your interactions if every person is an eternal portion of the same source?",

    192: "When you see sunlight through a window, moonlight at night, a flame flickering—pause. Every source of light is a reminder that your own awareness, which makes all perception possible, is that same original light. Are you striving with a prepared mind, or expecting results without inner work?",

    193: "The fire that transforms your food into energy right now—that's not just biology. Next time you eat, remember: the very act of digestion is a divine function within you. If the source of all knowing dwells in your heart, how far do you really need to search?",

    194: "Your body-mind changes constantly, but something in you notices these changes. That's still not the deepest you. Practice observing through three lenses: what's changing, what witnesses the change, and what makes both possible—the awareness that simply is.",

    195: "What if your deepest identity isn't the struggling person you think you are, but something playing that role temporarily? How would that change what you pursue, what you fear, and how you treat others who are equally expressions of that same presence?",

    196: "What situations trigger fear in you? Trace it back—it's usually unfamiliarity or ignorance. The more you know yourself as unlimited, the less you have to lose. Choose one quality from today's reading and practice it intentionally. Notice what resistance arises within you.",

    197: "When someone questions your competence, how do you react? Where do you project qualities you don't possess? The very fact you're examining yourself indicates something genuine within you. Ask each evening: Did today's actions move me toward freedom or deeper ego-identification?",

    198: "When you're genuinely confused about what's right, recognize this as a signal that your inner instrument needs cleaning. Your worldview shapes everything. When you act as if only material success matters, what happens to your compassion, patience, and honesty?",

    199: "Examine your desires: Which are simple needs that can be met and released? Which are obsessions that keep growing no matter what you acquire? Each unfulfilled expectation is a rope binding you. Identify one today and practice releasing it—not through suppression, but through understanding.",

    200: "Read these slowly: 'I've achieved this. I'll achieve more. I'm successful, powerful, happy. I'm rich and well-born—who compares?' Which statements make you uncomfortable? That's not shame—it's recognition. Today, do one generous act that no one will know about. Notice the resistance when your ego can't claim credit."
}

# Update the snippets
updated_count = 0
for snippet in data['snippets']:
    if 181 <= snippet['id'] <= 200:
        snippet['shortReflection'] = short_reflections[snippet['id']]
        print(f"Updated snippet {snippet['id']}: {snippet['title']}")
        updated_count += 1

# Write back to file
with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n✓ Successfully updated shortReflection for {updated_count} snippets (181-200)")
