"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderOpen,
  Loader2,
  Upload,
  X,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Download,
} from "lucide-react";

type Row = Record<string, string | number | boolean | null>;

type Project = {
  id: string;
  name: string;
  organisation: string;
  sector: string;
  donor: string;
  country: string;
  geography: string;
  reportingPeriod: string;
  status: "Planning" | "Active" | "Reporting" | "Closed";
  sensitivity: "Low" | "Moderate" | "High" | "Very high";
  description: string;
  createdAt: string;
  source: "local";
  instructions?: string;
};

type UploadedSummary = {
  name: string;
  type: "dataset" | "document" | "other";
  rows?: number;
  columns?: number;
  status: string;
};

const PROJECTS_KEY = "dalili.projects";
const ACTIVE_KEY = "dalili.activeProject";

const sectors = [
  "Health / SRH / HIV",
  "Education / Skills",
  "Agriculture / Livelihoods",
  "WASH",
  "Protection / SGBV",
  "Research / Evaluation",
  "Private sector project",
  "Other",
];

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "dalili";
}

function normaliseCell(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function parseCsv(text: string): Row[] {
  const workbook = XLSX.read(text, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null }).map((row) => {
    const cleaned: Row = {};
    Object.entries(row).forEach(([key, value]) => { cleaned[String(key).trim()] = normaliseCell(value); });
    return cleaned;
  });
}

async function parseDataset(file: File): Promise<Row[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCsv(await file.text());
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null }).map((row) => {
    const cleaned: Row = {};
    Object.entries(row).forEach(([key, value]) => { cleaned[String(key).trim()] = normaliseCell(value); });
    return cleaned;
  });
}

function isMissing(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "";
}

function isNumeric(value: unknown) {
  if (isMissing(value)) return false;
  return Number.isFinite(Number(String(value).replaceAll(",", "")));
}

function detectSensitive(column: string) {
  const text = column.toLowerCase();
  const checks = ["name", "phone", "email", "nin", "id", "gps", "latitude", "longitude", "hiv", "srh", "sgbv", "violence", "dob", "birth", "age", "disability", "refugee"];
  return checks.some((term) => text.includes(term));
}

function buildQuality(fileName: string, rows: Row[]) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const missingByColumn = columns.map((column) => {
    const missing = rows.filter((row) => isMissing(row[column])).length;
    return { column, missing, percentage: rows.length ? Math.round((missing / rows.length) * 1000) / 10 : 0 };
  });
  const duplicateCount = rows.length - new Set(rows.map((row) => JSON.stringify(row))).size;
  const highMissing = missingByColumn.filter((item) => item.percentage >= 30);
  const sensitive = columns.filter(detectSensitive);
  const issues = [
    ...highMissing.slice(0, 8).map((item) => ({ type: "Missing data", title: `${item.column} has ${item.percentage}% missing values`, detail: `${item.missing} records are blank in ${item.column}.`, severity: "high" as const })),
    ...(duplicateCount ? [{ type: "Duplicates", title: `${duplicateCount} possible duplicate rows`, detail: "Review duplicate records before final reporting.", severity: "medium" as const }] : []),
    ...sensitive.slice(0, 8).map((column) => ({ type: "Sensitive field", title: `${column} may contain sensitive or identifiable data`, detail: "Only analyse or export this field if you have authority to process it.", severity: "medium" as const })),
  ];
  const score = Math.max(35, 100 - highMissing.length * 8 - Math.min(duplicateCount, 20) - sensitive.length * 2);
  const columnProfiles = columns.map((column) => {
    const values = rows.map((row) => row[column]);
    const missing = values.filter(isMissing).length;
    const numericCount = values.filter(isNumeric).length;
    const valid = values.length - missing;
    return {
      column,
      label: column.replace(/[_-]+/g, " "),
      type: valid > 0 && numericCount / Math.max(valid, 1) > 0.8 ? "numeric" : "text/category",
      uniqueValues: new Set(values.filter((value) => !isMissing(value)).map(String)).size,
      missing,
      missingRate: rows.length ? Math.round((missing / rows.length) * 1000) / 10 : 0,
      sensitivityFlag: detectSensitive(column) ? "Review before sharing" : "No obvious flag",
      recommendedUse: detectSensitive(column) ? "Use with caution" : "Can support analysis or reporting",
    };
  });
  return { fileName, uploadedAt: new Date().toISOString(), rowCount: rows.length, totalRows: rows.length, columnCount: columns.length, columns: columns.length, score, qualityScore: score, duplicateCount, duplicateRows: duplicateCount, missingByColumn, missingness: missingByColumn, columnProfiles, issues };
}

