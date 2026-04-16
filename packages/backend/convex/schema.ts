import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const conversationStatus = v.union(
  v.literal("active"),
  v.literal("human_takeover"),
);

const chatRole = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("agent"),
);

const deliveryStatus = v.union(
  v.literal("queued"),
  v.literal("sent"),
  v.literal("failed"),
);

const outboundStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("sent"),
  v.literal("failed"),
);

export default defineSchema({
  leads: defineTable({
    orgId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
    converted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  /** One row per WhatsApp identity (Twilio `From` / `whatsapp:+...`). */
  conversations: defineTable({
    orgId: v.optional(v.string()),
    phone: v.string(),
    status: conversationStatus,
    lastSeen: v.number(),
    displayName: v.optional(v.string()),
  })
    .index("by_phone", ["phone"])
    .index("by_org_phone", ["orgId", "phone"])
    .index("by_org_lastSeen", ["orgId", "lastSeen"]),

  /** Turn-by-turn chat for the WhatsApp bot (n8n loads recent rows as LLM context). */
  chatMessages: defineTable({
    orgId: v.optional(v.string()),
    phone: v.string(),
    role: chatRole,
    content: v.string(),
    timestamp: v.number(),
    deliveryStatus: v.optional(deliveryStatus),
    outboundId: v.optional(v.id("outboundMessages")),
    twilioMessageSid: v.optional(v.string()),
  })
    .index("by_phone_time", ["phone", "timestamp"])
    .index("by_org_phone_time", ["orgId", "phone", "timestamp"]),

  /** Dashboard-originated outbound queue consumed by n8n/Twilio send workers. */
  outboundMessages: defineTable({
    orgId: v.string(),
    phone: v.string(),
    content: v.string(),
    status: outboundStatus,
    chatMessageId: v.optional(v.id("chatMessages")),
    twilioMessageSid: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_org_createdAt", ["orgId", "createdAt"])
    .index("by_org_phone_createdAt", ["orgId", "phone", "createdAt"]),

  /** Knowledge base chunks for RAG. n8n retrieves relevant chunks to slim the prompt. */
  knowledgeBase: defineTable({
    orgId: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_category", ["orgId", "category"]),

  /** Periodic summaries of long conversations to save tokens in the LLM prompt. */
  conversationSummaries: defineTable({
    orgId: v.optional(v.string()),
    phone: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_phone", ["phone"]),
});
