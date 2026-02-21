#!/usr/bin/env python3
"""Expand commentaries for IDs 91-95 in gita_snippets.json"""

import json

with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'r') as f:
    data = json.load(f)

snippets = data['snippets']

def get_snippet(sid):
    for s in snippets:
        if s['id'] == sid:
            return s
    return None

def set_commentary(sid, new_commentary):
    for s in snippets:
        if s['id'] == sid:
            s['commentary'] = new_commentary
            return

# ============================================================
# ID 91: 9164 chars, need ~1000-1600 more
# ============================================================
s91 = get_snippet(91)
c91 = s91['commentary']

insert_after_91 = "A person trying to eat healthier does not succeed by pretending desserts do not exist. They succeed by seeing the dessert, recognizing the craving, and making a conscious choice. Over time, the craving loses its grip. Not because they fought it, but because they stopped feeding it. That is vair\u0101gya in daily life."

new_para_91a = "The same principle applies in relationships. A person who is emotionally attached to the approval of others does not find freedom by avoiding all social contact. That is suppression wearing the mask of detachment. True *vair\u0101gya* means being fully present in relationships while releasing the compulsive need for validation. You listen to criticism without collapsing. You receive praise without inflating. The opinions of others flow through you like water through an open hand. You feel them, but you do not clutch."

new_para_91b = "In the workplace, *abhy\u0101sa* and *vair\u0101gya* together look like this: you give your fullest effort to every project, every deadline, every collaboration. That is practice. And when the outcome does not match your expectations, when the promotion goes to someone else, when the project is cancelled after months of work, you release the result without bitterness. That is detachment. The combination produces a person who is both deeply engaged and internally free. Colleagues notice this quality even when they cannot name it. There is a steadiness, a groundedness, that comes from caring about the process without being enslaved by the outcome."

c91 = c91.replace(
    insert_after_91 + "\n\nKrishna pairs these two",
    insert_after_91 + "\n\n" + new_para_91a + "\n\n" + new_para_91b + "\n\nKrishna pairs these two"
)
set_commentary(91, c91)
print(f"ID 91: {len(c91)} chars")

# ============================================================
# ID 92: 6805 chars, need ~3000-4000 more
# ============================================================
s92 = get_snippet(92)
c92 = s92['commentary']

insert_after_92a = "Arjuna's fear is sharp and specific. If this person dies before completing the journey, what happens to all that effort?"

new_para_92a = "This fear is not limited to spiritual practice. Consider a person who spends years building a business with genuine intention, wanting to create something meaningful, wanting to serve a real need. Midway through, circumstances change. The market shifts, health fails, a family crisis demands all their attention. The business closes. Was the effort wasted? Every skill they developed, every relationship they built, every lesson they learned about resilience and creativity: did all of that vanish the moment the company shut its doors? In the material world, we often answer yes. Failure is failure. The result is all that counts. Arjuna is asking whether the spiritual world operates by the same merciless accounting."

new_para_92b = "There is also a subtler dimension to this fear. Arjuna is not only worried about the person who stops practicing out of weakness. He is worried about the person who practices with full sincerity but simply does not have enough time. A life cut short by illness, by accident, by the sheer brevity of human existence. Some people discover the spiritual path late in life. They may have only a few years, or even a few months, of genuine practice before death arrives. Does the universe distinguish between the person who quit and the person who ran out of time? Or are both discarded equally?"

insert_after_92b = "It simply dissolves into nothing."

new_para_92c = "The image carries emotional weight because it mirrors a feeling that many people know from ordinary life. The person who leaves a stable career to pursue art, only to find that the art does not sustain them financially. The person who ends a comfortable but unfulfilling marriage to seek a deeper connection, only to find themselves alone. The person who questions the beliefs of their community and finds themselves neither at home in the old worldview nor fully established in a new one. In each case, the fear is the same: what if I have left solid ground and there is no other ground to land on?"

insert_after_92c = "They are too awake for the old life and not yet awake enough for the new one."

new_para_92d = "This middle ground is profoundly uncomfortable, and it is where many sincere seekers spend significant stretches of their journey. The old sources of pleasure have lost their luster. A promotion at work, a new possession, a weekend of entertainment: these things that once brought satisfaction now feel hollow. But the promised fruits of spiritual practice, the peace, the clarity, the inner freedom, have not yet fully materialized. You are caught between a world you can no longer believe in and a world you cannot yet experience. The temptation to turn back is enormous, and the fear of pressing forward without guarantees is equally strong."

