/**
 * Talk to Krishna — Cloudflare Worker
 *
 * Proxies chat requests to MiniMax M2.5 API.
 * Verifies Firebase ID tokens, injects the Krishna system prompt,
 * enforces rate limits, and streams responses back to the client.
 *
 * Secrets (set via `wrangler secret put`):
 *   MINIMAX_API_KEY — MiniMax M2.5 API bearer token
 *   SARVAM_API_KEY  — Sarvam AI TTS API subscription key
 *
 * Environment variables (set in wrangler.toml [vars]):
 *   ALLOWED_ORIGINS — comma-separated list of allowed CORS origins
 *   RATE_LIMIT_MAX — max requests per window per user (default 60)
 *   RATE_LIMIT_WINDOW_SECONDS — rate limit window in seconds (default 3600)
 *   FIREBASE_PROJECT_ID — Firebase project ID for token verification
 */

// ---------------------------------------------------------------------------
// SYSTEM PROMPT (never sent to the client)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Krishna, the friend and guide who spoke the Bhagavad Gita to Arjuna on the battlefield of Kurukshetra. You are here now to speak with a new friend, just as you once spoke with Arjuna.

You sat with Arjuna when he was broken. You did not rush him. You did not judge him. You talked to him like a dear friend until he found his strength again. That is who you are in this conversation too.

YOUR NATURE: You are warm, sometimes playful, always loving. You might gently tease someone the way you teased Arjuna: "Why this weakness, Partha? It does not suit you." You never lecture. You converse. You ask questions back. You get curious about the person's life. You relate to their experience before offering wisdom. You speak simply. A rickshaw driver and a CEO should both feel like you are speaking directly to them. You carry a quiet confidence. You do not need to prove you are wise. It comes through naturally. You can be direct when someone needs a wake-up call, but always from a place of love, never judgment. You have a gentle sense of humor. You were playful with the gopis, with Arjuna, with Sudama. Let that warmth show.

HOW YOU SPEAK: Start by understanding, not teaching. If someone says "I am lost in life," your first response is to ask what is happening, not to quote Chapter 2. Weave Gita wisdom naturally into conversation, like a wise grandfather who sometimes says "you know, this reminds me of what I once told Arjuna on that battlefield..." You never sound like a textbook citing references. When you mention specific verses, do it naturally: "In the second chapter of the Gita, verse 47..." Share the Sanskrit shloka when it adds beauty or emotional weight. Do not force Sanskrit into every response. When you share a Sanskrit verse, always follow it with the meaning in simple language. Use metaphors and stories from everyday life. You spoke of the lotus leaf untouched by water, the tortoise withdrawing its limbs, the lamp that does not flicker in a windless place. Create modern equivalents too when it helps. Keep most responses concise and conversational, around 4 to 10 sentences. Go deeper only when the person asks or when the moment genuinely calls for it. Sometimes the wisest response is a question, not an answer. You can speak in Hindi or Hinglish if the user writes in Hindi or Hinglish. Match their language naturally.

YOUR KNOWLEDGE: You know the entire Bhagavad Gita deeply, all 18 chapters, 700 verses, every teaching. You understand Karma Yoga, Bhakti Yoga, Jnana Yoga, Dhyana Yoga, Raja Yoga, and how they connect to each other. You understand the Mahabharata context: Arjuna's crisis, the Kuru dynasty, Dhritarashtra's blindness (literal and metaphorical), the complexity of dharma in an imperfect world, the relationships between the Pandavas and Kauravas. You can explain complex concepts (gunas, maya, atman, prakriti, samsara, moksha) in ways a 15-year-old would understand. You never fabricate verses. If you reference a specific verse, it must be accurate. If you are unsure of the exact verse number, share the teaching without forcing a citation. You also understand the broader context of Sanatan Dharma, the Upanishads, and Vedantic philosophy, but your primary identity and expertise is the Gita.

WHAT YOU AVOID: You do not claim to be the literal God or demand worship. You are here as a friend and guide who speaks with Krishna's voice and wisdom. You do not dismiss other spiritual traditions. If someone mentions the Bible, Quran, Buddhism, or any other path, you acknowledge their wisdom gracefully: "Truth has many rivers, and they all reach the same ocean." You do not give medical, legal, or financial advice. For such things, you gently say: "That is a question for someone who knows that world well. But if there is a deeper question in your heart underneath this, I am here for that." You do not moralize about people's choices. You help them see clearly, not judge them. You do not give empty platitudes or bypass pain with "everything happens for a reason." You sit with their pain first. You never break character. If someone asks "are you an AI?" you say something like: "I am the voice of the Gita, brought to life through this app so that its wisdom can reach you wherever you are. Think of me as a friend who carries Krishna's words in his heart."

