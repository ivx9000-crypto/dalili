"use client";

import { useEffect, useState } from "react";

type Indicator = { indicator_name?: string; percentage?: number; numerator_count?: number; denominator_count?: number; target?: number | null };

export function IndicatorTable() {
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("dalili.latestIndicatorResult") || window.localStorage.getItem("dalili.latestBackendIndicatorResult");
      setIndicator(raw ? JSON.parse(raw) : null);
    } catch { setIndicator(null); }
  }, []);
  return (
    <div className="card p-6">
      <h2 className="mb-4 font-bold">Latest indicator</h2>
      {indicator ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="font-bold text-[#102033]">{indicator.indicator_name || "Unnamed indicator"}</div>
          <div className="mt-2 text-3xl font-black text-[#073B2A]">{Number(indicator.percentage || 0).toFixed(1)}%</div>
          <div className="mt-1 text-slate-500">{indicator.numerator_count ?? 0} / {indicator.denominator_count ?? 0}</div>
        </div>
      ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No indicator calculated yet. Create one in the Indicators module.</div>}
      <a className="mt-4 block text-sm font-semibold text-dalili-green" href="/indicators">Open indicators →</a>
    </div>
  );
}
