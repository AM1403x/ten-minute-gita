#!/usr/bin/env python3
import json
import sys

# Read the file
with open('data/gita_snippets.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Define the new shortReflections for snippets 81-100
short_reflections = {
    81: "Notice the two selves operating within you right now: the \"working self\" caught in daily struggles, and the \"watching self\" that observes with clarity. Your inner voice of conscience is not nagging but guiding. Which self are you listening to? When cravings arise today, pause and ask your wiser self: Is this what I truly need, or just noise?",

    82: "You adjust the thermostat when it's hot, not because you're unenlightened but because you're practical. The yogi's equanimity doesn't mean suffering needlessly; it means your core peace isn't disturbed by external fluctuations. Today, when something goes wrong, can you see it happening at the surface level while remaining steady at your center?",

    83: "Your meditation practice isn't separate from the other 23.5 hours of your day. If you're calm on the cushion but chaotic at work, something's missing. Try this: choose one daily activity and bring the same quality of attention you'd give to formal practice. Notice how the boundary between practice and life begins to dissolve.",

    84: "Sit up straight not to punish yourself but because a straight spine actually requires less effort. Your body follows structural principles: aligned, it rests in natural stability. Try it now. Feel how uprightness becomes effortless when you stop fighting gravity. This is true in life too: alignment with truth requires less energy than maintaining lies.",

    85: "You already know this from experience: when you're sleep-deprived or overfed, focus becomes impossible. Bhagavan isn't prescribing asceticism but balance. Look at one area of your life that's out of balance, eating, sleeping, working, scrolling, and make one small adjustment toward moderation today. Just one.",

    86: "Remember learning to drive? Overwhelming at first, automatic later. Your spiritual practice follows the same pattern. Don't expect your first attempts at steadying the mind to feel natural. They won't. But with repetition, what required enormous effort becomes your default state. Where are you in this learning curve?",

    87: "Think of Sankalpa Shakti as your mind's projector, creating imaginary futures: \"If I get this promotion, then I'll buy that house, then I'll...\" Before you've taken one step toward the first goal, your mind has erased it and projected a new fantasy. You're chasing targets that keep moving. What would it mean to work on what's actually in front of you today?",

    88: "\"Shanaih shanaih,\" gradually, gradually. This phrase gives you permission to be a beginner. You don't need to perfect your meditation overnight. Each time your mind wanders and you notice, that's not failure, that's one repetition of the most important exercise: awareness itself. How many reps did you do today?",

    89: "The paradox of sin and karma: past actions have consequences you must face, but meditation cleanses the impressions that would generate future wrong actions. You can't escape what you've done, but you can stop creating new problems. Today, which impulse arising in you is a vasana (old impression) trying to repeat itself?",

    90: "Everyone seeks commonality. On meeting someone new, we search for shared background, interests, hometown. The spiritual journey is recognizing the ultimate commonality: the same consciousness looking out from every pair of eyes. Today, can you sense that shared aliveness in three very different people you encounter?",

    91: "Arjuna's honest doubt mirrors yours: \"This sounds beautiful, but my mind is like the wind, completely untameable.\" Krishna doesn't dismiss this; he agrees, then offers the method: abhyasa (practice) and vairagya (detachment). Small, consistent effort beats grand intentions. What one micro-practice can you commit to today?",

    92: "Your deepest fear isn't failure; it's wasting your life chasing the wrong thing. Will you fail at worldly success by pursuing spirituality, or fail at enlightenment by prioritizing career? This fear is universal. Hold it without rushing to resolve it. Krishna's answer in the next verses will reframe everything.",

    93: "No spiritual effort is ever lost. Every sincere attempt, every moment of practice, every act of service is deposited in an account that transfers across lifetimes. This isn't mysticism; it's how development works. The child prodigy is continuing what she began before. What are you developing right now that will outlast this body?",

    94: "You're drawn to these teachings not by accident but by momentum from previous development. Something in you recognizes this material because you've worked with it before. Trust that inexplicable pull toward practice. Your vasanas, deeper tendencies, will find their expression regardless of circumstances. Which way are yours pointing?",

    95: "Chapter 6 concludes with a hierarchy: the yogi surpasses the scholar, the ascetic, the ritualist. Why? Because integrated practice transforms, while partial approaches leave you split. You can memorize scriptures without changing, torture your body without purifying your mind. The question is: are you integrating what you learn into how you live?",

    96: "Moving from knowing to being is the journey from jnana to vijnana, from textbook knowledge to embodied wisdom. You know intellectually that you should be patient, but can you access that patience when your child is screaming? That gap between knowing and being is where the real work happens. Where's your biggest gap?",

    97: "Everything you see, touch, taste is Divine manifestation, the play of eight-fold Prakriti. But knowing this intellectually changes nothing. Today, practice recognizing it directly: the warmth of your coffee, the weight of your body in the chair, the voice in your head reading these words. All of it, Divine energy expressing itself. Can you hold that awareness for sixty seconds?",

    98: "Krishna describes Himself as the essential quality in everything: the fluidity in water, the light in sun and moon, the strength in the strong. Today's practice: for everything you encounter, identify its dharma, its essential nature, and recognize that quality as Divine presence. The sweetness in fruit. The solidarity of earth. The spaciousness of sky.",

    99: "\"I am the strength in the strong, free from desire and attachment.\" Examine your own strengths today. Are you using them to serve your dharma, or to feed your ego? The same intelligence that could solve real problems gets wasted on proving you're smarter than others. Where is your strength leaking into ego?",

    100: "You're deluded not because you're stupid but because Maya is extraordinarily convincing. Like a movie so immersive you forget it's a screen, the three gunas create a world that captures your total attention. The escape hatch isn't figuring out the trick intellectually; it's taking refuge in the Self. Are you trying to solve the puzzle, or surrender to its source?"
}

# Update the snippets
updated_count = 0
for snippet in data['snippets']:
    snippet_id = snippet['id']
    if snippet_id in short_reflections:
        snippet['shortReflection'] = short_reflections[snippet_id]
        updated_count += 1
        print(f"✓ Updated snippet {snippet_id}")

# Write back to file
with open('data/gita_snippets.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n✅ Update complete! Updated {updated_count} snippets (81-100)")
print("📝 File written back successfully.")
