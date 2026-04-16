export type ConversationStatus = "active" | "human_takeover" | "ai" | "human";

export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type Conversation = {
  id: string;
  orgId: string;
  /** WhatsApp identity, e.g. whatsapp:+65... */
  phone: string;
  displayName: string;
  lastMessagePreview: string;
  lastMessageAt: number;
  unreadCount: number;
  status: ConversationStatus;
};

export type ChatMessage = {
  id: string;
  conversationId?: string;
  role: "user" | "assistant" | "agent";
  content: string;
  createdAt: number;
  deliveryStatus?: "queued" | "sent" | "failed";
  /** Blob URL for inline playback (revoke when message is removed). */
  audioUrl?: string;
  /** Blob URL for image preview. */
  imageUrl?: string;
};
