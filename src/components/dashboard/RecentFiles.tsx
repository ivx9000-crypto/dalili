"use client";

import { useEffect, useState } from "react";

type Dataset = { filename?: string; file_name?: string; row_count?: number; column_count?: number; created_at?: string };

export function RecentFiles() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("dalili.latestDataset") || window.localStorage.getItem("dalili.latestBackendDataset");
      setDataset(raw ? JSON.parse(raw) : null);
    } catch { setDataset(null); }
  }, []);
  return (
    <div className="card p-6">
      <h2 className="font-bold">Recent file</h2>
      {dataset ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm"><div className="font-bold">{dataset.filename || dataset.file_name}</div><div className="mt-1 text-slate-500">{dataset.row_count ?? 0} rows · {dataset.column_count ?? 0} columns</div></div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No dataset uploaded yet.</div>}
    </div>
  );
}
