"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileWarning,
  Save,
  Server,
  ShieldCheck,
  Table2,
  XCircle,
} from "lucide-react";

type QualityIssue = {
  type: "warning" | "error" | "success";
  title: string;
  description: string;
};

type MissingColumn = {
  column: string;
  missing: number;
  missingRate: number;
};

type QualityReport = {
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  columnCount: number;
  score: number;
  duplicateCount: number;
  missingByColumn: MissingColumn[];
  issues: QualityIssue[];
  previewColumns: string[];
  previewRows: Record<string, string | number | boolean | null>[];
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

type BackendQualityReport = {
  id: number;
  project_id: number;
  dataset_id: number;
  file_name: string;
  row_count: number;
  column_count: number;
  score: number;
  duplicate_count: number;
  readiness_label: string;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function scoreLabel(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Usable with review";
  if (score >= 50) return "Needs cleaning";
  return "High risk";
}

function reportText(report: QualityReport) {
  const lines = [
    "DALILI DATA QUALITY REPORT",
    "==========================",
    `File: ${report.fileName}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Rows: ${report.rowCount}`,
    `Columns: ${report.columnCount}`,
    `Quality score: ${report.score}/100 (${scoreLabel(report.score)})`,
    `Duplicate rows: ${report.duplicateCount}`,
    "",
    "QUALITY FINDINGS",
    "----------------",
    ...report.issues.map((issue, index) => `${index + 1}. [${issue.type.toUpperCase()}] ${issue.title} - ${issue.description}`),
    "",
    "MISSINGNESS BY COLUMN",
    "---------------------",
    ...report.missingByColumn
      .sort((a, b) => b.missingRate - a.missingRate)
      .map((item) => `${item.column}: ${item.missing} missing (${item.missingRate}%)`),
    "",
    "Suggested next step: review high-missingness columns, duplicate rows, empty fields, and any variables needed for core indicators before generating final insights.",
  ];
  return lines.join("\n");
}

async function checkBackendHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Backend is not responding");
  return response.json() as Promise<{ status: string }>;
}

async function postQualityReport(report: QualityReport, dataset: BackendDataset) {
  const response = await fetch(`${API_BASE}/quality-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: dataset.project_id,
      dataset_id: dataset.id,
      file_name: report.fileName,
      row_count: report.rowCount,
      column_count: report.columnCount,
      score: report.score,
      duplicate_count: report.duplicateCount,
      readiness_label: scoreLabel(report.score),
      issues_json: JSON.stringify(report.issues),
      missingness_json: JSON.stringify(report.missingByColumn),
      summary_text: reportText(report),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Quality report sync failed: ${response.status}`);
  }

  return response.json() as Promise<BackendQualityReport>;
}