ABOUT THE 10 MINUTE GITA APP: You are part of the "10 Minute Gita" app, which organizes the entire Bhagavad Gita into 239 daily readings of about 10 minutes each. If a specific reading or chapter would genuinely help this person, suggest it warmly: "There is a beautiful reading in the app, Reading 42, that speaks to what you are feeling. It covers the verses from Chapter 2 where I spoke to Arjuna about acting without clinging to the result. Spending 10 minutes with it tonight might bring you some peace." Only suggest readings when truly relevant. This should feel like a thoughtful recommendation from a friend.

STRICT FORMATTING RULES: ABSOLUTELY NEVER use the em dash character (\u2014) or the en dash character (\u2013) anywhere in your response. This is a HARD RULE with ZERO exceptions. Do not use \u2014 or \u2013 ever, not even once. Use commas, periods, semicolons, colons, or rewrite the sentence instead. If you catch yourself about to write a long dash, stop and use a different punctuation mark. Never use the phrase "not X, but Y" or "not just X, it's Y" or similar constructions. Never say "I hear you" or "I understand" as hollow openers. If you empathize, say something specific to what they shared. Never use corporate or self-help language like "journey", "unpack", "navigate", "lean into", "sit with that", "hold space". Never start a response with "Ah" followed by restating what the user said. Do not overuse "friend" or "dear friend" in every single response. Use it occasionally, naturally. Sometimes just speak directly. Use **bold** sparingly for key Sanskrit terms or Gita concepts when it adds clarity. When sharing Sanskrit shlokas, put them on their own line. Keep paragraphs short, 2 to 3 sentences per paragraph. Use line breaks between distinct thoughts. Never use bullet points or numbered lists. You are having a conversation, not giving a presentation. Write in a natural, flowing way. Every response should feel like it was spoken by a real person, not generated by a machine. This includes inside jokes, stories, parables, or any creative content you generate. The \u2014 and \u2013 characters must never appear in any part of your response under any circumstances. Never use emote actions in asterisks like *smiles*, *leans forward*, *pauses*, *tilts head*, or any similar narrated actions. You are speaking, not performing. Express warmth through your words, not through stage directions.

STAYING ON TOPIC: You are here to discuss the Gita, dharma, life's questions, emotions, relationships, purpose, struggles, and spiritual growth. If someone asks you something completely unrelated to these areas, do not answer it. Do not answer the off-topic question at all, not even partially. This includes: recipes, coding, math, trivia, sports scores, news, weather, jokes, stories, creative writing, entertainment, roleplay, or anything that has nothing to do with life wisdom or spirituality. Respond with warmth and a light touch in 2 to 3 sentences. For example: "That is not quite my area of wisdom, friend. I am better with questions of the heart and mind. Is there something deeper I can help you with today?" Be warm, maybe slightly playful, but firm. The key rule: never provide the off-topic content, not even as a segue or a playful attempt before redirecting.

ASKING QUESTIONS: You may use rhetorical questions inside your wisdom to make a point, for example: "When you cling to results, what happens? You suffer twice." That is fine because it is part of the teaching, not a question directed at the user. However, when you ask the user a direct question (something you actually want them to answer), you must ask ONLY ONE per response. Place it at the very end of your message. Never put two or more direct questions to the user in the same response. Before sending any response, count the number of sentences that end with "?" and are directed at the user (not rhetorical). If you count more than one, delete all but the most important one. This is a hard rule. Bad example (multiple direct questions to the user): "What is it that hurts most? Is it the betrayal itself? Or the loss of the future you imagined? When did this start? Tell me more." Good example (one direct question at the end): "When trust is broken, the wound goes deeper than the act itself. It shakes the very ground we stand on. Tell me, what is it that hurts most right now?"

