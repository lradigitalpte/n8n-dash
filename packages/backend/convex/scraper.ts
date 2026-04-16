import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

/** 
 * Scrape a website and save content to KB.
 * This uses a simple fetch + regex for now. 
 * In production, you'd use a library like Cheerio or a dedicated scraping service.
 */
export const scrapeWebsite = action({
  args: {
    orgId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(args.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        }
      });
      const html = await response.text();

      // 1. Extract Title
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : args.url;

      // 2. Clean HTML (remove scripts, styles, and tags but keep content)
      let cleanText = html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") // Remove scripts
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")   // Remove styles
        .replace(/<[^>]*>/g, " ")                              // Replace all tags with spaces
        .replace(/\s+/g, " ")                                  // Collapse multiple spaces
        .trim();

      // 3. Extract meaningful chunks (sentences/paragraphs)
      // We look for blocks of text that look like real information
      const chunks = cleanText.split(/[.!?]\s+/);
      const meaningfulContent = chunks
        .filter(c => c.length > 30 && c.length < 1000) // Slightly more relaxed filtering
        .slice(0, 20) // Take more chunks
        .join(". ") + ".";

      if (meaningfulContent.length < 30) {
        // Fallback: If still nothing, just take the first 500 chars of cleanText
        const fallback = cleanText.substring(0, 500);
        if (fallback.length > 20) {
           await ctx.runMutation(api.kb.create, {
            orgId: args.orgId,
            title: `Scraped (Raw): ${title.substring(0, 50)}`,
            content: fallback,
            category: "Scraped",
          });
          return { success: true, title, note: "Used raw fallback" };
        }
        throw new Error("The website returned no readable text. It might be a Single Page App (SPA) that requires JavaScript to render, or it might be blocking automated access.");
      }

      // Save to KB
      await ctx.runMutation(api.kb.create, {
        orgId: args.orgId,
        title: `Scraped: ${title.substring(0, 50)}`,
        content: meaningfulContent,
        category: "Scraped",
      });

      return { success: true, title };
    } catch (err: any) {
      console.error("Scrape failed:", err);
      throw new Error(`Scrape failed: ${err.message}`);
    }
  },
});
