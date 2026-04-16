"use client";

import { Pencil, Trash2, Check, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/inbox-types";
import { formatRelativeTime } from "@/lib/inbox-utils";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: ChatMessage;
  onUpdate?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
};

export function MessageBubble({ message, onUpdate, onDelete }: MessageBubbleProps) {
  const isInbound = message.role === "user";
  /** Only messages you sent (agent/AI) can be edited or deleted — not customer messages. */
  const canEditOrDelete = message.role !== "user" && !!onUpdate && !!onDelete;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  useEffect(() => {
    setDraft(message.content);
  }, [message.content, message.id]);

  const saveEdit = () => {
    const next = draft.trim();
    if (next !== message.content) onUpdate?.(message.id, next);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(message.content);
    setEditing(false);
  };

  return (
    <div className={cn("group flex w-full", isInbound ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "relative max-w-[min(85%,20rem)] rounded-lg px-2.5 py-1.5 text-sm leading-snug shadow-sm md:px-3 md:py-2",
          isInbound
            ? "rounded-tl-md bg-muted text-foreground"
            : "rounded-tr-md bg-emerald-600 text-white dark:bg-emerald-700",
        )}
      >
        {!isInbound && !editing && (
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-100/90">
            {message.role === "agent" ? "Agent" : "AI"}
          </p>
        )}

        {message.imageUrl ? (
          <div className="mb-1 overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.imageUrl} alt="" className="max-h-48 w-full object-cover" />
          </div>
        ) : null}

        {message.audioUrl ? (
          <audio
            src={message.audioUrl}
            controls
            className={cn(
              "mb-1 mt-0.5 h-9 w-full min-w-[200px] max-w-full",
              !isInbound && "[&::-webkit-media-controls-panel]:bg-emerald-800/90",
            )}
            preload="metadata"
          />
        ) : null}

        {editing ? (
          <div className="space-y-1.5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className={cn(
                "min-h-[4rem] resize-y text-sm",
                !isInbound && "border-emerald-500/50 bg-emerald-800/40 text-white placeholder:text-emerald-200/60",
              )}
            />
            <div className="flex justify-end gap-1">
              <Button type="button" size="icon-sm" variant="ghost" className="size-7" onClick={cancelEdit}>
                <X className="size-3.5" />
              </Button>
              <Button type="button" size="icon-sm" className="size-7" onClick={saveEdit}>
                <Check className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : message.content.trim() ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}

        <p
          className={cn(
            "mt-1 text-[10px] tabular-nums opacity-80",
            isInbound ? "text-muted-foreground" : "text-emerald-100/85",
          )}
        >
          {formatRelativeTime(message.createdAt)}
        </p>

        {canEditOrDelete && !editing && (
          <div
            className={cn(
              "absolute -right-1 -top-1 flex gap-0.5 rounded-md border border-border/60 bg-background/95 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-card",
            )}
          >
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7"
              aria-label="Edit message"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7 text-destructive hover:text-destructive"
              aria-label="Delete message"
              onClick={() => {
                if (typeof window !== "undefined" && !window.confirm("Delete this message?")) return;
                onDelete?.(message.id);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