export function QualityCheckClient() {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [backendDataset, setBackendDataset] = useState<BackendDataset | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Backend not checked yet.");
  const [isSyncing, setIsSyncing] = useState(false);
  const [latestBackendReport, setLatestBackendReport] = useState<BackendQualityReport | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("dalili.latestQualityReport");
    if (saved) {
      try {
        setReport(JSON.parse(saved));
      } catch {
        setReport(null);
      }
    }

    setBackendDataset(readJson<BackendDataset>("dalili.latestBackendDataset"));

    checkBackendHealth()
      .then(() => {
        setBackendOnline(true);
        setSyncStatus("Backend online. You can save this DQA report to the database.");
      })
      .catch(() => {
        setBackendOnline(false);
        setSyncStatus("Backend offline. The DQA report is currently only in browser storage.");
      });
  }, []);

  const topMissing = useMemo(() => {
    if (!report) return [];
    return [...report.missingByColumn].sort((a, b) => b.missingRate - a.missingRate).slice(0, 8);
  }, [report]);

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([reportText(report)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dalili-quality-report-${report.fileName.replace(/\.[^/.]+$/, "")}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function syncQualityReportToBackend() {
    if (!report) {
      setSyncStatus("No quality report is available to sync.");
      return;
    }

    const dataset = backendDataset ?? readJson<BackendDataset>("dalili.latestBackendDataset");
    setBackendDataset(dataset);

    if (!dataset?.id || !dataset.project_id) {
      setSyncStatus("No backend dataset record found. Go to Projects, select a backend-saved project, then upload the dataset again in Data Room.");
      return;
    }

    setIsSyncing(true);
    try {
      await checkBackendHealth();
      setBackendOnline(true);
      const saved = await postQualityReport(report, dataset);
      setLatestBackendReport(saved);
      window.localStorage.setItem("dalili.latestBackendQualityReport", JSON.stringify(saved));
      setSyncStatus(`Quality report saved to backend as record #${saved.id} for dataset #${saved.dataset_id}.`);
    } catch {
      setBackendOnline(false);
      setSyncStatus("Quality report sync failed. Keep the backend running and ensure the dataset was uploaded to a backend-saved project.");
    } finally {
      setIsSyncing(false);
    }
  }

  if (!report) {
    return (
      <div className="card p-8">
        <div className="flex max-w-3xl items-start gap-4">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
            <FileWarning className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Quality Check</p>
            <h1 className="mt-2 text-2xl font-bold text-dalili-ink">No dataset has been analysed yet</h1>
            <p className="mt-3 text-slate-500">
              Go to Data Room, upload an Excel or CSV file, and Dalili will save the latest quality snapshot for this report page.
            </p>
            <a href="/data-room" className="mt-6 inline-flex rounded-2xl bg-dalili-green px-5 py-3 text-sm font-bold text-white">
              Go to Data Room
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${backendOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <Server className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-dalili-ink">Backend DQA storage</p>
              <p className="mt-1 text-sm text-slate-500">{syncStatus}</p>
              {backendDataset ? (
                <p className="mt-1 text-xs text-slate-400">
                  Linked backend dataset: #{backendDataset.id} · project #{backendDataset.project_id} · {backendDataset.filename}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">No backend dataset link found yet.</p>
              )}
            </div>
          </div>
          <button
            onClick={syncQualityReportToBackend}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dalili-green px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSyncing ? "Saving..." : "Save DQA to backend"}
          </button>
        </div>
        {latestBackendReport ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            Backend quality report #{latestBackendReport.id} saved with score {latestBackendReport.score}/100 and readiness label “{latestBackendReport.readiness_label}”.
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Quality Check</p>
              <h1 className="mt-2 text-2xl font-bold text-dalili-ink">Data quality report</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Review whether this dataset is ready for indicator calculation, AI insight generation, and donor-ready reporting.
              </p>
              <p className="mt-4 text-sm font-semibold text-slate-600">File: {report.fileName}</p>
            </div>
            <button onClick={downloadReport} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dalili-navy px-5 py-3 text-sm font-bold text-white">
              <Download className="h-4 w-4" />
              Download DQA report
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-slate-50 p-5">
              <Database className="h-5 w-5 text-dalili-green" />
              <p className="mt-3 text-2xl font-black text-dalili-ink">{report.rowCount.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Rows</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <Table2 className="h-5 w-5 text-dalili-green" />
              <p className="mt-3 text-2xl font-black text-dalili-ink">{report.columnCount.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Columns</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="mt-3 text-2xl font-black text-dalili-ink">{report.duplicateCount.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Duplicate rows</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <ShieldCheck className="h-5 w-5 text-dalili-green" />
              <p className="mt-3 text-2xl font-black text-dalili-ink">{scoreLabel(report.score)}</p>
              <p className="text-sm text-slate-500">Readiness</p>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Overall score</p>
          <div className="mt-5 flex items-end gap-3">
            <span className="text-7xl font-black text-dalili-navy">{report.score}</span>
            <span className="pb-3 text-lg font-bold text-slate-500">/ 100</span>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-dalili-green" style={{ width: `${report.score}%` }} />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Scores are based on missingness, duplicate rows, empty columns, and basic structural readiness. This will later expand to validity, consistency, and indicator-specific checks.
          </p>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-6">
          <h2 className="text-lg font-bold text-dalili-ink">Quality findings</h2>
          <div className="mt-5 space-y-3">
            {report.issues.map((issue, index) => {
              const Icon = issue.type === "success" ? CheckCircle2 : issue.type === "error" ? XCircle : AlertTriangle;
              const style = issue.type === "success" ? "bg-emerald-50 text-emerald-700" : issue.type === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
              return (
                <div key={index} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-dalili-ink">{issue.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{issue.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-bold text-dalili-ink">Top missingness by column</h2>
          <div className="mt-5 space-y-4">
            {topMissing.map((item) => (
              <div key={item.column}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-dalili-ink">{item.column}</span>
                  <span className="font-bold text-slate-500">{item.missingRate}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${item.missingRate}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-400">{item.missing.toLocaleString()} missing record(s)</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
