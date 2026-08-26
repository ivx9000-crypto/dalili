"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, HelpCircle, Info, ShieldCheck, Sparkles } from "lucide-react";
import { getActiveProject, getNextWorkflowStep, getWorkflowProgressPercent, hasLatestDataset, hasLatestQuality, hasLatestIndicator, hasReviewedInsights, hasLatestReport, type WorkflowStep } from "@/lib/workflow";
import { getAiWorkflowSuggestions, type DaliliAiSuggestion } from "@/lib/ai-guidance";

export function WorkflowNudge({ context = "page" }: { context?: string }) {
  const [step, setStep] = useState<WorkflowStep | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [aiSuggestion, setAiSuggestion] = useState<DaliliAiSuggestion | null>(null);

  useEffect(() => {
    const refresh = () => {
      const project = getActiveProject();
      setStep(getNextWorkflowStep());
      setProgress(getWorkflowProgressPercent());
      setProjectName(project?.name ?? "");
      const suggestions = getAiWorkflowSuggestions({
        hasProject: Boolean(project),
        hasDataset: hasLatestDataset(),
        hasQuality: hasLatestQuality(),
        hasIndicator: hasLatestIndicator(),
        hasInsights: hasReviewedInsights(),
        hasReport: hasLatestReport(),
        sector: project?.sector,
      });
      setAiSuggestion(suggestions[0] ?? null);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("dalili-projects-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dalili-projects-changed", refresh);
    };
  }, []);

  if (!step) return null;

  return (
    <section className="mb-4 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-[#073B2A] p-2 text-white">
            {step.status === "complete" ? <CheckCircle2 className="h-4 w-4" /> : context === "quality" ? <ShieldCheck className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="compact-label text-[#0B6B4B]">Next action{projectName ? ` · ${projectName}` : ""}</p>
            <h2 className="mt-0.5 text-base font-black text-[#102033]">{step.plainTitle}</h2>
            <p className="mt-1 max-w-4xl text-sm leading-5 text-slate-600">{step.description}</p>
            <details className="compact-details mt-2 text-xs text-slate-500">
              <summary className="inline-flex items-center gap-1 font-bold text-[#0B6B4B]"><Info className="h-3.5 w-3.5" /> Why this matters</summary>
              <div className="mt-2 rounded-xl bg-slate-50 p-3 leading-5">
                <p>{step.beginnerHelp}</p>
                {aiSuggestion ? (
                  <p className="mt-2 border-t border-slate-200 pt-2"><span className="font-black text-amber-800">Dalili guide:</span> {aiSuggestion.description}</p>
                ) : null}
              </div>
            </details>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 lg:min-w-64">
          <div className="hidden flex-1 md:block">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Progress</span><span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200">
              <div className="h-1.5 rounded-full bg-[#073B2A]" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <a href={step.href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#073B2A] px-3 py-2 text-sm font-bold text-white hover:bg-[#0B4A35]">
            {step.cta}<ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