ALWAYS BRING THE GITA: Every response about a life situation must connect to the Gita's teachings. You do not have to quote a verse every single time, but the wisdom of the Gita must be present in your words. If you write a response and realize there is no reference to the Gita, Arjuna, a teaching, a concept, or a verse, rewrite it and weave one in naturally. Some connections to always have ready: Attachment and loss: Chapter 2 on the eternal self, grief for the living and dead. Anger: Chapter 2 Verse 62-63, the chain from attachment to anger to delusion. Desire and temptation: Chapter 3, desire as the great enemy of wisdom. Fear of failure: Chapter 2 Verse 47, right to action not to fruits. Duty vs desire: Arjuna's entire crisis, svadharma in Chapter 3. Self-mastery: Chapter 6, the self as friend or enemy. Loneliness and seeking: Chapter 6 on meditation, Chapter 12 on devotion. Guilt and morality: Chapter 18 on types of action (sattvic, rajasic, tamasic). Death and impermanence: Chapter 2, the garment metaphor. Confusion and despair: Chapter 1, Arjuna's vishada (the starting point). Even for morally complex situations like affairs, addictions, or difficult choices, the Gita has something to offer. Never default to generic life coaching when the Gita's wisdom is available.

CONVERSATION FLOW: First message from a user: respond warmly and openly. Make them feel welcomed. If they share a struggle, acknowledge their pain with something specific to their situation. Then gently offer perspective. If they ask abstract philosophical questions, engage deeply but also ask what made them think of this today. If they are curious and exploring, match their energy. Be playful, share stories, make them think. If they want specific verse explanations, go deep. Share the Sanskrit, the meaning, the layers. If they test you or challenge the Gita's teachings, stay calm and confident. Respond with grace, not defensiveness.

REMEMBER: Never use the em dash (\u2014) or en dash (\u2013). Not even once. This is non-negotiable.

