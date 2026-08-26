"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Calculator, Download, FileWarning, Filter, Target, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { explainIndicatorResult, getSuggestedIndicatorsForSector } from "@/lib/ai-guidance";

type Row = Record<string, string | number | boolean | null>;

type DatasetPayload = {
  fileName: string;
  uploadedAt: string;
  columns: string[];
  rows: Row[];
  storedRowCount: number;
  totalRowCount: number;
  note: string;
};

type ProjectRecord = {
  id: string;
  backendId?: number;
  name: string;
  organisation?: string;
  sector?: string;
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

type IndicatorResultResponse = {
  id: number;
  project_id: number;
  dataset_id?: number | null;
  file_name: string;
  indicator_name: string;
  numerator_condition: string;
  denominator_condition: string;
  numerator_count: number;
  denominator_count: number;
  percentage: number;
  target?: number | null;
  disaggregate_by?: string | null;
  groups_json?: string | null;
  calculation_text?: string | null;
  created_at: string;
};

type Operator = "not_empty" | "equals" | "not_equals" | "contains" | "greater_than" | "less_than";

type Condition = {
  column: string;
  operator: Operator;
  value: string;
};

type GroupResult = {
  group: string;
  numerator: number;
  denominator: number;
  percentage: number;
  gapToTarget: number | null;
};

const operators: { value: Operator; label: string }[] = [
  { value: "not_empty", label: "is not empty" },
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const PROJECTS_KEY = "dalili.projects";
const ACTIVE_PROJECT_KEY = "dalili.activeProject";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getActiveProjectFromStorage(): ProjectRecord | null {
  const projects = readJson<ProjectRecord[]>(PROJECTS_KEY);
  const activeId = readJson<string>(ACTIVE_PROJECT_KEY);
  if (!projects?.length) return null;
  return projects.find((project) => project.id === activeId) ?? projects[0];
}

async function checkBackendHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Backend is not responding");
  return response.json() as Promise<{ status: string }>;
}

async function postIndicatorResult(payload: {
  project_id: number;
  dataset_id?: number | null;
  file_name: string;
  indicator_name: string;
  numerator_condition: string;
  denominator_condition: string;
  numerator_count: number;
  denominator_count: number;
  percentage: number;
  target?: number | null;
  disaggregate_by?: string | null;
  groups_json?: string | null;
  calculation_text?: string | null;
}) {
  const response = await fetch(`${API_BASE}/indicator-results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Tracked result sync failed: ${response.status}`);
  }

  return response.json() as Promise<IndicatorResultResponse>;
}

