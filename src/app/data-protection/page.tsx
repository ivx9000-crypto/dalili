export default function DataProtectionPage() {
  return (
    <main className="min-h-screen bg-[#f2f4f7] px-4 py-10 text-[#102033]">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">Data Protection</div>
        <h1 className="text-3xl font-black text-[#073B2A]">Data Protection and Responsible Analysis</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">Dalili is designed to support responsible analysis by making data quality, source context, sensitivity flags and human review visible.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ["Before upload", "Confirm lawful purpose, minimise identifiers and select the correct sensitivity level."],
            ["During analysis", "Review missingness, duplicates, data dictionary flags, numerator/denominator rules and filters."],
            ["Before export", "Approve insights, verify report language and avoid sharing sensitive annexes unnecessarily."],
            ["After project closure", "Apply retention and deletion rules documented in Settings & Compliance."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-bold text-[#102033]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">This page is a product-readiness guide, not legal advice. Organisations should seek appropriate data protection advice before public deployment and external client use.</p>
      </section>
    </main>
  );
}
