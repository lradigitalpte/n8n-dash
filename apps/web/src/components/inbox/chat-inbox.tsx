"use client";

import { Building2, ChevronDown, MessageCircle } from "lucide-react";
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

  const setConversationStatus = useCallback((id: string, status: ConversationStatus) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
  }, []);

  /** Outbound messages: text and/or image and/or recorded audio (blob URLs — revoke on delete). */
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
            ? {
                ...c,
                lastMessagePreview: (content || "Media").slice(0, 80),
                lastMessageAt: Date.now(),
                unreadCount: 0,
              }
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
          if (!newLast) {
            return { ...conv, lastMessagePreview: "(no messages)", lastMessageAt: Date.now() };
          }
          return {
            ...conv,
            lastMessagePreview: newLast.content.slice(0, 80),
            lastMessageAt: newLast.createdAt,
          };
        }),
      );
      return { ...prev, [selectedId]: next };
    });
  }, [selectedId]);

  const currentOrg = MOCK_ORGANIZATIONS.find((o) => o.id === orgId);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-muted/40 dark:bg-background">
      {/* WhatsApp Web–style: fixed-width list pane | full-width chat pane (nav lives in sidebar only — no extra top header) */}
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
                      {currentOrg?.name ?? "Workspace"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">WhatsApp</span>
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[min(100vw-2rem,300px)] rounded-lg bg-card p-1">
                {MOCK_ORGANIZATIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.id}
                    className="rounded-md text-sm"
                    onClick={() => setOrgId(o.id)}
                  >
                    {o.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/50 px-1.5 pb-2 pt-1 dark:border-white/10">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-12 text-center text-sm text-muted-foreground">
                <MessageCircle className="size-8 opacity-30" />
                <p>No chats yet</p>
                <p className="text-[11px] opacity-80">Connect Twilio → Convex to populate.</p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60 rounded-md border border-border/50 dark:divide-white/[0.08] dark:border-white/10">
                {filteredConversations.map((c) => {
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
                              {c.status === "ai" ? "AI" : "Human"}
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
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
              <MessageCircle className="size-14 opacity-30" />
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="max-w-sm text-xs">
                Choose a chat from the list to read messages and reply. Data is mock for now —
                Convex will replace this.
              </p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-card/50 px-4 py-3 md:px-6 md:py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground md:size-10 md:text-sm">
                    {initials(selected.displayName)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold md:text-base">{selected.displayName}</h2>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {selected.phone}
                    </p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/80 bg-background/90 px-2 py-1.5 text-[11px] md:gap-2 md:px-2.5 md:text-xs">
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

              <div
                ref={threadRef}
                className="chat-thread-texture min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 md:px-8 md:py-5"
              >
                <div className="flex w-full flex-col gap-3 md:gap-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
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

              <div className="shrink-0 border-t border-border/70 bg-[#e6e9ef] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-border/80 dark:bg-card/60 md:px-6 md:py-3">
                <PromptInputBox
                  value={draft}
                  onValueChange={setDraft}
                  onSend={(message, meta) => {
                    sendOutgoingMessage(message, meta);
                    if (meta?.files?.length) {
                      toast.info("Image queued", {
                        description:
                          "For Twilio WhatsApp, upload to HTTPS storage first then send MediaUrl (see code comment).",
                      });
                    }
                  }}
                  placeholder={
                    selected.status === "human" ? "Type a reply…" : "Type a message…"
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