c92 = c92.replace(
    insert_after_92a + "\n\nVerse 6.38",
    insert_after_92a + "\n\n" + new_para_92a + "\n\n" + new_para_92b + "\n\nVerse 6.38"
)

c92 = c92.replace(
    insert_after_92b + "\n\nArjuna is terrified",
    insert_after_92b + "\n\n" + new_para_92c + "\n\nArjuna is terrified"
)

c92 = c92.replace(
    insert_after_92c + "\n\n*Ubhaya-vibhra\u1e63\u1e6dha\u1e25*",
    insert_after_92c + "\n\n" + new_para_92d + "\n\n*Ubhaya-vibhra\u1e63\u1e6dha\u1e25*"
)

set_commentary(92, c92)
print(f"ID 92: {len(c92)} chars")

# ============================================================
# ID 93: 7551 chars, need ~2500-3200 more
# ============================================================
s93 = get_snippet(93)
c93 = s93['commentary']

insert_after_93a = "The effort is never erased."

new_para_93a = "Think about this in the context of parenting. A mother or father who spends years trying to instill good values in a child, reading to them, modeling kindness, having difficult conversations about honesty and courage, may not see the results during the child's teenage years. The teenager rebels, rejects everything, acts as though none of it mattered. But decades later, often after the parent is gone, those values resurface. The grown child finds themselves repeating their parent's words, choosing their parent's principles in moments of crisis. The effort was never wasted. It was simply stored, waiting for the right conditions to bloom. Krishna is describing a cosmic version of the same process."

insert_after_93b = "The prosperity provides freedom from the survival pressures that make inner work difficult."

new_para_93b = "Notice that Krishna lists purity before prosperity. The moral environment matters more than the material one. A child born into wealth but surrounded by corruption, dishonesty, and superficiality will find spiritual growth extremely difficult despite their material comfort. A child born into modest means but surrounded by integrity, compassion, and genuine wisdom will have everything they need to resume the inner journey. Krishna is not equating favorable birth with luxury. He is equating it with conditions that support the soul's development."

new_para_93c = "This teaching also carries implications for how we build our own families and communities. If the fallen yogi is reborn into an environment that matches their spiritual needs, then creating a home of purity and purpose is itself a form of cosmic service. The parent who cultivates an atmosphere of honesty, reflection, and love is not only shaping their own children. They may be providing the landing ground for a soul that has been journeying toward awakening across many lifetimes. Seen in this light, the everyday work of maintaining a good home takes on an entirely different significance."

insert_after_93c = "It was cultivated over lifetimes and then placed into the ideal environment for its flowering."

new_para_93d = "The Sanskrit term *durlabhataram* deserves further reflection. It uses the comparative suffix to indicate something rarer than rare. Krishna is acknowledging that most births, even favorable ones, come with distractions, with worldly obligations that compete for attention, with social pressures that pull the person away from inner work. To be born into a family where the spiritual path is not merely tolerated but actively supported, where wisdom is the family business, where the atmosphere vibrates with the energy of sincere practice: this is a gift of extraordinary rarity. And it is given not randomly but as a direct consequence of the soul's accumulated effort."

c93 = c93.replace(
    insert_after_93a + "\n\nThis is a radical claim.",
    insert_after_93a + "\n\n" + new_para_93a + "\n\nThis is a radical claim."
)

c93 = c93.replace(
    insert_after_93b + "\n\nThis is a profound statement",
    insert_after_93b + "\n\n" + new_para_93b + "\n\n" + new_para_93c + "\n\nThis is a profound statement"
)

c93 = c93.replace(
    insert_after_93c + "\n\nThere is an important implication",
    insert_after_93c + "\n\n" + new_para_93d + "\n\nThere is an important implication"
)

set_commentary(93, c93)
print(f"ID 93: {len(c93)} chars")

# ============================================================
# ID 94: 7223 chars, need ~2600-3600 more
# ============================================================
s94 = get_snippet(94)
c94 = s94['commentary']

insert_after_94a = "These tendencies did not come from nowhere. The Gita's framework suggests they are the residue of previous cultivation, the *buddhi-sanyogam* reasserting itself in a new form."

