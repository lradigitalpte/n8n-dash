import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { authComponent } from "./auth";

export const get = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversationSummaries")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
  },
});

export const update = mutation({
  args: {
    orgId: v.optional(v.string()),
    phone: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // n8n or dashboard can update this.
    // If n8n calls this, it might not have user auth, 
    // but for now we assume dashboard/internal access.
    
    const existing = await ctx.db
      .query("conversationSummaries")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("conversationSummaries", {
        orgId: args.orgId,
        phone: args.phone,
        content: args.content,
        updatedAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversationSummaries")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
