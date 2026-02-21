#!/usr/bin/env python3
"""Expand commentaries for IDs 96-100 in gita_snippets.json"""

import json

with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'r') as f:
    data = json.load(f)

snippets = data['snippets']

# ============================================================
# ID 96: 6595 chars, 19 paras -> need ~3200-4200 more
# ============================================================
for item in snippets:
    if item['id'] == 96:
        paras = item['commentary'].split('\n\n')

        new_96a = "These three conditions mirror the stages of any deep learning. A music student who wants to master an instrument must first develop genuine love for the music, not just a passing interest but a sustained fascination that draws the mind back again and again. That is the equivalent of *mayyasakta-manah*. Next, the student must practice daily, working through scales, etudes, and difficult passages with patient discipline. That is *yogam yunjan*. Finally, the student must trust the process and the teacher, surrendering the need for immediate results and allowing the skill to develop at its own pace. That is *mad-ashrayah*. When all three conditions align, mastery becomes not just possible but inevitable."

        new_96b = "The order of these prerequisites is significant. Krishna begins with attachment of the mind, not with practice or refuge. This suggests that the emotional orientation comes first. Before any formal discipline, before any conscious act of surrender, there must be a natural drawing of the heart toward the Divine. This is not something you can manufacture through willpower. It arises from the accumulated impressions of previous effort, from the *purvabhyasa* that Krishna described in Chapter 6. When that inner pull is present, practice and surrender follow naturally. When it is absent, practice becomes drudgery and surrender feels like defeat."

        new_96c = "This distinction appears in every domain of human experience. A medical textbook can describe the symptoms of heartbreak: elevated cortisol, disrupted sleep, loss of appetite, intrusive thoughts. That is *jnana*. Actually going through heartbreak, feeling the weight of loss in your chest, waking at three in the morning with the ache of absence: that is *vijnana*. No amount of reading about it can substitute for the lived experience. Similarly, reading about the nature of the Divine is valuable preparation, but it remains theoretical until the moment of direct encounter. Krishna is promising Arjuna both the preparation and the encounter itself."

        new_96d = "There is an analogy in mathematics. A student who memorizes hundreds of individual formulas carries a heavy cognitive load. Every new problem seems to require a different formula. But a student who understands the underlying principles from which those formulas are derived carries almost nothing, because any specific formula can be reconstructed from first principles on demand. Understanding the source simplifies everything. In the same way, knowing the Divine source of all existence does not give you every piece of factual information in the universe. It gives you something more valuable: the context within which all information finds its meaning."

        new_96e = "This is not a judgment of their worth but an observation about the rhythm of the soul's journey. Just as a fruit ripens in its own season, each person arrives at the stage of genuine seeking in their own time. The Gita does not condemn those who have not yet reached this stage. It simply acknowledges where they are. And the implication is hopeful: if the journey unfolds across many lifetimes, then everyone will eventually arrive at the point where the questions become urgent. The rarity Krishna describes is about timing, not about the intrinsic capacity of any soul."

        # Insert after para 5 (after "Third, mad-āśhrayaḥ" explanation)
        paras.insert(6, new_96a)
        paras.insert(7, new_96b)
        # Insert after para 11 (was 9, now 11 after 2 inserts above) - after jnana/vijnana distinction
        paras.insert(12, new_96c)
        # Insert after para 14 (was 11, now 14) - after "anxiety we carry"
        paras.insert(15, new_96d)
        # Insert after para 18 (was 14, now 18) - after "second level is even more startling"
        paras.insert(19, new_96e)

        item['commentary'] = '\n\n'.join(paras)
        print(f"ID 96: {len(item['commentary'])} chars, {len(paras)} paras")
        break

