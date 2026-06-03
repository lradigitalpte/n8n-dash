"use client";

import { api } from "@n8n-wht/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Building2, ChevronDown, MessageCircle, Pencil, Check, X } from "lucide-react";
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
  const saveDisplayName = useMutation(api.inbox.updateDisplayName);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showThread, setShowThread] = useState(false);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = useMemo(() => {
    if (!conversations || !selectedId) return null;
    return conversations.find((c) => c.id === selectedId) ?? null;
  }, [conversations, selectedId]);

  const messages = useQuery(
    api.inbox.getConversationMessages,
    selectedConversation
      ? { orgId: selectedConversation.orgId, phone: selectedConversation.phone, limit: 200 }
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
    if (orgRows && orgRows.length > 0 && orgId === "all") return;
    if (orgRows && orgRows.length > 0 && !orgRows.some((o) => o.id === orgId)) {
      setOrgId("all");
    }
  }, [orgRows, orgId]);

  // Reset name editing when conversation changes
  useEffect(() => {
    setEditingName(false);
    setNameDraft("");
  }, [selectedId]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, selectedId]);

  const [draft, setDraft] = useState("");

  const orgOptions = orgRows ?? [];
  const currentOrgName =
    orgId === "all"
      ? "All organizations"
      : (orgOptions.find((o) => o.id === orgId)?.name ?? orgId);

  const onSelectConversation = (id: string) => {
    setSelectedId(id);
    setShowThread(true);
  };

  const onToggleHandover = async (human: boolean) => {
    if (!selectedConversation) return;
    try {
      await setHandover({ orgId: selectedConversation.orgId, phone: selectedConversation.phone, human });
      toast.success(human ? "Human takeover enabled" : "AI mode restored");
    } catch {
      toast.error("Could not update handover status");
    }
  };

  const onSaveName = async () => {
    if (!selectedConversation) return;
    const name = nameDraft.trim();
    if (!name || name === selectedConversation.displayName) {
      setEditingName(false);
      return;
    }
    try {
      await saveDisplayName({ orgId: selectedConversation.orgId, phone: selectedConversation.phone, displayName: name });
      toast.success("Name saved");
    } catch {
      toast.error("Could not save name");
    }
    setEditingName(false);
  };

  const onSend = async (
    message: string,
    meta?: { files?: File[]; audio?: { blob: Blob; durationSec: number } },
  ) => {
    if (!selectedConversation) return;
    const content = message.trim();
    if (!content) return;
    if (meta?.files?.length || meta?.audio) {
      toast.info("Text-only sending is enabled for dashboard replies right now.");
    }
    try {
      await queueOutbound({ orgId: selectedConversation.orgId, phone: selectedConversation.phone, content });
      setDraft("");
    } catch {
      toast.error("Could not queue outbound reply");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-muted/40 dark:bg-background">
      <div className="flex min-h-0 flex-1">

        {/* ── Conversation list (includes nav on mobile) ───────────────── */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-r border-border/60 bg-[#dfe3ea] dark:border-border/50 dark:bg-[#16181d]",
            showThread ? "hidden" : "flex w-full",
            "md:flex md:w-75 md:min-w-65 md:max-w-[320px]",
          )}
        >
          {/* Nav lives here — visible on both mobile list view & desktop sidebar */}
          <SidebarNav />

          {/* Org switcher */}
          <div className="shrink-0 border-b border-border/40 px-3 py-3 dark:border-white/10">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-between gap-2 rounded-xl px-3 py-2.5 text-left font-normal hover:bg-black/5 dark:hover:bg-white/10"
                  />
                }
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Building2 className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold leading-tight">
                      {currentOrgName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">WhatsApp</span>
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[min(100vw-2rem,300px)] rounded-xl bg-card p-1">
                <DropdownMenuItem className="rounded-lg text-sm" onClick={() => setOrgId("all")}>
                  All organizations
                </DropdownMenuItem>
                {orgOptions.map((o) => (
                  <DropdownMenuItem key={o.id} className="rounded-lg text-sm" onClick={() => setOrgId(o.id)}>
                    {o.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Conversation list */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-2">
            {!conversations ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center text-muted-foreground">
                <MessageCircle className="size-10 opacity-30" />
                <p className="text-sm font-medium">No chats yet</p>
                <p className="text-xs opacity-70">Inbound WhatsApp messages will appear here.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(c.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors",
                          active
                            ? "bg-white shadow-sm dark:bg-[#252830]"
                            : "hover:bg-white/60 active:bg-white/80 dark:hover:bg-white/5",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {initials(c.displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">{c.displayName}</span>
                            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                              {formatRelativeTime(c.lastMessageAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {c.lastMessagePreview}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                c.status === "human_takeover"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                              )}
                            >
                              {uiStatusLabel(c.status)}
                            </span>
                            {c.unreadCount > 0 && (
                              <span className="flex min-w-5 justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold leading-5 text-white">
                                {c.unreadCount > 9 ? "9+" : c.unreadCount}
                              </span>
                            )}
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

        {/* ── Chat thread (no top nav — maximum space) ─────────────────── */}
        <section
          className={cn(
            "relative min-w-0 flex-1 grid grid-rows-[auto_1fr_auto] bg-[#eef0f4] dark:bg-background",
            !showThread ? "hidden md:grid" : "grid",
          )}
        >
          {!selectedConversation ? (
            <div className="col-span-full row-span-full flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
              <MessageCircle className="size-14 opacity-25" />
              <p className="text-sm font-semibold">Select a conversation</p>
              <p className="max-w-xs text-xs opacity-70">
                Choose a chat from the list to read messages and reply.
              </p>
            </div>
          ) : (
            <>
              {/* ── Chat header ── */}
              <div className="flex items-center gap-2 border-b border-border/70 bg-card/80 px-3 py-3 backdrop-blur">
                {/* Back — mobile only */}
                <button
                  type="button"
                  onClick={() => setShowThread(false)}
                  aria-label="Back to conversations"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10 md:hidden"
                >
                  <ArrowLeft className="size-5" />
                </button>

                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {initials(selectedConversation.displayName)}
                </div>

                {/* Name (tap to edit) */}
                <div className="min-w-0 flex-1">
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={nameInputRef}
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void onSaveName();
                          if (e.key === "Escape") setEditingName(false);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-primary/40 bg-background px-2 py-1 text-sm font-semibold outline-none focus:border-primary"
                        placeholder="Enter name…"
                      />
                      <button
                        type="button"
                        onClick={() => void onSaveName()}
                        className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(selectedConversation.displayName);
                        setEditingName(true);
                      }}
                      className="group flex w-full items-center gap-1.5 text-left"
                    >
                      <h2 className="truncate text-sm font-bold leading-tight">
                        {selectedConversation.displayName}
                      </h2>
                      <Pencil className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-40 group-focus-visible:opacity-40" />
                    </button>
                  )}
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {selectedConversation.phone}
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs font-medium">
                  <Checkbox
                    checked={selectedConversation.status === "human_takeover"}
                    onCheckedChange={(v) => void onToggleHandover(v === true)}
                  />
                  <span className="hidden sm:inline">Human takeover</span>
                  <span className="sm:hidden">Takeover</span>
                </label>
              </div>

              {/* ── Messages ── */}
              <div
                ref={threadRef}
                className="chat-thread-texture overflow-y-auto overscroll-contain px-3 py-4 md:px-6 md:py-5"
              >
                <div className="flex w-full flex-col gap-2 md:gap-3">
                  {!messages ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
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

              {/* ── Composer ── */}
              <div className="border-t border-border/70 bg-[#e6e9ef] px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-border/80 dark:bg-card/60 md:px-5 md:py-3">
                <PromptInputBox
                  value={draft}
                  onValueChange={setDraft}
                  onSend={(message, meta) => void onSend(message, meta)}
                  placeholder={
                    selectedConversation.status === "human_takeover"
                      ? "Type a human reply…"
                      : "Type a message…"
                  }
                  className="border-border/70 bg-background/90 shadow-sm dark:border-border/80 dark:bg-card/90"
                />
                <p className="mt-1 hidden px-1 text-[11px] text-muted-foreground sm:block">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
