"use client";

import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { Mic, Paperclip, Send, Smile } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default),
  { ssr: false },
);

type ChatComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  sendDisabled: boolean;
};

export default function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  onKeyDown,
  placeholder,
  sendDisabled,
}: ChatComposerProps) {
  const { resolvedTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const onEmojiSelect = useCallback(
    (emoji: string) => {
      onDraftChange(draft + emoji);
      setEmojiOpen(false);
    },
    [draft, onDraftChange],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    toast.info(`Selected “${file.name}” (${(file.size / 1024).toFixed(1)} KB)`, {
      description: "Wire an upload API (e.g. presigned S3) to attach files.",
    });
  };

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
  }, []);

  const toggleRecording = async () => {
    if (recording) {
      stopRecording();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          toast.success(`Voice note recorded (${(blob.size / 1024).toFixed(1)} KB)`, {
            description: "Upload the blob to S3 (presigned URL) or Convex file storage.",
          });
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);
      };
      mr.start(200);
      mediaRecorderRef.current = mr;
      setRecording(true);
      toast.message("Recording… tap mic again to stop");
    } catch {
      toast.error("Could not access microphone.");
    }
  };

  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const emojiTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  return (
    <div className="shrink-0 border-t border-border/80 bg-card/60 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:p-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf,audio/*,.doc,.docx"
        onChange={onFileChange}
      />
      <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-background p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring/30">
        <Textarea
          placeholder={placeholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          className="max-h-32 min-h-[2.75rem] w-full resize-none rounded-lg border-0 bg-transparent px-2 py-2 text-sm leading-normal shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-1 border-t border-border/40 pt-1">
          <div className="flex items-center gap-0.5">
            <DropdownMenu open={emojiOpen} onOpenChange={setEmojiOpen}>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-lg text-muted-foreground"
                    aria-label="Emoji"
                  />
                }
              >
                <Smile className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-auto border border-border/60 bg-popover p-0 shadow-md"
              >
                <div data-emoji-picker className="overflow-hidden rounded-md" onPointerDown={(e) => e.stopPropagation()}>
                  <EmojiPicker
                    theme={emojiTheme}
                    onEmojiClick={(data) => onEmojiSelect(data.emoji)}
                    width={320}
                    height={380}
                    skinTonesDisabled
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-lg text-muted-foreground"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>

            <Button
              type="button"
              variant={recording ? "secondary" : "ghost"}
              size="icon-sm"
              className={cn("size-8 rounded-lg", recording && "text-destructive")}
              aria-label={recording ? "Stop recording" : "Record voice"}
              onClick={() => void toggleRecording()}
            >
              <Mic className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0 rounded-lg"
            onClick={onSend}
            disabled={sendDisabled}
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
      <p className="mt-1 hidden px-1 text-[10px] text-muted-foreground sm:block">
        Enter to send · Shift+Enter new line · Attachments & voice upload to S3 next
      </p>
    </div>
  );
}