new_para_94a = "Consider the experience of meeting a stranger and feeling an immediate, inexplicable connection. Or arriving in a city you have never visited and feeling a sense of recognition, as though you have walked these streets before. Or picking up a musical instrument for the first time and finding that your hands seem to know what to do. Conventional psychology attributes these experiences to subconscious pattern recognition, to genetic predisposition, to coincidence. The Gita offers a different explanation: you are remembering. Not consciously, not with narrative detail, but at the level of *buddhi*, at the level of deep intuitive knowing. The resonance you feel is the echo of a previous life's experience rippling forward into the present."

new_para_94b = "For the spiritual practitioner, this teaching transforms the nature of daily practice. Every morning you sit for meditation is not an isolated event. It is the latest iteration of a practice that may stretch back across many births. The difficulty you experience is not a sign of failure; it is the natural friction of resuming a process that was interrupted. And the moments of unexpected clarity, the flashes of insight that seem to come from nowhere, may in fact be coming from a very specific somewhere: the accumulated wisdom of your own previous effort breaking through into conscious awareness."

insert_after_94b = "Like an investment that accumulates interest across decades, the spiritual bank balance grows even when you are not consciously adding to it."

new_para_94c = "This compounding metaphor has a practical dimension that is worth exploring. In financial investing, the most powerful force is time. A small amount invested early, left to compound, eventually surpasses a large amount invested late. The same principle applies to spiritual effort. A few minutes of sincere meditation practiced consistently over years produces deeper transformation than an intensive retreat undertaken once and never repeated. The person who maintains even a modest daily practice, returning to it year after year, is building compound interest on their spiritual investment. The returns may not be visible in the short term, but they accumulate relentlessly."

insert_after_94c = "They cannot explain why a particular book jumped out at them from a shelf, why a particular conversation shifted everything, why a particular moment of quiet suddenly opened a door they did not know was there. Krishna's explanation is that these are not coincidences. They are the gravitational pull of *p\u016brv\u0101bhy\u0101sa*, previous practice, drawing the soul back to the path it was already walking."

new_para_94d = "This gravitational pull operates with remarkable patience. It does not force. It does not coerce. It works through attraction, through the gentle arrangement of circumstances, through the quiet voice that whispers beneath the noise of daily life. A person might spend decades ignoring this voice, fully absorbed in career, family, and social obligation. Then one day, perhaps triggered by a loss, a moment of beauty, or simply a pause in the relentless busyness, the voice becomes audible again. The person turns toward it almost involuntarily, as though responding to a call they had been waiting to hear without knowing they were waiting."

c94 = c94.replace(
    insert_after_94a + "\n\nThe word *bh\u016bya\u1e25*",
    insert_after_94a + "\n\n" + new_para_94a + "\n\n" + new_para_94b + "\n\nThe word *bh\u016bya\u1e25*"
)

c94 = c94.replace(
    insert_after_94b + "\n\nVerse 6.44",
    insert_after_94b + "\n\n" + new_para_94c + "\n\nVerse 6.44"
)

c94 = c94.replace(
    insert_after_94c + "\n\nThe second half",
    insert_after_94c + "\n\n" + new_para_94d + "\n\nThe second half"
)

set_commentary(94, c94)
print(f"ID 94: {len(c94)} chars")

# ============================================================
# ID 95: 6133 chars, need ~3700-4700 more
# ============================================================
s95 = get_snippet(95)
c95 = s95['commentary']

insert_after_95a = "The yogi combines the discipline of the ascetic, the understanding of the scholar, and the active engagement of the ritualist, all unified by inner connection to the Divine."

new_para_95a = "To understand why Krishna ranks the yogi above these three, consider what each path lacks when practiced in isolation. The ascetic who fasts for forty days demonstrates extraordinary control over the body but may have no understanding of why suffering exists or how to help others navigate it. Their discipline serves themselves alone. The scholar who can explain every verse of every scripture with flawless precision may have never sat in silence long enough to experience what the verses describe. Their knowledge is about the territory, not of the territory. The ritualist who performs every ceremony at the exact prescribed time, with every syllable correctly pronounced, may go through the entire process without a single moment of genuine inner contact with the Divine. The form is perfect; the spirit is absent."

