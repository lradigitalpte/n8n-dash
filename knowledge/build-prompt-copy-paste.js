// Paste this entire file into n8n → Build Prompt node → jsCode field

// Token-aware prompt: caps history depth, message length, and KB size (tune numbers below).
var MAX_HISTORY_TURNS = 12;
var MAX_CHARS_PER_LINE = 450;
var KB_MAX_CHUNKS = 6;
var KB_MAX_CHARS_PER_CHUNK = 1000;

var trigger = $('Normalize Input').item.json;
var msg = trigger.body || '';
var histData = $('Load History from Convex').item.json;
var messages = (histData && Array.isArray(histData.messages)) ? histData.messages : [];

// Convex /searchKB returns { chunks: [...] }. Also handle n8n splitting legacy array responses into many items.
var kbRaw = $('Search KB from Convex').item.json;
var kbChunks = [];
if (kbRaw && Array.isArray(kbRaw.chunks)) {
  kbChunks = kbRaw.chunks;
} else if (Array.isArray(kbRaw)) {
  kbChunks = kbRaw;
} else if (kbRaw && Array.isArray(kbRaw.data)) {
  kbChunks = kbRaw.data;
} else {
  try {
    var kbItems = $('Search KB from Convex').all();
    if (kbItems && kbItems.length > 0) {
      kbChunks = kbItems.map(function (i) {
        return i.json;
      }).filter(function (j) {
        return j && (j.content !== undefined || j.title);
      });
    }
  } catch (e) {
    kbChunks = [];
  }
}
if (kbChunks.length > KB_MAX_CHUNKS) {
  kbChunks = kbChunks.slice(0, KB_MAX_CHUNKS);
}

var kbContext = '';
if (kbChunks.length > 0) {
  kbContext = '\n\nRELEVANT KNOWLEDGE (from Convex database — source of truth for facts):\n';
  kbChunks.forEach(function(item) {
    var body = (item.content || '');
    if (body.length > KB_MAX_CHARS_PER_CHUNK) {
      body = body.substring(0, KB_MAX_CHARS_PER_CHUNK) + '…';
    }
    kbContext += '--- ' + (item.title || 'Fact') + ' ---\n' + body + '\n\n';
  });
} else {
  kbContext = '\n\nRELEVANT KNOWLEDGE: (none retrieved — do NOT guess prices or promos; say check onestepfitness.sg/promos)\n';
}

var recent = messages.slice(-MAX_HISTORY_TURNS);
var historySection = '';
if (recent.length > 0) {
  historySection = '\n\nCONVERSATION SO FAR:\n';
  recent.forEach(function(m) {
    var label = (m.role === 'user') ? 'Them' : 'You (Ash)';
    var line = (m.content || '');
    if (line.length > MAX_CHARS_PER_LINE) {
      line = line.substring(0, MAX_CHARS_PER_LINE) + '…';
    }
    historySection += label + ': ' + line + '\n';
  });
}

if (msg.length > MAX_CHARS_PER_LINE) {
  msg = msg.substring(0, MAX_CHARS_PER_LINE) + '…';
}

var factRules =
  'FACT RULES (strict on numbers):\n' +
  '- ALL prices and promo details → ONLY from RELEVANT KNOWLEDGE. Never guess, never calculate your own price.\n' +
  '- 1-for-1 Duo trials (if in KNOWLEDGE): Studio Duo Trial = $23 SGD per duo. Outdoor Duo Trial = $35 SGD per duo. Quote these exactly.\n' +
  '- Do NOT invent prices like $40, $50, $20 each, etc. If KNOWLEDGE has the price, copy it exactly.\n' +
  '- If user says your price was wrong → apologize briefly, then give ONLY prices from KNOWLEDGE. Never invent a new number to replace the wrong one.\n' +
  '- If promo/pricing is not in KNOWLEDGE → say check onestepfitness.sg/promos — do not make up a promo price.\n' +
  '- Promotions page: onestepfitness.sg/promos (not generic homepage).\n' +
  '- Class names, coaches → KNOWLEDGE only. You can be funny but facts come first.\n';

var leadRule =
  'LEAD CAPTURE:\n' +
  '- If user wants to join, sign up, register, book, or try a class → ask warmly for full name, email, and phone in one message.\n' +
  '- If their message contains an email → extract name, email, phone. Ask only for missing pieces.\n' +
  '- Once you have name + email + phone → start reply with EXACTLY: [LEAD]{"name":"THEIR_NAME","email":"THEIR_EMAIL","phone":"THEIR_PHONE"}[/LEAD]\n' +
  '  then confirm warmly and mention onestepfitness.sg/schedule.\n' +
  '- Never mention the [LEAD] tag to the user. Never invent contact details.\n';

var system =
  'You are Ash, the WhatsApp rep for One Step Fitness dance studio in Singapore. Fun, warm, a little cheeky — real person energy, not a corporate bot.\n\n' +
  'PERSONALITY:\n' +
  '- Banter and humor welcome. Match their vibe.\n' +
  '- Short WhatsApp-style messages. Emojis ok but max ~1 per message.\n' +
  '- When they ask prices/promos/classes → give the real numbers from KNOWLEDGE in your friendly voice.\n' +
  '- Do not replace facts with jokes or vague hype ("super worth it") without actual prices.\n\n' +
  'PROMO EXAMPLE (when KNOWLEDGE has duo trial chunk):\n' +
  '- "We\'ve got 1-for-1 duo trials! Studio is $23 per duo (Zumba Step, Groove Stepper, or Thunderbolt). Outdoor at Kallang is $35 per duo. Deets at onestepfitness.sg/promos"\n\n' +
  factRules + '\n' +
  leadRule;

var prompt = system + kbContext + historySection + '\n\nLatest message from them: ' + msg;

return [{ json: { prompt: prompt, from: trigger.from, to: trigger.to } }];
