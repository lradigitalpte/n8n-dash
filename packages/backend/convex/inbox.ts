import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const outboundStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("sent"),
  v.literal("failed"),
);

function ensureAuthenticated(user: unknown) {
  if (!user) {
    throw new Error("Not authenticated");
  }
}

function phoneToName(phone: string): string {
  const raw = phone.replace(/^whatsapp:/i, "");
  const digits = raw.replace(/[^\d+]/g, "");
  return digits || raw || "Unknown";
}

export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    ensureAuthenticated(user);

    const orgSet = new Set<string>();
    const conversationRows = await ctx.db.query("conversations").collect();
    for (const row of conversationRows) {
      if (row.orgId && row.orgId.trim() !== "") {
        orgSet.add(row.orgId);
      }
    }
    const leadRows = await ctx.db.query("leads").collect();
    for (const row of leadRows) {
      if (row.orgId.trim() !== "") {
        orgSet.add(row.orgId);
      }
    }
    return Array.from(orgSet)
      .sort((a, b) => a.localeCompare(b))
      .map((id) => ({ id, name: id }));
  },
});

export const listConversations = query({
  args: {
    orgId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    ensureAuthenticated(user);

    const limit = Math.min(Math.max(1, args.limit ?? 100), 500);
    const rows = args.orgId
      ? await ctx.db
          .query("conversations")
          .withIndex("by_org_lastSeen", (q) => q.eq("orgId", args.orgId))
          .order("desc")
          .take(limit)
      : await ctx.db.query("conversations").collect();

    const ordered = args.orgId
      ? rows
      : rows.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, limit);

    const items = [];
    for (const c of ordered) {
      const orgId = c.orgId ?? "org_zumbaton";
      // Try by org first, fallback to phone only for legacy
      let latestRows = await ctx.db
        .query("chatMessages")
        .withIndex("by_org_phone_time", (q) =>
          q.eq("orgId", orgId).eq("phone", c.phone),
        )
        .order("desc")
        .take(1);

      if (latestRows.length === 0) {
        latestRows = await ctx.db
          .query("chatMessages")
          .withIndex("by_phone_time", (q) => q.eq("phone", c.phone))
          .order("desc")
          .take(1);
      }
      const preview = latestRows[0]?.content?.trim() || "(no messages)";
      items.push({
        id: c._id,
        orgId,
        phone: c.phone,
        displayName: c.displayName ?? phoneToName(c.phone),
        lastMessagePreview: preview,
        lastMessageAt: latestRows[0]?.timestamp ?? c.lastSeen,
        unreadCount: 0,
        status: c.status,
      });
    }
    return items;
  },
});

export const getConversationMessages = query({
  args: {
    orgId: v.string(),
    phone: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    ensureAuthenticated(user);

    const limit = Math.min(Math.max(1, args.limit ?? 200), 500);
    // Fallback: if orgId is provided but messages might be missing it (unset),
    // we try to fetch by phone and filter in memory to ensure old messages show up.
    const rowsByPhone = await ctx.db
      .query("chatMessages")
      .withIndex("by_phone_time", (q) => q.eq("phone", args.phone))
      .order("desc")
      .take(limit);

    // Filter: keep messages that match the orgId OR have no orgId (legacy)
    const rows = rowsByPhone.filter(m => !m.orgId || m.orgId === args.orgId);

    const chronological = rows.slice().reverse();
    return chronological.map((m) => ({
      id: m._id,
      orgId: m.orgId ?? args.orgId,
      phone: m.phone,
      role: m.role,
      content: m.content,
      createdAt: m.timestamp,
      deliveryStatus: m.deliveryStatus,
    }));
  },
});

export const setHandover = mutation({
  args: {
    orgId: v.string(),
    phone: v.string(),
    human: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    ensureAuthenticated(user);
    const now = Date.now();
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_org_phone", (q) =>
        q.eq("orgId", args.orgId).eq("phone", args.phone),
      )
      .unique();
    const status = args.human ? "human_takeover" : "active";
    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        lastSeen: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("conversations", {
      orgId: args.orgId,
      phone: args.phone,
      status,
      lastSeen: now,
      displayName: phoneToName(args.phone),
    });
  },
});

export const queueOutboundMessage = mutation({
  args: {
    orgId: v.string(),
    phone: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    ensureAuthenticated(user);

    const content = args.content.trim();
    if (content === "") {
      throw new Error("Message content is required");
    }
    const now = Date.now();
    const chatMessageId = await ctx.db.insert("chatMessages", {
      orgId: args.orgId,
      phone: args.phone,
      role: "agent",
      content,
      timestamp: now,
      deliveryStatus: "queued",
    });

    const outboundId = await ctx.db.insert("outboundMessages", {
      orgId: args.orgId,
      phone: args.phone,
      content,
      status: "pending",
      chatMessageId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(chatMessageId, { outboundId });

    const convo = await ctx.db
      .query("conversations")
      .withIndex("by_org_phone", (q) =>
        q.eq("orgId", args.orgId).eq("phone", args.phone),
      )
      .unique();
    if (convo) {
      await ctx.db.patch(convo._id, {
        status: "human_takeover",
        lastSeen: now,
      });
    } else {
      await ctx.db.insert("conversations", {
        orgId: args.orgId,
        phone: args.phone,
        status: "human_takeover",
        lastSeen: now,
        displayName: phoneToName(args.phone),
      });
    }

    return { outboundId, chatMessageId };
  },
});

export const claimOutboundMessages = internalMutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(1, args.limit), 50);
    const rows = await ctx.db
      .query("outboundMessages")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "pending"))
      .take(limit);
    const now = Date.now();
    const items = [];
    for (const row of rows) {
      await ctx.db.patch(row._id, {
        status: "processing",
        updatedAt: now,
      });
      items.push({
        outboundId: row._id,
        orgId: row.orgId,
        phone: row.phone,
        content: row.content,
      });
    }
    return { items };
  },
});

export const markOutboundMessage = internalMutation({
  args: {
    outboundId: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    twilioMessageSid: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const outboundId = ctx.db.normalizeId("outboundMessages", args.outboundId);
    if (!outboundId) {
      throw new Error("Invalid outbound id");
    }
    const row = await ctx.db.get(outboundId);
    if (!row) {
      throw new Error("Outbound message not found");
    }
    const now = Date.now();
    const patch: {
      status: "sent" | "failed";
      updatedAt: number;
      twilioMessageSid?: string;
      error?: string;
    } = {
      status: args.status,
      updatedAt: now,
    };
    if (args.twilioMessageSid && args.twilioMessageSid.trim() !== "") {
      patch.twilioMessageSid = args.twilioMessageSid.trim();
    }
    if (args.error && args.error.trim() !== "") {
      patch.error = args.error.trim();
    }
    await ctx.db.patch(row._id, patch);

    if (row.chatMessageId) {
      await ctx.db.patch(row.chatMessageId, {
        deliveryStatus: args.status === "sent" ? "sent" : "failed",
        twilioMessageSid: patch.twilioMessageSid,
      });
    }
    return { ok: true };
  },
});

export const listOutboundByStatus = query({
  args: {
    status: v.optional(outboundStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    ensureAuthenticated(user);
    const limit = Math.min(Math.max(1, args.limit ?? 50), 200);
    if (!args.status) {
      const rows = await ctx.db.query("outboundMessages").collect();
      return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    }
    return await ctx.db
      .query("outboundMessages")
      .withIndex("by_status_createdAt", (q) => q.eq("status", args.status!))
      .order("desc")
      .take(limit);
  },
});
