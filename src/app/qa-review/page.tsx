"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink, Play, RefreshCcw, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { API_BASE } from "@/lib/auth-client";

type CheckStatus = "not_run" | "pass" | "warn" | "fail";

type QaCheck = {
  id: string;
  page: string;
  action: string;
  expected: string;
  status: CheckStatus;
  detail?: string;
  href?: string;
};

const journeyChecks: QaCheck[] = [
  { id: "auth-signup", page: "Signup", action: "Create a new account with terms/privacy checked", expected: "Account is created and user is sent to onboarding", status: "not_run", href: "/signup" },
  { id: "auth-login", page: "Login", action: "Log in with the new account", expected: "Dashboard opens and greeting uses the user's first name", status: "not_run", href: "/login" },
  { id: "onboarding", page: "Onboarding", action: "Complete organisation setup and upload/save logo", expected: "Organisation details are saved and reused in reports/settings", status: "not_run", href: "/onboarding" },
  { id: "project-create", page: "Projects", action: "Click New Project and save a real project", expected: "Project is saved, appears in dropdown, and opens Project Guide", status: "not_run", href: "/projects?new=1" },
  { id: "workspace", page: "Project Guide", action: "Open the active project guide", expected: "Next action is clear and workflow progress is visible", status: "not_run", href: "/workspace" },
  { id: "upload", page: "Data Room", action: "Upload a small CSV/Excel file", expected: "Upload succeeds, data dictionary appears, page does not crash", status: "not_run", href: "/data-room" },
  { id: "quality", page: "Quality Check", action: "Run/review a quality check", expected: "Quality score, issues, and caution notes appear", status: "not_run", href: "/quality-check" },
  { id: "track", page: "Track Results", action: "Calculate average/count/percentage and break down by district/sex/facility", expected: "Result, denominator/valid records, and breakdown table appear", status: "not_run", href: "/indicators" },
  { id: "insights", page: "Insights", action: "Review what Dalili found", expected: "Findings can be approved, rejected, or flagged", status: "not_run", href: "/insights" },
  { id: "reports", page: "Reports", action: "Generate and export a report/project brief", expected: "Report exports and branding appears where supported", status: "not_run", href: "/reports" },
  { id: "maps", page: "Maps", action: "Open map/location summary", expected: "Location columns and breakdowns are summarised without crashing", status: "not_run", href: "/maps" },
  { id: "ai", page: "AI Assistant", action: "Ask what to do next for the active project", expected: "Assistant answers from available project evidence and does not guess", status: "not_run", href: "/ai-assistant" },
  { id: "settings", page: "Settings", action: "Check organisation, security, backend/database status", expected: "Settings save and backend/database status is visible", status: "not_run", href: "/settings" },
  { id: "support", page: "Support", action: "Open support and export issue note if needed", expected: "Local error log, status checks, and issue note tools work", status: "not_run", href: "/support" },
];

function statusBadge(status: CheckStatus) {
  if (status === "pass") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "warn") return "bg-amber-50 text-amber-800 border-amber-200";
  if (status === "fail") return "bg-red-50 text-red-800 border-red-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function statusIcon(status: CheckStatus) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "fail") return <XCircle className="h-4 w-4" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4" />;
  return <ClipboardList className="h-4 w-4" />;
}

function readStorageFlag(key: string) {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(key));
  } catch {
    return false;
  }
}

async function checkUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  return { ok: response.ok, status: response.status, text: response.ok ? "OK" : await response.text().catch(() => "Request failed") };
}

