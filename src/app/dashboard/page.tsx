"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, FolderOpen, Sparkles, UploadCloud, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";

type Project = { id: string; name: string; organisation?: string; sector?: string; geography?: string; reportingPeriod?: string };

type DatasetPreview = { fileName?: string; totalRowCount?: number; columns?: string[] };
type QualityPreview = { qualityScore?: number; score?: number; issues?: { title?: string; detail?: string; severity?: string }[] };
type ReportDraft = { title?: string; createdAt?: string; content?: string };

const PROJECTS_KEY = "dalili.projects";
const ACTIVE_KEY = "dalili.activeProject";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getActiveProject(projects: Project[]) {
  const activeId = readJson<string>(ACTIVE_KEY);
  return projects.find((project) => project.id === activeId) ?? projects[0] ?? null;
}

function StatusCard({ title, text, state }: { title: string; text: string; state: "done" | "current" | "next" }) {
  const classes = state === "done" ? "border-emerald-200 bg-emerald-50" : state === "current" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <div className="flex items-center gap-2">
        {state === "done" ? <CheckCircle2 className="h-4 w-4 text-[#0B6B4B]" /> : <div className="h-2.5 w-2.5 rounded-full bg-[#F5B400]" />}
        <h3 className="text-sm font-black text-[#102033]">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [dataset, setDataset] = useState<DatasetPreview | null>(null);
  const [quality, setQuality] = useState<QualityPreview | null>(null);
  const [report, setReport] = useState<ReportDraft | null>(null);

  useEffect(() => {
    const refresh = () => {
      setProjects(readJson<Project[]>(PROJECTS_KEY) ?? []);
      setDataset(readJson<DatasetPreview>("dalili.latestDataset"));
      setQuality(readJson<QualityPreview>("dalili.latestQualityReport"));
      setReport(readJson<ReportDraft>("dalili.latestReportDraft") ?? readJson<ReportDraft>("dalili.latestBackendReportDraft"));
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("dalili-projects-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dalili-projects-changed", refresh);
    };
  }, []);

  const activeProject = useMemo(() => getActiveProject(projects), [projects]);
  const issueCount = quality?.issues?.length ?? 0;
  const readiness = !activeProject ? 0 : report ? 100 : dataset && quality ? 70 : dataset ? 45 : 20;
  const nextHref = !activeProject ? "/start" : !dataset ? "/start" : !quality ? "/workspace" : !report ? "/reports" : "/reports";
  const nextText = !activeProject ? "Start with your project files" : !dataset ? "Upload project evidence" : !quality ? "Let Dalili review evidence" : !report ? "Create report" : "Open final report";

  return (
    <AppShell>
      <Topbar />
      <main className="modern-page">
        <section className="modern-hero p-5 md:p-7">
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div>
              <p className="compact-label text-emerald-100">Your evidence workspace</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight md:text-4xl">Upload everything. Dalili turns it into a report you can trust.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">No M&E jargon. No hunting through tools. Start with the files you already have, then review what Dalili finds before anything is used in a donor or client report.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="/start" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#073B2A] shadow-sm hover:bg-emerald-50">Start analysis <ArrowRight className="h-4 w-4" /></a>
                <a href="/reports" className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Reports</a>
              </div>
            </div>
            <div className="rounded-3xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-50"><span>Report readiness</span><span>{readiness}%</span></div>
              <div className="mt-3 h-3 rounded-full bg-white/20"><div className="workflow-line h-3 rounded-full" style={{ width: `${readiness}%` }} /></div>
              <div className="mt-4 rounded-2xl bg-white p-4 text-[#102033]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B4B]">Next best action</p>
                <h2 className="mt-1 text-lg font-black">{nextText}</h2>
                <p className="mt-2 text-sm leading-5 text-slate-600">{activeProject ? `Active project: ${activeProject.name}` : "Create one simple project workspace, then upload all relevant files."}</p>
                <a href={nextHref} className="modern-primary-button mt-4 w-full">Continue <ArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatusCard title="1. Project" text={activeProject ? activeProject.name : "Tell Dalili what the project is about."} state={activeProject ? "done" : "current"} />
          <StatusCard title="2. Evidence" text={dataset ? `${dataset.fileName ?? "Dataset"} uploaded${dataset.totalRowCount ? ` · ${dataset.totalRowCount} rows` : ""}.` : "Upload Excel, CSV, Kobo exports, PDF, Word and reports."} state={dataset ? "done" : activeProject ? "current" : "next"} />
          <StatusCard title="3. Review" text={quality ? `${issueCount} issue${issueCount === 1 ? "" : "s"} needing attention.` : "Dalili checks quality, possible indicators and missing evidence."} state={quality ? "done" : dataset ? "current" : "next"} />
          <StatusCard title="4. Report" text={report ? report.title ?? "Draft report ready." : "Generate a donor report, brief, summary or data quality report."} state={report ? "done" : quality ? "current" : "next"} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
          <div className="modern-panel p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3"><Sparkles className="h-5 w-5 text-[#073B2A]" /></div>
              <div>
                <h2 className="text-xl font-black text-[#102033]">Dalili should do the heavy M&E work.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">The main experience is now one path: project details, evidence upload, automatic review, finding approval and report generation. The technical pages are still there, but they are no longer the first thing a user must understand.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <a href="/start" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 hover:bg-emerald-100/70"><UploadCloud className="h-5 w-5 text-[#073B2A]" /><h3 className="mt-2 font-black text-[#102033]">Upload all files</h3><p className="mt-1 text-xs leading-5 text-slate-600">Start with what the organisation already has.</p></a>
              <a href="/workspace" className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"><FolderOpen className="h-5 w-5 text-[#073B2A]" /><h3 className="mt-2 font-black text-[#102033]">Review findings</h3><p className="mt-1 text-xs leading-5 text-slate-600">Approve, edit or reject what Dalili found.</p></a>
              <a href="/reports" className="rounded-2xl border border-amber-100 bg-amber-50 p-4 hover:bg-amber-100/70"><FileText className="h-5 w-5 text-amber-700" /><h3 className="mt-2 font-black text-[#102033]">Create report</h3><p className="mt-1 text-xs leading-5 text-slate-600">Export a donor-ready output.</p></a>
            </div>
          </div>

          <div className="modern-panel p-5">
            <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><h2 className="text-lg font-black text-[#102033]">What needs attention?</h2></div>
            <div className="mt-4 space-y-2">
              {!activeProject ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">No project yet. Start by uploading project files.</p> : null}
              {activeProject && !dataset ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">No evidence uploaded yet. Add project documents and datasets.</p> : null}
              {quality?.issues?.slice(0, 4).map((issue, index) => <p key={index} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{issue.title || issue.detail}</p>)}
              {activeProject && dataset && issueCount === 0 ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">No major issue is currently flagged in the quick review.</p> : null}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
