import { CheckCircle2 } from "lucide-react";

const steps = [
  { label: "Tell Dalili about your project", href: "/projects" },
  { label: "Open the Project Guide", href: "/workspace" },
  { label: "Add evidence or data", href: "/data-room" },
  { label: "Check if data is usable", href: "/quality-check" },
  { label: "Choose what to measure", href: "/indicators" },
  { label: "Create report or brief", href: "/reports" },
];

export function ProductOnboardingCard() {
  return (
    <section className="rounded-3xl bg-[#073B2A] p-5 text-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
            <CheckCircle2 className="h-4 w-4" /> Guided M&E journey
          </div>
          <h2 className="mt-3 text-2xl font-black">No M&E staff? Dalili guides the M&E work step by step.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/90">
            Start with a project. Dalili then helps you decide what evidence to collect, checks whether the data is usable, suggests simple indicators, helps review findings, and turns everything into a report or brief.
          </p>
        </div>
        <a href="/workspace" className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#073B2A] hover:bg-emerald-50">
          Start guided setup
        </a>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => (
          <a key={step.label} href={step.href} className="rounded-2xl bg-white/10 p-4 text-sm hover:bg-white/15">
            <div className="text-xs font-black text-emerald-100">{String(index + 1).padStart(2, "0")}</div>
            <div className="mt-2 font-semibold text-white">{step.label}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