function detectColumn(columns: string[], options: string[]) {
  return columns.find((column) => options.some((term) => column.toLowerCase().includes(term))) || "";
}

function buildAutoIndicator(fileName: string, rows: Row[]) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const ageColumn = detectColumn(columns, ["age"]);
  const locationColumn = detectColumn(columns, ["district", "location", "subcounty", "county", "region", "site", "facility"]);
  const completionColumn = detectColumn(columns, ["complete", "completed", "status", "attendance", "attended"]);
  const numeric = columns.filter((column) => rows.filter((row) => isNumeric(row[column])).length > 0);
  const selected = ageColumn || numeric[0] || columns[0] || "records";
  const values = rows.map((row) => Number(String(row[selected]).replaceAll(",", ""))).filter(Number.isFinite);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : rows.length;
  const groups = locationColumn
    ? Array.from(rows.reduce((map, row) => {
        const group = isMissing(row[locationColumn]) ? "Missing / blank" : String(row[locationColumn]);
        const existing = map.get(group) || { count: 0, total: 0, valid: 0 };
        existing.count += 1;
        const value = Number(String(row[selected]).replaceAll(",", ""));
        if (Number.isFinite(value)) { existing.total += value; existing.valid += 1; }
        map.set(group, existing);
        return map;
      }, new Map<string, { count: number; total: number; valid: number }>()).entries()).slice(0, 25).map(([group, item]) => ({
        group,
        numerator: item.valid || item.count,
        denominator: item.count,
        percentage: selected === ageColumn && item.valid ? Math.round((item.total / item.valid) * 10) / 10 : item.count,
        value: selected === ageColumn && item.valid ? Math.round((item.total / item.valid) * 10) / 10 : item.count,
        validRecords: item.valid || item.count,
        excludedRecords: Math.max(0, item.count - item.valid),
        gapToTarget: null,
      }))
    : [];
  return {
    indicatorName: ageColumn ? `Average ${ageColumn}${locationColumn ? ` by ${locationColumn}` : ""}` : `Records reviewed${locationColumn ? ` by ${locationColumn}` : ""}`,
    fileName,
    generatedAt: new Date().toISOString(),
    numeratorCondition: ageColumn ? `Average of ${ageColumn}` : "Count of uploaded records",
    denominatorCondition: "All valid uploaded records",
    numerator: values.length || rows.length,
    denominator: rows.length,
    percentage: Math.round(average * 10) / 10,
    target: null,
    disaggregateBy: locationColumn,
    groups,
    plainExplanation: ageColumn
      ? `Dalili calculated the average ${ageColumn} using ${values.length} valid records${locationColumn ? ` and grouped the result by ${locationColumn}` : ""}.`
      : `Dalili counted ${rows.length} records and can break them down by ${locationColumn || "a selected column"}.`,
    suggestedNextMeasure: completionColumn ? `You may also track completion using ${completionColumn}.` : "You can now choose another measure in Track Results.",
  };
}

