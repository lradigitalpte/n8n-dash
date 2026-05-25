/** Pure helpers for turning page HTML into focused KB chunks. */

const JUNK_LINE =
  /^(home|about|contact|login|log in|sign up|sign in|book now|menu|privacy policy|terms of service|terms & conditions|cookie policy|accept cookies|follow us|subscribe|read more|learn more|get started|skip to content)$/i;

const JUNK_CONTAINS =
  /(all rights reserved|©\s*\d{4}|powered by|we use cookies|accept all cookies|manage preferences)/i;

const MAX_CHUNK_CHARS = 900;
const MIN_CHUNK_CHARS = 40;

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–");
}

export function extractPageTitle(html: string, fallbackUrl: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) {
    return fallbackUrl;
  }
  return decodeHtmlEntities(match[1].replace(/\s+/g, " ").trim()) || fallbackUrl;
}

function stripInlineTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function isUsefulLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (trimmed.length < 12) {
    return /\$\d|SGD|\d+\s*(mins?|minutes|cal|kcal)/i.test(trimmed);
  }
  if (trimmed.length > 1800) {
    return false;
  }
  if (JUNK_LINE.test(trimmed)) {
    return false;
  }
  if (JUNK_CONTAINS.test(trimmed)) {
    return false;
  }
  // Mostly navigation: many short pipe-separated items
  if ((trimmed.match(/\|/g) ?? []).length >= 3 && trimmed.length < 120) {
    return false;
  }
  return true;
}

/** Turn HTML into clean text lines, keeping headings as section markers. */
export function htmlToLines(html: string): string[] {
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, "");

  cleaned = cleaned
    .replace(/<(h[1-4])[^>]*>/gi, "\n\n§ ")
    .replace(/<\/h[1-4]>/gi, "\n\n")
    .replace(/<\/(p|div|li|tr|td|th|section|article|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const rawLines = decodeHtmlEntities(cleaned)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const line of rawLines) {
    if (!isUsefulLine(line)) {
      continue;
    }
    const key = line.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(line);
  }
  return deduped;
}

export function inferCategory(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path.includes("pric") || path.includes("package")) {
      return "Pricing";
    }
    if (path.includes("schedule") || path.includes("timetable")) {
      return "Schedule";
    }
    if (path.includes("trial") || path.includes("promo")) {
      return "Promotions";
    }
    if (path.includes("class") || path.includes("program")) {
      return "Classes";
    }
    if (path.includes("contact") || path.includes("location")) {
      return "General";
    }
  } catch {
    // ignore invalid URL
  }
  return "General";
}

type KbChunkDraft = {
  title: string;
  content: string;
  category: string;
};

function splitLongText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) {
    return [text];
  }
  const parts: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";
  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > maxLen && current) {
      parts.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts.length > 0 ? parts : [text.slice(0, maxLen)];
}

function chunkTitle(sectionHeading: string | null, pageTitle: string, index: number): string {
  if (sectionHeading) {
    const shortPage = pageTitle.split("|")[0]?.trim() ?? pageTitle;
    return `${sectionHeading}`.slice(0, 80) || `${shortPage} — Section ${index + 1}`;
  }
  const shortPage = pageTitle.split("|")[0]?.trim() ?? pageTitle;
  return `${shortPage} — Section ${index + 1}`.slice(0, 80);
}

/** Group lines into focused KB chunks (one topic/section per chunk when possible). */
export function linesToKbChunks(
  lines: string[],
  pageTitle: string,
  url: string,
  category: string,
): KbChunkDraft[] {
  if (lines.length === 0) {
    return [];
  }

  const sections: { heading: string | null; body: string[] }[] = [];
  let currentHeading: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (currentBody.length === 0) {
      return;
    }
    sections.push({ heading: currentHeading, body: [...currentBody] });
    currentBody = [];
  };

  for (const line of lines) {
    if (line.startsWith("§ ")) {
      flush();
      currentHeading = line.slice(2).trim() || null;
      continue;
    }
    currentBody.push(line);
  }
  flush();

  if (sections.length === 0) {
    sections.push({ heading: null, body: lines });
  }

  const drafts: KbChunkDraft[] = [];
  let index = 0;

  for (const section of sections) {
    let text = section.body.join("\n").trim();
    if (text.length < MIN_CHUNK_CHARS && !section.heading) {
      continue;
    }

    const pieces = splitLongText(text, MAX_CHUNK_CHARS);
    for (const piece of pieces) {
      if (piece.length < MIN_CHUNK_CHARS && !/\$\d|SGD/i.test(piece)) {
        continue;
      }
      drafts.push({
        title: chunkTitle(section.heading, pageTitle, index),
        content: `${piece}\n\nSource: ${url}`,
        category,
      });
      index += 1;
    }
  }

  return drafts;
}

/** Fallback when structured extraction finds almost nothing. */
export function fallbackChunk(
  html: string,
  pageTitle: string,
  url: string,
  category: string,
): KbChunkDraft | null {
  const text = stripInlineTags(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, ""),
  );
  if (text.length < 30) {
    return null;
  }
  const snippet = text.slice(0, MAX_CHUNK_CHARS);
  return {
    title: `${pageTitle.split("|")[0]?.trim() ?? "Page"} — Summary`.slice(0, 80),
    content: `${snippet}\n\nSource: ${url}`,
    category,
  };
}
