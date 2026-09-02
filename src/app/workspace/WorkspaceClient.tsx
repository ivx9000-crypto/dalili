"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, FileText, Lightbulb, ShieldAlert, Sparkles, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { getActiveProject, type DaliliProject } from "@/lib/workflow";
import { getSuggestedIndicatorsForSector } from "@/lib/ai-guidance";

type UploadItem = { name: string; status: string; type?: string; rows?: number; columns?: number };
type QualityPayload = { qualityScore?: number; score?: number; issues?: { title?: string; detail?: string; severity?: string }[] };
type IndicatorPayload = { indicatorName?: string; percentage?: number; denominator?: number; groups?: { group: string; value?: number; percentage?: number }[]; plainExplanation?: string };
type ReportDraft = { title?: string; createdAt?: string; content?: string };

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function WorkspaceCard({ title, text, href, icon, state }: { title: string; text: string; href: string; icon: ReactNode; state: "done" | "current" | "next" }) {
  const classes = state === "done" ? "border-emerald-200 bg-emerald-50" : state === "current" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white";
  return (
    <a href={href} className={`block rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${classes}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm">{icon}</div>
        <span className="modern-pill bg-white text-slate-600 shadow-sm">{state === "done" ? "Done" : state === "current" ? "Do now" : "Later"}</span>
      </div>
      <h2 className="mt-4 text-lg font-black text-[#102033]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </a>
  );
}

export function WorkspaceClient() {
  const [project, setProject] = useState<DaliliProject | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [quality, setQuality] = useState<QualityPayload | null>(null);
  const [indicator, setIndicator] = useState<IndicatorPayload | null>(null);
  const [report, setReport] = useState<ReportDraft | null>(null);

  useEffect(() => {
    const refresh = () => {
      setProject(getActiveProject());
      setUploads(readJson<UploadItem[]>("dalili.projectEvidence") ?? readJson<UploadItem[]>("dalili.startAnalysisUploads") ?? []);
      setQuality(readJson<QualityPayload>("dalili.latestQualityReport"));
      setIndicator(readJson<IndicatorPayload>("dalili.latestIndicatorResult"));
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

  const suggested = useMemo(() => getSuggestedIndicatorsForSector(project?.sector).slice(0, 3), [project?.sector]);
  const hasEvidence = uploads.length > 0;
  const hasReview = Boolean(quality || indicator);
  const hasReport = Boolean(report);
  const readiness = !project ? 0 : hasReport ? 100 : hasReview ? 75 : hasEvidence ? 45 : 20;

  if (!project) {
    return (
      <div className="modern-page">
        <section className="modern-hero p-6 md:p-8">
          <div className="relative z-10 max-w-3xl">
            <p className="compact-label text-emerald-100">Project workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Start with project files, not M&E setup.</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50">Dalili will create the workspace after you add basic project details and evidence.</p>
            <a href="/start" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#073B2A]">Start analysis <ArrowRight className="h-4 w-4" /></a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="modern-page">
      <section className="modern-hero p-5 md:p-7">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="compact-label text-emerald-100">Project workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{project.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">This workspace keeps the project story, evidence, findings and report in one place. Advanced tools are available only when needed.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-white/10 px-3 py-1">{project.organisation || "Organisation missing"}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{project.sector || "Sector missing"}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{project.geography || project.country || "Location missing"}</span>
            </div>
          </div>
          <div className="rounded-3xl bg-white/12 p-4 ring-1 ring-white/15">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-50"><span>Report readiness</span><span>{readiness}%</span></div>
            <div className="mt-3 h-3 rounded-full bg-white/20"><div className="workflow-line h-3 rounded-full" style={{ width: `${readiness}%` }} /></div>
            <a href={!hasEvidence ? "/start" : !hasReport ? "/reports" : "/reports"} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#073B2A]">{!hasEvidence ? "Upload evidence" : !hasReport ? "Create report" : "Open report"} <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard title="Overview" text="The plain-language project summary, status and next action." href="/workspace" icon={<Sparkles className="h-5 w-5 text-[#073B2A]" />} state="done" />
        <WorkspaceCard title="Evidence" text={hasEvidence ? `${uploads.length} file${uploads.length === 1 ? "" : "s"} uploaded.` : "Add proposals, reports, Kobo/Excel files and notes."} href="/start" icon={<Database className="h-5 w-5 text-[#073B2A]" />} state={hasEvidence ? "done" : "current"} />
        <WorkspaceCard title="Findings" text={indicator?.plainExplanation || (hasReview ? "Review the suggested results and cautions." : "Dalili will suggest findings after upload.")} href="/insights" icon={<Lightbulb className="h-5 w-5 text-amber-700" />} state={hasReview ? "done" : hasEvidence ? "current" : "next"} />
        <WorkspaceCard title="Report" text={hasReport ? report?.title || "Draft report ready." : "Generate a donor report, brief or summary."} href="/reports" icon={<FileText className="h-5 w-5 text-[#073B2A]" />} state={hasReport ? "done" : hasReview ? "current" : "next"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="modern-panel p-5">
          <div className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-[#073B2A]" /><h2 className="text-xl font-black text-[#102033]">Evidence in this project</h2></div>
          <div className="mt-4 space-y-2">
            {uploads.length ? uploads.slice(0, 6).map((item) => (
              <div key={`${item.name}-${item.status}`} className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                <span className="text-sm font-black text-[#102033]">{item.name}</span>
                <span className="text-xs text-slate-500">{item.status}</span>
              </div>
            )) : <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">No evidence has been uploaded yet. Click Start and upload all available project files.</p>}
          </div>
          <a href="/start" className="modern-primary-button mt-4">Add more files <ArrowRight className="h-4 w-4" /></a>
        </div>

        <div className="modern-panel p-5">
          <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" /><h2 className="text-xl font-black text-[#102033]">Findings and cautions</h2></div>
          <div className="mt-4 space-y-3">
            {indicator ? (
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm font-black text-[#102033]">{indicator.indicatorName}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{indicator.plainExplanation || `Result: ${indicator.percentage}`}</p>
              </div>
            ) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Dalili will create first findings after a dataset is uploaded.</p>}
            {quality?.issues?.slice(0, 3).map((issue, index) => (
              <div key={index} className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{issue.title || issue.detail}</div>
            ))}
          </div>
          <details className="compact-details mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <summary className="font-black text-[#0B6B4B]">Show suggested M&E logic</summary>
            <div className="mt-3 space-y-2">
              {suggested.map((item) => <p key={item.label} className="rounded-xl bg-white p-3"><span className="font-black text-[#102033]">{item.plainQuestion}</span><br />{item.description}</p>)}
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
