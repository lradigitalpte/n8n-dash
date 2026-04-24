"use client";

import { api } from "@n8n-wht/backend/convex/_generated/api";
import type { Doc } from "@n8n-wht/backend/convex/_generated/dataModel";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery, useAction } from "convex/react";
import { 
  Building2,
  BookOpen, 
  ChevronDown,
  Plus, 
  Search, 
  Trash2, 
  Globe, 
  Loader2, 
  FileText,
  AlertCircle,
  Pencil
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
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
import { MOCK_ORGANIZATIONS } from "@/lib/inbox-mock-data";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Modal Shell                                                                */
/* -------------------------------------------------------------------------- */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <Plus className="size-4 rotate-45" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* KB Content                                                                 */
/* -------------------------------------------------------------------------- */
function KBContent() {
  const organizations = useQuery(api.inbox.listOrganizations, {});
  const fallbackOrganizations = useMemo(
    () => MOCK_ORGANIZATIONS.map((org) => ({ id: org.id, name: org.name })),
    [],
  );
  const orgOptions =
    organizations && organizations.length > 0 ? organizations : fallbackOrganizations;
  const [orgId, setOrgId] = useState<string>(orgOptions[0]?.id ?? "org_zumbaton");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isScraping, setIsAddingScrape] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const kbItems = useQuery(api.kb.list, { orgId });
  const createKB = useMutation(api.kb.create);
  const updateKB = useMutation(api.kb.update);
  const removeKB = useMutation(api.kb.remove);
  const scrapeWebsite = useAction(api.scraper.scrapeWebsite);

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);

  useEffect(() => {
    if (!orgOptions.some((org) => org.id === orgId) && orgOptions.length > 0) {
      setOrgId(orgOptions[0].id);
    }
  }, [orgId, orgOptions]);

  const filteredItems = useMemo(() => {
    if (!kbItems) return [];
    const q = searchQuery.toLowerCase();
    return kbItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.content.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  }, [kbItems, searchQuery]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const category = formData.get("category") as string;

    try {
      if (editingId) {
        await updateKB({ id: editingId as any, title, content, category });
        toast.success("Knowledge updated");
      } else {
        await createKB({ orgId, title, content, category });
        toast.success("Knowledge added");
      }
      setIsAdding(false);
      setEditingId(null);
    } catch (err) {
      toast.error("Failed to save knowledge");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this knowledge chunk?")) return;
    try {
      await removeKB({ id: id as any });
      toast.success("Deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <LeadsPageBar /> {/* Reusing the same bar style */}
      
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-6xl space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
              <p className="text-muted-foreground">
                Manage the facts and information your AI uses to reply to customers.
              </p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" className="h-9 min-w-[210px] justify-between gap-2 px-3" />
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">
                      {orgOptions.find((o) => o.id === orgId)?.name ?? orgId}
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[280px] rounded-xl bg-card p-1">
                  {orgOptions.map((o) => (
                    <DropdownMenuItem key={o.id} className="rounded-lg" onClick={() => setOrgId(o.id)}>
                      <Building2 className="mr-2 size-4" />
                      {o.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => setIsAddingScrape(true)}>
                <Globe className="mr-2 size-4" />
                Scrape Website
              </Button>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 size-4" />
                Add Chunk
              </Button>
            </div>
          </div>

          {/* Search & Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardContent className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search knowledge chunks..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Total Chunks</p>
                    <p className="text-xl font-bold">{kbItems?.length ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KB Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kbItems === undefined ? (
              <div className="col-span-full flex h-40 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
                <BookOpen className="mb-4 size-12 text-muted-foreground/20" />
                <h3 className="text-lg font-medium">No knowledge found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Try a different search term." : "Start by adding your first knowledge chunk."}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <Card key={item._id} className="group flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base line-clamp-1">{item.title}</CardTitle>
                        {item.category && (
                          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon-sm" onClick={() => {
                          setEditingId(item._id);
                          setIsAdding(true);
                        }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item._id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                      {item.content}
                    </p>
                  </CardContent>
                  <div className="border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground">
                    Last updated {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAdding && (
        <Modal 
          title={editingId ? "Edit Knowledge Chunk" : "Add Knowledge Chunk"} 
          onClose={() => { setIsAdding(false); setEditingId(null); }}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input 
                name="title" 
                placeholder="e.g. Pricing Policy" 
                required 
                defaultValue={editingId ? kbItems?.find(i => i._id === editingId)?.title : ""}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Input 
                name="category" 
                placeholder="e.g. Pricing, Schedule, Rules" 
                defaultValue={editingId ? kbItems?.find(i => i._id === editingId)?.category : ""}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Content</label>
              <Textarea 
                name="content" 
                placeholder="Enter the detailed information here..." 
                required 
                className="min-h-[150px]"
                defaultValue={editingId ? kbItems?.find(i => i._id === editingId)?.content : ""}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                Cancel
              </Button>
              <Button type="submit">Save Chunk</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Scrape Modal */}
      {isScraping && (
        <Modal title="Scrape Website" onClose={() => setIsAddingScrape(false)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-500/5 p-3 text-xs text-blue-600 dark:text-blue-400 flex gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <p>This will crawl the provided URL and automatically create knowledge chunks from the text content.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Website URL</label>
              <Input 
                placeholder="https://example.com/pricing" 
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                disabled={isScrapingLoading}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAddingScrape(false)}
                disabled={isScrapingLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (!scrapeUrl) return;
                  setIsScrapingLoading(true);
                  try {
                    await scrapeWebsite({ orgId, url: scrapeUrl });
                    toast.success("Website scraped successfully");
                    setIsAddingScrape(false);
                    setScrapeUrl("");
                  } catch (err: any) {
                    toast.error(err.message || "Scrape failed");
                  } finally {
                    setIsScrapingLoading(false);
                  }
                }}
                disabled={isScrapingLoading}
              >
                {isScrapingLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  "Start Scrape"
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <>
      <Authenticated>
        <KBContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
          <div className="w-full max-w-md space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your AI knowledge.</p>
          </div>
          <SignInForm onSwitchToSignUp={() => {}} />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>
      </AuthLoading>
    </>
  );
}