new_para_95b = "The yogi, as Krishna has defined the term throughout Chapter 6, integrates all three elements. The yogi practices discipline, not as self-punishment but as a means of clearing the inner channels. The yogi pursues knowledge, not as intellectual accumulation but as a pathway to direct realization. The yogi engages in action, not as mechanical ritual but as an offering rooted in love. Each element supports and completes the others. Discipline without knowledge is blind. Knowledge without discipline is impotent. Action without both becomes either reckless or robotic. The yogi brings all three together under the organizing principle of inner communion with the Divine."

new_para_95c = "In modern terms, this integration looks like a person who maintains a daily practice of meditation or prayer, who continues to study and learn throughout their life, and who actively contributes to their family and community through meaningful work. They are not defined by any single dimension of their practice. They are not exclusively the meditator, the student, or the volunteer. They are all three, and the unity of these three activities gives their life a coherence and depth that no single practice could achieve on its own."

insert_after_95b = "After all the philosophy, all the technique, all the reassurance, it comes down to this. Stop deliberating. Start practicing. Be a yogi."

new_para_95d = "There is a directness in this instruction that cuts through the tendency to over-prepare. Many seekers spend years reading about meditation without ever sitting down to meditate. They attend lectures, buy books, discuss techniques, compare traditions, and accumulate vast theoretical knowledge about a practice they have never actually done. Krishna short-circuits this pattern. You have heard enough. You have understood enough. Now do it. The gap between understanding and practice is the gap between knowing that exercise is healthy and actually going for a run. At some point, the deliberation must end and the doing must begin."

insert_after_95c = "It is an intimate, personal relationship. The inner self, the *antar-\u0101tm\u0101*, is directed not toward an abstract Absolute but toward *m\u0101\u1e41*, toward Me, toward Krishna as the personal face of the infinite."

new_para_95e = "This distinction between the abstract and the personal is crucial for understanding the Gita's spiritual psychology. The human heart can revere an abstract principle, but it cannot love one. You can be intellectually convinced that an impersonal Absolute exists, that the universe is governed by cosmic law, that consciousness is the ground of all being. But these convictions, however true, do not produce the transformative power of devotion. That power comes from relationship, from the living connection between a finite being and an infinite presence that has made itself accessible through a personal form. Krishna is saying that the highest yoga is not the mastery of technique but the flowering of love."

new_para_95f = "Consider the difference between admiring the ocean from a distance and diving into it. From the shore, you can appreciate its vastness, study its currents, measure its temperature. You can write a comprehensive scientific paper about the ocean without ever getting wet. This is the path of pure knowledge, and it has real value. But the person who dives in, who feels the salt on their skin, who is carried by the waves, who surrenders their footing to the depth: that person knows the ocean in a way the observer never will. *Bhakti* is the dive. It is the willingness to be fully immersed in the relationship with the Divine, to risk the vulnerability of genuine love, to let go of the safe distance that the intellect maintains."

c95 = c95.replace(
    insert_after_95a + "\n\nThe phrase *tasm\u0101d",
    insert_after_95a + "\n\n" + new_para_95a + "\n\n" + new_para_95b + "\n\n" + new_para_95c + "\n\nThe phrase *tasm\u0101d"
)

c95 = c95.replace(
    insert_after_95b + "\n\nBut Krishna does not end",
    insert_after_95b + "\n\n" + new_para_95d + "\n\nBut Krishna does not end"
)

c95 = c95.replace(
    insert_after_95c + "\n\n*\u015ahraddhav\u0101n bhajate*",
    insert_after_95c + "\n\n" + new_para_95e + "\n\n" + new_para_95f + "\n\n*\u015ahraddhav\u0101n bhajate*"
)

set_commentary(95, c95)
print(f"ID 95: {len(c95)} chars")

# Write the updated file
with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\nIDs 91-95 updated successfully.")
print("\nVerification:")
for item in data['snippets']:
    if item['id'] in range(91, 96):
        c = item['commentary']
        paras = [p for p in c.split('\n\n') if p.strip()]
        in_range = 9800 <= len(c) <= 10800
        status = "OK" if in_range else "OUT OF RANGE"
        print(f"  ID {item['id']}: {len(c)} chars, {len(paras)} paragraphs [{status}]")
