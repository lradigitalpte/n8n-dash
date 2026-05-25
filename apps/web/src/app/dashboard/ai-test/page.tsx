"use client";

import { api } from "@n8n-wht/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvex,
  useQuery,
} from "convex/react";
import {
  Building2,
  ChevronDown,
  FlaskConical,
  Loader2,
  Play,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import SidebarNav from "@/components/dashboard/sidebar-nav";
import SignInForm from "@/components/sign-in-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AI_TEST_SCRIPTS,
  evaluateKbRetrieval,
  getScriptForOrg,
  type AiTestCase,
} from "@/lib/ai-test-scripts";
import { MOCK_ORGANIZATIONS } from "@/lib/inbox-mock-data";
import { cn } from "@/lib/utils";

type ChunkResult = { title: string; content: string; category?: string };
type TestRunResult = {
  chunks: ChunkResult[];
  status: "pass" | "fail" | "warn";
  missing: string[];
  forbidden: string[];
};

function StatusBadge({ status }: { status: "pass" | "fail" | "warn" | "idle" }) {
  if (status === "idle") {
    return <span className="text-xs text-muted-foreground">Not run</span>;
  }
  if (status === "pass") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" /> KB OK
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertCircle className="size-3.5" /> Missing keywords
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
      <XCircle className="size-3.5" /> KB problem
    </span>
  );
}

function AiTestContent() {
  const convex = useConvex();
  const organizations = useQuery(api.inbox.listOrganizations, {});
  const fallbackOrganizations = useMemo(
    () => MOCK_ORGANIZATIONS.map((org) => ({ id: org.id, name: org.name })),
    [],
  );
  const orgOptions = useMemo(() => {
    const fromDb =
      organizations && organizations.length > 0 ? organizations : fallbackOrganizations;
    const withScripts = fromDb.filter((o) => getScriptForOrg(o.id));
    return withScripts.length > 0 ? withScripts : fromDb;
  }, [organizations, fallbackOrganizations]);

  const [orgId, setOrgId] = useState("org_zumbaton");
  const [results, setResults] = useState<Record<string, TestRunResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    if (!orgOptions.some((o) => o.id === orgId) && orgOptions.length > 0) {
      setOrgId(orgOptions[0].id);
    }
  }, [orgId, orgOptions]);

  const script = getScriptForOrg(orgId);
  const kbCount = useQuery(api.kb.list, { orgId })?.length;

  const runOne = async (test: AiTestCase) => {
    setRunningId(test.id);
    try {
      const chunks = await convex.query(api.kb.searchForDashboard, {
        orgId,
        query: test.question,
        limit: 6,
      });
      const mapped: ChunkResult[] = chunks.map((c) => ({
        title: c.title,
        content: c.content,
        category: c.category,
      }));
      const evalResult = evaluateKbRetrieval(mapped, test);
      setResults((prev) => ({
        ...prev,
        [test.id]: { chunks: mapped, ...evalResult },
      }));
    } catch {
      toast.error("KB search failed");
    } finally {
      setRunningId(null);
    }
  };

  const runAll = async () => {
    if (!script) return;
    setRunningAll(true);
    setResults({});
    for (const test of script.tests) {
      await runOne(test);
    }
    setRunningAll(false);
    toast.success("All tests complete");
  };

  const summary = useMemo(() => {
    const values = Object.values(results);
    return {
      pass: values.filter((r) => r.status === "pass").length,
      warn: values.filter((r) => r.status === "warn").length,
      fail: values.filter((r) => r.status === "fail").length,
    };
  }, [results]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <SidebarNav />
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <FlaskConical className="size-6 text-primary" />
                AI Test Scripts
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Sample customer questions per org. Checks which knowledge chunks the bot would
                retrieve — fix KB or search if keywords are missing. Full WhatsApp replies still
                need live testing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
                    <DropdownMenuItem
                      key={o.id}
                      className="rounded-lg"
                      onClick={() => {
                        setOrgId(o.id);
                        setResults({});
                      }}
                    >
                      <Building2 className="mr-2 size-4" />
                      {o.name}
                      <span className="ml-auto text-[10px] text-muted-foreground">{o.id}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {script && (
                <Button onClick={runAll} disabled={runningAll || runningId !== null}>
                  {runningAll ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Running…
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 size-4" />
                      Run all
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{kbCount ?? "—"}</p>
                <p className="text-xs text-muted-foreground">KB chunks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{summary.pass}</p>
                <p className="text-xs text-muted-foreground">Pass</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{summary.warn}</p>
                <p className="text-xs text-muted-foreground">Warn</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{summary.fail}</p>
                <p className="text-xs text-muted-foreground">Fail</p>
              </CardContent>
            </Card>
          </div>

          {!script ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No test script for <code className="text-foreground">{orgId}</code> yet. Add one in{" "}
                <code className="text-foreground">apps/web/src/lib/ai-test-scripts.ts</code>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {script.tests.map((test) => {
                const result = results[test.id];
                const status = result?.status ?? "idle";
                return (
                  <Card key={test.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="mb-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase">
                            {test.category}
                          </span>
                          <CardTitle className="text-base">{test.question}</CardTitle>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                      <CardDescription className="mt-2 text-sm leading-relaxed">
                        <span className="font-medium text-foreground">Expected: </span>
                        {test.expectedAnswer}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 border-t border-border/40 pt-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={runningAll || runningId === test.id}
                        onClick={() => runOne(test)}
                      >
                        {runningId === test.id ? (
                          <Loader2 className="mr-2 size-3.5 animate-spin" />
                        ) : (
                          <Play className="mr-2 size-3.5" />
                        )}
                        Check KB retrieval
                      </Button>

                      {result && (
                        <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                          {result.missing.length > 0 && (
                            <p className="text-amber-700 dark:text-amber-400">
                              Missing in chunks: {result.missing.join(", ")}
                            </p>
                          )}
                          {result.forbidden.length > 0 && (
                            <p className="text-destructive">
                              Should NOT appear: {result.forbidden.join(", ")}
                            </p>
                          )}
                          <p className="text-xs font-medium text-muted-foreground">
                            Chunks retrieved ({result.chunks.length}) — same search the bot uses:
                          </p>
                          <ul className="space-y-2">
                            {result.chunks.map((c, i) => (
                              <li
                                key={i}
                                className={cn(
                                  "rounded border border-border/50 bg-background p-2 text-xs",
                                )}
                              >
                                <span className="font-medium">{c.title}</span>
                                {c.category && (
                                  <span className="ml-2 text-muted-foreground">({c.category})</span>
                                )}
                                <p className="mt-1 line-clamp-3 text-muted-foreground">{c.content}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AiTestPage() {
  return (
    <>
      <Authenticated>
        <AiTestContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
          <SignInForm onSwitchToSignUp={() => {}} />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </AuthLoading>
    </>
  );
}
