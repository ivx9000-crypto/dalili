export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f2f4f7] px-4 py-10 text-[#102033]">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#073B2A]">Dalili Privacy Notice</div>
        <h1 className="text-3xl font-black text-[#073B2A]">Privacy Notice</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">Dalili helps organisations upload, review, analyse and report on programme and research data. Users remain responsible for ensuring that personal data is collected, uploaded, processed and shared lawfully.</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <section><h2 className="font-bold text-[#102033]">What Dalili processes</h2><p>Dalili may process uploaded datasets, documents, indicator definitions, quality reports, report drafts, user account details, organisation settings and audit information created while using the platform.</p></section>
          <section><h2 className="font-bold text-[#102033]">User responsibility</h2><p>Before uploading data, users should confirm that they have a lawful basis, approval or documented purpose for processing the data, especially where records contain personal, health, child, protection, financial vulnerability or precise location data.</p></section>
          <section><h2 className="font-bold text-[#102033]">Data minimisation</h2><p>Users should remove direct identifiers where they are not needed for analysis. Dalili flags likely personal or sensitive columns, but the organisation remains responsible for validating the file before analysis and export.</p></section>
          <section><h2 className="font-bold text-[#102033]">Exports and sharing</h2><p>Reports, briefs and annexes generated from Dalili should be reviewed before external sharing. Sensitive exports should only be shared with authorised recipients.</p></section>
          <section><h2 className="font-bold text-[#102033]">Status</h2><p>This is a starter privacy notice for product readiness. It should be reviewed by a qualified legal/data protection adviser before public launch.</p></section>
        </div>
      </section>
    </main>
  );
}