function buildReportText(project: Project, uploads: UploadedSummary[], quality: ReturnType<typeof buildQuality> | null, indicator: ReturnType<typeof buildAutoIndicator> | null) {
  return [
    `${project.name.toUpperCase()} — DRAFT DONOR REPORT`,
    "",
    `Organisation: ${project.organisation || "Not specified"}`,
    `Sector: ${project.sector}`,
    `Location: ${project.geography || project.country}`,
    `Funder/client: ${project.donor || "Not specified"}`,
    `Reporting period: ${project.reportingPeriod || "Not specified"}`,
    "",
    "1. Project summary",
    project.description || "Dalili prepared this draft using the project description and uploaded evidence.",
    "",
    "2. Evidence reviewed",
    uploads.length ? uploads.map((item) => `- ${item.name}: ${item.status}`).join("\n") : "- No files uploaded yet.",
    "",
    "3. Data readiness",
    quality ? `Dalili reviewed ${quality.rowCount} records and ${quality.columnCount} columns. Current quality score: ${quality.score}/100.` : "No structured dataset was available for quality checks.",
    quality?.issues?.length ? quality.issues.slice(0, 5).map((issue) => `- ${issue.title}`).join("\n") : "- No major data quality issue was found in the quick review.",
    "",
    "4. Result summary",
    indicator ? `Main tracked result: ${indicator.indicatorName}. Result: ${indicator.percentage}. Denominator/records reviewed: ${indicator.denominator}.` : "No quantitative result has been calculated yet.",
    indicator?.groups?.length ? "Breakdown available in Track Results and Maps." : "No breakdown was generated from the uploaded data.",
    "",
    "5. Recommended next action",
    "Review the suggested findings, confirm which ones are safe to use, then export a final report or management brief.",
    "",
    "Generated by Dalili. Please review and validate before external submission.",
  ].join("\n");
}

function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
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

