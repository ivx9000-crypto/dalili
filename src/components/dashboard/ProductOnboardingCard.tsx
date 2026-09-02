import { CheckCircle2 } from "lucide-react";

const steps = [
  { label: "Create the project", href: "/start" },
  { label: "Upload all evidence", href: "/start" },
  { label: "Dalili reviews it", href: "/start" },
  { label: "Approve findings", href: "/insights" },
  { label: "Create report", href: "/reports" },
];

export function ProductOnboardingCard() {
  return (
    <section className="rounded-3xl bg-[#073B2A] p-5 text-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
            <CheckCircle2 className="h-4 w-4" /> Guided M&E journey
          </div>
          <h2 className="mt-3 text-2xl font-black">No M&E staff? Start with one guided upload-to-report flow.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/90">
            Create a project, upload all the evidence you have, and Dalili will organise the data, check quality, suggest results, and prepare a donor report or brief for review.
          </p>
        </div>
        <a href="/start" className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#073B2A] hover:bg-emerald-50">
          Start analysis
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
