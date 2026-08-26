"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, HelpCircle, ShieldCheck } from "lucide-react";
import { getActiveProject, getNextWorkflowStep, getWorkflowProgressPercent, type WorkflowStep } from "@/lib/workflow";

export function WorkflowNudge({ context = "page" }: { context?: string }) {
  const [step, setStep] = useState<WorkflowStep | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setStep(getNextWorkflowStep());
      setProgress(getWorkflowProgressPercent());
      setProjectName(getActiveProject()?.name ?? "");
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
    <section className="mb-5 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#073B2A] p-3 text-white">
            {step.status === "complete" ? <CheckCircle2 className="h-5 w-5" /> : context === "quality" ? <ShieldCheck className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B6B4B]">Next best action{projectName ? ` · ${projectName}` : ""}</p>
            <h2 className="mt-1 text-xl font-black text-[#102033]">{step.plainTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{step.description}</p>
            <p className="mt-2 max-w-3xl rounded-2xl bg-white/80 p-3 text-xs leading-5 text-slate-500">{step.beginnerHelp}</p>
          </div>
        </div>
        <div className="min-w-52">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Journey progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-[#073B2A]" style={{ width: `${progress}%` }} />
          </div>
          <a href={step.href} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#073B2A] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B4A35]">
            {step.cta}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
