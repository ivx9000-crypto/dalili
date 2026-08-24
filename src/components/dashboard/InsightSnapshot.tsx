"use client";

import { useEffect, useState } from "react";

type Insight = { title?: string; finding?: string; status?: string; confidence?: string };

export function InsightSnapshot() {
  const [insight, setInsight] = useState<Insight | null>(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("dalili.latestBackendInsightReview");
      setInsight(raw ? JSON.parse(raw) : null);
    } catch { setInsight(null); }
  }, []);
  return (
    <div className="card p-6">
      <h2 className="mb-4 font-bold">Insight review</h2>
      {insight ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6">
          <div className="font-bold text-[#102033]">{insight.title || "Reviewed insight"}</div>
          <p className="mt-2 text-slate-600">{insight.finding || "No finding text saved."}</p>
          <div className="mt-3 flex gap-2"><span className="badge bg-emerald-50 text-emerald-700">{insight.status || "pending"}</span><span className="badge bg-slate-100 text-slate-700">{insight.confidence || "Medium"}</span></div>
        </div>
      ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No reviewed insight yet. Generate and validate insights before reporting.</div>}
      <a className="mt-4 block text-sm font-semibold text-dalili-green" href="/insights">Open insights →</a>
    </div>
  );
}
