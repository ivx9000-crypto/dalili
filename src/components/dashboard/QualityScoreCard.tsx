export function QualityScoreCard() {
  return (
    <div className="card p-6">
      <h2 className="mb-5 font-bold">Data Quality Overview</h2>
      <div className="flex flex-col items-center gap-5 md:flex-row">
        <div className="relative grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#0FA67A_0_86%,#F5B400_86%_94%,#EF4444_94%_100%)]">
          <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center">
            <div>
              <div className="text-3xl font-bold">95%</div>
              <div className="text-sm text-slate-500">Good</div>
            </div>
          </div>
        </div>
        <div className="w-full space-y-3 text-sm">
          <div className="flex justify-between"><span>Good</span><strong>95%</strong></div>
          <div className="flex justify-between"><span>Warnings</span><strong>3%</strong></div>
          <div className="flex justify-between"><span>Errors</span><strong>2%</strong></div>
          <a className="mt-4 block text-sm font-semibold text-dalili-green" href="/quality-check">View full quality report →</a>
        </div>
      </div>
    </div>
  );
}
