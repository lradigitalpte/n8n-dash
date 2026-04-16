import { v } from "convex/values";

import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { authComponent } from "./auth";

const conversationStatus = v.union(
  v.literal("active"),
  v.literal("human_takeover"),
);

const HANDOVER_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

function resolveOrgId(rawOrgId?: string): string {
  const fromArg = rawOrgId?.trim();
  if (fromArg) {
    return fromArg;
  }
  return process.env.DEFAULT_LEAD_ORG_ID?.trim() || "org_zumbaton";
}

async function getConversationByOrgPhone(
  ctx: any,
  orgId: string,
  phone: string,
) {
  return await ctx.db
    .query("conversations")
    .withIndex("by_org_phone", (q: any) =>
      q.eq("orgId", orgId).eq("phone", phone),
    )
    .unique();
}

async function getConversationByPhoneFallback(
  ctx: any,
  phone: string,
) {
  const rows = await ctx.db
    .query("conversations")
    .withIndex("by_phone", (q: any) => q.eq("phone", phone))
    .collect();
  if (rows.length === 0) {
    return null;
  }
  return rows.sort((a: any, b: any) => b.lastSeen - a.lastSeen)[0] ?? null;
}

/** Shared with HTTP layer: if `WHATSAPP_BOT_HTTP_SECRET` is unset, routes stay open (dev only). */
export function verifyBotHttpSecret(
  request: Request,
  body?: Record<string, unknown>,
): boolean {
  const expected = process.env.WHATSAPP_BOT_HTTP_SECRET;
  if (!expected) {
    return true;
  }
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("secret");
  const authHeader = request.headers.get("Authorization");
  const fromHeader =
    request.headers.get("x-whatsapp-bot-secret") ??
    (authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : undefined);
  const fromBody =
    body && typeof body.secret === "string" ? body.secret : undefined;
  return (
    fromQuery === expected ||
    fromHeader === expected ||
    fromBody === expected
  );
}

export const getStatus = internalQuery({
  args: { phone: v.string(), orgId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = args.orgId
      ? await getConversationByOrgPhone(ctx, args.orgId, args.phone)
      : await getConversationByPhoneFallback(ctx, args.phone);
    
    if (row?.status === "human_takeover" && row.lastSeen) {
      const elapsed = Date.now() - row.lastSeen;
      if (elapsed > HANDOVER_TIMEOUT_MS) {
        // We don't patch in a query, but we tell n8n to treat it as active
        return { status: "active", wasTimedOut: true };
      }
    }

    return { status: row?.status ?? "active" };
  },
});

export const getHistory = internalQuery({
  args: { phone: v.string(), limit: v.number(), orgId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(1, args.limit), 50);
    const rows = args.orgId
      ? await ctx.db
          .query("chatMessages")
          .withIndex("by_org_phone_time", (q) =>
            q.eq("orgId", args.orgId).eq("phone", args.phone),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("chatMessages")
          .withIndex("by_phone_time", (q) => q.eq("phone", args.phone))
          .order("desc")
          .take(limit);
    const chronological = rows.slice().reverse();
    return {
      messages: chronological.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  },
});

export const saveMessages = internalMutation({
  args: {
    orgId: v.optional(v.string()),
    phone: v.string(),
    userMessage: v.string(),
    botReply: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = resolveOrgId(args.orgId);
    const now = Date.now();
    if (args.userMessage.trim() !== "") {
      await ctx.db.insert("chatMessages", {
        orgId,
        phone: args.phone,
        role: "user",
        content: args.userMessage,
        timestamp: now,
      });
    }
    if (args.botReply.trim() !== "") {
      await ctx.db.insert("chatMessages", {
        orgId,
        phone: args.phone,
        role: "assistant",
        content: args.botReply,
        timestamp: now + 1,
        deliveryStatus: "sent",
      });
    }
    const existing = await getConversationByOrgPhone(ctx, orgId, args.phone);
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: now });
    } else {
      await ctx.db.insert("conversations", {
        orgId,
        phone: args.phone,
        status: "active",
        lastSeen: now,
      });
    }
  },
});

export const setConversationStatus = internalMutation({
  args: {
    orgId: v.optional(v.string()),
    phone: v.string(),
    status: conversationStatus,
  },
  handler: async (ctx, args) => {
    const orgId = resolveOrgId(args.orgId);
    const now = Date.now();
    const existing = await getConversationByOrgPhone(ctx, orgId, args.phone);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        lastSeen: now,
      });
    } else {
      await ctx.db.insert("conversations", {
        orgId,
        phone: args.phone,
        status: args.status,
        lastSeen: now,
      });
    }
  },
});

/** Dashboard / app: clear human takeover so the bot can reply again. */
export const releaseHandover = mutation({
  args: { phone: v.string(), orgId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const orgId = resolveOrgId(args.orgId);
    const existing = await getConversationByOrgPhone(ctx, orgId, args.phone);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        lastSeen: Date.now(),
      });
    }
  },
});
