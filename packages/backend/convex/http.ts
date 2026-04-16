import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { verifyBotHttpSecret } from "./whatsappBot";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

http.route({
  path: "/getStatus",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!verifyBotHttpSecret(request)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");
    const orgId = url.searchParams.get("orgId")?.trim() || undefined;
    if (!phone || phone.trim() === "") {
      return json({ error: "missing_phone" }, 400);
    }
    const result = await ctx.runQuery(internal.whatsappBot.getStatus, {
      phone: phone.trim(),
      orgId,
    });

    // If it timed out, we should actually update the status to active
    if ((result as any).wasTimedOut) {
      await ctx.runMutation(internal.whatsappBot.setConversationStatus, {
        phone: phone.trim(),
        orgId,
        status: "active",
      });
    }

    return json(result);
  }),
});

http.route({
  path: "/getHistory",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!verifyBotHttpSecret(request)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");
    const orgId = url.searchParams.get("orgId")?.trim() || undefined;
    if (!phone || phone.trim() === "") {
      return json({ error: "missing_phone" }, 400);
    }
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 8;
    const result = await ctx.runQuery(internal.whatsappBot.getHistory, {
      phone: phone.trim(),
      limit: Number.isFinite(limit) ? limit : 8,
      orgId,
    });
    return json(result);
  }),
});

http.route({
  path: "/saveMessages",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!verifyBotHttpSecret(request, body)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const orgId =
      typeof body.orgId === "string" && body.orgId.trim() !== ""
        ? body.orgId.trim()
        : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const userMessage =
      typeof body.userMessage === "string" ? body.userMessage : "";
    const botReply = typeof body.botReply === "string" ? body.botReply : "";
    if (!phone) {
      return json({ error: "missing_phone" }, 400);
    }
    await ctx.runMutation(internal.whatsappBot.saveMessages, {
      orgId,
      phone,
      userMessage,
      botReply,
    });
    return json({ ok: true });
  }),
});

http.route({
  path: "/setStatus",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!verifyBotHttpSecret(request, body)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const orgId =
      typeof body.orgId === "string" && body.orgId.trim() !== ""
        ? body.orgId.trim()
        : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const status = body.status;
    if (!phone) {
      return json({ error: "missing_phone" }, 400);
    }
    if (status !== "active" && status !== "human_takeover") {
      return json({ error: "invalid_status" }, 400);
    }
    await ctx.runMutation(internal.whatsappBot.setConversationStatus, {
      orgId,
      phone,
      status,
    });
    return json({ ok: true });
  }),
});

http.route({
  path: "/pullOutbound",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!verifyBotHttpSecret(request)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;
    const result = await ctx.runMutation(internal.inbox.claimOutboundMessages, {
      limit: Number.isFinite(limit) ? limit : 10,
    });
    return json(result);
  }),
});

http.route({
  path: "/markOutbound",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!verifyBotHttpSecret(request, body)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const outboundId =
      typeof body.outboundId === "string" ? body.outboundId.trim() : "";
    const status = body.status;
    const twilioMessageSid =
      typeof body.twilioMessageSid === "string"
        ? body.twilioMessageSid.trim()
        : undefined;
    const error =
      typeof body.error === "string" && body.error.trim() !== ""
        ? body.error.trim()
        : undefined;
    if (!outboundId) {
      return json({ error: "missing_outbound_id" }, 400);
    }
    if (status !== "sent" && status !== "failed") {
      return json({ error: "invalid_status" }, 400);
    }
    await ctx.runMutation(internal.inbox.markOutboundMessage, {
      outboundId,
      status,
      twilioMessageSid,
      error,
    });
    return json({ ok: true });
  }),
});

http.route({
  path: "/ingestLead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!verifyBotHttpSecret(request, body)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const orgId =
      typeof body.orgId === "string" && body.orgId.trim() !== ""
        ? body.orgId.trim()
        : (process.env.DEFAULT_LEAD_ORG_ID?.trim() ?? "org_zumbaton");
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim() : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const notes =
      typeof body.notes === "string" && body.notes.trim() !== ""
        ? body.notes.trim()
        : undefined;
    if (name === "" && email === "" && phone === "") {
      return json({ error: "missing_lead_fields" }, 400);
    }
    const leadId = await ctx.runMutation(internal.leads.insertFromBot, {
      orgId,
      name: name === "" ? "Unknown" : name,
      email,
      phone,
      notes,
    });
    return json({ ok: true, leadId });
  }),
});

http.route({
  path: "/searchKB",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!verifyBotHttpSecret(request)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";
    const orgId = url.searchParams.get("orgId")?.trim() || "org_zumbaton";
    const limitRaw = url.searchParams.get("limit");
    const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : 5;
    const limit = Number.isFinite(limitParsed)
      ? Math.min(Math.max(1, limitParsed), 15)
      : 5;
    const result = await ctx.runQuery(internal.kb.search, {
      orgId,
      query,
      limit,
    });
    // Single JSON object so n8n HTTP Request does not split array into multiple items (which broke KB in prompt).
    return json({ chunks: result });
  }),
});

http.route({
  path: "/getSummary",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!verifyBotHttpSecret(request)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");
    if (!phone) {
      return json({ error: "missing_phone" }, 400);
    }
    const result = await ctx.runQuery(internal.summaries.get, {
      phone,
    });
    return json(result);
  }),
});

export default http;
