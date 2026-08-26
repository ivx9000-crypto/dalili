import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { AIAssistantCard } from "@/components/dashboard/AIAssistantCard";
import { ProductOnboardingCard } from "@/components/dashboard/ProductOnboardingCard";
import { ProjectActivityTimeline } from "@/components/dashboard/ProjectActivityTimeline";
import { WorkflowNudge } from "@/components/workflow/WorkflowNudge";

function EmptyMetric({ label, detail, href }: { label: string; detail: string; href: string }) {
  return (
    <a href={href} className="card block p-5 hover:border-emerald-200 hover:bg-emerald-50/30">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black text-[#102033]">Not started</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </a>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Topbar />
      <ProductOnboardingCard />
      <WorkflowNudge context="dashboard" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EmptyMetric label="Projects" detail="Start the guided M&E journey. Dalili will help you know what to track, collect, analyse and report." href="/projects?new=1" />
        <EmptyMetric label="Data room" detail="Upload evidence you already have, or use the Project Guide to decide what data to collect." href="/data-room" />
        <EmptyMetric label="Indicators" detail="Calculate traceable numerators, denominators, percentages and disaggregations." href="/indicators" />
        <EmptyMetric label="Reports" detail="Draft and export branded reports after data and insights are reviewed." href="/reports" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <ProjectActivityTimeline />
        <AIAssistantCard />
      </div>
    </AppShell>
  );
}
