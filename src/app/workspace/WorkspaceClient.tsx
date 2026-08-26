"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Database, FileText, Info, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
import type { ElementType } from "react";
import { getActiveProject, getWorkflowProgressPercent, getWorkflowSteps, type DaliliProject, type WorkflowStep } from "@/lib/workflow";
import { getSuggestedIndicatorsForSector } from "@/lib/ai-guidance";

const planTemplates: Record<string, string[]> = {
  "Health / SRH / HIV": ["People reached with services", "Eligible clients receiving intended service", "Client satisfaction", "Service availability issues", "Age, sex and location breakdown"],
  Education: ["Learners enrolled", "Attendance", "Completion", "Skills improvement", "Learner satisfaction and barriers"],
  WASH: ["People reached", "Facility functionality", "Hygiene practice adoption", "Access barriers", "Community satisfaction"],
  "Agriculture / Livelihoods": ["Participants supported", "Practice adoption", "Income/productivity change", "Access to inputs or markets", "Gender/location breakdown"],
  "Protection / SGBV": ["People reached", "Referral completion", "Safe access", "Barriers to support", "Sensitive data controls"],
  "Research / Evaluation": ["Records analysed", "Response/completion rate", "Key outcomes", "Priority group breakdown", "Limitations"],
  Other: ["People or sites reached", "Activity completion", "Progress against target", "Participant satisfaction", "Barriers and actions"],
};

function statusClasses(status: WorkflowStep["status"]) {
  if (status === "complete") return "border-emerald-200 bg-emerald-50";
  if (status === "current") return "border-amber-200 bg-amber-50";
  if (status === "next") return "border-slate-200 bg-white";
  return "border-slate-100 bg-slate-50 opacity-70";
}

function statusLabel(status: WorkflowStep["status"]) {
  if (status === "complete") return "Done";
  if (status === "current") return "Do now";
  if (status === "next") return "Next";
  return "Later";
}

function MiniGuide({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="flex gap-2 rounded-xl bg-slate-50 p-2 text-xs leading-5 text-slate-600">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#073B2A]" />
      <span><span className="font-black text-[#102033]">{title}:</span> {text}</span>
    </div>
  );
}

export function WorkspaceClient() {
  const [project, setProject] = useState<DaliliProject | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setProject(getActiveProject());
      setSteps(getWorkflowSteps());
      setProgress(getWorkflowProgressPercent());
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("dalili-projects-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dalili-projects-changed", refresh);
    };
  }, []);

  const currentStep = useMemo(() => steps.find((step) => step.status === "current") ?? steps[steps.length - 1], [steps]);
  const suggestedIndicators = planTemplates[project?.sector ?? "Other"] ?? planTemplates.Other;
  const aiSuggestedIndicators = getSuggestedIndicatorsForSector(project?.sector).slice(0, 4);

  if (!project) {
    return (
      <div className="compact-page">
        <section className="compact-hero bg-[#073B2A] text-white shadow-sm">
          <p className="compact-label text-emerald-100">Guided M&E assistant</p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="max-w-3xl text-2xl font-black">Set up project monitoring without needing an M&E officer.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-5 text-emerald-50">Create a project. Dalili will guide what to track, what evidence to collect, how to check it and how to produce a report.</p>
            </div>
            <a href="/projects?new=1" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-[#073B2A]">Create first project <ArrowRight className="h-4 w-4" /></a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="compact-page">
      <section className="compact-hero bg-[#073B2A] text-white shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="compact-label text-emerald-100">Project guide</p>
            <h1 className="mt-1 truncate text-2xl font-black">{project.name}</h1>
            <p className="mt-1 text-sm leading-5 text-emerald-50">Goal: produce a trusted report or brief from this project’s evidence.</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-white/10 px-2.5 py-1">{project.organisation || "Organisation missing"}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">{project.sector || "Sector missing"}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">{project.geography || project.country || "Geography missing"}</span>
            </div>
          </div>
          <div className="w-full rounded-2xl bg-white/10 p-3 lg:max-w-xs">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-50"><span>Journey progress</span><span>{progress}%</span></div>
            <div className="mt-2 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-[#F5B400]" style={{ width: `${progress}%` }} /></div>
            {currentStep ? <a href={currentStep.href} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-[#073B2A]">{currentStep.cta} <ArrowRight className="h-4 w-4" /></a> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div className="compact-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="compact-label text-[#0B6B4B]">Step-by-step path</p>
              <h2 className="text-lg font-black text-[#102033]">Follow this until you have a report.</h2>
            </div>
            <details className="compact-details text-xs text-slate-500">
              <summary className="inline-flex items-center gap-1 font-bold text-[#0B6B4B]"><Info className="h-3.5 w-3.5" /> How it works</summary>
              <p className="mt-2 max-w-md rounded-xl bg-slate-50 p-3 leading-5">Dalili shows the practical action first. Evidence, calculation and technical details stay available when you need to check them.</p>
            </details>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {steps.map((step, index) => (
              <a key={step.key} href={step.href} className={`rounded-2xl border p-3 transition hover:border-emerald-200 hover:bg-emerald-50 ${statusClasses(step.status)}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-[#073B2A] shadow-sm">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-[#102033]">{step.plainTitle}</h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-600 shadow-sm">{statusLabel(step.status)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{step.description}</p>
                    <details className="compact-details mt-2 text-[11px] text-slate-500">
                      <summary className="font-bold text-[#0B6B4B]">Why this matters</summary>
                      <p className="mt-1 rounded-xl bg-white/70 p-2 leading-5">{step.beginnerHelp}</p>
                    </details>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <section className="compact-section border-amber-100 bg-amber-50">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-700" /><h2 className="text-base font-black text-amber-950">Dalili draft M&E plan</h2></div>
            <p className="mt-1 text-xs leading-5 text-amber-900">A starter plan based on your project sector. Edit it as you learn more.</p>
            <div className="mt-3 space-y-2">
              {aiSuggestedIndicators.map((item) => (
                <details key={item.label} className="compact-details rounded-xl bg-white p-3 text-sm shadow-sm">
                  <summary className="font-black text-[#102033]">{item.plainQuestion}</summary>
                  <div className="mt-2 text-xs leading-5 text-slate-600">
                    <p>{item.description}</p>
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500">{item.suggestedFormula}</p>
                  </div>
                </details>
              ))}
            </div>
            <a href="/indicators" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#073B2A] px-3 py-2 text-sm font-black text-white">Track results <ArrowRight className="h-4 w-4" /></a>
          </section>

          <section className="compact-section">
            <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#073B2A]" /><h2 className="text-base font-black text-[#102033]">Starter measures</h2></div>
            <div className="mt-3 grid gap-2">
              {suggestedIndicators.map((item) => (
                <div key={item} className="flex gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 text-xs text-slate-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#073B2A]" /><span>{item}</span></div>
              ))}
            </div>
          </section>

          <section className="compact-section">
            <h2 className="text-base font-black text-[#102033]">Quick glossary</h2>
            <div className="mt-3 space-y-2">
              <MiniGuide icon={Database} title="Evidence" text="Registers, surveys, Kobo exports, reports, attendance lists or other proof of work done." />
              <MiniGuide icon={ShieldAlert} title="Quality check" text="A safety check before using numbers in reports." />
              <MiniGuide icon={Lightbulb} title="Finding" text="A short statement about what the data shows, with evidence behind it." />
              <MiniGuide icon={FileText} title="Output" text="A report, brief, presentation or evidence pack you can share." />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
