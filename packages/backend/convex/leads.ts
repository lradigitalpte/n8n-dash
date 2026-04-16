import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/** n8n → POST /ingestLead (verified by `WHATSAPP_BOT_HTTP_SECRET`). */
export const insertFromBot = internalMutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("leads", {
      orgId: args.orgId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      notes: args.notes,
      converted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }
    if (args.orgId !== undefined) {
      const rows = await ctx.db
        .query("leads")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId!))
        .collect();
      return rows.sort((a, b) => b.createdAt - a.createdAt);
    }
    const rows = await ctx.db.query("leads").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const setConverted = mutation({
  args: {
    leadId: v.id("leads"),
    converted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }
    await ctx.db.patch(args.leadId, {
      converted: args.converted,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    leadId: v.id("leads"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }
    await ctx.db.patch(args.leadId, {
      name: args.name,
      email: args.email,
      phone: args.phone,
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }
    await ctx.db.delete(args.leadId);
  },
});

/** Called from the dashboard (signed-in) or from n8n/AI if `ingestSecret` matches Convex env `LEAD_INGEST_SECRET`. */
export const create = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
    ingestSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const secret = process.env.LEAD_INGEST_SECRET;
    const secretOk =
      secret !== undefined && secret !== "" && args.ingestSecret === secret;
    if (!user && !secretOk) {
      throw new Error("Unauthorized");
    }
    const now = Date.now();
    return await ctx.db.insert("leads", {
      orgId: args.orgId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      notes: args.notes,
      converted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