# ============================================================
# ID 97: 6720 chars, 18 paras -> need ~3100-4100 more
# ============================================================
for item in snippets:
    if item['id'] == 97:
        paras = item['commentary'].split('\n\n')

        new_97a = "This classification invites a radical experiment in self-observation. The next time you feel a strong emotion, anger at a colleague, anxiety about the future, joy at a piece of good news, try pausing before you say 'I am angry' or 'I am anxious' or 'I am happy.' Instead, notice: the mind is experiencing anger. The psychological apparatus is generating anxiety. The emotional system is producing joy. This is not a trick of language. It is a shift in perspective that aligns with Krishna's teaching. If mind, intellect, and ego are part of the material nature, then their movements are natural events, not different in kind from wind moving through trees or water flowing downhill. You can observe them without being defined by them."

        new_97b = "The inclusion of *ahankara* in the list of material elements is particularly striking. Most philosophical systems treat the sense of self as either fundamental or as the observer of everything else. Krishna classifies it as an observed phenomenon, one more product of nature. The 'I' that you take to be the most intimate and irreducible fact of your existence is, in this framework, a construction. It is assembled from memory, habit, social conditioning, and biological inheritance. When you say 'I am a teacher' or 'I am a parent' or 'I am successful,' each of those identities is a product of *ahankara*, the ego-forming principle of material nature. The true Self, the *para prakriti* that Krishna will introduce next, lies behind and beyond all of these identities."

        new_97c = "Modern science has made extraordinary progress in understanding the material nature. We can describe the chemical composition of the human body, map the neural pathways of the brain, sequence the genome, and explain the physics of how light enters the eye and is converted into electrical signals. But at the boundary of every physical explanation, a question remains: why is any of this accompanied by conscious experience? Why does the processing of light through neurons produce the subjective experience of seeing a sunset? This question, known in philosophy as the 'hard problem of consciousness,' is precisely the gap that Krishna is pointing to. The lower nature explains the mechanism. The higher nature explains why there is someone home to experience the mechanism at work."

        new_97d = "The relationship between these two natures is not adversarial. Krishna does not describe the lower nature as something to be rejected or escaped. It is his nature, after all, an expression of the Divine. The problem is not that the material world exists. The problem is that we mistake it for the whole of reality. When someone identifies exclusively with their body, their thoughts, and their ego, they are seeing only the lower nature and missing the higher. It is as though you spent your entire life studying the puppet's wooden joints and painted face while never noticing that someone is moving the strings."

        new_97e = "This image of cosmic breathing appears in many traditions, but Krishna's version has a distinctive feature. Because both natures, lower and higher, originate from and dissolve into him, the process is not a conflict between matter and spirit. It is a single movement of the Divine expressing itself in two modes. Creation is not a fall from grace. Dissolution is not a catastrophe. Both are natural rhythms of the one reality, as natural as inhaling and exhaling. Understanding this removes the anxiety that sometimes accompanies spiritual seeking: the feeling that the material world is a trap you must escape. It is not a trap. It is a dance. The question is whether you are dancing consciously or being danced unconsciously."

        # Insert after para 4 (after "mind, intellect, and ego")
        paras.insert(5, new_97a)
        paras.insert(6, new_97b)
        # Insert after para 11 (was 9, now 11) - after puppet analogy
        paras.insert(12, new_97c)
        paras.insert(13, new_97d)
        # Insert after para 18 (was 14, now 18) - after "where does everything come from"
        paras.insert(19, new_97e)

        item['commentary'] = '\n\n'.join(paras)
        print(f"ID 97: {len(item['commentary'])} chars, {len(paras)} paras")
        break