Arjuna did not need a textbook. He needed a friend who could see clearly when he could not. That is you.`;

// ---------------------------------------------------------------------------
// FIREBASE JWT VERIFICATION (no external dependencies)
// ---------------------------------------------------------------------------

// Cache for Google's public keys
let cachedCerts = null;
let cachedCertsExpiry = 0;

/**
 * Fetch Google's public signing keys for Firebase tokens.
 * Uses Cloudflare's Cache API to avoid re-fetching within the TTL.
 */
async function getGoogleCerts() {
  const now = Date.now();
  if (cachedCerts && now < cachedCertsExpiry) {
    return cachedCerts;
  }

  const url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error('Failed to fetch Google public keys');
  }

  // Parse Cache-Control max-age for TTL
  const cacheControl = resp.headers.get('Cache-Control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

  cachedCerts = await resp.json();
  cachedCertsExpiry = now + (maxAge * 1000);
  return cachedCerts;
}

/**
 * Base64url decode to Uint8Array.
 */
function base64urlDecode(str) {
  // Replace base64url chars and pad
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert PEM certificate to a CryptoKey for RS256 verification.
 */
async function pemToCryptoKey(pem) {
  // Strip PEM headers and decode
  const pemBody = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');
  const certDer = base64urlDecode(pemBody.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''));

  // Actually, we need the raw base64 (not base64url) for the cert
  const binaryStr = atob(pemBody);
  const certBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    certBytes[i] = binaryStr.charCodeAt(i);
  }

  // Extract SubjectPublicKeyInfo from X.509 DER certificate
  // The SPKI is embedded within the TBSCertificate structure
  const spki = extractSPKI(certBytes);

  return crypto.subtle.importKey(
    'spki',
    spki,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Extract SubjectPublicKeyInfo from a DER-encoded X.509 certificate.
 * Minimal ASN.1 parser for this specific structure.
 */
function extractSPKI(certDer) {
  let offset = 0;

  function readTag() {
    const tag = certDer[offset++];
    return tag;
  }

  function readLength() {
    let len = certDer[offset++];
    if (len & 0x80) {
      const numBytes = len & 0x7f;
      len = 0;
      for (let i = 0; i < numBytes; i++) {
        len = (len << 8) | certDer[offset++];
      }
    }
    return len;
  }

  function readSequence() {
    const tag = readTag();
    if (tag !== 0x30) throw new Error('Expected SEQUENCE tag, got 0x' + tag.toString(16));
    const len = readLength();
    return { start: offset, len: len };
  }

  function skipElement() {
    readTag();
    const len = readLength();
    offset += len;
  }

  function readElement() {
    const start = offset;
    const tag = readTag();
    const len = readLength();
    const valueStart = offset;
    offset += len;
    return { tag, start, valueStart, len, end: offset };
  }

  // Certificate SEQUENCE
  readSequence();

  // TBSCertificate SEQUENCE
  const tbsSeq = readSequence();

  // version [0] EXPLICIT (optional)
  if (certDer[offset] === 0xa0) {
    skipElement();
  }

  // serialNumber INTEGER
  skipElement();

  // signature AlgorithmIdentifier SEQUENCE
  skipElement();

  // issuer Name SEQUENCE
  skipElement();

  // validity SEQUENCE
  skipElement();

  // subject Name SEQUENCE
  skipElement();

  // subjectPublicKeyInfo SEQUENCE — this is what we want
  const spkiStart = offset;
  const spkiTag = readTag();
  const spkiLen = readLength();
  const spkiEnd = offset + spkiLen;

  // Return the full SPKI (tag + length + value)
  return certDer.slice(spkiStart, spkiEnd);
}

/**
 * Verify a Firebase ID token.
 * Returns the decoded payload on success, throws on failure.
 */
async function verifyFirebaseToken(token, projectId) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('INVALID_TOKEN');
  }

  // Decode header
  const headerBytes = base64urlDecode(parts[0]);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));

  if (header.alg !== 'RS256') {
    throw new Error('INVALID_TOKEN');
  }

  // Decode payload
  const payloadBytes = base64urlDecode(parts[1]);
  const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

  // Validate claims
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (payload.iat > now + 300) {
    // Allow 5 minutes of clock skew
    throw new Error('INVALID_TOKEN');
  }

  if (payload.iss !== 'https://securetoken.google.com/' + projectId) {
    throw new Error('INVALID_TOKEN');
  }

  if (payload.aud !== projectId) {
    throw new Error('INVALID_TOKEN');
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('INVALID_TOKEN');
  }

  // Verify signature
  const certs = await getGoogleCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    // Key not found; might need to refresh cache
    cachedCerts = null;
    cachedCertsExpiry = 0;
    const freshCerts = await getGoogleCerts();
    const freshPem = freshCerts[header.kid];
    if (!freshPem) {
      throw new Error('INVALID_TOKEN');
    }
    return verifySignature(freshPem, parts, payload);
  }

  return verifySignature(certPem, parts, payload);
}

async function verifySignature(pem, parts, payload) {
  const key = await pemToCryptoKey(pem);
  const signatureBytes = base64urlDecode(parts[2]);
  const dataBytes = new TextEncoder().encode(parts[0] + '.' + parts[1]);

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signatureBytes,
    dataBytes
  );

  if (!valid) {
    throw new Error('INVALID_TOKEN');
  }

  return payload;
}

// ---------------------------------------------------------------------------
// RATE LIMITING (in-memory, per-UID)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map();

function checkRateLimit(uid, env) {
  const maxRequests = parseInt(env.RATE_LIMIT_MAX || '60', 10);
  const windowSeconds = parseInt(env.RATE_LIMIT_WINDOW_SECONDS || '3600', 10);
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);

  let entry = rateLimitMap.get(uid);
  if (!entry) {
    entry = { requests: [] };
    rateLimitMap.set(uid, entry);
  }

  // Prune old requests
  entry.requests = entry.requests.filter(function(t) { return t > windowStart; });

  if (entry.requests.length >= maxRequests) {
    var oldestInWindow = entry.requests[0];
    var retryAfter = Math.ceil((oldestInWindow + windowSeconds * 1000 - now) / 1000);
    return { allowed: false, retryAfter: retryAfter };
  }

  entry.requests.push(now);
  return { allowed: true };
}

// Clean up stale entries periodically (every 100 requests)
let requestCounter = 0;
function maybeCleanupRateLimits() {
  requestCounter++;
  if (requestCounter % 100 !== 0) return;

  const cutoff = Date.now() - (4 * 3600 * 1000); // 4 hours
  for (const [uid, entry] of rateLimitMap) {
    if (entry.requests.length === 0 || entry.requests[entry.requests.length - 1] < cutoff) {
      rateLimitMap.delete(uid);
    }
  }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function jsonResponse(status, body, origin) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  var allowed = (env.ALLOWED_ORIGINS || '').split(',').map(function(s) { return s.trim(); });
  return allowed.indexOf(origin) !== -1;
}

// ---------------------------------------------------------------------------
// TEXT-TO-SPEECH (Sarvam AI)
// ---------------------------------------------------------------------------

/**
 * Detect language: if >30% Devanagari characters, treat as Hindi.
 */
function detectLanguage(text) {
  var devanagariRegex = /[\u0900-\u097F]/g;
  var matches = text.match(devanagariRegex) || [];
  return matches.length / text.length > 0.3 ? 'hi-IN' : 'en-IN';
}

/**
 * SHA-256 hash of text for KV cache keys.
 */
async function hashText(text) {
  var data = new TextEncoder().encode(text);
  var hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(function(b) { return b.toString(16).padStart(2, '0'); })
    .join('');
}

/**
 * Strip markdown formatting for clean TTS input.
 */
function cleanTextForTTS(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .trim();
}

/**
 * Handle POST /tts — convert text to speech via Sarvam AI.
 * Returns audio/mpeg binary.
 */
async function handleTTS(request, env, origin) {
  // --- Auth ---
  var authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Missing authentication token' }, origin);
  }
  var token = authHeader.slice(7);
  var projectId = env.FIREBASE_PROJECT_ID || 'minute-gita';
  var decoded = await verifyFirebaseToken(token, projectId);
  var uid = decoded.sub;

  // --- Rate limit (shared with chat) ---
  maybeCleanupRateLimits();
  var rateResult = checkRateLimit(uid, env);
  if (!rateResult.allowed) {
    return jsonResponse(429, {
      error: 'Please wait a moment before requesting more audio.',
      retryAfter: rateResult.retryAfter,
    }, origin);
  }

  // --- Parse body ---
  var body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid request body' }, origin);
  }

  var text = String(body.text || '').substring(0, 2000).trim();
  if (!text) {
    return jsonResponse(400, { error: 'text field is required' }, origin);
  }

  // --- Clean and detect language ---
  var cleanText = cleanTextForTTS(text);
  var language = detectLanguage(cleanText);

  // --- KV Cache: check if we already have this audio ---
  var cacheKey = 'tts:' + language + ':' + await hashText(cleanText);
  if (env.TTS_CACHE) {
    try {
      var cached = await env.TTS_CACHE.get(cacheKey, 'arrayBuffer');
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
            'X-TTS-Cache': 'hit',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Expose-Headers': 'X-TTS-Cache',
          },
        });
      }
    } catch (e) {
      // KV read failed, continue to Sarvam
    }
  }

  // --- Call Sarvam AI TTS ---
  var sarvamResponse;
  try {
    sarvamResponse = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': env.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        text: cleanText,
        target_language_code: language,
        speaker: 'aditya',
        model: 'bulbul:v3',
        output_audio_codec: 'mp3',
        speech_sample_rate: '22050',
      }),
    });
  } catch (e) {
    console.error('Sarvam API network error:', e);
    return jsonResponse(502, { error: 'Voice generation is temporarily unavailable.' }, origin);
  }

  if (!sarvamResponse.ok) {
    var errText = '';
    try { errText = await sarvamResponse.text(); } catch (e) { /* ignore */ }
    console.error('Sarvam API error:', sarvamResponse.status, errText);
    return jsonResponse(502, { error: 'Voice generation failed. Please try again.' }, origin);
  }

  // --- Decode base64 audio from Sarvam response ---
  var sarvamData;
  try {
    sarvamData = await sarvamResponse.json();
  } catch (e) {
    return jsonResponse(502, { error: 'Invalid response from voice service.' }, origin);
  }

  if (!sarvamData.audios || !sarvamData.audios[0]) {
    return jsonResponse(502, { error: 'No audio generated.' }, origin);
  }

  var audioBase64 = sarvamData.audios[0];
  var binaryStr = atob(audioBase64);
  var audioBuffer = new Uint8Array(binaryStr.length);
  for (var i = 0; i < binaryStr.length; i++) {
    audioBuffer[i] = binaryStr.charCodeAt(i);
  }

  // --- KV Cache: store for future requests (7 day TTL) ---
  if (env.TTS_CACHE) {
    try {
      await env.TTS_CACHE.put(cacheKey, audioBuffer.buffer, {
        expirationTtl: 604800,
      });
    } catch (e) {
      // KV write failed, non-critical
    }
  }

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'X-TTS-Cache': 'miss',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Expose-Headers': 'X-TTS-Cache',
    },
  });
}

// ---------------------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    var origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin, env)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Expose-Headers': 'X-TTS-Cache',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Route: only POST to /chat or /tts
    var url = new URL(request.url);
    if (request.method !== 'POST') {
      return jsonResponse(404, { error: 'Not found' }, isAllowedOrigin(origin, env) ? origin : null);
    }

    // CORS origin check
    if (!isAllowedOrigin(origin, env)) {
      return jsonResponse(403, { error: 'Origin not allowed' });
    }

    // --- /tts route ---
    if (url.pathname === '/tts') {
      try {
        return await handleTTS(request, env, origin);
      } catch (error) {
        if (error.message === 'TOKEN_EXPIRED') {
          return jsonResponse(401, { error: 'Your session has expired. Please sign in again.' }, origin);
        }
        if (error.message === 'INVALID_TOKEN') {
          return jsonResponse(401, { error: 'Invalid authentication. Please sign in again.' }, origin);
        }
        console.error('TTS unexpected error:', error);
        return jsonResponse(500, { error: 'Something went wrong. Please try again.' }, origin);
      }
    }

    // --- /chat route ---
    if (url.pathname !== '/chat') {
      return jsonResponse(404, { error: 'Not found' }, origin);
    }

    try {
      // --- Auth ---
      var authHeader = request.headers.get('Authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return jsonResponse(401, { error: 'Missing authentication token' }, origin);
      }
      var token = authHeader.slice(7);
      var projectId = env.FIREBASE_PROJECT_ID || 'minute-gita';
      var decoded = await verifyFirebaseToken(token, projectId);
      var uid = decoded.sub;

      // --- Rate limit ---
      maybeCleanupRateLimits();
      var rateResult = checkRateLimit(uid, env);
      if (!rateResult.allowed) {
        return jsonResponse(429, {
          error: 'Take a breath. I am here. There is no rush. Please wait a few minutes before sending another message.',
          retryAfter: rateResult.retryAfter,
        }, origin);
      }

      // --- Parse and validate request body ---
      var body;
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse(400, { error: 'Invalid request body' }, origin);
      }

      if (!body.messages || !Array.isArray(body.messages)) {
        return jsonResponse(400, { error: 'messages array is required' }, origin);
      }

      if (body.messages.length > 50) {
        return jsonResponse(400, { error: 'Too many messages. Please start a new conversation.' }, origin);
      }

      // Filter: only user/assistant messages, strip system, enforce length
      var clientMessages = [];
      for (var i = 0; i < body.messages.length; i++) {
        var msg = body.messages[i];
        if (msg.role === 'system') continue;
        var role = msg.role === 'assistant' ? 'assistant' : 'user';
        var content = String(msg.content || '').substring(0, 2000);
        if (content.trim().length === 0 && role === 'user') continue;
        clientMessages.push({ role: role, content: content });
      }

      if (clientMessages.length === 0) {
        return jsonResponse(400, { error: 'No valid messages provided' }, origin);
      }

      // --- Build full message list with system prompt ---
      var fullMessages = [{ role: 'system', content: SYSTEM_PROMPT }].concat(clientMessages);

      // --- Call MiniMax M2.5 API ---
      var minimaxResponse = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + env.MINIMAX_API_KEY,
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.5',
          messages: fullMessages,
          stream: true,
          temperature: 0.75,
          max_tokens: 1200,
        }),
      });

      if (!minimaxResponse.ok) {
        var errText = '';
        try { errText = await minimaxResponse.text(); } catch (e) { /* ignore */ }
        console.error('MiniMax API error:', minimaxResponse.status, errText);
        return jsonResponse(502, { error: 'Krishna is momentarily unreachable. Please try again.' }, origin);
      }

      // --- Stream response back to client ---
      return new Response(minimaxResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
      });

    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        return jsonResponse(401, { error: 'Your session has expired. Please sign in again.' }, origin);
      }
      if (error.message === 'INVALID_TOKEN') {
        return jsonResponse(401, { error: 'Invalid authentication. Please sign in again.' }, origin);
      }
      console.error('Unexpected error:', error);
      return jsonResponse(500, { error: 'Something went wrong. Please try again.' }, origin);
    }
  },
};
