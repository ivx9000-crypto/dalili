"use client";

import { CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

type ActivityItem = {
  label: string;
  detail: string;
  href: string;
  done: boolean;
};

function hasStorage(key: string) {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(key));
}

export function ProjectActivityTimeline() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  function refresh() {
    const hasProject = hasStorage("dalili.activeProject");
    const hasDataset = hasStorage("dalili.latestDataset") || hasStorage("dalili.latestBackendDataset");
    const hasQuality = hasStorage("dalili.latestQualityReport") || hasStorage("dalili.latestBackendQualityReport");
    const hasIndicator = hasStorage("dalili.latestIndicatorResult") || hasStorage("dalili.latestBackendIndicatorResult");
    const hasInsights = hasStorage("dalili.insightStatuses") || hasStorage("dalili.latestBackendInsightReview");
    const hasReport = hasStorage("dalili.latestBackendReportDraft") || hasStorage("dalili.reportStatus");

    setItems([
      { label: "Project created", detail: "Attach every analysis output to one active project.", href: "/projects", done: hasProject },
      { label: "Dataset uploaded", detail: "Upload Excel, CSV or Kobo/ODK export data.", href: "/data-room", done: hasDataset },
      { label: "Quality checked", detail: "Review missingness, duplicates and readiness.", href: "/quality-check", done: hasQuality },
      { label: "Indicator calculated", detail: "Store numerator, denominator, target and calculation trace.", href: "/indicators", done: hasIndicator },
      { label: "Insights reviewed", detail: "Approve, flag or reject findings before reporting.", href: "/insights", done: hasInsights },
      { label: "Report drafted", detail: "Save draft, set review status and export outputs.", href: "/reports", done: hasReport },
    ]);
  }

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("dalili-projects-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("dalili-projects-changed", handler);
    };
  }, []);

  const completed = items.filter((item) => item.done).length;

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Project activity</p>
          <h2 className="mt-2 text-xl font-black text-dalili-ink">Evidence workflow timeline</h2>
          <p className="mt-2 text-sm text-slate-500">Track what has already been completed for the active project.</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-[#073B2A]">
          {completed}/{items.length}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <a key={item.label} href={item.href} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 hover:bg-white">
            {item.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />}
            <div>
              <div className="text-sm font-bold text-dalili-ink">{item.label}</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        <Clock3 className="h-4 w-4 shrink-0" />
        Refresh this page after running backend actions if a timeline item has not updated automatically.
      </div>
    </section>
  );
}