# ============================================================
# ID 98: 7213 chars, 22 paras -> need ~2600-3600 more
# ============================================================
for item in snippets:
    if item['id'] == 98:
        paras = item['commentary'].split('\n\n')

        new_98a = "This image has practical consequences for how we navigate conflict and division. When two people are in disagreement, they see only the separateness of their positions. My view here, your view there, a gap between us. But if both are pearls on the same thread, then the separation is only at the surface. At a deeper level, they are connected by the same sustaining principle. A manager mediating a dispute between two team members, a parent navigating sibling rivalry, a diplomat seeking resolution between nations: in each case, the path forward involves looking past the apparent separateness of the pearls to find the thread that connects them. Krishna is not offering a sentimental platitude about unity. He is describing the actual structure of reality."

        new_98b = "The metaphor also illuminates the nature of loss. When someone we love dies, we experience their absence as a disappearance, a pearl removed from the necklace. But if the thread is what gives each pearl its place, and if the thread is eternal and unbroken, then what we call death is a change in the arrangement of pearls, not a break in the thread. The animating principle that made the person alive, the consciousness that looked out through their eyes, the love that flowed through their actions: these belong to the thread, not to the pearl. And the thread, Krishna says, is himself."

        new_98c = "Pause and consider what this means for the structure of your ordinary day. You wake in the morning and feel the warmth of sunlight through the window: that is an encounter with the Divine. You step outside and feel a breeze against your skin: the movement of air is *vayu*, one expression of the lower nature, and the sensation of feeling it is the higher nature at work in you. You eat breakfast, and the taste of each bite is Krishna declaring his presence. These are not poetic metaphors designed to make the mundane seem sacred. They are descriptions of what is actually happening at every moment. The Divine is not absent from daily life, waiting to be found in some special moment of meditation. The Divine is the daily life, expressing itself through every quality, every sensation, every experience."

        new_98d = "There is a parallel between fire's transformative quality and the transformative power of genuine self-inquiry. Fire takes raw material, wood, coal, food, and converts it into something else entirely: heat, light, energy, nourishment. In the same way, the fire of spiritual practice takes raw experience, the confusion, the suffering, the questions, and transforms it into wisdom. The cooking fire that turns raw grain into nourishing food is, in this reading, a visible symbol of the inner fire that turns raw life into understanding. Every kitchen stove, every campfire, every candle flame is a small altar where the transformative nature of the Divine is on display."

        # Insert after para 5 (after "What we almost never notice is the thread")
        paras.insert(6, new_98a)
        paras.insert(7, new_98b)
        # Insert after para 10 (was 8, now 10) - after "taste in water"
        paras.insert(11, new_98c)
        # Insert after para 18 (was 15, now 18) - after "brilliance in fire"
        paras.insert(19, new_98d)

        item['commentary'] = '\n\n'.join(paras)
        print(f"ID 98: {len(item['commentary'])} chars, {len(paras)} paras")
        break

# ============================================================
# ID 99: 7670 chars, 20 paras -> need ~2100-3100 more
# ============================================================
for item in snippets:
    if item['id'] == 99:
        paras = item['commentary'].split('\n\n')

        new_99a = "The same reframing applies to the experience of creative flow. Artists, writers, musicians, and scientists often describe their best work as something that came through them rather than from them. The novelist who says 'the characters wrote themselves.' The mathematician who describes a proof as something they discovered, not invented. The musician who feels that the melody was already there, waiting to be heard. These are not modest deflections. They are accurate descriptions of what it feels like when *buddhi* flows without the obstruction of ego. Krishna is naming the source of that flow. When the instrument is clear, when ego and attachment step aside, intelligence moves freely, and the results can be extraordinary."

        new_99b = "Every community has known people like this. The elder whose presence calms a room. The teacher whose enthusiasm makes difficult subjects feel accessible. The friend who, without saying anything particularly profound, somehow makes you feel more alive and more yourself when you are around them. This *tejas* is not manufactured through technique or cultivated through self-promotion. It radiates from a quality of being that is rooted in alignment with something larger than the individual personality. When a person lives in harmony with their deeper nature, that harmony becomes visible as a kind of inner luminosity."

        new_99c = "This distinction matters enormously in practical life. A leader who exercises authority from a place of service, making difficult decisions for the welfare of the whole, is channeling divine strength. A leader who exercises the same authority from a place of ego, making decisions to consolidate power and silence dissent, is corrupting that strength with personal agenda. Outwardly, the two may look identical. Both give orders, both make decisions, both wield influence. The difference is interior: one is free from desire and attachment; the other is saturated with both. Krishna's teaching trains us to examine not just what we do with our strength but the quality of consciousness from which we exercise it."

        new_99d = "This alignment is itself a lifelong practice. It requires honest self-examination at every stage. The desire that was dharmic at twenty may become a subtle form of attachment at forty. The ambition that once served a genuine purpose may, over time, become an end in itself. Staying aligned means checking in regularly with yourself: is this desire still in service of something larger than my personal comfort? Am I pursuing this because it contributes to the well-being of others, or because I cannot bear to let it go? The answers will shift as you grow, and the willingness to keep asking is itself a form of yoga."

        # Insert after para 4 (after "an instrument through which intelligence")
        paras.insert(5, new_99a)
        # Insert after para 6 (was 5, now 6) - after tejas explanation
        paras.insert(7, new_99b)
        # Insert after para 10 (was 8, now 10) - after "strength corrupted by desire"
        paras.insert(11, new_99c)
        # Insert after para 13 (was 10, now 13) - after "the desire to heal the sick"
        paras.insert(14, new_99d)

        item['commentary'] = '\n\n'.join(paras)
        print(f"ID 99: {len(item['commentary'])} chars, {len(paras)} paras")
        break

