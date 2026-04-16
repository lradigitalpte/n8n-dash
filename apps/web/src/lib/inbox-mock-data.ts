import type { ChatMessage, Conversation, Organization } from "@/lib/inbox-types";

export const MOCK_ORGANIZATIONS: Organization[] = [
  { id: "org_zumbaton", name: "Zumbaton", slug: "zumbaton" },
  { id: "org_demo", name: "Demo Studio", slug: "demo" },
];

const now = Date.now();

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_1",
    orgId: "org_zumbaton",
    phone: "whatsapp:+6591234567",
    displayName: "Alex Chen",
    lastMessagePreview: "What time is Groove Stepper tomorrow?",
    lastMessageAt: now - 2 * 60 * 1000,
    unreadCount: 2,
    status: "ai",
  },
  {
    id: "conv_2",
    orgId: "org_zumbaton",
    phone: "whatsapp:+6598765432",
    displayName: "Samira K.",
    lastMessagePreview: "Thanks! See you at the trial 🙏",
    lastMessageAt: now - 45 * 60 * 1000,
    unreadCount: 0,
    status: "human",
  },
  {
    id: "conv_3",
    orgId: "org_demo",
    phone: "whatsapp:+14155550100",
    displayName: "Jordan Lee",
    lastMessagePreview: "Can we book a private class?",
    lastMessageAt: now - 3 * 60 * 60 * 1000,
    unreadCount: 1,
    status: "ai",
  },
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  conv_1: [
    {
      id: "m1",
      conversationId: "conv_1",
      role: "user",
      content: "Hi! Do you have trial classes this week?",
      createdAt: now - 24 * 60 * 1000,
    },
    {
      id: "m2",
      conversationId: "conv_1",
      role: "assistant",
      content:
        "Yes! You can book a trial at zumbaton.sg/trial-booking — pick a slot that works for you.",
      createdAt: now - 23 * 60 * 1000,
    },
    {
      id: "m3",
      conversationId: "conv_1",
      role: "user",
      content: "What time is Groove Stepper tomorrow?",
      createdAt: now - 2 * 60 * 1000,
    },
  ],
  conv_2: [
    {
      id: "m4",
      conversationId: "conv_2",
      role: "user",
      content: "Is Coach Lavs teaching tonight?",
      createdAt: now - 120 * 60 * 1000,
    },
    {
      id: "m5",
      conversationId: "conv_2",
      role: "agent",
      content: "Yes — Lavs is on the 7:30pm slot. Want me to hold a spot?",
      createdAt: now - 118 * 60 * 1000,
    },
    {
      id: "m6",
      conversationId: "conv_2",
      role: "user",
      content: "Thanks! See you at the trial 🙏",
      createdAt: now - 45 * 60 * 1000,
    },
  ],
  conv_3: [
    {
      id: "m7",
      conversationId: "conv_3",
      role: "user",
      content: "Can we book a private class?",
      createdAt: now - 3 * 60 * 60 * 1000,
    },
  ],
};

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
