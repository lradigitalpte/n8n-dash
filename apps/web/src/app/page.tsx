"use client";

import Link from "next/link";

import { api } from "@n8n-wht/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  const healthCheck = useQuery(api.healthCheck.get);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">n8n-wht</h1>
        <p className="text-muted-foreground">
          WhatsApp automation and agent inbox. Open the dashboard to manage conversations.
        </p>
        <Link
          href="/dashboard"
          className={buttonVariants({ className: "mt-4 inline-flex rounded-xl" })}
        >
          Open inbox
        </Link>
      </div>

      <section className="rounded-xl border border-border/80 bg-card/50 p-4">
        <h2 className="mb-3 text-sm font-medium">API status</h2>
        <div className="flex items-center gap-2">
          <div
            className={`size-2 rounded-full ${healthCheck === "OK" ? "bg-emerald-500" : healthCheck === undefined ? "bg-amber-400" : "bg-red-500"}`}
          />
          <span className="text-sm text-muted-foreground">
            {healthCheck === undefined
              ? "Checking…"
              : healthCheck === "OK"
                ? "Connected"
                : "Error"}
          </span>
        </div>
      </section>
    </div>
  );
}
