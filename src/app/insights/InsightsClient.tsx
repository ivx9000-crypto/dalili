"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FileWarning, Lightbulb, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";

type GroupResult = {
  group: string;
  numerator: number;
  denominator: number;
  percentage: number;
  gapToTarget: number | null;
};

type IndicatorPayload = {
  indicatorName: string;
  fileName: string;
  generatedAt: string;
  numeratorCondition: string;
  denominatorCondition: string;
  numerator: number;
  denominator: number;
  percentage: number;
  target: number | null;
  disaggregateBy: string;
  groups: GroupResult[];
};

type QualityPayload = {
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  columns: number;
  duplicateRows: number;
  qualityScore: number;
  issues: { type: string; detail: string; severity: "high" | "medium" | "low" }[];
  missingness: { column: string; missing: number; percentage: number }[];
};

type InsightStatus = "pending" | "approved" | "rejected" | "flagged";

type ProjectRecord = {
  id: string;
  backendId?: number;
  name: string;
  organisation?: string;
  source?: "backend" | "local";
};

type BackendDataset = {
  id: number;
  project_id: number;
  filename: string;
  row_count: number;
  column_count: number;
  quality_score?: number | null;
  storage_path?: string | null;
  created_at: string;
};

type BackendIndicatorResult = {
  id: number;
  project_id: number;
  dataset_id?: number | null;
  file_name: string;
  indicator_name: string;
  percentage: number;
  created_at: string;
};

type BackendInsightReview = {
  id: number;
  project_id: number;
  dataset_id?: number | null;
  indicator_result_id?: number | null;
  insight_key: string;
  title: string;
  status: InsightStatus;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type InsightCard = {
  id: string;
  title: string;
  finding: string;
  recommendation: string;
  source: string;
  calculation: string;
  confidence: "High" | "Medium" | "Low";
  caveat: string;
  status: InsightStatus;
  severity: "positive" | "warning" | "critical" | "neutral";
};

function fmtDate(value?: string) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getActiveProjectFromStorage(): ProjectRecord | null {
  return readJson<ProjectRecord>("dalili.activeProject");
}

async function checkBackendHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Backend offline");
  return response.json();
}