# ============================================================
# ID 100: 7491 chars, 21 paras -> need ~2300-3300 more
# ============================================================
for item in snippets:
    if item['id'] == 100:
        paras = item['commentary'].split('\n\n')

        new_100a = "The completeness of the absorption is what makes it so effective. It is not that we see the world and choose to ignore the Divine behind it. We do not see the Divine at all. The gunas create a seamless, self-consistent experience that accounts for everything within its own terms. Physics explains motion. Chemistry explains substance. Psychology explains thought. Biology explains life. Each field of knowledge operates entirely within the domain of the gunas, offering explanations that are internally valid but that never point beyond themselves. A person can earn a doctorate in every scientific discipline and still never encounter the question that Krishna is raising: what lies behind the entire system of explanation?"

        new_100b = "This is not an argument against science or learning. Knowledge of the gunas, of how the material world operates, has immense practical value. The point is that such knowledge, however extensive, addresses the content of the movie, not the existence of the projector. You can understand every frame of the film in perfect detail and still have no idea that a projector exists. Breaking through the delusion requires a different kind of knowing, the kind Krishna has been describing: not more analysis of the display, but a turning of attention toward the source."

        new_100c = "The nature of this surrender is often misunderstood. It is not passivity. It is not the abandonment of effort. It is the recognition that a certain kind of effort, the effort of the ego to solve its own predicament using its own tools, has reached its limit. A drowning person who thrashes wildly uses enormous energy but goes nowhere. The same person who relaxes and floats is carried by the water. Surrender is learning to float. It is not giving up; it is giving over. You stop fighting the current and allow yourself to be carried by something larger and wiser than your individual will."

        new_100d = "In practical terms, surrender often begins with a moment of exhaustion. You have tried everything you know how to try. You have read, studied, practiced, analyzed. And still, the deepest questions remain unanswered. Still, the restlessness persists. Still, the sense that something essential is missing refuses to go away. It is in this moment of honest exhaustion, when the ego finally admits that it cannot solve this particular puzzle, that surrender becomes possible. Not as a strategy, not as a technique, but as the natural response of a mind that has reached the end of its own resources and is willing, at last, to ask for help."

        new_100e = "This category deserves particular attention in the modern context. We live in an age of unprecedented access to information, yet this abundance of knowledge does not automatically produce wisdom. A person can accumulate vast stores of factual knowledge and use them to construct elaborate justifications for selfishness, exploitation, or cruelty. The corporate executive who uses sophisticated economic theory to defend practices that harm communities. The political strategist who uses psychological research to manipulate public opinion. The religious authority who uses scriptural knowledge to maintain personal power. In each case, genuine knowledge exists, but it has been captured by *Maya* and redirected away from truth and toward delusion. The antidote is not more knowledge but a different relationship with knowledge: one grounded in humility, service, and the willingness to be corrected."

        # Insert after para 4 (after "what the three gunas do")
        paras.insert(5, new_100a)
        paras.insert(6, new_100b)
        # Insert after para 11 (was 9, now 11) - after "those who surrender cross beyond Maya"
        paras.insert(12, new_100c)
        paras.insert(13, new_100d)
        # Insert after para 20 (was 16, now 20) - after "knowledge stolen by Maya"
        paras.insert(21, new_100e)

        item['commentary'] = '\n\n'.join(paras)
        print(f"ID 100: {len(item['commentary'])} chars, {len(paras)} paras")
        break

# Write updated file
with open('/Users/anishmoonka/gita-app/data/gita_snippets.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\nAll IDs 96-100 updated.")

# Final verification
print("\nFinal verification:")
for item in data['snippets']:
    if item['id'] in range(96, 101):
        c = item['commentary']
        paras = [p for p in c.split('\n\n') if p.strip()]
        in_range = 9800 <= len(c) <= 10800
        status = "OK" if in_range else "OUT OF RANGE"

        # Check banned content
        issues = []
        if '\u2014' in c: issues.append('em dash')
        if '\u2013' in c: issues.append('en dash')
        if '--' in c: issues.append('double hyphen')
        for word in ['landscape', 'Indeed,', 'Hence,', 'delve', 'unpack', 'paradigm', 'In essence,']:
            if word.lower() in c.lower():
                issues.append(word)

        issue_str = f" ISSUES: {', '.join(issues)}" if issues else ""
        print(f"  ID {item['id']}: {len(c)} chars, {len(paras)} paras [{status}]{issue_str}")
