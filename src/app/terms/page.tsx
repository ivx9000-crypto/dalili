export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f2f4f7] px-4 py-10 text-[#102033]">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#073B2A]">Dalili Terms</div>
        <h1 className="text-3xl font-black text-[#073B2A]">Terms of Use</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">These starter terms explain the intended use of Dalili while the product is being prepared for online deployment.</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <section><h2 className="font-bold text-[#102033]">Purpose</h2><p>Dalili is an M&E and research intelligence tool for data quality review, indicator calculation, insight validation, report drafting and evidence management.</p></section>
          <section><h2 className="font-bold text-[#102033]">No automatic final judgement</h2><p>Dalili outputs are decision-support outputs. Users must review calculations, assumptions, filters, limitations and narrative findings before using them in donor reports, publications or management decisions.</p></section>
          <section><h2 className="font-bold text-[#102033]">User content</h2><p>Users are responsible for the accuracy, lawfulness and appropriateness of data, documents and content uploaded to Dalili.</p></section>
          <section><h2 className="font-bold text-[#102033]">Acceptable use</h2><p>Users should not upload data they are not authorised to process or share. Users should not use Dalili to produce misleading reports, hide limitations, or make unsupported claims.</p></section>
          <section><h2 className="font-bold text-[#102033]">Status</h2><p>These terms are a starter template and should be reviewed before public launch.</p></section>
        </div>
      </section>
    </main>
  );
}