export default function QaReviewPage() {
  const [checks, setChecks] = useState<QaCheck[]>(journeyChecks);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState("Run the automated checks, then complete the manual journey check page by page.");

  const counts = useMemo(() => {
    return checks.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { pass: 0, warn: 0, fail: 0, not_run: 0 } as Record<CheckStatus, number>,
    );
  }, [checks]);

  async function runAutomatedChecks() {
    setIsRunning(true);
    const next = [...journeyChecks];
    try {
      const [health, version, database, stability] = await Promise.allSettled([
        checkUrl(`${API_BASE}/health`),
        checkUrl(`${API_BASE}/ops/version`),
        checkUrl(`${API_BASE}/ops/database`),
        checkUrl(`${API_BASE}/ops/stability`),
      ]);

      const apiOk = health.status === "fulfilled" && health.value.ok;
      const opsOk = version.status === "fulfilled" && version.value.ok && database.status === "fulfilled" && database.value.ok;
      const stabilityOk = stability.status === "fulfilled" && stability.value.ok;

      next.unshift({
        id: "api-health",
        page: "Backend",
        action: "Check /health",
        expected: "Backend responds",
        status: apiOk ? "pass" : "fail",
        detail: apiOk ? "Backend health endpoint responded." : "Backend health endpoint failed. Check API URL/CORS/backend service.",
      });
      next.unshift({
        id: "ops-status",
        page: "Operations",
        action: "Check /ops/version, /ops/database and /ops/stability",
        expected: "Operations endpoints respond",
        status: opsOk && stabilityOk ? "pass" : "warn",
        detail: opsOk ? "Ops endpoints are reachable." : "One or more ops endpoints failed. Redeploy backend or check Render logs.",
      });

      const hasProject = readStorageFlag("dalili.activeProject") || readStorageFlag("dalili.projects");
      const hasDataset = readStorageFlag("dalili.latestDataset") || readStorageFlag("dalili.latestBackendDataset");
      const hasQuality = readStorageFlag("dalili.latestQualityReport") || readStorageFlag("dalili.latestBackendQualityReport");
      const hasIndicator = readStorageFlag("dalili.latestIndicatorResult") || readStorageFlag("dalili.latestBackendIndicatorResult");
      const hasReport = readStorageFlag("dalili.latestBackendReportDraft") || readStorageFlag("dalili.reportStatus");

      const updateById = (id: string, status: CheckStatus, detail: string) => {
        const item = next.find((entry) => entry.id === id);
        if (item) {
          item.status = status;
          item.detail = detail;
        }
      };

      updateById("project-create", hasProject ? "pass" : "warn", hasProject ? "A project exists in this browser state." : "No active project detected yet. Test project creation manually.");
      updateById("upload", hasDataset ? "pass" : "warn", hasDataset ? "A dataset is detected in this browser state." : "No dataset detected yet. Upload one manually.");
      updateById("quality", hasQuality ? "pass" : "warn", hasQuality ? "A quality report is detected." : "No quality report detected yet. Run quality check manually.");
      updateById("track", hasIndicator ? "pass" : "warn", hasIndicator ? "A tracked result is detected." : "No tracked result detected yet. Use Track Results manually.");
      updateById("reports", hasReport ? "pass" : "warn", hasReport ? "A report/report status is detected." : "No report detected yet. Generate/export one manually.");

      setChecks(next);
      setSummary(apiOk ? "Automated checks completed. Now walk through the manual actions from top to bottom." : "Backend health failed. Fix backend/API connection before testing page actions.");
    } catch (error) {
      setSummary(error instanceof Error ? error.message : "Automated checks failed.");
    } finally {
      setIsRunning(false);
    }
  }

  function exportQaNote() {
    const text = [
      "DALILI V60 FULL APP QA REVIEW",
      `Date: ${new Date().toISOString()}`,
      `Frontend: ${typeof window !== "undefined" ? window.location.origin : "Unknown"}`,
      `Backend: ${API_BASE}`,
      "",
      ...checks.map((item) => [`Page: ${item.page}`, `Action: ${item.action}`, `Expected: ${item.expected}`, `Status: ${item.status}`, item.detail ? `Detail: ${item.detail}` : ""].filter(Boolean).join("\n")),
    ].join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dalili-v60-qa-review.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <Topbar />
      <div className="space-y-4">
        <section className="card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#073B2A]">Full app QA</p>
              <h1 className="mt-1 text-2xl font-black text-[#102033]">Review Dalili page by page.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Use this before wider sharing. The aim is simple: every page must load, do its main job, save correctly, and guide the user to the next step.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={runAutomatedChecks} disabled={isRunning} className="inline-flex items-center gap-2 rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                {isRunning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run checks
              </button>
              <button onClick={exportQaNote} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                <ClipboardList className="h-4 w-4" /> Export QA note
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <div className="card p-4"><p className="text-xs font-bold uppercase text-slate-500">Passed</p><p className="mt-1 text-2xl font-black text-emerald-800">{counts.pass}</p></div>
          <div className="card p-4"><p className="text-xs font-bold uppercase text-slate-500">Needs manual check</p><p className="mt-1 text-2xl font-black text-amber-700">{counts.warn}</p></div>
          <div className="card p-4"><p className="text-xs font-bold uppercase text-slate-500">Failed</p><p className="mt-1 text-2xl font-black text-red-700">{counts.fail}</p></div>
          <div className="card p-4"><p className="text-xs font-bold uppercase text-slate-500">Not run</p><p className="mt-1 text-2xl font-black text-slate-700">{counts.not_run}</p></div>
        </section>

        <section className="card p-4">
          <p className="text-sm font-bold text-[#102033]">QA summary</p>
          <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{summary}</p>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <p className="text-sm font-bold text-[#102033]">Page-by-page checklist</p>
            <p className="mt-1 text-xs text-slate-500">Open each page, perform the action, and record anything that does not work.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {checks.map((item) => (
              <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[160px_1fr_1fr_150px] lg:items-center">
                <div>
                  <p className="text-sm font-black text-[#102033]">{item.page}</p>
                  {item.href ? <a href={item.href} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#073B2A]">Open <ExternalLink className="h-3 w-3" /></a> : null}
                </div>
                <p className="text-sm leading-6 text-slate-700">{item.action}</p>
                <div>
                  <p className="text-sm leading-6 text-slate-600">{item.expected}</p>
                  {item.detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p> : null}
                </div>
                <span className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase ${statusBadge(item.status)}`}>
                  {statusIcon(item.status)} {item.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
