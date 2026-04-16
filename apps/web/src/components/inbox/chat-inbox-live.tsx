"use client";

import { api } from "@n8n-wht/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Building2, ChevronDown, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import SidebarNav from "@/components/dashboard/sidebar-nav";
import { MessageBubble } from "@/components/inbox/message-bubble";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime, uiStatusLabel } from "@/lib/inbox-utils";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function ChatInboxLive() {
  const orgRows = useQuery(api.inbox.listOrganizations, {});
  const [orgId, setOrgId] = useState<string | "all">("all");
  const conversations = useQuery(api.inbox.listConversations, {
    orgId: orgId === "all" ? undefined : orgId,
    limit: 200,
  });

  const setHandover = useMutation(api.inbox.setHandover);
  const queueOutbound = useMutation(api.inbox.queueOutboundMessage);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedConversation = useMemo(() => {
    if (!conversations || !selectedId) {
      return null;
    }
    return conversations.find((c) => c.id === selectedId) ?? null;
  }, [conversations, selectedId]);

  const messages = useQuery(
    api.inbox.getConversationMessages,
    selectedConversation
      ? {
          orgId: selectedConversation.orgId,
          phone: selectedConversation.phone,
          limit: 200,
        }
      : "skip",
  );

  useEffect(() => {
    if (!conversations || conversations.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !conversations.some((c) => c.id === selectedId)) {
      setSelectedId(conversations[0]!.id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    if (orgRows && orgRows.length > 0 && orgId === "all") {
      return;
    }
    if (orgRows && orgRows.length > 0 && !orgRows.some((o) => o.id === orgId)) {
      setOrgId("all");
    }
  }, [orgRows, orgId]);

  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, selectedId]);

  const [draft, setDraft] = useState("");

  const orgOptions = orgRows ?? [];
  const currentOrgName =
    orgId === "all" ? "All organizations" : (orgOptions.find((o) => o.id === orgId)?.name ?? orgId);

  const onToggleHandover = async (human: boolean) => {
    if (!selectedConversation) {
      return;
    }
    try {
      await setHandover({
        orgId: selectedConversation.orgId,
        phone: selectedConversation.phone,
        human,
      });
      toast.success(human ? "Human takeover enabled" : "AI mode restored");
    } catch {
      toast.error("Could not update handover status");
    }
  };

  const onSend = async (
    message: string,
    meta?: { files?: File[]; audio?: { blob: Blob; durationSec: number } },
  ) => {
    if (!selectedConversation) {
      return;
    }
    const content = message.trim();
    if (!content) {
      return;
    }
    if (meta?.files?.length || meta?.audio) {
      toast.info("Text-only sending is enabled for dashboard replies right now.");
    }
    try {
      await queueOutbound({
        orgId: selectedConversation.orgId,
        phone: selectedConversation.phone,
        content,
      });
      setDraft("");
    } catch {
      toast.error("Could not queue outbound reply");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-muted/40 dark:bg-background">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex max-h-[38vh] min-h-0 w-full shrink-0 flex-col border-b border-border/60 bg-[#dfe3ea] dark:border-border/50 dark:bg-[#16181d] md:max-h-none md:h-full md:w-[252px] md:min-w-[240px] md:max-w-[272px] md:border-b-0 md:border-r">
          <SidebarNav />
          <div className="shrink-0 px-2.5 pb-2 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-between gap-2 rounded-lg px-2 py-1.5 text-left font-normal hover:bg-black/5 dark:hover:bg-white/10"
                  />
                }
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Building2 className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium leading-tight">
                      {currentOrgName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">WhatsApp</span>
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[min(100vw-2rem,300px)] rounded-lg bg-card p-1">
                <DropdownMenuItem className="rounded-md text-sm" onClick={() => setOrgId("all")}>
                  All organizations
                </DropdownMenuItem>
                {orgOptions.map((o) => (
                  <DropdownMenuItem key={o.id} className="rounded-md text-sm" onClick={() => setOrgId(o.id)}>
                    {o.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/50 px-1.5 pb-2 pt-1 dark:border-white/10">
            {!conversations ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">Loading conversations…</div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-12 text-center text-sm text-muted-foreground">
                <MessageCircle className="size-8 opacity-30" />
                <p>No chats yet</p>
                <p className="text-[11px] opacity-80">Inbound messages from n8n/Convex will appear here.</p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60 rounded-md border border-border/50 dark:divide-white/[0.08] dark:border-white/10">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          "flex w-full gap-2 px-2 py-2 text-left transition-colors first:rounded-t-md last:rounded-b-md",
                          active
                            ? "bg-white/95 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:bg-[#252830] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                            : "hover:bg-white/70 dark:hover:bg-white/[0.06]",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                            active ? "bg-primary/90 text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {initials(c.displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-medium leading-none">{c.displayName}</span>
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                              {formatRelativeTime(c.lastMessageAt)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                            {c.lastMessagePreview}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-muted-foreground/90">
                              {uiStatusLabel(c.status)}
                            </span>
                            {c.unreadCount > 0 ? (
                              <span className="flex min-w-[1.125rem] justify-center rounded-full bg-emerald-600/90 px-1 text-[10px] font-medium leading-4 text-white">
                                {c.unreadCount > 9 ? "9+" : c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#eef0f4] dark:bg-background">
          {!selectedConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
              <MessageCircle className="size-14 opacity-30" />
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="max-w-sm text-xs">Choose a chat from the list to read messages and reply.</p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-card/50 px-4 py-3 md:px-6 md:py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground md:size-10 md:text-sm">
                    {initials(selectedConversation.displayName)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold md:text-base">{selectedConversation.displayName}</h2>
                    <p className="truncate font-mono text-xs text-muted-foreground">{selectedConversation.phone}</p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/80 bg-background/90 px-2 py-1.5 text-[11px] md:gap-2 md:px-2.5 md:text-xs">
                  <Checkbox
                    checked={selectedConversation.status === "human_takeover"}
                    onCheckedChange={(v) => {
                      void onToggleHandover(v === true);
                    }}
                  />
                  <span className="hidden sm:inline">Human takeover</span>
                  <span className="sm:hidden">Takeover</span>
                </label>
              </div>

              <div
                ref={threadRef}
                className="chat-thread-texture min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 md:px-8 md:py-5"
              >
                <div className="flex w-full flex-col gap-3 md:gap-4">
                  {!messages ? (
                    <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
                  ) : (
                    messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={{
                          id: m.id,
                          role: m.role,
                          content: m.content,
                          createdAt: m.createdAt,
                          deliveryStatus: m.deliveryStatus,
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-border/70 bg-[#e6e9ef] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-border/80 dark:bg-card/60 md:px-6 md:py-3">
                <PromptInputBox
                  value={draft}
                  onValueChange={setDraft}
                  onSend={(message, meta) => {
                    void onSend(message, meta);
                  }}
                  placeholder={
                    selectedConversation.status === "human_takeover" ? "Type a human reply…" : "Type a message…"
                  }
                  className="border-border/70 bg-background/90 text-sm shadow-sm dark:border-border/80 dark:bg-card/90"
                />
                <p className="mt-0.5 hidden px-1 text-[10px] text-muted-foreground sm:block">
                  Enter to send · Shift+Enter for a new line
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