async function postInsightReview(payload: Record<string, unknown>): Promise<BackendInsightReview> {
  const response = await fetch(`${API_BASE}/insight-reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Failed to save insight review");
  }

  return response.json();
}

function statusClass(status: InsightStatus) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "flagged") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function severityClass(severity: InsightCard["severity"]) {
  if (severity === "positive") return "bg-emerald-50 text-emerald-700";
  if (severity === "critical") return "bg-rose-50 text-rose-700";
  if (severity === "warning") return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-700";
}

function buildInsights(indicator: IndicatorPayload, quality: QualityPayload | null): InsightCard[] {
  const qualityScore = quality?.qualityScore ?? null;
  const hasTarget = typeof indicator.target === "number";
  const gap = hasTarget ? Math.round((indicator.percentage - Number(indicator.target)) * 10) / 10 : null;
  const lowestGroup = indicator.groups?.length
    ? [...indicator.groups].filter((g) => g.denominator > 0).sort((a, b) => a.percentage - b.percentage)[0]
    : null;
  const highestMissing = quality?.missingness?.length ? [...quality.missingness].sort((a, b) => b.percentage - a.percentage)[0] : null;

  const insights: InsightCard[] = [
    {
      id: "overall-performance",
      title: hasTarget ? "Indicator performance against target" : "Indicator performance summary",
      finding: hasTarget
        ? `${indicator.indicatorName} is ${indicator.percentage}%, based on ${indicator.numerator} of ${indicator.denominator} eligible records. This is ${gap! >= 0 ? `${gap} percentage points above` : `${Math.abs(gap!)} percentage points below`} the target of ${indicator.target}%.`
        : `${indicator.indicatorName} is ${indicator.percentage}%, based on ${indicator.numerator} of ${indicator.denominator} eligible records. No target has been set for this indicator yet.`,
      recommendation: hasTarget && gap! < 0
        ? "Review the lowest-performing disaggregation groups and agree a programme action before using this result in a report."
        : "Validate the calculation and approve it for reporting if the numerator and denominator rules are correct.",
      source: indicator.fileName,
      calculation: `${indicator.numerator} / ${indicator.denominator} = ${indicator.percentage}%`,
      confidence: indicator.denominator >= 100 ? "High" : indicator.denominator >= 30 ? "Medium" : "Low",
      caveat: indicator.denominator === 0 ? "The denominator is zero, so this result should not be reported." : `Numerator rule: ${indicator.numeratorCondition}. Denominator rule: ${indicator.denominatorCondition}.`,
      status: "pending",
      severity: hasTarget && gap! < 0 ? "warning" : "positive",
    },
  ];

  if (lowestGroup && indicator.disaggregateBy) {
    insights.push({
      id: "lowest-group",
      title: `Lowest ${indicator.disaggregateBy} group`,
      finding: `${lowestGroup.group} has the lowest result among the visible disaggregation groups: ${lowestGroup.percentage}%, based on ${lowestGroup.numerator} of ${lowestGroup.denominator} records.`,
      recommendation: "Check whether this gap reflects real programme performance, missing data, or coding inconsistencies before taking action.",
      source: indicator.fileName,
      calculation: `${lowestGroup.numerator} / ${lowestGroup.denominator} = ${lowestGroup.percentage}%`,
      confidence: lowestGroup.denominator >= 50 ? "High" : lowestGroup.denominator >= 20 ? "Medium" : "Low",
      caveat: `This finding only uses the uploaded prototype dataset stored in the browser. Disaggregation variable: ${indicator.disaggregateBy}.`,
      status: "pending",
      severity: hasTarget && lowestGroup.gapToTarget !== null && lowestGroup.gapToTarget < 0 ? "critical" : "neutral",
    });
  }

  if (qualityScore !== null) {
    insights.push({
      id: "data-quality-context",
      title: "Data quality context",
      finding: `The latest quality score for ${quality?.fileName} is ${qualityScore}/100. Dalili detected ${quality?.issues?.length ?? 0} quality issue(s), including ${quality?.duplicateRows ?? 0} duplicate row(s).`,
      recommendation: qualityScore < 75 ? "Resolve high-priority quality issues before approving this insight for external reporting." : "The quality score is acceptable for draft analysis, but the finding should still be reviewed.",
      source: quality?.fileName ?? indicator.fileName,
      calculation: `Quality score: ${qualityScore}/100; duplicate rows: ${quality?.duplicateRows ?? 0}`,
      confidence: qualityScore >= 80 ? "High" : qualityScore >= 60 ? "Medium" : "Low",
      caveat: "This prototype quality score is based on simple browser-side checks. The production version will use a stronger backend DQA engine.",
      status: "pending",
      severity: qualityScore < 60 ? "critical" : qualityScore < 80 ? "warning" : "positive",
    });
  }

  if (highestMissing && highestMissing.percentage > 0) {
    insights.push({
      id: "missingness-warning",
      title: "Missing data warning",
      finding: `${highestMissing.column} has the highest missingness among checked columns: ${highestMissing.missing} missing value(s), equal to ${highestMissing.percentage}%.`,
      recommendation: "Confirm whether this missingness is expected due to skip logic or whether it needs cleaning before reporting.",
      source: quality?.fileName ?? indicator.fileName,
      calculation: `${highestMissing.missing} missing values = ${highestMissing.percentage}%`,
      confidence: "Medium",
      caveat: "Missingness can be valid if caused by survey skip logic. Human review is required.",
      status: "pending",
      severity: highestMissing.percentage >= 30 ? "critical" : "warning",
    });
  }

  return insights;
}

export function InsightsClient() {
  const [indicator, setIndicator] = useState<IndicatorPayload | null>(null);
  const [quality, setQuality] = useState<QualityPayload | null>(null);
  const [statuses, setStatuses] = useState<Record<string, InsightStatus>>({});
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [backendDataset, setBackendDataset] = useState<BackendDataset | null>(null);
  const [backendIndicator, setBackendIndicator] = useState<BackendIndicatorResult | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [isSavingReviews, setIsSavingReviews] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Backend not checked yet.");

  useEffect(() => {
    try {
      const savedIndicator = window.localStorage.getItem("dalili.latestIndicatorResult");
      const savedQuality = window.localStorage.getItem("dalili.latestQualityReport");
      if (savedIndicator) setIndicator(JSON.parse(savedIndicator));
      if (savedQuality) setQuality(JSON.parse(savedQuality));
      const savedStatuses = window.localStorage.getItem("dalili.insightStatuses");
      if (savedStatuses) setStatuses(JSON.parse(savedStatuses));
      setActiveProject(getActiveProjectFromStorage());
      setBackendDataset(readJson<BackendDataset>("dalili.latestBackendDataset"));
      setBackendIndicator(readJson<BackendIndicatorResult>("dalili.latestBackendIndicatorResult"));

      checkBackendHealth()
        .then(() => {
          setBackendOnline(true);
          setBackendStatus("Backend connected. Insight reviews can be saved to the database.");
        })
        .catch(() => {
          setBackendOnline(false);
          setBackendStatus("Backend offline. Insight reviews are currently browser-only.");
        });
    } catch {
      setIndicator(null);
      setQuality(null);
    }
  }, []);

  const insights = useMemo(() => {
    if (!indicator) return [];
    return buildInsights(indicator, quality).map((insight) => ({
      ...insight,
      status: statuses[insight.id] ?? insight.status,
    }));
  }, [indicator, quality, statuses]);

  function updateStatus(id: string, status: InsightStatus) {
    const next = { ...statuses, [id]: status };
    setStatuses(next);
    window.localStorage.setItem("dalili.insightStatuses", JSON.stringify(next));
  }

  async function saveInsightsToBackend() {
    if (!indicator || insights.length === 0) return;

    const project = activeProject ?? getActiveProjectFromStorage();
    const latestBackendDataset = backendDataset ?? readJson<BackendDataset>("dalili.latestBackendDataset");
    const latestBackendIndicator = backendIndicator ?? readJson<BackendIndicatorResult>("dalili.latestBackendIndicatorResult");

    if (!project?.backendId) {
      setBackendStatus("Select or create a backend-saved project first, then save insight reviews.");
      return;
    }

    if (latestBackendDataset && latestBackendDataset.project_id !== project.backendId) {
      setBackendStatus("The latest backend dataset belongs to a different project. Upload the dataset again under the active project before saving insights.");
      return;
    }

    if (latestBackendIndicator && latestBackendIndicator.project_id !== project.backendId) {
      setBackendStatus("The latest backend indicator belongs to a different project. Save the indicator again under the active project before saving insights.");
      return;
    }

    setIsSavingReviews(true);
    try {
      await checkBackendHealth();
      setBackendOnline(true);

      const saved: BackendInsightReview[] = [];
      for (const insight of insights) {
        const review = await postInsightReview({
          project_id: project.backendId,
          dataset_id: latestBackendDataset?.id ?? latestBackendIndicator?.dataset_id ?? null,
          indicator_result_id: latestBackendIndicator?.id ?? null,
          insight_key: insight.id,
          title: insight.title,
          finding: insight.finding,
          recommendation: insight.recommendation,
          source: insight.source,
          calculation: insight.calculation,
          confidence: insight.confidence,
          caveat: insight.caveat,
          status: insight.status,
          severity: insight.severity,
          reviewer: "Dalili user",
        });
        saved.push(review);
      }

      window.localStorage.setItem("dalili.latestBackendInsightReviews", JSON.stringify(saved));
      setBackendStatus(`${saved.length} insight review(s) saved to backend under project #${project.backendId}.`);
    } catch {
      setBackendOnline(false);
      setBackendStatus("Backend save failed. Insight statuses are still saved in browser storage.");
    } finally {
      setIsSavingReviews(false);
    }
  }

  function exportInsights() {
    if (!indicator) return;
    const lines = [
      "DALILI INSIGHT REVIEW",
      "=====================",
      `Indicator: ${indicator.indicatorName}`,
      `Dataset: ${indicator.fileName}`,
      `Generated from indicator result: ${fmtDate(indicator.generatedAt)}`,
      "",
      ...insights.flatMap((insight, index) => [
        `${index + 1}. ${insight.title}`,
        `Status: ${insight.status}`,
        `Finding: ${insight.finding}`,
        `Recommendation: ${insight.recommendation}`,
        `Source: ${insight.source}`,
        `Calculation: ${insight.calculation}`,
        `Confidence: ${insight.confidence}`,
        `Caveat: ${insight.caveat}`,
        "",
      ]),
    ];
    downloadText(`dalili-insights-${indicator.indicatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`, lines.join("\n"));
  }

  if (!indicator) {
    return (
      <div className="card p-8">
        <div className="flex max-w-3xl items-start gap-4">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
            <FileWarning className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Insights</p>
            <h1 className="mt-2 text-2xl font-bold text-dalili-ink">No indicator result available</h1>
            <p className="mt-3 text-slate-500">
              Go to Data Room, upload a dataset, then open Indicators and calculate an indicator. Dalili will turn that result into traceable insight cards here.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/data-room" className="rounded-2xl bg-dalili-green px-5 py-3 text-sm font-bold text-white">Upload dataset</a>
              <a href="/indicators" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-dalili-ink">Open indicators</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const approved = insights.filter((item) => item.status === "approved").length;
  const rejected = insights.filter((item) => item.status === "rejected").length;
  const flagged = insights.filter((item) => item.status === "flagged").length;

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-[#073b2a] px-6 py-6 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">Insights</p>
              <h1 className="mt-2 text-2xl font-bold">Traceable insight review</h1>
              <p className="mt-2 max-w-3xl text-sm text-emerald-50/90">
                Dalili has converted the latest indicator result into reviewable insight cards. Each finding keeps its source, calculation, confidence level, and caveat visible.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={saveInsightsToBackend} disabled={isSavingReviews} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-bold text-[#073b2a] disabled:cursor-not-allowed disabled:opacity-60">
                <Database className="h-4 w-4" />
                {isSavingReviews ? "Saving..." : "Save reviews"}
              </button>
              <button onClick={exportInsights} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#073b2a]">
                <Download className="h-4 w-4" />
                Export review
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Indicator</p>
            <p className="mt-2 text-lg font-bold text-dalili-ink">{indicator.indicatorName}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Result</p>
            <p className="mt-2 text-3xl font-black text-dalili-green">{indicator.percentage}%</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Calculation</p>
            <p className="mt-2 text-lg font-bold text-dalili-ink">{indicator.numerator}/{indicator.denominator}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Review status</p>
            <p className="mt-2 text-sm font-bold text-slate-700">{approved} approved · {flagged} flagged · {rejected} rejected</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {insights.map((insight) => (
            <article key={insight.id} className="card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`rounded-2xl p-3 ${severityClass(insight.severity)}`}>
                    {insight.severity === "positive" ? <CheckCircle2 className="h-5 w-5" /> : insight.severity === "critical" ? <AlertTriangle className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-dalili-ink">{insight.title}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${statusClass(insight.status)}`}>{insight.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{insight.finding}</p>
                    <p className="mt-3 text-sm font-semibold text-dalili-ink">Recommended action</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{insight.recommendation}</p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button onClick={() => updateStatus(insight.id, "approved")} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
                    <ThumbsUp className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => updateStatus(insight.id, "flagged")} className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-xs font-bold text-white">
                    <AlertTriangle className="h-4 w-4" /> Flag
                  </button>
                  <button onClick={() => updateStatus(insight.id, "rejected")} className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white">
                    <ThumbsDown className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Source</p>
                  <p className="mt-1 text-sm font-semibold text-dalili-ink">{insight.source}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Show calculation</p>
                  <p className="mt-1 text-sm font-semibold text-dalili-ink">{insight.calculation}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Confidence</p>
                  <p className="mt-1 text-sm font-semibold text-dalili-ink">{insight.confidence}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Caveat</p>
                  <p className="mt-1 text-sm text-slate-600">{insight.caveat}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-5">
          <div className={`card p-6 ${backendOnline ? "border-emerald-200" : "border-amber-200"}`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl p-3 ${backendOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-dalili-ink">Backend storage</p>
                <p className="text-xs text-slate-500">Save review decisions in the database.</p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{backendStatus}</p>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Project</dt><dd className="font-semibold text-dalili-ink text-right">{activeProject?.backendId ? `#${activeProject.backendId}` : "Browser-only"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Dataset</dt><dd className="font-semibold text-dalili-ink text-right">{backendDataset?.id ? `#${backendDataset.id}` : "Not linked"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Indicator</dt><dd className="font-semibold text-dalili-ink text-right">{backendIndicator?.id ? `#${backendIndicator.id}` : "Not linked"}</dd></div>
            </dl>
            <button onClick={saveInsightsToBackend} disabled={isSavingReviews || !activeProject?.backendId} className="mt-4 w-full rounded-2xl bg-[#073b2a] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSavingReviews ? "Saving reviews..." : "Save insight reviews"}
            </button>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-bold text-dalili-ink">Human validation</p>
                <p className="text-xs text-slate-500">No finding should move to reports before review.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p><strong className="text-dalili-ink">Approved:</strong> ready for report drafting.</p>
              <p><strong className="text-dalili-ink">Flagged:</strong> needs cleaning, context, or manager review.</p>
              <p><strong className="text-dalili-ink">Rejected:</strong> should not be used.</p>
            </div>
          </div>

          <div className="card p-6">
            <p className="text-sm font-bold text-dalili-ink">Dataset context</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Indicator source</dt><dd className="font-semibold text-dalili-ink">{indicator.fileName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Generated</dt><dd className="font-semibold text-dalili-ink text-right">{fmtDate(indicator.generatedAt)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Quality score</dt><dd className="font-semibold text-dalili-ink">{quality ? `${quality.qualityScore}/100` : "Not available"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Target</dt><dd className="font-semibold text-dalili-ink">{indicator.target === null ? "Not set" : `${indicator.target}%`}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
