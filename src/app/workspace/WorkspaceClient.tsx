"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, Database, FileText, HelpCircle, Lightbulb, Map, ShieldAlert, Sparkles } from "lucide-react";
import type { ElementType } from "react";
import { getActiveProject, getWorkflowProgressPercent, getWorkflowSteps, type DaliliProject, type WorkflowStep } from "@/lib/workflow";
import { getSuggestedIndicatorsForSector } from "@/lib/ai-guidance";

const planTemplates: Record<string, string[]> = {
  "Health / SRH / HIV": [
    "Number of clients reached with services",
    "Percent of eligible clients receiving the intended service",
    "Client satisfaction or referral willingness",
    "Stock-out or service availability issues",
    "Age, sex and location breakdown of service users",
  ],
  Education: [
    "Number of learners enrolled",
    "Attendance rate",
    "Completion rate",
    "Learning or skills improvement",
    "Learner satisfaction and barriers to participation",
  ],
  WASH: [
    "Number of people reached with WASH services",
    "Functionality of water/sanitation facilities",
    "Adoption of hygiene practices",
    "Reported barriers to access",
    "Community satisfaction with services",
  ],
  "Agriculture / Livelihoods": [
    "Number of participants trained or supported",
    "Adoption of promoted practices",
    "Income or productivity change",
    "Access to inputs, markets or finance",
    "Gender and location breakdown of benefits",
  ],
  "Protection / SGBV": [
    "Number of people reached with prevention or response services",
    "Referral completion rate",
    "Safe and confidential service access",
    "Reported barriers to support",
    "Sensitive case data reviewed with strict access controls",
  ],
  "Research / Evaluation": [
    "Number of respondents or records analysed",
    "Response/completion rate",
    "Key outcome indicators",
    "Disaggregation by priority groups",
    "Limitations and data quality caveats",
  ],
  Other: [
    "Number of people or sites reached",
    "Activity completion rate",
    "Progress against target",
    "Participant/client satisfaction",
    "Key barriers and recommended actions",
  ],
};

function statusClasses(status: WorkflowStep["status"]) {
  if (status === "complete") return "border-emerald-200 bg-emerald-50";
  if (status === "current") return "border-amber-200 bg-amber-50";
  if (status === "next") return "border-slate-200 bg-white";
  return "border-slate-100 bg-slate-50 opacity-70";
}

function statusLabel(status: WorkflowStep["status"]) {
  if (status === "complete") return "Complete";
  if (status === "current") return "Do this now";
  if (status === "next") return "Next";
  return "Locked until earlier steps are done";
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
      <div className="space-y-6">
        <section className="rounded-3xl bg-[#073B2A] p-6 text-white shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-100">Guided M&E assistant</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black">Dalili helps teams without M&E staff know what to track, what data to collect, and how to report progress.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-emerald-50">Start by creating a project. Dalili will then guide you through evidence, quality checks, indicators, findings and report outputs.</p>
          <a href="/projects?new=1" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#073B2A]">
            Create first project <ArrowRight className="h-4 w-4" />
          </a>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#073B2A] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-100">Project guide</p>
            <h1 className="mt-3 text-3xl font-black">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50">Goal: move from project implementation to a trusted M&E output — even if your team does not have a dedicated M&E officer.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/10 px-3 py-1">{project.organisation || "Organisation not specified"}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{project.sector || "Sector not specified"}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{project.geography || project.country || "Geography not specified"}</span>
            </div>
          </div>
          <div className="w-full max-w-sm rounded-3xl bg-white/10 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-50">
              <span>M&E journey progress</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-3 rounded-full bg-white/20">
              <div className="h-3 rounded-full bg-[#F5B400]" style={{ width: `${progress}%` }} />
            </div>
            {currentStep ? (
              <a href={currentStep.href} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#073B2A]">
                {currentStep.cta} <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-700"><Sparkles className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-black text-[#102033]">What should I do next?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Dalili should always point you to the next practical action. Follow the steps below from top to bottom.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {steps.map((step, index) => (
              <a key={step.key} href={step.href} className={`block rounded-3xl border p-4 transition hover:border-emerald-200 hover:bg-emerald-50 ${statusClasses(step.status)}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#073B2A] shadow-sm">{index + 1}</div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-[#102033]">{step.plainTitle}</h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 shadow-sm">{statusLabel(step.status)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{step.beginnerHelp}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <section className="card border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-amber-700"><Sparkles className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-black text-amber-950">Dalili AI draft M&E plan</h2>
                <p className="mt-1 text-sm leading-6 text-amber-900">Based on the project sector and details available, Dalili suggests a simple monitoring plan. Edit it as your project becomes clearer.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {aiSuggestedIndicators.map((item) => (
                <div key={item.label} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                  <div className="font-black text-[#102033]">{item.plainQuestion}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{item.description}</div>
                  <div className="mt-2 rounded-xl bg-slate-50 p-2 text-[11px] leading-5 text-slate-500">{item.suggestedFormula}</div>
                </div>
              ))}
            </div>
            <a href="/indicators" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#073B2A] px-4 py-3 text-sm font-black text-white">Use these to track results <ArrowRight className="h-4 w-4" /></a>
          </section>

          <section className="card p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-[#073B2A]"><ClipboardList className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-black text-[#102033]">Simple M&E plan</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">For a team without M&E staff, start by tracking these practical measures.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {suggestedIndicators.map((item) => (
                <div key={item} className="flex gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#073B2A]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <a href="/indicators" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-black text-[#073B2A] hover:bg-emerald-50">Turn these into tracked results <ArrowRight className="h-4 w-4" /></a>
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-black text-[#102033]">Plain-language guide</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <Guide icon={Database} title="Evidence" text="Anything that proves what happened: registers, surveys, Kobo exports, reports, photos lists, attendance or finance records." />
              <Guide icon={ShieldAlert} title="Quality check" text="A safety check before using numbers in a report. It flags missing, duplicated, inconsistent or sensitive data." />
              <Guide icon={BarChart3} title="Tracked result" text="A simple measure of progress, such as people reached, percent completed, target achieved, or satisfaction level." />
              <Guide icon={Lightbulb} title="Insight" text="A finding that explains what the data means and what action may be needed." />
              <Guide icon={FileText} title="Output" text="The final report, brief, DQA summary or presentation you can share with a donor, client or manager." />
              <Guide icon={Map} title="Location view" text="A way to see where performance is strong, weak, missing or unequal across project areas." />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Guide({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="rounded-xl bg-slate-100 p-2 text-[#073B2A]"><Icon className="h-4 w-4" /></div>
      <div><span className="font-black text-[#102033]">{title}: </span>{text}</div>
    </div>
  );
}
