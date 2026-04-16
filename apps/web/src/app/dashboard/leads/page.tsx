"use client";

import { api } from "@n8n-wht/backend/convex/_generated/api";
import type { Doc } from "@n8n-wht/backend/convex/_generated/dataModel";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { Building2, ChevronDown, Eye, Info, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import LeadsPageBar from "@/components/dashboard/leads-page-bar";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_LEADS, type LeadDisplayRow } from "@/lib/leads-mock-data";
import { MOCK_ORGANIZATIONS } from "@/lib/inbox-mock-data";
import { cn } from "@/lib/utils";

function filterMockByOrg(rows: LeadDisplayRow[], orgFilter: string | "all") {
  if (orgFilter === "all") return rows;
  return rows.filter((l) => l.orgId === orgFilter);
}

type RealLeadRow = Doc<"leads"> & { kind: "real" };
type MockLeadRow = LeadDisplayRow & { kind: "mock" };
type LeadRow = RealLeadRow | MockLeadRow;

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-xl border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Button variant="ghost" size="icon-sm" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-3 px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

function LeadsContent() {
  const [orgFilter, setOrgFilter] = useState<string | "all">("all");
  const [mockConverted, setMockConverted] = useState<Record<string, boolean>>({});
  const [mockEdits, setMockEdits] = useState<Record<string, Partial<LeadDisplayRow>>>({});
  const [mockDeleted, setMockDeleted] = useState<Set<string>>(new Set());
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "delete" | null>(null);
  const [editDraft, setEditDraft] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const leads = useQuery(api.leads.list, {
    orgId: orgFilter === "all" ? undefined : orgFilter,
  });
  const setConverted = useMutation(api.leads.setConverted);
  const updateLead = useMutation((api as any).leads.update);
  const deleteLead = useMutation((api as any).leads.remove);

  const usingMockData = leads !== undefined && leads.length === 0;

  const mockRows = useMemo(() => {
    if (!usingMockData) return [];
    const filtered = filterMockByOrg(MOCK_LEADS, orgFilter).filter((l) => !mockDeleted.has(l._id));
    return filtered.map((lead) => ({ ...lead, ...(mockEdits[lead._id] ?? {}) }));
  }, [usingMockData, orgFilter, mockDeleted, mockEdits]);

  const convexRows: RealLeadRow[] | null =
    leads !== undefined && leads.length > 0 ? leads.map((l) => ({ ...l, kind: "real" })) : null;

  const stats = useMemo(() => {
    if (convexRows) {
      const total = convexRows.length;
      const convertedCount = convexRows.filter((r) => r.converted).length;
      const open = total - convertedCount;
      const rate = total === 0 ? 0 : Math.round((convertedCount / total) * 100);
      return { total, converted: convertedCount, open, rate };
    }
    const effective = mockRows.map((l) => ({
      ...l,
      converted: mockConverted[l._id] ?? l.converted,
    }));
    const total = effective.length;
    const convertedCount = effective.filter((r) => r.converted).length;
    const open = total - convertedCount;
    const rate = total === 0 ? 0 : Math.round((convertedCount / total) * 100);
    return { total, converted: convertedCount, open, rate };
  }, [convexRows, mockRows, mockConverted]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const onToggleConvex = useCallback(
    async (lead: RealLeadRow, next: boolean) => {
      try {
        await setConverted({
          leadId: lead._id,
          converted: next,
        });
        toast.success(next ? "Marked converted" : "Marked not converted");
      } catch {
        toast.error("Could not update lead");
      }
    },
    [setConverted],
  );

  const onToggleMock = useCallback((id: string, next: boolean) => {
    setMockConverted((prev) => ({ ...prev, [id]: next }));
    toast.success(next ? "Marked converted (sample)" : "Marked open (sample)");
  }, []);

  const effectiveMockConverted = (lead: MockLeadRow | LeadDisplayRow) =>
    mockConverted[lead._id] ?? lead.converted;

  const tableRows: LeadRow[] = useMemo(() => {
    if (convexRows) return convexRows;
    return mockRows.map((l) => ({ ...l, kind: "mock" as const }));
  }, [convexRows, mockRows]);

  const showStats = leads !== undefined;
  const showBar = showStats && stats.total > 0;
  const tableEmpty = leads !== undefined && tableRows.length === 0;

  const openModal = useCallback((lead: LeadRow, mode: "view" | "edit" | "delete") => {
    setActiveLead(lead);
    setModalMode(mode);
    setEditDraft({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      notes: lead.notes ?? "",
    });
  }, []);

  const closeModal = useCallback(() => {
    setActiveLead(null);
    setModalMode(null);
  }, []);

  const saveLeadEdit = useCallback(async () => {
    if (!activeLead) return;
    if (!editDraft.name.trim() || !editDraft.email.trim() || !editDraft.phone.trim()) {
      toast.error("Name, email, and phone are required.");
      return;
    }
    if (activeLead.kind === "real") {
      try {
        await updateLead({
          leadId: activeLead._id,
          name: editDraft.name.trim(),
          email: editDraft.email.trim(),
          phone: editDraft.phone.trim(),
          notes: editDraft.notes.trim() || undefined,
        });
        toast.success("Lead updated");
        closeModal();
      } catch {
        toast.error("Could not update lead");
      }
      return;
    }
    setMockEdits((prev) => ({
      ...prev,
      [activeLead._id]: {
        name: editDraft.name.trim(),
        email: editDraft.email.trim(),
        phone: editDraft.phone.trim(),
        notes: editDraft.notes.trim() || undefined,
      },
    }));
    toast.success("Lead updated");
    closeModal();
  }, [activeLead, closeModal, editDraft, updateLead]);

  const confirmDelete = useCallback(async () => {
    if (!activeLead) return;
    if (activeLead.kind === "real") {
      try {
        await deleteLead({ leadId: activeLead._id });
        toast.success("Lead deleted");
        closeModal();
      } catch {
        toast.error("Could not delete lead");
      }
      return;
    }
    setMockDeleted((prev) => new Set(prev).add(activeLead._id));
    toast.success("Lead deleted");
    closeModal();
  }, [activeLead, closeModal, deleteLead]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-gradient-to-b from-background to-muted/20 dark:to-background">
      <LeadsPageBar />
      <div className="min-h-0 flex-1 overflow-auto px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12 lg:px-16">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 md:gap-10">
          <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-start sm:justify-between md:p-7">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">Lead pipeline</h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-[1.05rem]">
                Captured from WhatsApp / AI. Mark converted when a lead books or pays.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-10 w-full justify-between gap-2 rounded-xl border-border/80 px-4 sm:w-[240px]"
                  />
                }
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">
                    {orgFilter === "all"
                      ? "All organizations"
                      : (MOCK_ORGANIZATIONS.find((o) => o.id === orgFilter)?.name ?? orgFilter)}
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(100vw-2rem,280px)] rounded-xl bg-card p-1">
                <DropdownMenuItem className="rounded-lg" onClick={() => setOrgFilter("all")}>
                  All organizations
                </DropdownMenuItem>
                {MOCK_ORGANIZATIONS.map((o) => (
                  <DropdownMenuItem key={o.id} className="rounded-lg" onClick={() => setOrgFilter(o.id)}>
                    <Building2 className="mr-2 size-4" />
                    {o.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {usingMockData && (
            <div
              className="flex gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 text-sm dark:border-amber-400/20 dark:bg-amber-500/10 md:px-6 md:py-5"
              role="status"
            >
              <Info className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0 space-y-1">
                <p className="text-base font-medium text-amber-950 dark:text-amber-100">Showing sample leads</p>
                <p className="text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                  Your lead list is currently empty, so sample entries are shown for preview. Any changes you
                  make here affect only sample rows.
                </p>
              </div>
            </div>
          )}

          {showStats && (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              <Card className="rounded-2xl border-border/80 bg-card/80 shadow-sm">
                <CardHeader className="space-y-1 pb-3 pt-6 md:px-2">
                  <CardDescription className="text-[11px] uppercase tracking-wide">In view</CardDescription>
                  <CardTitle className="text-3xl tabular-nums md:text-4xl">{stats.total}</CardTitle>
                </CardHeader>
                <CardContent className="pb-6 pt-0 text-sm text-muted-foreground md:px-2">
                  {orgFilter === "all" ? "All orgs" : MOCK_ORGANIZATIONS.find((o) => o.id === orgFilter)?.name}
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-border/80 bg-card/80 shadow-sm">
                <CardHeader className="space-y-1 pb-3 pt-6 md:px-2">
                  <CardDescription className="text-[11px] uppercase tracking-wide">Open</CardDescription>
                  <CardTitle className="text-3xl tabular-nums text-sky-700 dark:text-sky-400 md:text-4xl">
                    {stats.open}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6 pt-0 text-sm text-muted-foreground md:px-2">Not converted yet</CardContent>
              </Card>
              <Card className="rounded-2xl border-border/80 bg-card/80 shadow-sm">
                <CardHeader className="space-y-1 pb-3 pt-6 md:px-2">
                  <CardDescription className="text-[11px] uppercase tracking-wide">Converted</CardDescription>
                  <CardTitle className="text-3xl tabular-nums text-emerald-700 dark:text-emerald-400 md:text-4xl">
                    {stats.converted}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6 pt-0 text-sm text-muted-foreground md:px-2">Booked / paid</CardContent>
              </Card>
              <Card className="rounded-2xl border-border/80 bg-card/80 shadow-sm">
                <CardHeader className="space-y-1 pb-3 pt-6 md:px-2">
                  <CardDescription className="text-[11px] uppercase tracking-wide">Conversion rate</CardDescription>
                  <CardTitle className="text-3xl tabular-nums md:text-4xl">{stats.rate}%</CardTitle>
                </CardHeader>
                <CardContent className="pb-6 pt-0 text-sm text-muted-foreground md:px-2">In this filter</CardContent>
              </Card>
            </div>
          )}

          {showBar && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm md:p-5">
              <p className="text-sm font-medium text-muted-foreground">Open vs converted</p>
              <div className="flex h-3.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-emerald-500 transition-all dark:bg-emerald-600"
                  style={{ width: `${stats.rate}%` }}
                  title={`Converted: ${stats.rate}%`}
                />
                <div
                  className="bg-sky-400/80 dark:bg-sky-500/70"
                  style={{ width: `${100 - stats.rate}%` }}
                  title={`Open: ${100 - stats.rate}%`}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Green = converted · Blue = still open (same totals as cards above).
              </p>
            </div>
          )}

          <Card className="rounded-2xl border-border/80 bg-card/80 shadow-sm">
            <CardHeader className="space-y-2 pb-4 pt-6 md:px-8 md:pt-8">
              <CardTitle className="text-lg md:text-xl">Leads table</CardTitle>
              <CardDescription className="text-sm leading-relaxed md:text-[15px]">
                Manage your leads in one place. You can mark conversion status, view details, edit contact
                information, or remove outdated entries.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 overflow-x-auto p-0 md:px-2 md:pb-8 md:pt-0 lg:px-4">
              {leads === undefined ? (
                <p className="px-8 py-12 text-base text-muted-foreground md:px-10">Loading leads…</p>
              ) : tableEmpty ? (
                <div className="px-8 py-16 text-center text-base text-muted-foreground md:px-10">
                  <p>No leads in this filter.</p>
                  <p className="mt-3 text-sm">Try selecting &quot;All organizations&quot;.</p>
                </div>
              ) : tableRows.length > 0 ? (
                <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-[15px]">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-border/80 bg-muted/75 text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
                      <th className="px-5 py-4 md:px-6">Status</th>
                      <th className="px-5 py-4 md:px-6">Name</th>
                      <th className="px-5 py-4 md:px-6">Email</th>
                      <th className="px-5 py-4 md:px-6">Phone</th>
                      <th className="px-5 py-4 md:px-6">Org</th>
                      <th className="px-5 py-4 md:px-6">Notes</th>
                      <th className="px-5 py-4 md:px-6">Created</th>
                      <th className="px-5 py-4 text-right md:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((lead) => {
                      const orgName =
                        MOCK_ORGANIZATIONS.find((o) => o.id === lead.orgId)?.name ?? lead.orgId;
                      const converted =
                        lead.kind === "real" ? lead.converted : effectiveMockConverted(lead);
                      return (
                        <tr key={lead._id} className="border-b border-border/50 transition-colors odd:bg-background even:bg-muted/10 hover:bg-muted/30">
                          <td className="px-5 py-4 align-middle md:px-6">
                            <button
                              type="button"
                              onClick={async () => {
                                if (lead.kind === "real") {
                                  await onToggleConvex(lead, !converted);
                                } else {
                                  onToggleMock(lead._id, !converted);
                                }
                              }}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                                converted
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                              )}
                            >
                              {converted ? "Converted" : "Open"}
                            </button>
                          </td>
                          <td className="px-5 py-4 font-medium md:px-6">{lead.name}</td>
                          <td className="px-5 py-4 md:px-6">
                            <a
                              href={`mailto:${lead.email}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {lead.email}
                            </a>
                          </td>
                          <td className="px-5 py-4 font-mono text-sm md:px-6">{lead.phone}</td>
                          <td className="px-5 py-4 text-muted-foreground md:px-6">{orgName}</td>
                          <td
                            className="max-w-[220px] truncate px-5 py-4 text-muted-foreground md:px-6"
                            title={lead.notes ?? ""}
                          >
                            {lead.notes ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground tabular-nums md:px-6">
                            {formatTime(lead.createdAt)}
                          </td>
                          <td className="px-5 py-4 md:px-6">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7"
                                onClick={() => openModal(lead, "view")}
                                title="View"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7"
                                onClick={() => openModal(lead, "edit")}
                                title="Edit"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7 text-destructive hover:text-destructive"
                                onClick={() => openModal(lead, "delete")}
                                title="Delete"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}
            </CardContent>
          </Card>

          <p className="pb-2 pt-6 text-center text-sm text-muted-foreground/90">
            <Link href="/dashboard" className="underline-offset-4 hover:underline">
              ← Back to inbox
            </Link>
            {" · "}
            n8n-wht agent dashboard
          </p>
        </div>
      </div>
      {activeLead && modalMode === "view" && (
        <ModalShell title="Lead details" onClose={closeModal}>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {activeLead.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {activeLead.email}</p>
            <p><span className="text-muted-foreground">Phone:</span> {activeLead.phone}</p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {(activeLead.kind === "real" ? activeLead.converted : effectiveMockConverted(activeLead))
                ? "Converted"
                : "Open"}
            </p>
            <p><span className="text-muted-foreground">Notes:</span> {activeLead.notes ?? "—"}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={closeModal}>Close</Button>
          </div>
        </ModalShell>
      )}
      {activeLead && modalMode === "edit" && (
        <ModalShell title="Edit lead" onClose={closeModal}>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={editDraft.name} onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input value={editDraft.email} onChange={(e) => setEditDraft((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={editDraft.phone} onChange={(e) => setEditDraft((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea
                rows={4}
                value={editDraft.notes}
                onChange={(e) => setEditDraft((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={() => void saveLeadEdit()}>Save</Button>
          </div>
        </ModalShell>
      )}
      {activeLead && modalMode === "delete" && (
        <ModalShell title="Delete lead?" onClose={closeModal}>
          <p className="text-sm text-muted-foreground">
            This will remove <span className="font-medium text-foreground">{activeLead.name}</span> from the lead list.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>Delete</Button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <Authenticated>
        <LeadsContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
          <div className="w-full max-w-md space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
            <p className="text-sm text-muted-foreground">Sign in to view and manage leads.</p>
          </div>
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
          <Link href="/dashboard" className={cn("text-sm text-muted-foreground underline-offset-4 hover:underline")}>
            Back to inbox
          </Link>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>
      </AuthLoading>
    </>
  );
}

