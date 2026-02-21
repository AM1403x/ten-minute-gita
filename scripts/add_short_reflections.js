const fs = require('fs');
const path = require('path');

// Read the JSON file
const filePath = '/Users/anishmoonka/gita-app/data/gita_snippets.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Short reflections for snippets 1-20 (based on existing reflection themes)
const shortReflections = {
  1: "Notice today where you draw the line between \"mine\" and \"theirs\" — my team vs. their team, my people vs. outsiders. Every conflict in your life traces back to this one habit of division. What if you dropped that boundary, just for today, and treated \"them\" as your own?",

  2: "When you feel insecure, do you over-prepare, over-explain, or keep listing reasons why things should work out? That nervous energy is a signal — not that you're weak, but that you're seeking approval instead of trusting yourself. Today, catch the moment you start justifying and simply stop. Confidence doesn't need a list.",

  3: "Think about the last time you complimented someone. Was it genuine, or did it come with an unspoken expectation — a favour, loyalty, or reassurance? Flattery disguised as praise is one of the most common ways we manipulate without realising it. Today, give one honest compliment with absolutely nothing attached.",

  4: "You have everything you need — skills, support, resources — yet you can't shake the anxiety that it's not enough. Notice how your mind toggles between \"I've got this\" and \"I'm screwed.\" That oscillation isn't about the situation; it's about whether you believe your cause is right. What decision are you avoiding because deep down, you already know the answer?",

  5: "What's your conch? Not your resume or your title — your actual voice, the thing only you can sound. Most people spend decades muting themselves, waiting for permission to contribute. Today, in one meeting or conversation, say the thing only you can say. Don't wait for the \"right\" moment. Blow your conch first.",

  6: "Your life speaks louder than your words. Yudhishthira's conch was named \"Eternal Victory\" because truth always wins eventually. Nakula's was \"Sweet-Sounding\" because he valued beauty. What would your conch be called if it reflected how you actually live — not how you want to be seen? Is there a gap? That gap is where the work is.",

  7: "When you know you're wrong, even neutral facts feel threatening. Notice how, when you're hiding something or avoiding a hard truth, even a colleague's confidence or a friend's success makes you defensive. That's not about them — it's your own misalignment speaking. What truth are you running from that makes everything else feel like a threat?",

  8: "You've already decided they're the enemy, so now everything they do proves it. This is how we create villains in our own lives — the coworker, the ex, the family member who \"just doesn't get it.\" Today, catch yourself mid-judgment and ask: am I seeing them, or am I seeing my story about them? One is reality. The other is a choice.",

  9: "You can't hurt people without also hurting yourself — not because of karma, but because you actually share more than you think. The person you're planning to betray, dismiss, or cut off? They're woven into your life in ways you've stopped noticing. Before you act, ask: if I do this, what part of me am I also destroying?",

  10: "Your body always knows before your mind does. Dry mouth before the meeting. Trembling hands before the conversation. Knot in your stomach when you see their name. Stop overriding these signals with logic and willpower. What is your body trying to tell you that your mind refuses to hear?",

  11: "When you're overwhelmed, you start seeing signs everywhere — bad luck, omens, cosmic conspiracies against you. But there are no signs. There's only cause and effect, and your exhausted mind trying to make meaning out of chaos. What decision have you been avoiding that's making everything else look like a disaster?",

  12: "You list every reason why you shouldn't have to do the hard thing — it's unfair, they don't deserve it, it'll cause harm, you're a good person who doesn't do things like this. But underneath all that logic, there's just one truth: you don't want to. That's fine. But call it what it is. What are you calling \"morality\" that's really just fear?",

  13: "You've built an airtight case for why you're right. Every angle covered, every objection answered. But if you already know what's right, why do you need so many reasons? Overexplaining is a red flag — not for others, but for yourself. When you catch yourself building a fortress of justifications, ask: what am I really trying to convince myself of?",

  14: "You're not worried about society collapsing. You're worried about your world collapsing — the life you've built, the identity you've invested in, the story you tell about who you are. When you catastrophize about \"what will happen if,\" you're not predicting the future. You're protecting the past. What are you clinging to that you're calling \"principles\"?",

  15: "Notice how much energy you spend performing virtue — listing all the terrible things you'd never do, all the values you'd never compromise. It's exhausting because it's not real. Real integrity doesn't announce itself. It just acts. What \"principle\" are you loudly defending to avoid a choice you don't want to make?",

  16: "\"It would be better if they just killed me.\" This is the fantasy of the person who won't choose — martyrdom without agency, suffering without responsibility. You'd rather be the victim of their cruelty than the author of your own life. What are you calling \"surrender\" that's really just paralysis? And what would actual surrender look like?",

  17: "When your world is falling apart, the last thing you want is someone telling you to snap out of it. But that's exactly what a true teacher does — not because they don't care, but because they see what you can't: your breakdown is a doorway. What are you calling a \"crisis\" that might actually be clarity trying to break through?",

  18: "You can't enjoy anything that came from betraying yourself. The promotion you got by staying silent. The peace you bought by avoiding conflict. The relationship you kept by pretending. It all tastes like ash because you know what it cost. What \"success\" in your life is actually poisoning you? And what would it take to walk away?",

  19: "You've been pretending you have it together, listing your concerns as if they're intellectual problems to solve. But the moment you say \"I don't know what to do\" — that's when real help can arrive. Where in your life are you performing competence when what you actually need is to admit you're lost?",

  20: "Notice how Krishna smiles before he teaches. Not because Arjuna's suffering is funny, but because from a wider view, the problem Arjuna thinks he has isn't the real problem. You're grieving the wrong things, fearing the wrong outcomes, protecting the wrong people. What are you taking desperately seriously that, from ten years out, won't matter at all?"
};

// Add shortReflection to snippets 1-20
for (let i = 0; i < 20 && i < data.snippets.length; i++) {
  const snippet = data.snippets[i];
  const id = snippet.id;

  if (id >= 1 && id <= 20 && shortReflections[id]) {
    // Find the position after 'reflection' field
    snippet.shortReflection = shortReflections[id];
  }
}

// Write back to file with proper formatting
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log('Successfully added shortReflection fields to snippets 1-20');
