"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { ArrowUp, Mic, Paperclip, Smile, Square, StopCircle, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default),
  { ssr: false },
);

/* -------------------------------------------------------------------------- */
/* Radix: Tooltip                                                             */
/* -------------------------------------------------------------------------- */

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/* -------------------------------------------------------------------------- */
/* Radix: Dialog                                                              */
/* -------------------------------------------------------------------------- */

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-border bg-card p-0 shadow-xl duration-300 md:max-w-[800px]",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-muted/80 p-2 transition-colors hover:bg-muted">
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/* -------------------------------------------------------------------------- */
/* Primitives (scoped names — avoid clashing with shadcn Button/Textarea)    */
/* -------------------------------------------------------------------------- */

const PromptBoxTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={1}
    className={cn(
      "ai-prompt-scroll flex min-h-[36px] w-full resize-none rounded-md border-0 bg-transparent px-2 py-1.5 text-sm leading-snug text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
PromptBoxTextarea.displayName = "PromptBoxTextarea";

type PromptBoxButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

const PromptBoxButton = React.forwardRef<HTMLButtonElement, PromptBoxButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border border-border bg-transparent hover:bg-muted",
      ghost: "bg-transparent hover:bg-muted",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-7 w-7 shrink-0 rounded-full",
    };
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
PromptBoxButton.displayName = "PromptBoxButton";

/* -------------------------------------------------------------------------- */
/* VoiceRecorder                                                              */
/* -------------------------------------------------------------------------- */

function VoiceRecorderPanel({
  isRecording,
  seconds,
  visualizerBars = 16,
}: {
  isRecording: boolean;
  seconds: number;
  visualizerBars?: number;
}) {
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isRecording) return null;

  return (
    <div className="flex w-full flex-col items-center justify-center py-2">
      <div className="mb-2 flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        <span className="font-mono text-xs text-foreground/80">{formatTime(seconds)}</span>
      </div>
      <div className="flex h-8 w-full items-center justify-center gap-0.5 px-3">
        {Array.from({ length: visualizerBars }).map((_, i) => (
          <div
            key={i}
            className="w-0.5 animate-pulse rounded-full bg-foreground/40"
            style={{
              height: `${Math.max(15, Math.random() * 100)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Image dialog                                                               */
/* -------------------------------------------------------------------------- */

function ImageViewDialog({
  imageUrl,
  onClose,
}: {
  imageUrl: string | null;
  onClose: () => void;
}) {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:max-w-[800px]">
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl bg-card shadow-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-[80vh] w-full rounded-2xl object-contain"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Prompt context                                                             */
/* -------------------------------------------------------------------------- */

interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}

const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});

function usePromptInput() {
  return React.useContext(PromptInputContext);
}

const PromptInput = React.forwardRef<
  HTMLDivElement,
  {
    isLoading?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
    maxHeight?: number | string;
    onSubmit?: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
  }
>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(value ?? "");
    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };
    const controlled = value !== undefined;
    return (
      <TooltipProvider delayDuration={200}>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: controlled ? value : internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled,
          }}
        >
          <div
            ref={ref}
            className={cn(
              "rounded-2xl border border-border/80 bg-card p-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] transition-all duration-300 dark:shadow-[0_6px_24px_rgba(0,0,0,0.35)]",
              isLoading && "border-destructive/50",
              className,
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  },
);
PromptInput.displayName = "PromptInput";

const PromptInputTextarea = ({
  className,
  onKeyDown,
  disableAutosize = false,
  placeholder,
  ...props
}: React.ComponentProps<typeof PromptBoxTextarea> & {
  disableAutosize?: boolean;
  placeholder?: string;
}) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (disableAutosize || !el) return;
    el.style.height = "auto";
    el.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(el.scrollHeight, maxHeight)}px`
        : `min(${el.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };

  return (
    <PromptBoxTextarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
};

const PromptInputActions = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-1.5", className)} {...props}>
    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/* PromptInputBox                                                             */
/* -------------------------------------------------------------------------- */

/** Extra payload when sending (Twilio needs uploaded HTTPS URLs for production media). */
export type PromptSendMeta = {
  files?: File[];
  audio?: { blob: Blob; durationSec: number };
};

export type PromptInputBoxProps = {
  onSend?: (message: string, meta?: PromptSendMeta) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  /** Controlled input (optional) */
  value?: string;
  onValueChange?: (value: string) => void;
};

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  function PromptInputBox(
    {
      onSend = () => {},
      isLoading = false,
      placeholder = "Type your message here...",
      className,
      value: valueProp,
      onValueChange,
    },
    ref,
  ) {
    const [internal, setInternal] = React.useState("");
    const input = valueProp !== undefined ? valueProp : internal;
    const setInput = onValueChange ?? setInternal;
    const inputLatestRef = React.useRef(input);
    inputLatestRef.current = input;

    const [files, setFiles] = React.useState<File[]>([]);
    const [filePreviews, setFilePreviews] = React.useState<Record<string, string>>({});
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
    const [isRecording, setIsRecording] = React.useState(false);
    const [emojiOpen, setEmojiOpen] = React.useState(false);
    const uploadInputRef = React.useRef<HTMLInputElement>(null);
    const innerRef = React.useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();
    const recordingSecRef = React.useRef(0);
    const durationAtStopRef = React.useRef(0);
    const [recordingSecDisplay, setRecordingSecDisplay] = React.useState(0);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const mediaStreamRef = React.useRef<MediaStream | null>(null);
    const audioChunksRef = React.useRef<Blob[]>([]);

    React.useEffect(() => {
      if (!isRecording) {
        recordingSecRef.current = 0;
        setRecordingSecDisplay(0);
        return;
      }
      recordingSecRef.current = 0;
      setRecordingSecDisplay(0);
      const id = window.setInterval(() => {
        recordingSecRef.current += 1;
        setRecordingSecDisplay((n) => n + 1);
      }, 1000);
      return () => window.clearInterval(id);
    }, [isRecording]);

    React.useEffect(() => {
      return () => {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== "inactive") mr.stop();
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      };
    }, []);
    const mergedRef = (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const isImageFile = (file: File) => file.type.startsWith("image/");

    const processFile = (file: File) => {
      if (!isImageFile(file)) return;
      if (file.size > 10 * 1024 * 1024) return;
      setFiles([file]);
      const reader = new FileReader();
      reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string });
      reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dropped = Array.from(e.dataTransfer.files).filter(isImageFile);
      if (dropped[0]) processFile(dropped[0]);
    };

    const handleRemoveFile = () => {
      setFiles([]);
      setFilePreviews({});
    };

    const handlePaste = React.useCallback((e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            break;
          }
        }
      }
    }, []);

    React.useEffect(() => {
      document.addEventListener("paste", handlePaste);
      return () => document.removeEventListener("paste", handlePaste);
    }, [handlePaste]);

    const handleSubmit = () => {
      if (!input.trim() && files.length === 0) return;
      onSend(input, files.length ? { files } : undefined);
      setInput("");
      setFiles([]);
      setFilePreviews({});
    };

    const startRecording = React.useCallback(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Microphone is not available in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        mr.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const durationSec = durationAtStopRef.current;
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
          setIsRecording(false);
          if (blob.size > 0) {
            const caption = inputLatestRef.current.trim();
            onSend(caption, { audio: { blob, durationSec } });
            setInput("");
          } else {
            toast.message("No audio captured.");
          }
        };
        mr.start(200);
        mediaRecorderRef.current = mr;
        setIsRecording(true);
      } catch {
        toast.error("Could not access the microphone.");
      }
    }, [onSend]);

    const stopRecording = React.useCallback(() => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") return;
      durationAtStopRef.current = recordingSecRef.current;
      mr.stop();
    }, []);

    const emojiTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;

    const hasContent = input.trim() !== "" || files.length > 0;

    const micDisabled = isLoading && !hasContent && !isRecording;

    return (
      <>
        <PromptInput
          ref={mergedRef}
          value={input}
          onValueChange={setInput}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          className={cn("w-full", className)}
          disabled={isLoading || isRecording}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {files.length > 0 && !isRecording && (
            <div className="flex flex-wrap gap-1.5 pb-0.5">
              {files.map((file) =>
                file.type.startsWith("image/") && filePreviews[file.name] ? (
                  <div key={file.name} className="group relative">
                    <button
                      type="button"
                      className="relative h-12 w-12 overflow-hidden rounded-lg"
                      onClick={() => setSelectedImage(filePreviews[file.name])}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={filePreviews[file.name]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5"
                    >
                      <X className="h-2.5 w-2.5 text-white" />
                    </button>
                  </div>
                ) : null,
              )}
            </div>
          )}

          <div
            className={cn(
              "transition-all duration-300",
              isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100",
            )}
          >
            <PromptInputTextarea placeholder={placeholder} />
          </div>

          {isRecording && (
          <VoiceRecorderPanel
            isRecording={isRecording}
            seconds={recordingSecDisplay}
          />
        )}

          <PromptInputActions className="flex items-center justify-between gap-1.5 pt-1.5">
            <div
              className={cn(
                "flex items-center gap-0.5 transition-opacity duration-300",
                isRecording ? "invisible h-0 opacity-0" : "opacity-100",
              )}
            >
              <DropdownMenu open={emojiOpen} onOpenChange={setEmojiOpen}>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 rounded-full text-muted-foreground"
                      aria-label="Emoji"
                      disabled={isRecording}
                    />
                  }
                >
                  <Smile className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-auto border border-border/60 bg-popover p-0 shadow-md"
                >
                  <div
                    data-emoji-picker
                    className="overflow-hidden rounded-md"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <EmojiPicker
                      theme={emojiTheme}
                      onEmojiClick={(data) => {
                        setInput(input + data.emoji);
                        setEmojiOpen(false);
                      }}
                      width={280}
                      height={340}
                      skinTonesDisabled
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Paperclip className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Attach image</TooltipContent>
              </Tooltip>
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processFile(f);
                  e.target.value = "";
                }}
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <PromptBoxButton
                  variant="default"
                  size="icon"
                  className={cn(
                    "transition-all",
                    isRecording && "bg-transparent text-red-500 hover:bg-muted hover:text-red-400",
                    !isRecording && hasContent && "bg-primary text-primary-foreground",
                    !isRecording && !hasContent && "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else if (hasContent) {
                      handleSubmit();
                    } else {
                      void startRecording();
                    }
                  }}
                  disabled={micDisabled}
                >
                  {isLoading ? (
                    <Square className="h-3.5 w-3.5 animate-pulse fill-current" />
                  ) : isRecording ? (
                    <StopCircle className="h-4 w-4" />
                  ) : hasContent ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </PromptBoxButton>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isLoading
                  ? "Stop"
                  : isRecording
                    ? "Stop recording"
                    : hasContent
                      ? "Send"
                      : "Voice message"}
              </TooltipContent>
            </Tooltip>
          </PromptInputActions>
        </PromptInput>

        <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </>
    );
  },
);

PromptInputBox.displayName = "PromptInputBox";