export function StartAnalysisClient() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<UploadedSummary[]>([]);
  const [message, setMessage] = useState("");
  const [project, setProject] = useState<Project>({
    id: `proj-${Date.now()}`,
    name: "",
    organisation: "",
    sector: "Health / SRH / HIV",
    donor: "",
    country: "Uganda",
    geography: "",
    reportingPeriod: "",
    status: "Active",
    sensitivity: "Moderate",
    description: "",
    createdAt: new Date().toISOString().slice(0, 10),
    source: "local",
    instructions: "Help us turn uploaded project evidence into a donor-ready report. Keep explanations simple and flag weak evidence.",
  });

  const canCreate = project.name.trim().length >= 2 && project.organisation.trim().length >= 2;
  const evidenceSummary = useMemo(() => uploads.length ? `${uploads.length} file${uploads.length === 1 ? "" : "s"} reviewed` : "No evidence uploaded yet", [uploads]);

  function saveProject() {
    const saved = readJson<Project[]>(PROJECTS_KEY) ?? [];
    const cleaned = saved.filter((item) => item.id !== project.id);
    const nextProject = { ...project, id: project.id || `proj-${Date.now()}`, createdAt: project.createdAt || new Date().toISOString().slice(0, 10) };
    saveJson(PROJECTS_KEY, [nextProject, ...cleaned]);
    saveJson(ACTIVE_KEY, nextProject.id);
    saveJson("dalili.projectInstructions", nextProject.instructions || "");
    window.dispatchEvent(new Event("dalili-projects-changed"));
    setProject(nextProject);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    saveProject();
    setBusy(true);
    setMessage("Dalili is reviewing your uploaded evidence...");
    const summaries: UploadedSummary[] = [];
    let firstQuality: ReturnType<typeof buildQuality> | null = null;
    let firstIndicator: ReturnType<typeof buildAutoIndicator> | null = null;
    try {
      for (const file of Array.from(files)) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
          const rows = await parseDataset(file);
          const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
          const quality = buildQuality(file.name, rows);
          const indicator = buildAutoIndicator(file.name, rows);
          if (!firstQuality) firstQuality = quality;
          if (!firstIndicator) firstIndicator = indicator;
          saveJson("dalili.latestDataset", {
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            columns,
            rows: rows.slice(0, 1000),
            storedRowCount: Math.min(rows.length, 1000),
            totalRowCount: rows.length,
            note: "Uploaded through Start Analysis. Dalili kept a safe preview for quick results and reporting.",
          });
          saveJson("dalili.latestQualityReport", quality);
          saveJson("dalili.latestDataDictionary", { fileName: file.name, generatedAt: new Date().toISOString(), columns: quality.columnProfiles });
          saveJson("dalili.latestIndicatorResult", indicator);
          summaries.push({ name: file.name, type: "dataset", rows: rows.length, columns: columns.length, status: `${rows.length} rows and ${columns.length} columns reviewed` });
        } else if (lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx") || lower.endsWith(".txt")) {
          summaries.push({ name: file.name, type: "document", status: "Stored as project evidence. Document extraction can be reviewed in Documents." });
        } else {
          summaries.push({ name: file.name, type: "other", status: "File noted. Use Data Room for detailed processing if needed." });
        }
      }
      setUploads((current) => [...summaries, ...current]);
      saveJson("dalili.startAnalysisUploads", [...summaries, ...uploads]);
      if (firstQuality || firstIndicator) {
        const report = buildReportText(project, [...summaries, ...uploads], firstQuality, firstIndicator);
        saveJson("dalili.latestReportDraft", { title: `${project.name || "Project"} donor report draft`, reportType: "donor", createdAt: new Date().toISOString(), content: report });
        saveJson("dalili.analysisReportText", report);
      }
      setMessage("Done. Dalili prepared a quick review and draft reporting path.");
      setStep(3);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dalili could not read one of the files. Try a smaller CSV/Excel file first.");
    } finally {
      setBusy(false);
    }
  }

  function exportDraft() {
    const content = readJson<{ content?: string }>("dalili.latestReportDraft")?.content || buildReportText(project, uploads, null, null);
    downloadText(`${slugify(project.name || "dalili")}-draft-report.doc`, content, "application/msword;charset=utf-8");
  }

  return (
    <div className="compact-page">
      <section className="compact-hero bg-[#073B2A] text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="compact-label text-emerald-100">Start here</p>
            <h1 className="mt-1 max-w-3xl text-2xl font-black">Upload what you have. Dalili guides you to a report.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50">Create a project, add all relevant evidence, then let Dalili review the data, suggest what can be tracked and prepare a donor report or brief for you to approve.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#073B2A] hover:bg-emerald-50">
            Start analysis <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["1", "Project", "Tell Dalili the basics."],
          ["2", "Upload", "Add all project evidence."],
          ["3", "Review", "Dalili checks and suggests."],
          ["4", "Report", "Approve and export output."],
        ].map(([number, title, text]) => (
          <div key={title} className="compact-section">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#073B2A] text-xs font-black text-white">{number}</div>
            <h2 className="mt-3 text-base font-black text-[#102033]">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      <section className="compact-section">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#102033]">Current simple flow</h2>
            <p className="mt-1 text-sm text-slate-500">Use this when someone does not know M&E. Advanced tools remain available only when needed.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">{project.name || "No project started"}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{evidenceSummary}</span>
          </div>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="compact-label text-[#0B6B4B]">Guided project setup</p>
                <h2 className="mt-1 text-xl font-black text-[#102033]">One project workspace. All evidence in one place.</h2>
                <p className="mt-1 text-sm text-slate-500">Borrowing the simplicity of project workspaces: create the project, upload its knowledge/evidence, add instructions, then let Dalili prepare the M&E pathway.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {["Project details", "Upload evidence", "Review and report"].map((label, index) => (
                <button key={label} onClick={() => setStep(index + 1)} className={`rounded-2xl border p-3 text-left text-sm font-black ${step === index + 1 ? "border-[#073B2A] bg-emerald-50 text-[#073B2A]" : "border-slate-200 text-slate-600"}`}>
                  {index + 1}. {label}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-bold text-slate-700">Project name<input value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="e.g. Youth skills training project" /></label>
                <label className="text-sm font-bold text-slate-700">Organisation/company<input value={project.organisation} onChange={(e) => setProject({ ...project, organisation: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Your organisation" /></label>
                <label className="text-sm font-bold text-slate-700">Sector<select value={project.sector} onChange={(e) => setProject({ ...project, sector: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">{sectors.map((sector) => <option key={sector}>{sector}</option>)}</select></label>
                <label className="text-sm font-bold text-slate-700">Funder/client<input value={project.donor} onChange={(e) => setProject({ ...project, donor: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Optional" /></label>
                <label className="text-sm font-bold text-slate-700">Location<input value={project.geography} onChange={(e) => setProject({ ...project, geography: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Districts, region or country" /></label>
                <label className="text-sm font-bold text-slate-700">Reporting period<input value={project.reportingPeriod} onChange={(e) => setProject({ ...project, reportingPeriod: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="e.g. Q3 2026" /></label>
                <label className="md:col-span-2 text-sm font-bold text-slate-700">What is the project trying to achieve?<textarea value={project.description} onChange={(e) => setProject({ ...project, description: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Write it simply. Dalili will use this to suggest what to track and report." /></label>
                <label className="md:col-span-2 text-sm font-bold text-slate-700">Project instructions for Dalili<textarea value={project.instructions} onChange={(e) => setProject({ ...project, instructions: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                <div className="md:col-span-2 flex justify-end">
                  <button disabled={!canCreate} onClick={() => { saveProject(); setStep(2); }} className="inline-flex items-center gap-2 rounded-xl bg-[#073B2A] px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">Next: upload evidence <ArrowRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
                  <Upload className="mx-auto h-9 w-9 text-[#073B2A]" />
                  <h3 className="mt-3 text-lg font-black text-[#102033]">Upload all project evidence</h3>
                  <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-600">Add Excel, CSV, Kobo exports, Word, PDF or text files. Dalili will organise what it can now and keep the rest as project evidence.</p>
                  <input multiple type="file" accept=".csv,.xlsx,.xls,.doc,.docx,.pdf,.txt" onChange={(e) => void handleFiles(e.target.files)} className="mt-4 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
                  {busy ? <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#073B2A]"><Loader2 className="h-4 w-4 animate-spin" /> Reviewing files...</p> : null}
                  {message ? <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p> : null}
                </div>
                <div className="grid gap-2">
                  {uploads.map((item) => (
                    <div key={`${item.name}-${item.status}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm">
                      <span className="font-bold text-[#102033]">{item.name}</span>
                      <span className="text-xs text-slate-500">{item.status}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Back</button>
                  <button onClick={() => setStep(3)} className="inline-flex items-center gap-2 rounded-xl bg-[#073B2A] px-5 py-2.5 text-sm font-black text-white">Next: review and report <ArrowRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <ShieldCheck className="h-5 w-5 text-[#073B2A]" />
                  <h3 className="mt-2 font-black text-[#102033]">Data checked</h3>
                  <p className="mt-1 text-sm text-slate-600">Dalili prepared a quality review and data dictionary where a dataset was available.</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <BarChart3 className="h-5 w-5 text-amber-700" />
                  <h3 className="mt-2 font-black text-[#102033]">Results suggested</h3>
                  <p className="mt-1 text-sm text-slate-600">Dalili suggested an initial result and breakdown from the uploaded data.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <FileText className="h-5 w-5 text-slate-700" />
                  <h3 className="mt-2 font-black text-[#102033]">Report path ready</h3>
                  <p className="mt-1 text-sm text-slate-600">Review the findings, then export a donor report, brief or summary.</p>
                </div>
                <div className="lg:col-span-3 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                  <a href="/workspace" className="inline-flex items-center gap-2 rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-black text-white">Open workspace <ArrowRight className="h-4 w-4" /></a>
                  <a href="/indicators" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#073B2A]">Review results</a>
                  <a href="/reports" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#073B2A]">Create report</a>
                  <button onClick={exportDraft} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#073B2A]"><Download className="h-4 w-4" /> Download draft</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
