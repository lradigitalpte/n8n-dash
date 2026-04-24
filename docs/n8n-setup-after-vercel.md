# Configure n8n after deploying the UI on Vercel

This guide assumes you already deploy **Convex** (backend) and the **Next.js** app (**n8n-wht** `apps/web`) to **Vercel**. The WhatsApp bot runs in **n8n** and talks to **Convex** over HTTPS; the Vercel app is your **dashboard** (leads, inbox) and does **not** receive Twilio webhooks.

## Architecture (short)

| Piece | Role |
|--------|------|
| **Vercel** | Hosts the web UI (sign-in, `/dashboard`, leads). Uses Convex as its database API. |
| **Convex** | Stores `leads`, `conversations`, `chatMessages`. Exposes HTTP routes under `https://<deployment>.<region>.convex.site` for n8n. |
| **n8n** | Runs the workflow (Twilio trigger → LLM → Convex HTTP). Must be reachable by **Twilio** for inbound WhatsApp. |

---

## 1. Deploy and env the Vercel app

1. Connect the repo to Vercel. For this monorepo, set **Root Directory** to `apps/web` (or use a Turborepo-aware preset so `pnpm install` and `pnpm build` run from the repo root with the correct filter—follow Vercel’s monorepo docs if build fails).
2. In **Vercel → Project → Settings → Environment Variables**, set:

   | Variable | Value |
   |----------|--------|
   | `NEXT_PUBLIC_CONVEX_URL` | `https://<your-deployment>.<region>.convex.cloud` (from [Convex Dashboard](https://dashboard.convex.dev) → your deployment → **URL** ending in `.convex.cloud`) |
   | `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://<your-deployment>.<region>.convex.site` (same deployment, **site** URL ending in `.convex.site`) |

3. Redeploy after saving variables.

4. Open your production URL (e.g. `https://your-app.vercel.app`) and confirm the app loads and you can sign in.

---

## 2. Align Convex with your Vercel URL (auth)

Better Auth uses **`SITE_URL`** on the **Convex** deployment. It must match the URL you use in the browser for the app (your Vercel URL), including `https` and no trailing slash issues.

From `packages/backend` (or using the Convex dashboard **Environment Variables**):

```bash
pnpm exec convex env set SITE_URL "https://your-app.vercel.app"
```

So production (e.g. `https://n8n-dash-web.vercel.app`) is the canonical **`SITE_URL`**. Local dev on `http://localhost:3001` will **not** work for sign-in unless you also allow that origin. Set **one** optional Convex env (comma-separated if you need several):

```bash
pnpm exec convex env set ADDITIONAL_TRUSTED_ORIGINS "http://localhost:3001"
```

Redeploy Convex after changing env (`pnpm exec convex deploy`). Remove or narrow `ADDITIONAL_TRUSTED_ORIGINS` if you do not need local dev against this deployment.

Also ensure **`BETTER_AUTH_SECRET`** (32+ characters) is set on Convex if you have not already:

```bash
pnpm exec convex env set BETTER_AUTH_SECRET "<long-random-string>"
```

Redeploy Convex functions if prompted (`pnpm exec convex deploy`).

---

## 3. Convex secrets for the WhatsApp bot HTTP routes

Still on the **Convex** deployment, set:

| Convex env | Purpose |
|------------|---------|
| `WHATSAPP_BOT_HTTP_SECRET` | Shared secret: n8n sends it on every bot HTTP call (`?secret=` / JSON `secret`). **Required in production.** |
| `DEFAULT_LEAD_ORG_ID` | Optional. Defaults to `org_zumbaton` in code; must match how you filter leads in the UI if you use org filters. |

```bash
pnpm exec convex env set WHATSAPP_BOT_HTTP_SECRET "<long-random-string-different-from-auth>"
# optional:
pnpm exec convex env set DEFAULT_LEAD_ORG_ID "org_zumbaton"
```

If `WHATSAPP_BOT_HTTP_SECRET` is **not** set, the HTTP routes stay open (dev-only risk).

---

## 4. Note your Convex **site** base URL for n8n

All workflow HTTP nodes use the **`.convex.site`** host (not `.convex.cloud`).

Example:

`https://fantastic-wolverine-819.eu-west-1.convex.site`

You will paste this into the workflow as the base for:

- `/getStatus`
- `/getHistory`
- `/saveMessages`
- `/setStatus`
- `/ingestLead`
- `/pullOutbound`
- `/markOutbound`

---

## 5. n8n: import the workflow

1. In n8n, **Import** `whatagent-zumbaton-v2.json` (from this repo or your copy).
2. Open the **Normalize Input** node (**Set**). It holds all Convex-related config **in one place** so you do **not** need n8n **Variables** (Enterprise/Cloud) or `$env` — this works on **Community Edition**.

   | Field | What to set |
   |--------|-------------|
   | `convexSiteBase` | Full base URL, e.g. `https://fantastic-wolverine-819.eu-west-1.convex.site` — **no** trailing slash. |
   | `botSecret` | Same string as Convex `WHATSAPP_BOT_HTTP_SECRET`. Leave **empty** only if Convex also has no secret (dev only). |
   | `defaultLeadOrgId` | `org_zumbaton` (or the org id you use in the Vercel leads filter). |

3. Fill placeholders in other nodes (see sticky note in the workflow):

   - `OWNER_PHONE_NUMBER` — owner WhatsApp in E.164, **no** `whatsapp:` prefix.
   - `FROM_EMAIL@yourdomain.com` / `STUDIO_EMAIL@example.com` — **Send Lead Email** (SMTP).
   - Twilio **from** numbers on send nodes — match your Twilio WhatsApp sender.

---

## 6. n8n: environment variables (optional)

If you use **n8n Community Edition** and cannot create **Variables**, you do **not** need this section — the workflow reads **`convexSiteBase`**, **`botSecret`**, and **`defaultLeadOrgId`** from **Normalize Input** (above).

If you **self-host** n8n (Docker, etc.), you can still set environment variables on the process; some workflows use `$env.*` for secrets, but **this** workflow is configured to avoid that.

---

## 7. n8n: credentials

Connect these in n8n **Credentials**:

| Credential | Used for |
|------------|----------|
| **Twilio API** | WhatsApp **Trigger** + all **Send WA** nodes |
| **OpenRouter** | OpenRouter Chat Model |
| **SMTP** | Send Lead Email |
| (No Google Sheets) | Leads go to Convex via **Save Lead to Convex** |

---

## 8. Twilio → n8n (not Vercel)

1. **Activate** the workflow in n8n so the **Twilio WhatsApp Trigger** is listening.
2. Copy the **production webhook URL** n8n shows for that trigger (depends on n8n Cloud vs self-hosted).
3. In [Twilio Console](https://console.twilio.com/) → your WhatsApp sender / sandbox:

   - Set the **incoming message webhook** (and status callback if required) to that **n8n** URL.

Twilio must call **n8n**. Your Vercel URL is only for humans using the dashboard.

**n8n Cloud:** use the HTTPS webhook URL n8n provides (often under the trigger node).

**Self-hosted n8n:** use a public URL (reverse proxy + TLS) pointing to your instance; same idea.

---

## 9. Smoke test

1. Send a WhatsApp message to your Twilio-connected number.
2. In n8n **Executions**, confirm the run succeeds.
3. In **Convex Dashboard → Data**, check `chatMessages` / `conversations` update.
4. Trigger a **lead** (per your prompt rules) and confirm **`leads`** gets a row and **`POST /ingestLead`** returns 200.
5. On **Vercel**, open **`/dashboard/leads`** signed in — confirm the new lead appears (filter by org if you use `DEFAULT_LEAD_ORG_ID` / `org_zumbaton`).

6. If you want human replies sent from the dashboard inbox, import `whatagent-zumbaton-outbound-bridge.json` in n8n and activate it. This worker polls Convex outbound queue rows (`/pullOutbound`), sends via Twilio, then marks delivery back to Convex (`/markOutbound`).

---

## 10. Troubleshooting

| Issue | What to check |
|--------|----------------|
| `401` from Convex HTTP | `WHATSAPP_BOT_HTTP_SECRET` matches in **both** Convex and n8n; query/body `secret` present in workflow. |
| UI works but no Convex data in n8n | URLs use **`.convex.site`**, not `.convex.cloud`. |
| Auth errors on Vercel | `SITE_URL` on Convex equals your **exact** Vercel URL; redeploy after changing. |
| Twilio hits n8n but nothing runs | Workflow **active**; trigger credential correct; webhook URL is the **production** URL n8n expects. |

---

## Quick reference URLs

- **Browser / Next.js:** `NEXT_PUBLIC_CONVEX_URL` → `*.convex.cloud`
- **n8n HTTP actions:** base → `https://<deployment>.<region>.convex.site`
- **Dashboard (users):** `https://<your-project>.vercel.app`
