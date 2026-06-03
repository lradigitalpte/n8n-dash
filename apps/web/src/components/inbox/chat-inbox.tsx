"use client";

import { ArrowLeft, Building2, ChevronDown, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import type { ChatMessage, Conversation, ConversationStatus } from "@/lib/inbox-types";
import {
  formatRelativeTime,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_ORGANIZATIONS,
} from "@/lib/inbox-mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function ChatInbox() {
  const [orgId, setOrgId] = useState(MOCK_ORGANIZATIONS[0]!.id);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messagesByConv, setMessagesByConv] =
    useState<Record<string, ChatMessage[]>>(MOCK_MESSAGES);

  const filteredConversations = useMemo(() => {
    const list = conversations.filter((c) => c.orgId === orgId);
    return list.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }, [conversations, orgId]);

  const [selectedId, setSelectedId] = useState<string | null>(
    filteredConversations[0]?.id ?? null,
  );
  const [showThread, setShowThread] = useState(false);

  useEffect(() => {
    if (filteredConversations.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredConversations.some((c) => c.id === selectedId)) {
      setSelectedId(filteredConversations[0]!.id);
    }
  }, [filteredConversations, orgId, selectedId]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const messages = selectedId ? messagesByConv[selectedId] ?? [] : [];
  const threadRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, selectedId]);

  const onSelectConversation = (id: string) => {
    setSelectedId(id);
    setShowThread(true);
  };

  const setConversationStatus = useCallback((id: string, status: ConversationStatus) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
  }, []);

  const sendOutgoingMessage = useCallback(
    (
      text: string,
      meta?: { files?: File[]; audio?: { blob: Blob; durationSec: number } },
    ) => {
      if (!selectedId || !selected) return;
      const t = text.trim();
      const file = meta?.files?.[0];
      const audio = meta?.audio;

      let audioUrl: string | undefined;
      let imageUrl: string | undefined;
      let content = t;

      if (audio && audio.blob.size > 0) {
        audioUrl = URL.createObjectURL(audio.blob);
        if (!content) content = `🎤 Voice message (${audio.durationSec}s)`;
      }
      if (file?.type.startsWith("image/")) {
        imageUrl = URL.createObjectURL(file);
        if (!content) content = "📷 Image";
      }

      if (!content && !audioUrl && !imageUrl) return;

      const newMsg: ChatMessage = {
        id: `local_${Date.now()}`,
        conversationId: selectedId,
        role: selected.status === "human" ? "agent" : "assistant",
        content: content || " ",
        createdAt: Date.now(),
        audioUrl,
        imageUrl,
      };

      setMessagesByConv((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), newMsg],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, lastMessagePreview: (content || "Media").slice(0, 80), lastMessageAt: Date.now(), unreadCount: 0 }
            : c,
        ),
      );
      setDraft("");
    },
    [selected, selectedId],
  );

  const updateMessage = useCallback(
    (messageId: string, content: string) => {
      if (!selectedId) return;
      setMessagesByConv((prev) => {
        const list = prev[selectedId] ?? [];
        const next = list.map((m) => (m.id === messageId ? { ...m, content } : m));
        const last = next[next.length - 1];
        if (last?.id === messageId) {
          setConversations((cp) =>
            cp.map((conv) =>
              conv.id === selectedId
                ? { ...conv, lastMessagePreview: content.slice(0, 80) }
                : conv,
            ),
          );
        }
        return { ...prev, [selectedId]: next };
      });
    },
    [selectedId],
  );

  const deleteMessage = useCallback((messageId: string) => {
    if (!selectedId) return;
    setMessagesByConv((prev) => {
      const list = prev[selectedId] ?? [];
      const msg = list.find((m) => m.id === messageId);
      if (msg?.audioUrl) URL.revokeObjectURL(msg.audioUrl);
      if (msg?.imageUrl) URL.revokeObjectURL(msg.imageUrl);
      const next = list.filter((m) => m.id !== messageId);
      const newLast = next[next.length - 1];
      setConversations((cp) =>
        cp.map((conv) => {
          if (conv.id !== selectedId) return conv;
          if (!newLast) return { ...conv, lastMessagePreview: "(no messages)", lastMessageAt: Date.now() };
          return { ...conv, lastMessagePreview: newLast.content.slice(0, 80), lastMessageAt: newLast.createdAt };
        }),
      );
      return { ...prev, [selectedId]: next };
    });
  }, [selectedId]);

  const currentOrg = MOCK_ORGANIZATIONS.find((o) => o.id === orgId);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-muted/40 dark:bg-background">
      {/* Top nav bar — always visible full width */}
      <SidebarNav />

      <div className="flex min-h-0 flex-1">
        {/* ── Conversation list ───────────────────────────────────────────── */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-r border-border/60 bg-[#dfe3ea] dark:border-border/50 dark:bg-[#16181d]",
            showThread ? "hidden" : "flex w-full",
            "md:flex md:w-75 md:min-w-65 md:max-w-[320px]",
          )}
        >
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
                      {currentOrg?.name ?? "Workspace"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">WhatsApp</span>
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[min(100vw-2rem,300px)] rounded-xl bg-card p-1">
                {MOCK_ORGANIZATIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.id}
                    className="rounded-lg text-sm"
                    onClick={() => setOrgId(o.id)}
                  >
                    {o.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Conversation list */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-2">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center text-muted-foreground">
                <MessageCircle className="size-10 opacity-30" />
                <p className="text-sm font-medium">No chats yet</p>
                <p className="text-xs opacity-70">Connect Twilio → Convex to populate.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {filteredConversations.map((c) => {
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
                            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
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
                            <span className={cn(
                              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              c.status === "human"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                            )}>
                              {c.status === "ai" ? "AI" : "Human"}
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

        {/* ── Chat thread ─────────────────────────────────────────────────── */}
        <section
          className={cn(
            "relative min-w-0 flex-1 grid grid-rows-[auto_1fr_auto] bg-[#eef0f4] dark:bg-background",
            !showThread ? "hidden md:grid" : "grid",
          )}
        >
          {!selected ? (
            <div className="col-span-full row-span-full flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
              <MessageCircle className="size-14 opacity-25" />
              <p className="text-sm font-semibold">Select a conversation</p>
              <p className="max-w-xs text-xs opacity-70">
                Choose a chat from the list to read messages and reply.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex shrink-0 items-center gap-2 border-b border-border/70 bg-card/70 px-3 py-3 backdrop-blur md:px-5">
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
                  {initials(selected.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold leading-tight">{selected.displayName}</h2>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{selected.phone}</p>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs font-medium">
                  <Checkbox
                    checked={selected.status === "human"}
                    onCheckedChange={(v) =>
                      setConversationStatus(selected.id, v === true ? "human" : "ai")
                    }
                  />
                  <span className="hidden sm:inline">Human takeover</span>
                  <span className="sm:hidden">Takeover</span>
                </label>
              </div>

              {/* Messages */}
              <div
                ref={threadRef}
                className="chat-thread-texture overflow-y-auto overscroll-contain px-3 py-4 md:px-6 md:py-5"
              >
                <div className="flex w-full flex-col gap-2 md:gap-3">
                  {messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No messages yet. Incoming WhatsApp traffic will show here.
                    </p>
                  ) : (
                    messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        onUpdate={updateMessage}
                        onDelete={deleteMessage}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-border/70 bg-[#e6e9ef] px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-border/80 dark:bg-card/60 md:px-5 md:py-3">
                <PromptInputBox
                  value={draft}
                  onValueChange={setDraft}
                  onSend={(message, meta) => {
                    sendOutgoingMessage(message, meta);
                    if (meta?.files?.length) {
                      toast.info("Image queued", {
                        description: "For Twilio WhatsApp, upload to HTTPS storage first then send MediaUrl.",
                      });
                    }
                  }}
                  placeholder={selected.status === "human" ? "Type a reply…" : "Type a message…"}
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
