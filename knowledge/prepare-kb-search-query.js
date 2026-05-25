// Paste into n8n → new Code node named "Prepare KB Search Query"
// Wire: Load History from Convex → this node → Search KB from Convex

var trigger = $('Normalize Input').item.json;
var msg = (trigger.body || '').trim();
var histData = $input.item.json;
var messages = (histData && Array.isArray(histData.messages)) ? histData.messages : [];

var parts = [];
var userMsgs = messages.filter(function (m) {
  return m.role === 'user';
}).slice(-4);

userMsgs.forEach(function (m) {
  if (m.content) {
    parts.push(m.content);
  }
});
if (msg) {
  parts.push(msg);
}

var searchQuery = parts.join(' ').trim();

// Vague follow-ups like "how much is it?" — add context from earlier messages
var vaguePrice = /^(how much( is it)?|what'?s the price|price\??|pricing|cost)[\s?!.]*$/i.test(msg);
if (vaguePrice && userMsgs.length > 0) {
  searchQuery = (searchQuery + ' promotion trial duo pricing 1-for-1').trim();
}

if (searchQuery.length === 0) {
  searchQuery = 'classes schedule pricing promotion trial duo';
}

return [{ json: { searchQuery: searchQuery.substring(0, 500) } }];