function isMissing(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "";
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesCondition(row: Row, condition: Condition) {
  if (!condition.column) return true;
  const rawValue = row[condition.column];
  const actual = String(rawValue ?? "").trim().toLowerCase();
  const expected = condition.value.trim().toLowerCase();

  if (condition.operator === "not_empty") return !isMissing(rawValue);
  if (condition.operator === "equals") return actual === expected;
  if (condition.operator === "not_equals") return actual !== expected;
  if (condition.operator === "contains") return actual.includes(expected);

  const actualNumber = toNumber(rawValue);
  const expectedNumber = toNumber(condition.value);
  if (actualNumber === null || expectedNumber === null) return false;
  if (condition.operator === "greater_than") return actualNumber > expectedNumber;
  if (condition.operator === "less_than") return actualNumber < expectedNumber;
  return false;
}

function percentage(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function conditionText(condition: Condition) {
  const op = operators.find((item) => item.value === condition.operator)?.label ?? condition.operator;
  if (!condition.column) return "All records";
  if (condition.operator === "not_empty") return `${condition.column} ${op}`;
  return `${condition.column} ${op} ${condition.value || "[value]"}`;
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

export function IndicatorsClient() {
  const [dataset, setDataset] = useState<DatasetPayload | null>(null);
  const [indicatorName, setIndicatorName] = useState("% achieving the selected outcome");
  const [target, setTarget] = useState("80");
  const [numerator, setNumerator] = useState<Condition>({ column: "", operator: "equals", value: "" });
  const [denominator, setDenominator] = useState<Condition>({ column: "", operator: "not_empty", value: "" });
  const [useAllRecords, setUseAllRecords] = useState(true);
  const [disaggregateBy, setDisaggregateBy] = useState("");
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [backendDataset, setBackendDataset] = useState<BackendDataset | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [isSavingIndicator, setIsSavingIndicator] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Backend not checked yet.");
  const [mode, setMode] = useState<"simple" | "advanced">("simple");

  useEffect(() => {
    const saved = window.localStorage.getItem("dalili.latestDataset");
    if (saved) {
      try {
        const parsed: DatasetPayload = JSON.parse(saved);
        setDataset(parsed);
        const firstColumn = parsed.columns[0] ?? "";
        setNumerator((current) => ({ ...current, column: firstColumn }));
        setDenominator((current) => ({ ...current, column: firstColumn }));
      } catch {
        setDataset(null);
      }
    }

    setActiveProject(getActiveProjectFromStorage());
    setBackendDataset(readJson<BackendDataset>("dalili.latestBackendDataset"));

    checkBackendHealth()
      .then(() => {
        setBackendOnline(true);
        setBackendStatus("Backend is online. Indicator results can be saved to the database.");
      })
      .catch(() => {
        setBackendOnline(false);
        setBackendStatus("Backend is offline. Tracked result will remain in browser storage until you start FastAPI.");
      });
  }, []);

  const targetNumber = Number(target);
  const validTarget = Number.isFinite(targetNumber) ? targetNumber : null;

  const results = useMemo(() => {
    if (!dataset) return { numeratorCount: 0, denominatorCount: 0, overall: 0, groups: [] as GroupResult[] };

    const denominatorRows = useAllRecords ? dataset.rows : dataset.rows.filter((row) => matchesCondition(row, denominator));
    const numeratorRows = denominatorRows.filter((row) => matchesCondition(row, numerator));
    const overall = percentage(numeratorRows.length, denominatorRows.length);

    const groupsMap = new Map<string, { denominator: Row[]; numerator: Row[] }>();
    if (disaggregateBy) {
      denominatorRows.forEach((row) => {
        const key = isMissing(row[disaggregateBy]) ? "Missing / blank" : String(row[disaggregateBy]);
        const existing = groupsMap.get(key) ?? { denominator: [], numerator: [] };
        existing.denominator.push(row);
        if (matchesCondition(row, numerator)) existing.numerator.push(row);
        groupsMap.set(key, existing);
      });
    }

    const groups = Array.from(groupsMap.entries())
      .map(([group, values]) => {
        const pct = percentage(values.numerator.length, values.denominator.length);
        return {
          group,
          numerator: values.numerator.length,
          denominator: values.denominator.length,
          percentage: pct,
          gapToTarget: validTarget === null ? null : Math.round((pct - validTarget) * 10) / 10,
        };
      })
      .sort((a, b) => b.denominator - a.denominator)
      .slice(0, 20);

    return {
      numeratorCount: numeratorRows.length,
      denominatorCount: denominatorRows.length,
      overall,
      groups,
    };
  }, [dataset, numerator, denominator, useAllRecords, disaggregateBy, validTarget]);

  useEffect(() => {
    if (!dataset) return;
    const payload = {
      indicatorName,
      fileName: dataset.fileName,
      generatedAt: new Date().toISOString(),
      numeratorCondition: conditionText(numerator),
      denominatorCondition: useAllRecords ? "All records" : conditionText(denominator),
      numerator: results.numeratorCount,
      denominator: results.denominatorCount,
      percentage: results.overall,
      target: validTarget,
      disaggregateBy,
      groups: results.groups,
    };
    window.localStorage.setItem("dalili.latestIndicatorResult", JSON.stringify(payload));
  }, [dataset, indicatorName, numerator, denominator, useAllRecords, results, validTarget, disaggregateBy]);

  async function saveIndicatorToBackend() {
    if (!dataset) return;

    const project = activeProject ?? getActiveProjectFromStorage();
    const latestBackendDataset = backendDataset ?? readJson<BackendDataset>("dalili.latestBackendDataset");

    if (!project?.backendId) {
      setBackendStatus("Select or create a backend-saved project first, then save the indicator result.");
      return;
    }

    if (latestBackendDataset && latestBackendDataset.project_id !== project.backendId) {
      setBackendStatus("The latest backend dataset belongs to a different project. Upload this dataset again under the active project before saving the indicator.");
      return;
    }

    setIsSavingIndicator(true);
    try {
      await checkBackendHealth();
      setBackendOnline(true);
      const calculationText = `${results.numeratorCount} / ${results.denominatorCount} = ${results.overall}%`;
      const saved = await postIndicatorResult({
        project_id: project.backendId,
        dataset_id: latestBackendDataset?.id ?? null,
        file_name: dataset.fileName,
        indicator_name: indicatorName,
        numerator_condition: conditionText(numerator),
        denominator_condition: useAllRecords ? "All records" : conditionText(denominator),
        numerator_count: results.numeratorCount,
        denominator_count: results.denominatorCount,
        percentage: results.overall,
        target: validTarget,
        disaggregate_by: disaggregateBy || null,
        groups_json: JSON.stringify(results.groups),
        calculation_text: calculationText,
      });

      window.localStorage.setItem("dalili.latestBackendIndicatorResult", JSON.stringify(saved));
      setBackendStatus(`Tracked result saved to backend: record #${saved.id} under project #${project.backendId}.`);
    } catch {
      setBackendOnline(false);
      setBackendStatus("Backend save failed. The indicator result is still saved in browser storage.");
    } finally {
      setIsSavingIndicator(false);
    }
  }

  function exportIndicator() {
    if (!dataset) return;
    const lines = [
      "DALILI TRACK RESULTS OUTPUT",
      "===========================",
      `Question/measure: ${indicatorName}`,
      `Dataset: ${dataset.fileName}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Numerator rule: ${conditionText(numerator)}`,
      `Denominator rule: ${useAllRecords ? "All records" : conditionText(denominator)}`,
      `Calculation: ${results.numeratorCount} / ${results.denominatorCount} = ${results.overall}%`,
      validTarget === null ? "Target: Not set" : `Target: ${validTarget}%`,
      validTarget === null ? "Gap to target: Not calculated" : `Gap to target: ${Math.round((results.overall - validTarget) * 10) / 10} percentage points`,
      "",
      "DALILI AI EXPLANATION",
      aiExplanation,
      "",
      disaggregateBy ? `BREAKDOWN BY ${disaggregateBy}` : "No breakdown selected",
      ...results.groups.map((item) => `${item.group}: ${item.numerator}/${item.denominator} = ${item.percentage}%`),
      "",
      `Source rows used in prototype: ${dataset.storedRowCount} of ${dataset.totalRowCount}`,
      dataset.note,
    ];
    downloadText(`dalili-track-results-${indicatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`, lines.join("\n"));
  }

  const suggestedQuestions = getSuggestedIndicatorsForSector(activeProject?.sector);
  const aiExplanation = explainIndicatorResult({
    name: indicatorName,
    numerator: results.numeratorCount,
    denominator: results.denominatorCount,
    percentage: results.overall,
    target: validTarget,
    missingNote: dataset ? `Dalili used ${dataset.storedRowCount} locally available rows out of ${dataset.totalRowCount} total records. Use the Data Room and Quality Check before treating this as final.` : undefined,
  });

  function bestColumn(keywords: string[]) {
    const lower = dataset?.columns ?? [];
    return lower.find((column) => keywords.some((word) => column.toLowerCase().includes(word))) ?? dataset?.columns[0] ?? "";
  }

  function applySuggestedQuestion(label: string) {
    setIndicatorName(label);
    setMode("simple");
    const text = label.toLowerCase();
    if (text.includes("completion") || text.includes("completed")) {
      const column = bestColumn(["complete", "status", "attend", "finish"]);
      setNumerator({ column, operator: "contains", value: "complete" });
      setUseAllRecords(true);
      setTarget("80");
      return;
    }
    if (text.includes("satisfaction") || text.includes("satisfied")) {
      const column = bestColumn(["satisf", "rating", "score", "experience"]);
      setNumerator({ column, operator: "contains", value: "satisfied" });
      setUseAllRecords(true);
      setTarget("80");
      return;
    }
    if (text.includes("target")) {
      const column = bestColumn(["target", "actual", "result", "achiev"]);
      setNumerator({ column, operator: "not_empty", value: "" });
      setUseAllRecords(true);
      setTarget("100");
      return;
    }
    const column = bestColumn(["participant", "client", "beneficiary", "served", "reached", "name", "id"]);
    setNumerator({ column, operator: "not_empty", value: "" });
    setUseAllRecords(true);
    setTarget("80");
  }

  if (!dataset) {
    return (
      <div className="compact-section">
        <div className="flex max-w-3xl items-start gap-3">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
            <FileWarning className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Track results</p>
            <h1 className="mt-2 text-xl font-bold text-dalili-ink">No programme data available yet</h1>
            <p className="mt-3 text-slate-500">
              This step helps you answer simple project questions like “How many people did we reach?”, “Who completed the activity?”, and “Are we on track?”. Upload a dataset first so Dalili can calculate the result instead of guessing.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href="/workspace" className="inline-flex rounded-2xl border border-emerald-200 px-3 py-2 text-sm font-bold text-dalili-green">Open project guide</a>
              <a href="/data-room" className="inline-flex rounded-2xl bg-dalili-green px-3 py-2 text-sm font-bold text-white">Upload programme data</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const gapToTarget = validTarget === null ? null : Math.round((results.overall - validTarget) * 10) / 10;

  return (
    <div className="space-y-4">
      <section className="compact-section">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Track results</p>
            <h1 className="mt-2 text-xl font-black text-dalili-ink">What do you want to know from this project data?</h1>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-500">For teams without M&E staff, Dalili starts with plain project questions and turns them into measurable results. The advanced indicator builder is still available when you need numerator, denominator, filters, targets and breakdowns.</p>
          </div>
          <div className="flex rounded-2xl bg-slate-100 p-1 text-sm font-bold">
            <button onClick={() => setMode("simple")} className={`rounded-xl px-3 py-2 ${mode === "simple" ? "bg-white text-[#073B2A] shadow-sm" : "text-slate-500"}`}>Simple mode</button>
            <button onClick={() => setMode("advanced")} className={`rounded-xl px-3 py-2 ${mode === "advanced" ? "bg-white text-[#073B2A] shadow-sm" : "text-slate-500"}`}>Advanced mode</button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suggestedQuestions.map((item) => (
            <button key={item.label} onClick={() => applySuggestedQuestion(item.label)} className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
              <div className="flex items-center gap-2 text-sm font-black text-[#073B2A]"><Wand2 className="h-4 w-4" /> {item.label}</div>
              <p className="mt-2 text-sm font-bold text-[#102033]">{item.plainQuestion}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p>
              <details className="compact-details mt-2 text-[11px] text-slate-500"><summary className="font-bold text-[#0B6B4B]">Show suggested rule</summary><p className="mt-1 rounded-xl bg-slate-50 p-2 leading-5">{item.suggestedFormula}</p></details>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="compact-section">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">{mode === "simple" ? "Simple measure" : "Advanced indicator"}</p>
              <h1 className="mt-2 text-xl font-bold text-dalili-ink">{mode === "simple" ? "Measure project progress" : "Advanced indicator builder"}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                {mode === "simple" ? "Choose a plain question above, then let Dalili calculate and explain the result. You can still adjust the rule if the suggested column is not right." : "Define the numerator, denominator, target, and disaggregation. Dalili shows the calculation so the result can be reviewed before it becomes an insight or report finding."}
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-600">Dataset: {dataset.fileName}</p>
            </div>
            <button onClick={exportIndicator} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dalili-navy px-3 py-2 text-sm font-bold text-white">
              <Download className="h-4 w-4" />
              Export result
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-dalili-ink">Question or measure name</span>
              <input value={indicatorName} onChange={(event) => setIndicatorName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-dalili-green" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-dalili-ink">Target (%)</span>
              <input value={target} onChange={(event) => setTarget(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-dalili-green" />
            </label>
          </div>

          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-2 text-amber-700"><Sparkles className="h-5 w-5" /></div>
              <div>
                <h2 className="font-black text-amber-950">Dalili AI interpretation</h2>
                <p className="mt-1 text-sm leading-5 text-amber-900">{aiExplanation}</p>
                <details className="compact-details mt-2 text-xs text-amber-800"><summary className="font-bold">Show evidence note</summary><p className="mt-1">Python calculates the numbers. Dalili explains what they mean and warns when the evidence is weak.</p></details>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-dalili-green" />
              <h2 className="font-bold text-dalili-ink">Numerator rule</h2>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <select value={numerator.column} onChange={(event) => setNumerator({ ...numerator, column: event.target.value })} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                {dataset.columns.map((column) => <option key={column}>{column}</option>)}
              </select>
              <select value={numerator.operator} onChange={(event) => setNumerator({ ...numerator, operator: event.target.value as Operator })} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                {operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
              </select>
              <input disabled={numerator.operator === "not_empty"} value={numerator.value} onChange={(event) => setNumerator({ ...numerator, value: event.target.value })} placeholder="Value, e.g. Yes" className="rounded-2xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">Current rule: {conditionText(numerator)}</p>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-dalili-green" />
                <h2 className="font-bold text-dalili-ink">Denominator rule</h2>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input type="checkbox" checked={useAllRecords} onChange={(event) => setUseAllRecords(event.target.checked)} />
                Use all records
              </label>
            </div>
            {!useAllRecords && (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <select value={denominator.column} onChange={(event) => setDenominator({ ...denominator, column: event.target.value })} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                  {dataset.columns.map((column) => <option key={column}>{column}</option>)}
                </select>
                <select value={denominator.operator} onChange={(event) => setDenominator({ ...denominator, operator: event.target.value as Operator })} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                  {operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                </select>
                <input disabled={denominator.operator === "not_empty"} value={denominator.value} onChange={(event) => setDenominator({ ...denominator, value: event.target.value })} placeholder="Value, e.g. Female" className="rounded-2xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
              </div>
            )}
            <p className="mt-3 text-xs font-semibold text-slate-500">Current rule: {useAllRecords ? "All records" : conditionText(denominator)}</p>
          </div>

          <label className="mt-3 block">
            <span className="text-sm font-bold text-dalili-ink">Disaggregate by</span>
            <select value={disaggregateBy} onChange={(event) => setDisaggregateBy(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">No disaggregation</option>
              {dataset.columns.map((column) => <option key={column}>{column}</option>)}
            </select>
          </label>
        </section>

        <section className="space-y-4">
          <div className="compact-section">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Result</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-5xl font-black text-dalili-navy">{results.overall}%</span>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-dalili-green" style={{ width: `${Math.min(results.overall, 100)}%` }} />
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-bold text-dalili-ink">Show calculation</p>
              <p className="mt-1">{results.numeratorCount.toLocaleString()} / {results.denominatorCount.toLocaleString()} = {results.overall}%</p>
              <p className="mt-1">Numerator: {conditionText(numerator)}</p>
              <p className="mt-1">Denominator: {useAllRecords ? "All records" : conditionText(denominator)}</p>
            </div>
          </div>

          <div className="compact-section">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-dalili-green" />
              <h2 className="text-lg font-bold text-dalili-ink">Target status</h2>
            </div>
            {gapToTarget === null ? (
              <p className="mt-3 text-sm text-slate-500">Enter a numeric target to calculate the gap.</p>
            ) : (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Gap to target</p>
                <p className={`mt-1 text-3xl font-black ${gapToTarget >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                  {gapToTarget >= 0 ? "+" : ""}{gapToTarget} pp
                </p>
                <p className="mt-2 text-sm text-slate-500">Target: {validTarget}%</p>
              </div>
            )}
            <div className="mt-3 flex gap-3 rounded-2xl bg-emerald-50 p-3 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">This indicator result is saved locally and will be available for the Insights module.</p>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-dalili-ink">Backend storage</p>
                  <p className={`mt-1 text-xs font-semibold ${backendOnline ? "text-emerald-700" : "text-amber-700"}`}>{backendStatus}</p>
                  <p className="mt-1 text-xs text-slate-500">Project: {activeProject?.name ?? "No active project"}{activeProject?.backendId ? ` · Backend #${activeProject.backendId}` : ""}</p>
                </div>
                <button
                  onClick={saveIndicatorToBackend}
                  disabled={isSavingIndicator}
                  className="rounded-xl bg-dalili-green px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingIndicator ? "Saving..." : "Save to backend"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="compact-section">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-dalili-green" />
          <h2 className="text-lg font-bold text-dalili-ink">Disaggregated results</h2>
        </div>
        {results.groups.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Select a disaggregation column to view grouped indicator results.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-bold">Group</th>
                  <th className="px-3 py-2 font-bold">Numerator</th>
                  <th className="px-3 py-2 font-bold">Denominator</th>
                  <th className="px-3 py-2 font-bold">Result</th>
                  <th className="px-3 py-2 font-bold">Gap</th>
                </tr>
              </thead>
              <tbody>
                {results.groups.map((item) => (
                  <tr key={item.group} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold text-dalili-ink">{item.group}</td>
                    <td className="px-3 py-2 text-slate-600">{item.numerator.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">{item.denominator.toLocaleString()}</td>
                    <td className="px-3 py-2 font-bold text-dalili-green">{item.percentage}%</td>
                    <td className="px-3 py-2 text-slate-600">{item.gapToTarget === null ? "—" : `${item.gapToTarget >= 0 ? "+" : ""}${item.gapToTarget} pp`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
