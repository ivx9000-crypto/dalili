import Link from "next/link";
import { ArrowRight, BarChart3, FileCheck, ShieldCheck, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <div className="mb-6 inline-flex rounded-full bg-dalili-green/10 px-4 py-2 text-sm font-semibold text-dalili-green">AI-assisted M&E and research intelligence</div>
          <h1 className="text-5xl font-black tracking-tight text-dalili-navy md:text-6xl">Find the evidence in your data.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Dalili turns Kobo, ODK, Excel, PDF and transcript data into quality checks, indicators, traceable insights and donor-ready reports.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-dalili-green px-5 py-3 font-semibold text-white shadow-soft">Create secure workspace <ArrowRight size={18} /></Link>
            <Link href="/login" className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-dalili-navy">Sign in</Link>
          </div>
        </div>
        <div className="card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [BarChart3, "Indicator analysis", "Define numerators, denominators, targets and disaggregation."],
              [FileCheck, "Quality checks", "Detect missing values, duplicates, invalid dates and outliers."],
              [Sparkles, "Traceable insights", "Every AI finding links to sources and calculations."],
              [ShieldCheck, "Governance", "Audit logs, PII detection and approval workflows."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof BarChart3;
              return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5" key={String(title)}><I className="mb-4 text-dalili-green" /><h3 className="font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{String(text)}</p></div>
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
