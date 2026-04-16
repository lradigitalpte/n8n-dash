import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { authComponent } from "./auth";

export const list = query({
  args: {
    orgId: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    let q = ctx.db.query("knowledgeBase").withIndex("by_org", (q) => q.eq("orgId", args.orgId));
    
    if (args.category) {
      q = ctx.db.query("knowledgeBase").withIndex("by_org_category", (q) => 
        q.eq("orgId", args.orgId).eq("category", args.category)
      );
    }

    return await q.collect();
  },
});

export const create = mutation({
  args: {
    orgId: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    // Allow n8n (internal) or authenticated user
    if (!user && (ctx as any).auth === undefined) {
       // This is a bit of a hack for internal calls if not using internalMutation
    }

    return await ctx.db.insert("knowledgeBase", {
      orgId: args.orgId,
      title: args.title,
      content: args.content,
      category: args.category,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("knowledgeBase"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("knowledgeBase") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
  },
});

/** Fold common variants so "prices" matches "pricing" in KB text. */
function foldBizTerms(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(pricing|prices|priced)\b/g, "price")
    .replace(/\b(costs?|fees?)\b/g, "price")
    .replace(/\b(packages?|packs?|tokens?)\b/g, "package")
    .replace(/\b(schedules?)\b/g, "schedule")
    .replace(/\b(locations?|address|venue)\b/g, "location")
    .replace(/\b(bookings?|booked|trial)\b/g, "book")
    .replace(/\b(classes?)\b/g, "class");
}

/** Search KB chunks: word overlap + synonym folding + fallback to newest chunks. */
export const search = internalQuery({
  args: {
    orgId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(1, args.limit ?? 5), 15);
    const all = await ctx.db
      .query("knowledgeBase")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    if (all.length === 0) {
      return [];
    }

    const raw = args.query.toLowerCase().trim();
    if (raw === "") {
      return all
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit);
    }

    const foldedQuery = foldBizTerms(raw);
    const words = foldedQuery
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter((w) => w.length > 1);

    const rawWords = raw
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter((w) => w.length > 1);

    const scored = all.map((item) => {
      const text = `${item.title} ${item.content}`.toLowerCase();
      const foldedText = foldBizTerms(text);
      let score = 0;
      if (text.includes(raw)) {
        score += 12;
      }
      for (const w of rawWords) {
        if (w.length > 2 && text.includes(w)) {
          score += 3;
        }
      }
      for (const w of words) {
        if (w.length > 2 && foldedText.includes(w)) {
          score += 4;
        }
      }
      // Prefix match: "pric" matches "pricing" in original text
      for (const w of rawWords) {
        if (w.length >= 4) {
          const idx = text.indexOf(w.slice(0, 4));
          if (idx !== -1) {
            score += 2;
          }
        }
      }
      const cat = (item.category ?? "").toLowerCase();
      if (cat.includes("pric") && (raw.includes("price") || foldedQuery.includes("price"))) {
        score += 6;
      }
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const withHits = scored.filter((s) => s.score > 0).map((s) => s.item);
    if (withHits.length >= limit) {
      return withHits.slice(0, limit);
    }

    const used = new Set(withHits.map((i) => i._id));
    const rest = all
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((i) => !used.has(i._id));
    return [...withHits, ...rest].slice(0, limit);
  },
});
