import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  extractPageTitle,
  fallbackChunk,
  htmlToLines,
  inferCategory,
  linesToKbChunks,
} from "./scraperExtract";

const MAX_CHUNKS_PER_SCRAPE = 25;

/**
 * Scrape a website page and save multiple focused KB chunks (not one messy blob).
 */
export const scrapeWebsite = action({
  args: {
    orgId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const url = args.url.trim();
    if (!url) {
      throw new Error("Please enter a URL.");
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!response.ok) {
        throw new Error(`Website returned HTTP ${response.status}`);
      }

      const html = await response.text();
      const pageTitle = extractPageTitle(html, url);
      const category = inferCategory(url);

      const lines = htmlToLines(html);
      let chunks = linesToKbChunks(lines, pageTitle, url, category);

      if (chunks.length === 0) {
        const fallback = fallbackChunk(html, pageTitle, url, category);
        if (!fallback) {
          throw new Error(
            "No readable text found. The site may need JavaScript to render, or it blocked automated access.",
          );
        }
        chunks = [fallback];
      }

      if (chunks.length > MAX_CHUNKS_PER_SCRAPE) {
        chunks = chunks.slice(0, MAX_CHUNKS_PER_SCRAPE);
      }

      for (const chunk of chunks) {
        await ctx.runMutation(api.kb.create, {
          orgId: args.orgId,
          title: chunk.title,
          content: chunk.content,
          category: chunk.category,
        });
      }

      return {
        success: true,
        title: pageTitle,
        chunksCreated: chunks.length,
        category,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown scrape error";
      console.error("Scrape failed:", err);
      throw new Error(`Scrape failed: ${message}`);
    }
  },
});
