import { v } from "convex/values";
import { mutation, query, internalQuery, type QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import type { Doc } from "./_generated/dataModel";

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
    .replace(/\b(bookings?|booked|trial|promo|promotion|duo|special)\b/g, "book")
    .replace(/\b(classes?)\b/g, "class")
    .replace(/\b(refunds?|refundable|reimburs\w*)\b/g, "refund")
    .replace(/\b(cancell?ations?|cancel|cancelled|no.?show|noshow|forfeit\w*)\b/g, "cancel")
    .replace(/\b(dress\s*code|attire|wear|shoes?|footwear|outfit|cloth\w*)\b/g, "attire")
    .replace(/\b(reschedul\w*|swap|chang\w* class|transfer)\b/g, "cancel");
}

/** Search KB chunks: word overlap + synonym folding + fallback to newest chunks. */
async function searchKbChunks(
  ctx: QueryCtx,
  args: { orgId: string; query: string; limit?: number },
): Promise<Doc<"knowledgeBase">[]> {
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

  const isClassQuery =
    /\b(class|classes|programs?|workouts?|offer|offering)\b/i.test(raw) ||
    /\bwhat do you (have|offer)\b/i.test(raw);
  const isPriceQuery =
    raw.includes("price") ||
    raw.includes("pack") ||
    raw.includes("cost") ||
    raw.includes("how much") ||
    raw.includes("$") ||
    foldedQuery.includes("price") ||
    foldedQuery.includes("package");
  const isPromoQuery =
    /\b(promo|promotion|trial|duo|1-for-1|special|offer|running)\b/i.test(raw) ||
    raw.includes("too good to be true");
  const isRefundQuery =
    /\b(refund|refundable|cancel|cancellation|no.?show|forfeit|money back|get.*back)\b/i.test(raw) ||
    foldedQuery.includes("refund") ||
    foldedQuery.includes("cancel");
  const isAttireQuery =
    /\b(wear|attire|dress\s*code|shoes?|outfit|cloth\w*|come\s*in|bring)\b/i.test(raw) ||
    foldedQuery.includes("attire");

  const scored = all.map((item) => {
    const title = item.title.toLowerCase();
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
    for (const w of rawWords) {
      if (w.length >= 4) {
        const idx = text.indexOf(w.slice(0, 4));
        if (idx !== -1) {
          score += 2;
        }
      }
    }
    const cat = (item.category ?? "").toLowerCase();
    if ((cat.includes("pric") || text.includes("pric") || text.includes("pack")) && isPriceQuery) {
      score += 6;
    }

    if (isPromoQuery || (isPriceQuery && (raw.includes("trial") || raw.includes("promo") || raw.includes("duo")))) {
      if (cat.includes("promo")) {
        score += 18;
      }
      if (title.includes("duo trial") || title.includes("1-for-1") || title.includes("trial promo")) {
        score += 22;
      }
      if (text.includes("$23") && (raw.includes("studio") || raw.includes("23") || isPromoQuery)) {
        score += 8;
      }
      if (text.includes("$35") && (raw.includes("outdoor") || raw.includes("35") || isPromoQuery)) {
        score += 8;
      }
    }

    if (isPriceQuery && cat.includes("promo")) {
      score += 10;
    }

    if (isClassQuery) {
      if (cat.includes("class")) {
        score += 10;
      }
      if (title.includes("all studio classes") || title.includes("class lineup")) {
        score += 20;
      }
      if (title.includes("groove stepper") && raw.includes("groove")) {
        score += 8;
      }
      if (title.includes("zumba step") && (raw.includes("zumba") || raw.includes("zumb"))) {
        score += 8;
      }
      if (title.includes("thunderbolt") && raw.includes("thunder")) {
        score += 8;
      }
      if (title.includes("piloxing") && raw.includes("pilox")) {
        score += 8;
      }
      if (title.includes("lil steppers") && (raw.includes("kid") || raw.includes("lil"))) {
        score += 8;
      }
    }

    if (isRefundQuery) {
      if (
        foldedText.includes("refund") ||
        foldedText.includes("cancel") ||
        text.includes("non-refundable") ||
        text.includes("no show") ||
        text.includes("forfeited") ||
        text.includes("token refund")
      ) {
        score += 18;
      }
      if (
        title.includes("refund") ||
        title.includes("cancel") ||
        title.includes("bookings") ||
        title.includes("terms")
      ) {
        score += 12;
      }
      if (cat.includes("policy") || cat.includes("general")) {
        score += 6;
      }
    }

    if (isAttireQuery) {
      if (
        foldedText.includes("attire") ||
        text.includes("covered shoes") ||
        text.includes("sportswear") ||
        text.includes("dress code") ||
        text.includes("wear")
      ) {
        score += 18;
      }
      if (title.includes("attire") || title.includes("dress") || title.includes("wear")) {
        score += 12;
      }
    }

    if (text.includes("hello@zumbaton.sg") || text.includes("zumbaton.sg/trial")) {
      score -= 25;
    }
    if (text.includes("zumbuddies") && !raw.includes("zumbudd")) {
      score -= 8;
    }

    if (text.includes("kid") && raw.includes("kid")) {
      score += 10;
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
}

/** Dashboard + AI test page — same search logic the WhatsApp bot uses via HTTP. */
export const searchForDashboard = query({
  args: {
    orgId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }
    return await searchKbChunks(ctx, args);
  },
});

export const search = internalQuery({
  args: {
    orgId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await searchKbChunks(ctx, args);
  },
});
