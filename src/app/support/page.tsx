"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, Download, FileText, RefreshCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { clearErrorLog, readErrorLog, type DaliliErrorLogItem } from "@/lib/error-log";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type BackendStatus = {
  health: "checking" | "online" | "offline";
  database: "checking" | "connected" | "offline";
  version?: string;
  databaseEngine?: string;
  message?: string;
};

const smokeTests = [
  "Create a fresh account and log back in",
  "Create a project and confirm the Project Guide opens",
  "Upload a small CSV or Excel file",
  "Confirm the data dictionary and sensitive-field warnings appear",
  "Run a quality check before using the data in a report",
  "Open Track Results and answer one simple question",
  "Generate a report or project brief",
  "Export the output and confirm organisation branding appears",
  "Log out and log back in to confirm the project is still available",
];

const firstUserQuestions = [
  "Did Dalili make it clear what to do after creating a project?",
  "Could you understand what data to upload or collect?",
  "Was Track Results understandable without M&E knowledge?",
  "Did the report/export feel useful enough to share?",
  "Where did you feel lost, confused, or unsure?",
];

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatLog(log: DaliliErrorLogItem[]) {
  if (!log.length) return "No local Dalili errors have been logged in this browser.";
  return log
    .map((item, index) => {
      return [
        `#${index + 1}`,
        `Time: ${item.createdAt}`,
        `Path: ${item.path || "Unknown"}`,
        `Source: ${item.source}`,
        `Message: ${item.message}`,
        item.detail ? `Detail: ${item.detail}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

export default function SupportPage() {
  const [status, setStatus] = useState<BackendStatus>({ health: "checking", database: "checking" });
  const [errors, setErrors] = useState<DaliliErrorLogItem[]>([]);
  const [feedback, setFeedback] = useState("");

  async function checkBackend() {
    setStatus({ health: "checking", database: "checking" });
    try {
      const healthResponse = await fetch(`${API_BASE}/health`);
      if (!healthResponse.ok) throw new Error("Health check failed");
      const versionResponse = await fetch(`${API_BASE}/ops/version`).catch(() => null);
      const versionJson = versionResponse?.ok ? await versionResponse.json() : null;
      const databaseResponse = await fetch(`${API_BASE}/ops/database`).catch(() => null);
      const databaseJson = databaseResponse?.ok ? await databaseResponse.json() : null;
      setStatus({
        health: "online",
        database: databaseJson?.ok === false ? "offline" : databaseResponse?.ok ? "connected" : "offline",
        version: versionJson?.version || "Unknown",
        databaseEngine: databaseJson?.database_engine || databaseJson?.database || "Unknown",
        message: databaseJson?.message || "Backend checks completed.",
      });
    } catch (error) {
      setStatus({ health: "offline", database: "offline", message: error instanceof Error ? error.message : "Backend unavailable" });
    }
  }

  useEffect(() => {
    setErrors(readErrorLog());
    void checkBackend();
    const onLog = () => setErrors(readErrorLog());
    window.addEventListener("dalili-error-log-changed", onLog);
    return () => window.removeEventListener("dalili-error-log-changed", onLog);
  }, []);

  const issueText = useMemo(() => {
    return [
      "DALILI TEST ISSUE NOTE",
      `Date: ${new Date().toISOString()}`,
      `Page: ${typeof window !== "undefined" ? window.location.origin : "Dalili"}`,
      `Backend: ${API_BASE}`,
      `Backend health: ${status.health}`,
      `Database: ${status.databaseEngine || status.database}`,
      "",
      "What happened:",
      feedback || "Describe what happened, what you expected, and the steps you followed.",
      "",
      "Recent local error log:",
      formatLog(errors),
    ].join("\n");
  }, [errors, feedback, status]);

  return (
    <AppShell>
      <Topbar />
      <div className="space-y-4">
        <section className="card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#073B2A]">Help & Testing</p>
              <h1 className="mt-2 text-2xl font-black text-[#102033]">Check stability before sharing Dalili.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Use this page during first-user testing. It keeps the guidance compact, checks backend/database status, and helps you copy an issue note if something breaks.
              </p>
            </div>
            <button onClick={checkBackend} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
              <RefreshCcw className="h-4 w-4" /> Refresh checks
            </button>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="card p-5">
            <p className="text-sm font-bold text-[#102033]">System status</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Backend</p>
                <p className={`mt-2 text-lg font-black ${status.health === "online" ? "text-[#073B2A]" : status.health === "checking" ? "text-amber-700" : "text-red-700"}`}>{status.health}</p>
                <p className="mt-1 text-xs text-slate-500">Version: {status.version || "Checking"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Database</p>
                <p className={`mt-2 text-lg font-black ${status.database === "connected" ? "text-[#073B2A]" : status.database === "checking" ? "text-amber-700" : "text-red-700"}`}>{status.database}</p>
                <p className="mt-1 text-xs text-slate-500">Engine: {status.databaseEngine || "Checking"}</p>
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{status.message || "Status not available yet."}</p>
          </section>

          <section className="card p-5">
            <p className="text-sm font-bold text-[#102033]">First-user smoke test</p>
            <div className="mt-4 grid gap-2">
              {smokeTests.map((item) => (
                <label key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-700">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#073B2A]" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="card p-5">
            <p className="text-sm font-bold text-[#102033]">Questions for first users</p>
            <div className="mt-4 space-y-2">
              {firstUserQuestions.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#073B2A]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <p className="text-sm font-bold text-[#102033]">Issue note</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">When a tester reports a problem, write what happened here, then copy or download the issue note.</p>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={5}
              className="mt-4 w-full rounded-2xl border border-slate-200 p-3 text-sm text-[#102033]"
              placeholder="Example: I created a project, clicked Upload data, selected an Excel file, and the page went blank."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => navigator.clipboard?.writeText(issueText)} className="inline-flex items-center gap-2 rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white">
                <Clipboard className="h-4 w-4" /> Copy issue note
              </button>
              <button onClick={() => downloadText("dalili-issue-note.txt", issueText)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </section>
        </div>

        <section className="card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#102033]">Local error log</p>
              <p className="mt-1 text-xs text-slate-500">Only stored in this browser. It helps debugging during testing and can be cleared any time.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadText("dalili-error-log.txt", formatLog(errors))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                <FileText className="h-4 w-4" /> Export log
              </button>
              <button onClick={() => { clearErrorLog(); setErrors([]); }} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700">
                <Trash2 className="h-4 w-4" /> Clear
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {!errors.length ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-[#073B2A]">No local page errors logged in this browser.</div>
            ) : (
              errors.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <div className="flex gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> {item.source}</div>
                  <p className="mt-1">{item.message}</p>
                  <p className="mt-1 text-amber-700">{item.createdAt} · {item.path}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
