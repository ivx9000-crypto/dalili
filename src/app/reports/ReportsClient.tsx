"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clipboard, Download, FileSpreadsheet, FileText, FileWarning, Lock, Presentation, RefreshCcw, Send, Share2, Sparkles } from "lucide-react";

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

type ReportType = "donor" | "evaluation" | "dqa";
type ReportStatus = "draft" | "review" | "approved" | "final" | "shared";

type ProjectRecord = {
  backendId?: number;
  name?: string;
};

type BackendDataset = {
  id: number;
  project_id: number;
  filename: string;
  row_count: number;
  column_count: number;
  quality_score?: number | null;
};

type BackendIndicatorResult = {
  id: number;
  project_id: number;
  dataset_id?: number | null;
  indicator_name: string;
};

type BackendReportDraft = {
  id: number;
  project_id: number;
  report_type: string;
  title: string;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function checkBackendOnline() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function createReportDraft(payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/report-drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to save report draft");
  return (await response.json()) as BackendReportDraft;
}

async function downloadBackendReport(draftId: number, format: "docx" | "pptx" | "pdf" | "xlsx" | "html" | "txt") {
  const response = await fetch(`${API_BASE}/exports/report-drafts/${draftId}?format=${format}`);
  if (!response.ok) throw new Error("Failed to generate backend export");
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  const filename = match?.[1] ?? `dalili-backend-report.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fmtDate(value?: string) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function firstNameFromSession() {
  try {
    const raw = window.localStorage.getItem("dalili_auth_session");
    const session = raw ? JSON.parse(raw) : null;
    return session?.user?.full_name || "Dalili user";
  } catch {
    return "Dalili user";
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


function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildReportHtml(type: ReportType, indicator: IndicatorPayload, quality: QualityPayload | null, statuses: Record<string, InsightStatus>) {
  const reportText = buildReport(type, indicator, quality, statuses);
  const logo = typeof window !== "undefined" ? window.localStorage.getItem("dalili.organisationLogo") : null;
  const organisation = (() => {
    try {
      const settings = window.localStorage.getItem("daliliComplianceSettings");
      return settings ? JSON.parse(settings).organisationName || "" : "";
    } catch {
      return "";
    }
  })();
  const paragraphs = reportText.split("\n").map((line) => {
    if (!line.trim()) return "<br />";
    if (/^[0-9]+\./.test(line)) return `<h2>${escapeHtml(line)}</h2>`;
    if (line === line.toUpperCase() && line.length > 4) return `<h1>${escapeHtml(line)}</h1>`;
    if (line.startsWith("- ")) return `<p class=\"bullet\">${escapeHtml(line)}</p>`;
    return `<p>${escapeHtml(line)}</p>`;
  }).join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(reportTitle(type))}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #102033; line-height: 1.55; margin: 48px; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #F5B400; padding-bottom: 14px; margin-bottom: 22px; }
  .logo { height: 62px; max-width: 160px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 14px; padding: 6px; }
  h1 { color: #073B2A; font-size: 24px; margin: 0; }
  h2 { color: #073B2A; font-size: 18px; margin-top: 24px; }
  p { font-size: 12.5px; margin: 7px 0; }
  .bullet { margin-left: 18px; }
  .meta { background: #f2f4f7; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 24px; }
  .footer { margin-top: 36px; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>
<div class="header">${logo ? `<img class="logo" src="${logo}" alt="Organisation logo" />` : ""}<div><h1>${escapeHtml(reportTitle(type))}</h1><p>${escapeHtml(organisation || "Dalili report")}</p></div></div>
<div class="meta">
  <strong>Dalili report export</strong><br />
  Dataset: ${escapeHtml(indicator.fileName)}<br />
  Indicator: ${escapeHtml(indicator.indicatorName)}<br />
  Quality score: ${escapeHtml(quality ? `${quality.qualityScore}/100` : "Not available")}
</div>
${paragraphs}
<div class="footer">Generated by Dalili prototype. Validate all calculations before external submission.</div>
</body>
</html>`;
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildAnnexCsv(indicator: IndicatorPayload, quality: QualityPayload | null) {
  const rows: string[][] = [];
  rows.push(["Section", "Item", "Value"]);
  rows.push(["Indicator", "Name", indicator.indicatorName]);
  rows.push(["Indicator", "Dataset", indicator.fileName]);
  rows.push(["Indicator", "Numerator rule", indicator.numeratorCondition]);
  rows.push(["Indicator", "Denominator rule", indicator.denominatorCondition]);
  rows.push(["Indicator", "Numerator", String(indicator.numerator)]);
  rows.push(["Indicator", "Denominator", String(indicator.denominator)]);
  rows.push(["Indicator", "Result", `${indicator.percentage}%`]);
  rows.push(["Indicator", "Target", indicator.target === null ? "Not set" : `${indicator.target}%`]);
  rows.push(["Quality", "Quality score", quality ? `${quality.qualityScore}/100` : "Not available"]);
  rows.push(["Quality", "Duplicate rows", quality ? String(quality.duplicateRows) : "Not available"]);
  if (indicator.groups?.length) {
    indicator.groups.forEach((group) => {
      rows.push(["Disaggregation", `${indicator.disaggregateBy}: ${group.group}`, `${group.percentage}% (${group.numerator}/${group.denominator})`]);
    });
  }
  if (quality?.missingness?.length) {
    quality.missingness.slice(0, 20).forEach((item) => {
      rows.push(["Missingness", item.column, `${item.missing} missing (${item.percentage}%)`]);
    });
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildSlideDeckHtml(indicator: IndicatorPayload, quality: QualityPayload | null, statuses: Record<string, InsightStatus>) {
  const insights = buildApprovedInsightText(indicator, quality, statuses);
  const logo = typeof window !== "undefined" ? window.localStorage.getItem("dalili.organisationLogo") : null;
  const qualityScore = quality ? `${quality.qualityScore}/100` : "Not available";
  const slides = [
    {
      title: "Dalili results deck",
      body: [`Indicator: ${indicator.indicatorName}`, `Dataset: ${indicator.fileName}`, `Generated: ${fmtDate(new Date().toISOString())}`],
    },
    {
      title: "Headline result",
      body: [`${indicator.percentage}%`, `Calculation: ${indicator.numerator} / ${indicator.denominator}`, `Target: ${indicator.target === null ? "Not set" : `${indicator.target}%`}`],
    },
    {
      title: "Key insights",
      body: insights.length ? insights : ["No approved insight text is available yet. Review the Insights page before finalising."],
    },
    {
      title: "Data quality context",
      body: [`Quality score: ${qualityScore}`, `Duplicate rows: ${quality?.duplicateRows ?? "Not available"}`, `Quality issues: ${quality?.issues?.length ?? "Not available"}`],
    },
    {
      title: "Recommended actions",
      body: ["Validate numerator and denominator rules.", "Review flagged insights before donor sharing.", "Resolve high-severity data quality issues.", "Add programme explanation for below-target performance."],
    },
  ];

  return `<!doctype html><html><head><meta charset="utf-8" /><title>Dalili results deck</title><style>
    body { margin: 0; background: #f2f4f7; font-family: Arial, Helvetica, sans-serif; color: #102033; }
    .slide { width: 960px; min-height: 540px; margin: 28px auto; padding: 48px; background: white; border-radius: 24px; box-shadow: 0 10px 30px rgba(15,23,42,.10); box-sizing: border-box; page-break-after: always; }
    .top { display:flex; align-items:center; justify-content:space-between; gap:18px; }
    .logo { height:52px; max-width:150px; object-fit:contain; border:1px solid #e2e8f0; border-radius:14px; padding:6px; }
    .kicker { color: #0fa67a; text-transform: uppercase; letter-spacing: .18em; font-size: 12px; font-weight: 700; }
    h1 { color: #073B2A; font-size: 42px; margin: 12px 0 30px; }
    ul { font-size: 24px; line-height: 1.55; }
    li { margin: 14px 0; }
    .result { font-size: 86px; font-weight: 900; color: #0fa67a; }
    .footer { margin-top: 40px; color: #64748b; font-size: 13px; }
  </style></head><body>${slides.map((slide, index) => `<section class="slide"><div class="kicker">Dalili · slide ${index + 1}</div><h1>${escapeHtml(slide.title)}</h1>${index === 1 ? `<div class="result">${escapeHtml(indicator.percentage)}%</div>` : ""}<ul>${slide.body.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><div class="footer">Source-linked prototype deck. Export as PDF from browser print if needed.</div></section>`).join("\n")}</body></html>`;
}

function reportTitle(type: ReportType) {
  if (type === "donor") return "Quarterly donor update";
  if (type === "evaluation") return "Evaluation results summary";
  return "Data quality memo";
}

function safePercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Not available";
  return `${value}%`;
}

function buildApprovedInsightText(indicator: IndicatorPayload, quality: QualityPayload | null, statuses: Record<string, InsightStatus>) {
  const lines: string[] = [];
  const hasTarget = typeof indicator.target === "number";
  const gap = hasTarget ? Math.round((indicator.percentage - Number(indicator.target)) * 10) / 10 : null;

  if (statuses["overall-performance"] !== "rejected") {
    lines.push(
      hasTarget
        ? `${indicator.indicatorName} was ${indicator.percentage}%, based on ${indicator.numerator} of ${indicator.denominator} eligible records. This is ${gap! >= 0 ? `${gap} percentage points above` : `${Math.abs(gap!)} percentage points below`} the target of ${indicator.target}%.`
        : `${indicator.indicatorName} was ${indicator.percentage}%, based on ${indicator.numerator} of ${indicator.denominator} eligible records. No target was set for this indicator.`
    );
  }

  const lowestGroup = indicator.groups?.length
    ? [...indicator.groups].filter((g) => g.denominator > 0).sort((a, b) => a.percentage - b.percentage)[0]
    : null;

  if (lowestGroup && statuses["lowest-group"] !== "rejected") {
    lines.push(
      `${lowestGroup.group} had the lowest result for ${indicator.disaggregateBy}: ${lowestGroup.percentage}%, based on ${lowestGroup.numerator} of ${lowestGroup.denominator} records.`
    );
  }

  if (quality && statuses["data-quality-context"] !== "rejected") {
    lines.push(
      `The dataset quality score was ${quality.qualityScore}/100. Dalili detected ${quality.issues?.length ?? 0} quality issue(s), including ${quality.duplicateRows ?? 0} duplicate row(s).`
    );
  }

  const highestMissing = quality?.missingness?.length ? [...quality.missingness].sort((a, b) => b.percentage - a.percentage)[0] : null;
  if (highestMissing && highestMissing.percentage > 0 && statuses["missingness-warning"] !== "rejected") {
    lines.push(
      `${highestMissing.column} had the highest missingness: ${highestMissing.missing} missing value(s), equal to ${highestMissing.percentage}%.`
    );
  }

  return lines;
}

function buildReport(type: ReportType, indicator: IndicatorPayload, quality: QualityPayload | null, statuses: Record<string, InsightStatus>) {
  const approvedInsights = buildApprovedInsightText(indicator, quality, statuses);
  const targetText = indicator.target === null ? "No target set" : `${indicator.target}%`;
  const gap = indicator.target === null ? null : Math.round((indicator.percentage - indicator.target) * 10) / 10;
  const gapText = gap === null ? "Not available" : gap >= 0 ? `${gap} percentage points above target` : `${Math.abs(gap)} percentage points below target`;
  const qualityScore = quality ? `${quality.qualityScore}/100` : "Not available";
  const highIssues = quality?.issues?.filter((item) => item.severity === "high") ?? [];
  const mediumIssues = quality?.issues?.filter((item) => item.severity === "medium") ?? [];

  const sections: string[] = [
    reportTitle(type).toUpperCase(),
    "=======================",
    `Generated by: Dalili prototype`,
    `Generated on: ${fmtDate(new Date().toISOString())}`,
    `Dataset: ${indicator.fileName}`,
    `Indicator: ${indicator.indicatorName}`,
    "",
  ];

  if (type === "donor") {
    sections.push(
      "1. Executive summary",
      `The latest analysis shows that ${indicator.indicatorName} stands at ${safePercent(indicator.percentage)}, calculated from ${indicator.numerator} of ${indicator.denominator} eligible records. The current target is ${targetText}; performance is ${gapText}.`,
      "",
      "2. Key findings",
      ...(approvedInsights.length ? approvedInsights.map((item, index) => `${index + 1}. ${item}`) : ["No approved insight text is available yet. Review the Insights page before finalising this report."]),
      "",
      "3. Programme interpretation",
      gap !== null && gap < 0
        ? "The indicator is currently below target. Programme teams should review lower-performing groups, data quality issues, and implementation barriers before the next reporting cycle."
        : "The indicator is currently meeting or has no defined target. Programme teams should still validate the calculation and confirm whether the result is consistent with field realities.",
      "",
      "4. Recommended actions",
      "- Validate numerator and denominator rules with the M&E lead.",
      "- Review flagged or pending insights before external sharing.",
      "- Confirm whether missing values are expected skip-logic outcomes or data quality gaps.",
      "- Add management explanation for any below-target performance.",
      "",
      "5. Source and calculation note",
      `Calculation: ${indicator.numerator} / ${indicator.denominator} = ${indicator.percentage}%`,
      `Numerator rule: ${indicator.numeratorCondition}`,
      `Denominator rule: ${indicator.denominatorCondition}`,
      `Generated from browser-stored prototype data on ${fmtDate(indicator.generatedAt)}.`,
    );
  }

  if (type === "evaluation") {
    sections.push(
      "1. Results summary",
      `${indicator.indicatorName} was estimated at ${safePercent(indicator.percentage)} using ${indicator.denominator} eligible records. The estimate is based on the uploaded dataset and should be interpreted alongside the data quality score of ${qualityScore}.`,
      "",
      "2. Indicator calculation",
      `Numerator: ${indicator.numerator}`,
      `Denominator: ${indicator.denominator}`,
      `Result: ${indicator.percentage}%`,
      `Target: ${targetText}`,
      `Target gap: ${gapText}`,
      "",
      "3. Disaggregated results",
      ...(indicator.groups?.length
        ? indicator.groups.map((group) => `- ${group.group}: ${group.percentage}% (${group.numerator}/${group.denominator})`)
        : ["No disaggregation was selected or no grouped results were available."]),
      "",
      "4. Interpretation",
      ...(approvedInsights.length ? approvedInsights.map((item) => `- ${item}`) : ["- No validated insight text is available yet."]),
      "",
      "5. Limitations",
      `- Quality score: ${qualityScore}.`,
      `- Duplicate rows detected: ${quality?.duplicateRows ?? "Not available"}.`,
      "- The current prototype uses browser-side analysis. Production analysis should be run on the backend with stronger validation and audit logs.",
      "- Missingness may reflect valid skip logic and should be reviewed before final reporting.",
    );
  }

  if (type === "dqa") {
    sections.push(
      "1. Dataset overview",
      `File: ${quality?.fileName ?? indicator.fileName}`,
      `Rows: ${quality?.totalRows ?? "Not available"}`,
      `Columns: ${quality?.columns ?? "Not available"}`,
      `Uploaded/generated: ${fmtDate(quality?.uploadedAt ?? indicator.generatedAt)}`,
      "",
      "2. Quality score",
      `Overall quality score: ${qualityScore}`,
      "",
      "3. Priority issues",
      ...(quality?.issues?.length
        ? quality.issues.map((issue, index) => `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.detail}`)
        : ["No quality issues were detected by the current prototype checks."]),
      "",
      "4. High and medium severity summary",
      `High-severity issues: ${highIssues.length}`,
      `Medium-severity issues: ${mediumIssues.length}`,
      `Duplicate rows: ${quality?.duplicateRows ?? "Not available"}`,
      "",
      "5. Missingness summary",
      ...(quality?.missingness?.length
        ? quality.missingness.slice(0, 10).map((item) => `- ${item.column}: ${item.missing} missing value(s), ${item.percentage}%`)
        : ["Missingness details are not available. Upload a dataset in Data Room first."]),
      "",
      "6. Recommended actions",
      "- Resolve high-severity issues before external reporting.",
      "- Check whether missing values are expected due to survey skip logic.",
      "- Re-run indicator calculations after cleaning the source dataset.",
      "- Keep this memo with the report annex as part of the analysis audit trail.",
    );
  }

  return sections.join("\n");
}

export function ReportsClient() {
  const [indicator, setIndicator] = useState<IndicatorPayload | null>(null);
  const [quality, setQuality] = useState<QualityPayload | null>(null);
  const [statuses, setStatuses] = useState<Record<string, InsightStatus>>({});
  const [reportType, setReportType] = useState<ReportType>("donor");
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [backendDataset, setBackendDataset] = useState<BackendDataset | null>(null);
  const [backendIndicator, setBackendIndicator] = useState<BackendIndicatorResult | null>(null);
  const [backendReportDraft, setBackendReportDraft] = useState<BackendReportDraft | null>(null);
  const [isExportingBackend, setIsExportingBackend] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Backend not checked yet.");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<ReportStatus>("draft");
  const [shareStatus, setShareStatus] = useState("Share actions have not been used yet.");

  useEffect(() => {
    try {
      const savedIndicator = window.localStorage.getItem("dalili.latestIndicatorResult");
      const savedQuality = window.localStorage.getItem("dalili.latestQualityReport");
      const savedStatuses = window.localStorage.getItem("dalili.insightStatuses");
      if (savedIndicator) setIndicator(JSON.parse(savedIndicator));
      if (savedQuality) setQuality(JSON.parse(savedQuality));
      if (savedStatuses) setStatuses(JSON.parse(savedStatuses));
      setActiveProject(readJson<ProjectRecord>("dalili.activeProject"));
      setBackendDataset(readJson<BackendDataset>("dalili.latestBackendDataset"));
      setBackendIndicator(readJson<BackendIndicatorResult>("dalili.latestBackendIndicatorResult"));
      setBackendReportDraft(readJson<BackendReportDraft>("dalili.latestBackendReportDraft"));
      const savedReportStatus = window.localStorage.getItem("dalili.reportStatus") as ReportStatus | null;
      if (savedReportStatus) setReportStatus(savedReportStatus);
    } catch {
      setIndicator(null);
      setQuality(null);
      setStatuses({});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    checkBackendOnline().then((online) => {
      if (cancelled) return;
      setBackendOnline(online);
      setBackendStatus(online ? "Backend connected. Report drafts can be saved to the database." : "Backend offline. Exports still work, but report drafts will not save to the database.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reportText = useMemo(() => {
    if (!indicator) return "";
    return buildReport(reportType, indicator, quality, statuses);
  }, [reportType, indicator, quality, statuses]);

  function exportReportText() {
    if (!indicator || !reportText) return;
    const filename = `dalili-${reportType}-report-${slugify(indicator.indicatorName)}.txt`;
    downloadText(filename, reportText);
  }

  function exportWordCompatible() {
    if (!indicator) return;
    const html = buildReportHtml(reportType, indicator, quality, statuses);
    downloadBlob(`dalili-${reportType}-report-${slugify(indicator.indicatorName)}.doc`, html, "application/msword;charset=utf-8");
  }

  function exportHtmlBrief() {
    if (!indicator) return;
    const html = buildReportHtml(reportType, indicator, quality, statuses);
    downloadBlob(`dalili-${reportType}-brief-${slugify(indicator.indicatorName)}.html`, html, "text/html;charset=utf-8");
  }

  function exportAnnexCsv() {
    if (!indicator) return;
    const csv = buildAnnexCsv(indicator, quality);
    downloadBlob(`dalili-annex-${slugify(indicator.indicatorName)}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportSlideDeckHtml() {
    if (!indicator) return;
    const html = buildSlideDeckHtml(indicator, quality, statuses);
    downloadBlob(`dalili-results-deck-${slugify(indicator.indicatorName)}.html`, html, "text/html;charset=utf-8");
  }

  async function exportBackend(format: "docx" | "pptx" | "pdf" | "xlsx" | "html" | "txt") {
    const draft = backendReportDraft ?? readJson<BackendReportDraft>("dalili.latestBackendReportDraft");
    if (!draft?.id) {
      setBackendStatus("Save the report draft to backend first, then use backend exports.");
      return;
    }
    if (!backendOnline) {
      setBackendStatus("Backend is offline. Start FastAPI before generating backend exports.");
      return;
    }
    setIsExportingBackend(true);
    try {
      await downloadBackendReport(draft.id, format);
      setBackendStatus(`Backend ${format.toUpperCase()} export generated from draft #${draft.id}.`);
    } catch {
      setBackendStatus(`Backend ${format.toUpperCase()} export failed. Check FastAPI logs and confirm the report draft exists.`);
    } finally {
      setIsExportingBackend(false);
    }
  }

  function updateReportStatus(nextStatus: ReportStatus) {
    setReportStatus(nextStatus);
    window.localStorage.setItem("dalili.reportStatus", nextStatus);
    setShareStatus(`Report marked as ${nextStatus}. Save the draft to backend before external sharing.`);
  }

  async function copyShareSummary() {
    if (!indicator || !reportText) return;
    const summary = [
      `${reportTitle(reportType)} — ${indicator.indicatorName}`,
      `Status: ${reportStatus}`,
      `Result: ${indicator.percentage}% (${indicator.numerator}/${indicator.denominator})`,
      quality ? `Quality score: ${quality.qualityScore}/100` : "Quality score: Not available",
      "",
      reportText.slice(0, 1200),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setShareStatus("Report summary copied to clipboard.");
    } catch {
      downloadText(`dalili-${reportType}-share-summary.txt`, summary);
      setShareStatus("Clipboard was not available, so Dalili downloaded a share summary instead.");
    }
  }

  async function copyInternalReportLink() {
    const draft = backendReportDraft ?? readJson<BackendReportDraft>("dalili.latestBackendReportDraft");
    if (!draft?.id) {
      setShareStatus("Save the report draft to backend first, then copy an internal report link.");
      return;
    }
    const link = `${window.location.origin}/reports?draft=${draft.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareStatus("Internal report link copied. Access should remain restricted to authorised Dalili users.");
    } catch {
      setShareStatus(link);
    }
  }

  async function saveReportToBackend() {
    if (!indicator || !reportText) return;
    const project = activeProject ?? readJson<ProjectRecord>("dalili.activeProject");
    if (!project?.backendId) {
      setBackendStatus("Create or select a backend-saved project before saving reports.");
      return;
    }
    if (!backendOnline) {
      setBackendStatus("Backend is offline. Start FastAPI, then try saving the report again.");
      return;
    }

    const latestDataset = backendDataset ?? readJson<BackendDataset>("dalili.latestBackendDataset");
    const latestIndicator = backendIndicator ?? readJson<BackendIndicatorResult>("dalili.latestBackendIndicatorResult");

    if (latestDataset && latestDataset.project_id !== project.backendId) {
      setBackendStatus("Latest backend dataset belongs to a different project. Upload the dataset again under the active project.");
      return;
    }
    if (latestIndicator && latestIndicator.project_id !== project.backendId) {
      setBackendStatus("Latest backend indicator belongs to a different project. Save the indicator again under the active project.");
      return;
    }

    setIsSavingReport(true);
    try {
      const saved = await createReportDraft({
        project_id: project.backendId,
        dataset_id: latestDataset?.id ?? latestIndicator?.dataset_id ?? null,
        indicator_result_id: latestIndicator?.id ?? null,
        report_type: reportType,
        title: reportTitle(reportType),
        file_name: indicator.fileName,
        indicator_name: indicator.indicatorName,
        quality_score: quality?.qualityScore ?? null,
        insight_summary_json: JSON.stringify({ statuses, approved: Object.values(statuses).filter((status) => status === "approved").length }),
        report_text: reportText,
        export_format: "draft",
        status: reportStatus,
        author: firstNameFromSession(),
      });
      window.localStorage.setItem("dalili.latestBackendReportDraft", JSON.stringify(saved));
      setBackendReportDraft(saved);
      setBackendStatus(`Report draft saved to backend as record #${saved.id}. Backend DOCX/PPTX/PDF/XLSX exports are now available.`);
    } catch {
      setBackendStatus("Report draft sync failed. Keep the backend running and confirm the active project exists in the backend.");
    } finally {
      setIsSavingReport(false);
    }
  }

  if (!indicator) {
    return (
      <div className="card p-8">
        <div className="flex max-w-3xl items-start gap-4">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
            <FileWarning className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Reports</p>
            <h1 className="mt-2 text-2xl font-bold text-dalili-ink">No report data available</h1>
            <p className="mt-3 text-slate-500">
              Upload a dataset in Data Room, calculate an indicator, then review insights. Dalili will generate report-ready text here.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/data-room" className="rounded-2xl bg-dalili-green px-5 py-3 text-sm font-bold text-white">Upload dataset</a>
              <a href="/indicators" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-dalili-ink">Calculate indicator</a>
              <a href="/insights" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-dalili-ink">Review insights</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const approvedCount = Object.values(statuses).filter((status) => status === "approved").length;
  const flaggedCount = Object.values(statuses).filter((status) => status === "flagged").length;
  const rejectedCount = Object.values(statuses).filter((status) => status === "rejected").length;

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-[#073b2a] px-6 py-6 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">Reports</p>
              <h1 className="mt-2 text-2xl font-bold">Report studio</h1>
              <p className="mt-2 max-w-3xl text-sm text-emerald-50/90">
                Turn validated calculations and insight cards into donor-ready text. Export Word-compatible reports, browser-printable briefs, slide-deck HTML, text reports, and CSV annex tables from validated Dalili results.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportWordCompatible} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#073b2a]">
                <FileText className="h-4 w-4" />
                Export Word
              </button>
              <button onClick={exportAnnexCsv} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f5b400] px-4 py-3 text-sm font-bold text-[#073b2a]">
                <FileSpreadsheet className="h-4 w-4" />
                Export annex
              </button>
              <button onClick={saveReportToBackend} disabled={isSavingReport || !activeProject?.backendId} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-bold text-[#073b2a] disabled:cursor-not-allowed disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />
                {isSavingReport ? "Saving..." : "Save report"}
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Quality score</p>
            <p className="mt-2 text-3xl font-black text-dalili-ink">{quality ? `${quality.qualityScore}/100` : "—"}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Insight review</p>
            <p className="mt-2 text-sm font-bold text-slate-700">{approvedCount} approved · {flaggedCount} flagged · {rejectedCount} rejected</p>
          </div>
        </div>

        <div className={`mx-6 mb-6 rounded-2xl border p-4 ${backendOnline ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-bold text-[#102033]">{backendOnline ? "Backend connected" : "Backend offline"}</div>
              <p className="mt-1 text-xs text-slate-600">{backendStatus}</p>
              <p className="mt-1 text-xs text-slate-500">Active project: {activeProject?.backendId ? `backend #${activeProject.backendId}` : "browser-only or not selected"} · Dataset: {backendDataset?.id ? `#${backendDataset.id}` : "not linked"} · Indicator: {backendIndicator?.id ? `#${backendIndicator.id}` : "not linked"} · Report draft: {backendReportDraft?.id ? `#${backendReportDraft.id}` : "not saved"}</p>
            </div>
            <button onClick={saveReportToBackend} disabled={isSavingReport || !activeProject?.backendId} className="rounded-2xl bg-[#073B2A] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isSavingReport ? "Saving..." : "Save draft to backend"}
            </button>
          </div>
        </div>

        <div className="mx-6 mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-[#073B2A]"><Lock className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-bold text-dalili-ink">Report status</p>
                <p className="mt-1 text-xs text-slate-500">Use this to control the internal review stage before export or sharing.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["draft", "review", "approved", "final"] as ReportStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => updateReportStatus(status)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-bold capitalize ${reportStatus === status ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-dalili-ink"><Share2 className="h-4 w-4 text-[#073B2A]" /> Share report</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">Share controls are internal for now. Production secure links should require login and permissions.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => updateReportStatus("review")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-dalili-ink"><Send className="h-4 w-4" /> Send for review</button>
                <button onClick={copyShareSummary} className="inline-flex items-center gap-2 rounded-2xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white"><Clipboard className="h-4 w-4" /> Copy summary</button>
                <button onClick={copyInternalReportLink} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-dalili-ink"><Share2 className="h-4 w-4" /> Copy link</button>
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{shareStatus}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-bold text-dalili-ink">Report type</p>
                <p className="text-xs text-slate-500">Choose the output format to draft.</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {(["donor", "evaluation", "dqa"] as ReportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold ${reportType === type ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  {reportTitle(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700"><Sparkles className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-bold text-dalili-ink">Available export formats</p>
                <p className="text-xs text-slate-500">Use these for reports, annexes, and presentation drafts.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <button onClick={exportWordCompatible} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-dalili-ink hover:bg-slate-50"><FileText className="h-4 w-4 text-emerald-700" /> Word-compatible .doc</button>
              <button onClick={exportSlideDeckHtml} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-dalili-ink hover:bg-slate-50"><Presentation className="h-4 w-4 text-amber-700" /> Presentation deck .html</button>
              <button onClick={exportAnnexCsv} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-dalili-ink hover:bg-slate-50"><FileSpreadsheet className="h-4 w-4 text-blue-700" /> Annex table .csv</button>
              <button onClick={exportHtmlBrief} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-dalili-ink hover:bg-slate-50"><Sparkles className="h-4 w-4 text-purple-700" /> Browser-printable .html</button>
              <button onClick={exportReportText} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-dalili-ink hover:bg-slate-50"><Download className="h-4 w-4 text-slate-700" /> Plain text .txt</button>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-bold text-dalili-ink">Backend exports</p>
                <p className="text-xs text-slate-500">Save the draft to backend first, then generate real files.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <button onClick={() => exportBackend("docx")} disabled={isExportingBackend || !backendReportDraft?.id} className="rounded-2xl bg-[#073B2A] px-4 py-3 text-left text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Backend DOCX</button>
              <button onClick={() => exportBackend("pptx")} disabled={isExportingBackend || !backendReportDraft?.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-dalili-ink disabled:cursor-not-allowed disabled:opacity-50">Backend PPTX</button>
              <button onClick={() => exportBackend("pdf")} disabled={isExportingBackend || !backendReportDraft?.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-dalili-ink disabled:cursor-not-allowed disabled:opacity-50">Backend PDF</button>
              <button onClick={() => exportBackend("xlsx")} disabled={isExportingBackend || !backendReportDraft?.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-dalili-ink disabled:cursor-not-allowed disabled:opacity-50">Backend Excel annex</button>
            </div>
          </div>
        </aside>

        <section className="card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Draft preview</p>
              <h2 className="mt-1 text-xl font-black text-dalili-ink">{reportTitle(reportType)}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setReportType(reportType)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-dalili-ink">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <button onClick={exportReportText} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white">
                <Download className="h-4 w-4" />
                Export text
              </button>
            </div>
          </div>
          <div className="bg-slate-50 p-6">
            <pre className="min-h-[560px] whitespace-pre-wrap rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-800 shadow-sm">{reportText}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}
