/** Shape matches Convex `leads` documents for UI-only preview when the table is empty. */
export type LeadDisplayRow = {
  _id: string;
  orgId: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  converted: boolean;
  createdAt: number;
};

const day = 24 * 60 * 60 * 1000;
const now = Date.now();

export const MOCK_LEADS: LeadDisplayRow[] = [
  {
    _id: "mock_lead_1",
    orgId: "org_zumbaton",
    name: "Alex Chen",
    email: "alex.chen@email.com",
    phone: "+65 9123 4567",
    notes: "Asked about Groove Stepper trial — follow up Tue.",
    converted: false,
    createdAt: now - 2 * day,
  },
  {
    _id: "mock_lead_2",
    orgId: "org_zumbaton",
    name: "Samira K.",
    email: "samira.k@email.com",
    phone: "+65 9876 5432",
    notes: "Trial booked for Saturday 10am.",
    converted: true,
    createdAt: now - 5 * day,
  },
  {
    _id: "mock_lead_3",
    orgId: "org_demo",
    name: "Jordan Lee",
    email: "jordan@example.com",
    phone: "+1 415 555 0100",
    notes: "Private class pricing question.",
    converted: false,
    createdAt: now - 1 * day,
  },
  {
    _id: "mock_lead_4",
    orgId: "org_zumbaton",
    name: "Priya Nair",
    email: "priya.n@email.com",
    phone: "+65 8001 2233",
    notes: "Corporate team event — 12 pax.",
    converted: false,
    createdAt: now - 3 * day,
  },
  {
    _id: "mock_lead_5",
    orgId: "org_demo",
    name: "Chris Wong",
    email: "chris.w@email.com",
    phone: "+65 9000 7788",
    notes: "Converted from WhatsApp campaign.",
    converted: true,
    createdAt: now - 10 * day,
  },
];
