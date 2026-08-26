"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Calculator, Download, FileWarning, Filter, Target, CheckCircle2, Sparkles, Wand2, Sigma } from "lucide-react";
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
type MetricType = "percentage" | "count" | "average" | "sum" | "min" | "max";

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
  value: number;
  validRecords: number;
  excludedRecords: number;
  gapToTarget: number | null;
};

type ResultSummary = {
  numeratorCount: number;
  denominatorCount: number;
  overall: number;
  displayValue: string;
  displayLabel: string;
  validRecords: number;
  excludedRecords: number;
  groups: GroupResult[];
  calculationText: string;
};

const operators: { value: Operator; label: string }[] = [
  { value: "not_empty", label: "is not empty" },
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
];

const metricOptions: { value: MetricType; label: string; help: string }[] = [
  { value: "percentage", label: "Percentage", help: "Use this for completion rates, satisfaction, uptake, referral completion or target achievement." },
  { value: "count", label: "Count", help: "Use this for number reached, number trained, number served, or number of records with a value." },
  { value: "average", label: "Average", help: "Use this for average age, average score, average wait time, average income or average attendance." },
  { value: "sum", label: "Total / sum", help: "Use this to add up numeric values such as amount spent, quantities distributed or total attendance." },
  { value: "min", label: "Minimum", help: "Use this to find the lowest value in a numeric column." },
  { value: "max", label: "Maximum", help: "Use this to find the highest value in a numeric column." },
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

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
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
  return roundOne((numerator / denominator) * 100);
}

function conditionText(condition: Condition) {
  const op = operators.find((item) => item.value === condition.operator)?.label ?? condition.operator;
  if (!condition.column) return "All records";
  if (condition.operator === "not_empty") return `${condition.column} ${op}`;
  return `${condition.column} ${op} ${condition.value || "[value]"}`;
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

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function numericColumns(columns: string[], rows: Row[]) {
  return columns.filter((column) => rows.some((row) => toNumber(row[column]) !== null));
}

function columnLooksLike(column: string, keywords: string[]) {
  const normalised = column.toLowerCase().replace(/[_-]+/g, " ");
  return keywords.some((word) => normalised.includes(word));
}

function calculateAggregate(metricType: MetricType, rows: Row[], valueColumn: string) {
  if (metricType === "count") {
    const validRows = valueColumn ? rows.filter((row) => !isMissing(row[valueColumn])) : rows;
    return {
      value: validRows.length,
      validRecords: validRows.length,
      excludedRecords: Math.max(rows.length - validRows.length, 0),
      calculationText: valueColumn ? `Count of records where ${valueColumn} is not empty = ${validRows.length}` : `Count of records = ${validRows.length}`,
    };
  }

  const numbers = rows.map((row) => toNumber(row[valueColumn])).filter((value): value is number => value !== null);
  const excludedRecords = Math.max(rows.length - numbers.length, 0);
  if (!numbers.length) {
    return { value: 0, validRecords: 0, excludedRecords, calculationText: `No valid numeric values found in ${valueColumn || "the selected column"}.` };
  }

  const sum = numbers.reduce((total, value) => total + value, 0);
  if (metricType === "average") {
    return { value: roundOne(sum / numbers.length), validRecords: numbers.length, excludedRecords, calculationText: `Average of ${valueColumn}: ${roundOne(sum)} / ${numbers.length} = ${roundOne(sum / numbers.length)}` };
  }
  if (metricType === "sum") {
    return { value: roundOne(sum), validRecords: numbers.length, excludedRecords, calculationText: `Sum of ${valueColumn}: ${roundOne(sum)}` };
  }
  if (metricType === "min") {
    return { value: roundOne(Math.min(...numbers)), validRecords: numbers.length, excludedRecords, calculationText: `Minimum ${valueColumn}: ${roundOne(Math.min(...numbers))}` };
  }
  return { value: roundOne(Math.max(...numbers)), validRecords: numbers.length, excludedRecords, calculationText: `Maximum ${valueColumn}: ${roundOne(Math.max(...numbers))}` };
}

function metricUnit(metricType: MetricType) {
  return metricType === "percentage" ? "%" : "";
}

function formatValue(value: number, metricType: MetricType) {
  return metricType === "percentage" ? `${value}%` : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function explainFlexibleResult(args: {
  metricType: MetricType;
  name: string;
  value: number;
  valueColumn: string;
  validRecords: number;
  excludedRecords: number;
  target?: number | null;
  disaggregateBy?: string;
}) {
  const metricLabel = metricOptions.find((item) => item.value === args.metricType)?.label.toLowerCase() ?? args.metricType;
  const targetText = typeof args.target === "number" && args.metricType !== "min" && args.metricType !== "max"
    ? ` The target is ${args.target}${metricUnit(args.metricType)}, so the gap is ${roundOne(args.value - args.target)}${metricUnit(args.metricType)}.`
    : "";
  const caution = args.validRecords === 0
    ? " This result cannot be interpreted because there are no valid records."
    : args.validRecords < 30
      ? " Treat this cautiously because it is based on a small number of valid records."
      : "";
  const excluded = args.excludedRecords > 0 ? ` Dalili excluded ${args.excludedRecords.toLocaleString()} record(s) with missing or invalid values for this calculation.` : "";
  const breakdown = args.disaggregateBy ? ` The result is also broken down by ${args.disaggregateBy}.` : "";
  return `${args.name}: the ${metricLabel} is ${formatValue(args.value, args.metricType)}${args.valueColumn ? ` using ${args.valueColumn}` : ""}, based on ${args.validRecords.toLocaleString()} valid record(s).${targetText}${caution}${excluded}${breakdown}`;
}

export function IndicatorsClient() {
  const [dataset, setDataset] = useState<DatasetPayload | null>(null);
  const [indicatorName, setIndicatorName] = useState("People reached");
  const [metricType, setMetricType] = useState<MetricType>("percentage");
  const [target, setTarget] = useState("80");
  const [valueColumn, setValueColumn] = useState("");
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
        const firstNumeric = numericColumns(parsed.columns, parsed.rows)[0] ?? firstColumn;
        setValueColumn(firstNumeric);
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
        setBackendStatus("Backend is online. Tracked results can be saved to the database.");
      })
      .catch(() => {
        setBackendOnline(false);
        setBackendStatus("Backend is offline. Tracked result will remain in browser storage until you start FastAPI.");
      });
  }, []);

  const targetNumber = Number(target);
  const validTarget = Number.isFinite(targetNumber) ? targetNumber : null;
  const availableNumericColumns = useMemo(() => (dataset ? numericColumns(dataset.columns, dataset.rows) : []), [dataset]);
  const measureColumns = metricType === "count" ? dataset?.columns ?? [] : availableNumericColumns;

  const results = useMemo<ResultSummary>(() => {
    if (!dataset) {
      return { numeratorCount: 0, denominatorCount: 0, overall: 0, displayValue: "0", displayLabel: "Result", validRecords: 0, excludedRecords: 0, groups: [], calculationText: "No dataset loaded." };
    }

    const eligibleRows = useAllRecords ? dataset.rows : dataset.rows.filter((row) => matchesCondition(row, denominator));

    if (metricType === "percentage") {
      const numeratorRows = eligibleRows.filter((row) => matchesCondition(row, numerator));
      const overall = percentage(numeratorRows.length, eligibleRows.length);
      const groupsMap = new Map<string, { denominator: Row[]; numerator: Row[] }>();
      if (disaggregateBy) {
        eligibleRows.forEach((row) => {
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
            value: pct,
            validRecords: values.denominator.length,
            excludedRecords: 0,
            gapToTarget: validTarget === null ? null : roundOne(pct - validTarget),
          };
        })
        .sort((a, b) => b.denominator - a.denominator)
        .slice(0, 30);
      return {
        numeratorCount: numeratorRows.length,
        denominatorCount: eligibleRows.length,
        overall,
        displayValue: `${overall}%`,
        displayLabel: "Percentage result",
        validRecords: eligibleRows.length,
        excludedRecords: Math.max(dataset.rows.length - eligibleRows.length, 0),
        groups,
        calculationText: `${numeratorRows.length} / ${eligibleRows.length} = ${overall}%`,
      };
    }

    const aggregate = calculateAggregate(metricType, eligibleRows, valueColumn);
    const groupsMap = new Map<string, Row[]>();
    if (disaggregateBy) {
      eligibleRows.forEach((row) => {
        const key = isMissing(row[disaggregateBy]) ? "Missing / blank" : String(row[disaggregateBy]);
        const existing = groupsMap.get(key) ?? [];
        existing.push(row);
        groupsMap.set(key, existing);
      });
    }
    const groups = Array.from(groupsMap.entries())
      .map(([group, rows]) => {
        const groupAgg = calculateAggregate(metricType, rows, valueColumn);
        return {
          group,
          numerator: groupAgg.validRecords,
          denominator: rows.length,
          percentage: metricType === "count" ? groupAgg.value : 0,
          value: groupAgg.value,
          validRecords: groupAgg.validRecords,
          excludedRecords: groupAgg.excludedRecords,
          gapToTarget: validTarget === null ? null : roundOne(groupAgg.value - validTarget),
        };
      })
      .sort((a, b) => b.validRecords - a.validRecords)
      .slice(0, 30);

    return {
      numeratorCount: aggregate.validRecords,
      denominatorCount: eligibleRows.length,
      overall: aggregate.value,
      displayValue: formatValue(aggregate.value, metricType),
      displayLabel: metricOptions.find((item) => item.value === metricType)?.label ?? "Result",
      validRecords: aggregate.validRecords,
      excludedRecords: aggregate.excludedRecords + Math.max(dataset.rows.length - eligibleRows.length, 0),
      groups,
      calculationText: aggregate.calculationText,
    };
  }, [dataset, metricType, numerator, denominator, useAllRecords, disaggregateBy, valueColumn, validTarget]);

  useEffect(() => {
    if (!dataset) return;
    const payload = {
      indicatorName,
      metricType,
      fileName: dataset.fileName,
      generatedAt: new Date().toISOString(),
      valueColumn,
      numeratorCondition: metricType === "percentage" ? conditionText(numerator) : `${metricType} of ${valueColumn}`,
      denominatorCondition: useAllRecords ? "All records" : conditionText(denominator),
      numerator: results.numeratorCount,
      denominator: results.denominatorCount,
      percentage: metricType === "percentage" ? results.overall : null,
      value: results.overall,
      target: validTarget,
      disaggregateBy,
      groups: results.groups,
      calculationText: results.calculationText,
    };
    window.localStorage.setItem("dalili.latestIndicatorResult", JSON.stringify(payload));
  }, [dataset, indicatorName, metricType, valueColumn, numerator, denominator, useAllRecords, results, validTarget, disaggregateBy]);

  async function saveIndicatorToBackend() {
    if (!dataset) return;

    const project = activeProject ?? getActiveProjectFromStorage();
    const latestBackendDataset = backendDataset ?? readJson<BackendDataset>("dalili.latestBackendDataset");

    if (!project?.backendId) {
      setBackendStatus("Select or create a backend-saved project first, then save the tracked result.");
      return;
    }

    if (latestBackendDataset && latestBackendDataset.project_id !== project.backendId) {
      setBackendStatus("The latest backend dataset belongs to a different project. Upload this dataset again under the active project before saving the result.");
      return;
    }

    setIsSavingIndicator(true);
    try {
      await checkBackendHealth();
      setBackendOnline(true);
      const saved = await postIndicatorResult({
        project_id: project.backendId,
        dataset_id: latestBackendDataset?.id ?? null,
        file_name: dataset.fileName,
        indicator_name: indicatorName,
        numerator_condition: metricType === "percentage" ? conditionText(numerator) : `${metricType} of ${valueColumn}`,
        denominator_condition: useAllRecords ? "All records" : conditionText(denominator),
        numerator_count: results.numeratorCount,
        denominator_count: results.denominatorCount,
        percentage: metricType === "percentage" ? results.overall : results.overall,
        target: validTarget,
        disaggregate_by: disaggregateBy || null,
        groups_json: JSON.stringify(results.groups),
        calculation_text: results.calculationText,
      });

      window.localStorage.setItem("dalili.latestBackendIndicatorResult", JSON.stringify(saved));
      setBackendStatus(`Tracked result saved to backend: record #${saved.id} under project #${project.backendId}.`);
    } catch {
      setBackendOnline(false);
      setBackendStatus("Backend save failed. The tracked result is still saved in browser storage.");
    } finally {
      setIsSavingIndicator(false);
    }
  }

  function exportIndicator() {
    if (!dataset) return;
    const csvRows = [
      ["Group", "Result", "Valid records", "Records considered", "Excluded/missing", "Gap to target"],
      ...(results.groups.length ? results.groups : [{ group: "Overall", value: results.overall, validRecords: results.validRecords, denominator: results.denominatorCount, excludedRecords: results.excludedRecords, gapToTarget: validTarget === null ? null : roundOne(results.overall - validTarget), numerator: results.numeratorCount, percentage: results.overall }]).map((item) => [
        item.group,
        formatValue(item.value, metricType),
        item.validRecords,
        item.denominator,
        item.excludedRecords,
        item.gapToTarget === null ? "" : item.gapToTarget,
      ]),
    ].map((row) => row.map(csvEscape).join(",")).join("\n");

    const summary = [
      "DALILI TRACK RESULTS OUTPUT",
      "===========================",
      `Question/measure: ${indicatorName}`,
      `Calculation type: ${metricType}`,
      `Column: ${metricType === "percentage" ? conditionText(numerator) : valueColumn}`,
      `Dataset: ${dataset.fileName}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Filter: ${useAllRecords ? "All records" : conditionText(denominator)}`,
      `Calculation: ${results.calculationText}`,
      `Result: ${results.displayValue}`,
      validTarget === null ? "Target: Not set" : `Target: ${validTarget}${metricUnit(metricType)}`,
      "",
      "DALILI EXPLANATION",
      aiExplanation,
      "",
      disaggregateBy ? `BREAKDOWN BY ${disaggregateBy}` : "No breakdown selected",
      csvRows,
      "",
      `Source rows used in prototype: ${dataset.storedRowCount} of ${dataset.totalRowCount}`,
      dataset.note,
    ];
    downloadText(`dalili-track-results-${indicatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`, summary.join("\n"));
  }

  function exportBreakdownCsv() {
    if (!dataset) return;
    const rows = [
      ["Group", "Result", "Valid records", "Records considered", "Excluded/missing", "Gap to target"],
      ...(results.groups.length ? results.groups : [{ group: "Overall", value: results.overall, validRecords: results.validRecords, denominator: results.denominatorCount, excludedRecords: results.excludedRecords, gapToTarget: validTarget === null ? null : roundOne(results.overall - validTarget), numerator: results.numeratorCount, percentage: results.overall }]).map((item) => [
        item.group,
        formatValue(item.value, metricType),
        item.validRecords,
        item.denominator,
        item.excludedRecords,
        item.gapToTarget === null ? "" : item.gapToTarget,
      ]),
    ];
    downloadText(`dalili-breakdown-${indicatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, rows.map((row) => row.map(csvEscape).join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  const suggestedQuestions = getSuggestedIndicatorsForSector(activeProject?.sector);
  const aiExplanation = metricType === "percentage"
    ? explainIndicatorResult({
        name: indicatorName,
        numerator: results.numeratorCount,
        denominator: results.denominatorCount,
        percentage: results.overall,
        target: validTarget,
        missingNote: dataset ? `Dalili used ${dataset.storedRowCount} locally available rows out of ${dataset.totalRowCount} total records. Use the Data Room and Quality Check before treating this as final.` : undefined,
      })
    : explainFlexibleResult({
        metricType,
        name: indicatorName,
        value: results.overall,
        valueColumn,
        validRecords: results.validRecords,
        excludedRecords: results.excludedRecords,
        target: validTarget,
        disaggregateBy,
      });

  function bestColumn(keywords: string[], numericOnly = false) {
    const columns = numericOnly && dataset ? availableNumericColumns : dataset?.columns ?? [];
    return columns.find((column) => keywords.some((word) => columnLooksLike(column, [word]))) ?? columns[0] ?? "";
  }

  function bestDisaggregation() {
    return bestColumn(["district", "county", "subcounty", "region", "location", "site", "facility", "sex", "gender", "age group"]);
  }

  function applySuggestedQuestion(label: string) {
    setIndicatorName(label);
    setMode("simple");
    const text = label.toLowerCase();
    if (text.includes("average age") || (text.includes("age") && text.includes("average"))) {
      setMetricType("average");
      setValueColumn(bestColumn(["age"], true));
      setDisaggregateBy(bestDisaggregation());
      setTarget("");
      setUseAllRecords(true);
      return;
    }
    if (text.includes("how many") || text.includes("people reached") || text.includes("learners enrolled") || text.includes("farmers reached") || text.includes("households reached")) {
      setMetricType("count");
      setValueColumn(bestColumn(["participant", "client", "beneficiary", "learner", "farmer", "household", "id", "name"]));
      setDisaggregateBy("");
      setTarget("");
      setUseAllRecords(true);
      return;
    }
    if (text.includes("completion") || text.includes("completed")) {
      const column = bestColumn(["complete", "status", "attend", "finish"]);
      setMetricType("percentage");
      setNumerator({ column, operator: "contains", value: "complete" });
      setUseAllRecords(true);
      setTarget("80");
      return;
    }
    if (text.includes("satisfaction") || text.includes("satisfied")) {
      const column = bestColumn(["satisf", "rating", "score", "experience"]);
      setMetricType("percentage");
      setNumerator({ column, operator: "contains", value: "satisfied" });
      setUseAllRecords(true);
      setTarget("80");
      return;
    }
    if (text.includes("target")) {
      const column = bestColumn(["target", "actual", "result", "achiev"]);
      setMetricType("percentage");
      setNumerator({ column, operator: "not_empty", value: "" });
      setUseAllRecords(true);
      setTarget("100");
      return;
    }
    if (text.includes("equity") || text.includes("left out") || text.includes("location")) {
      const column = bestColumn(["participant", "client", "beneficiary", "served", "reached", "name", "id"]);
      setMetricType("count");
      setValueColumn(column);
      setDisaggregateBy(bestDisaggregation());
      setUseAllRecords(true);
      setTarget("");
      return;
    }
    const column = bestColumn(["participant", "client", "beneficiary", "served", "reached", "name", "id"]);
    setMetricType("percentage");
    setNumerator({ column, operator: "not_empty", value: "" });
    setUseAllRecords(true);
    setTarget("80");
  }

  function applyQuickMeasure(type: "averageAge" | "averageByDistrict" | "countByDistrict" | "sum" | "max") {
    setMode("simple");
    if (type === "averageAge") {
      setIndicatorName("Average age");
      setMetricType("average");
      setValueColumn(bestColumn(["age"], true));
      setDisaggregateBy("");
      setTarget("");
    }
    if (type === "averageByDistrict") {
      setIndicatorName("Average age by location");
      setMetricType("average");
      setValueColumn(bestColumn(["age"], true));
      setDisaggregateBy(bestColumn(["district", "county", "subcounty", "region", "location", "site", "facility"]));
      setTarget("");
    }
    if (type === "countByDistrict") {
      setIndicatorName("People reached by location");
      setMetricType("count");
      setValueColumn(bestColumn(["participant", "client", "beneficiary", "id", "name"]));
      setDisaggregateBy(bestColumn(["district", "county", "subcounty", "region", "location", "site", "facility"]));
      setTarget("");
    }
    if (type === "sum") {
      setIndicatorName("Total value");
      setMetricType("sum");
      setValueColumn(availableNumericColumns[0] ?? "");
      setDisaggregateBy("");
      setTarget("");
    }
    if (type === "max") {
      setIndicatorName("Highest value");
      setMetricType("max");
      setValueColumn(availableNumericColumns[0] ?? "");
      setDisaggregateBy("");
      setTarget("");
    }
    setUseAllRecords(true);
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
              This step helps you calculate results like average age, number reached, completion rate, satisfaction, and breakdowns by district or facility. Upload a dataset first so Dalili can calculate instead of guessing.
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

  const gapToTarget = validTarget === null ? null : roundOne(results.overall - validTarget);

  return (
    <div className="space-y-4">
      <section className="compact-section">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Track results</p>
            <h1 className="mt-2 text-xl font-black text-dalili-ink">What do you want to calculate?</h1>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-500">Use simple calculations such as count, percentage, average, total, minimum or maximum. You can also break the result down by district, sex, facility, month or any other column.</p>
          </div>
          <div className="flex rounded-2xl bg-slate-100 p-1 text-sm font-bold">
            <button onClick={() => setMode("simple")} className={`rounded-xl px-3 py-2 ${mode === "simple" ? "bg-white text-[#073B2A] shadow-sm" : "text-slate-500"}`}>Simple mode</button>
            <button onClick={() => setMode("advanced")} className={`rounded-xl px-3 py-2 ${mode === "advanced" ? "bg-white text-[#073B2A] shadow-sm" : "text-slate-500"}`}>Advanced mode</button>
          </div>
        </div>

        {mode === "simple" ? (
          <>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <button onClick={() => applyQuickMeasure("averageAge")} className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
                <div className="flex items-center gap-2 text-sm font-black text-[#073B2A]"><Sigma className="h-4 w-4" /> Average age</div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Calculates the mean age using valid numeric age values.</p>
              </button>
              <button onClick={() => applyQuickMeasure("averageByDistrict")} className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
                <div className="flex items-center gap-2 text-sm font-black text-[#073B2A]"><Sigma className="h-4 w-4" /> Average by location</div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Example: average age by district, facility or project site.</p>
              </button>
              <button onClick={() => applyQuickMeasure("countByDistrict")} className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
                <div className="flex items-center gap-2 text-sm font-black text-[#073B2A]"><BarChart3 className="h-4 w-4" /> Count by location</div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Counts people or records and breaks them down by district or facility.</p>
              </button>
              {suggestedQuestions.map((item) => (
                <button key={item.label} onClick={() => applySuggestedQuestion(item.label)} className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
                  <div className="flex items-center gap-2 text-sm font-black text-[#073B2A]"><Wand2 className="h-4 w-4" /> {item.label}</div>
                  <p className="mt-2 text-sm font-bold text-[#102033]">{item.plainQuestion}</p>
                  <details className="compact-details mt-2 text-[11px] text-slate-500"><summary className="font-bold text-[#0B6B4B]">Show suggested rule</summary><p className="mt-1 rounded-xl bg-slate-50 p-2 leading-5">{item.suggestedFormula}</p></details>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="compact-section">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Calculation setup</p>
              <h2 className="mt-2 text-lg font-black text-dalili-ink">Choose the calculation and breakdown</h2>
              <p className="mt-1 text-sm text-slate-500">Dataset: {dataset.fileName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportIndicator} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dalili-navy px-3 py-2 text-sm font-bold text-white">
                <Download className="h-4 w-4" /> Export result
              </button>
              <button onClick={exportBreakdownCsv} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-dalili-ink">
                CSV table
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-dalili-ink">Question or measure name</span>
              <input value={indicatorName} onChange={(event) => setIndicatorName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-dalili-green" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-dalili-ink">Calculation type</span>
              <select value={metricType} onChange={(event) => setMetricType(event.target.value as MetricType)} className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                {metricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <details className="compact-details mt-2 text-xs text-slate-500">
            <summary className="font-bold text-[#0B6B4B]">What does this calculation do?</summary>
            <p className="mt-2 rounded-xl bg-slate-50 p-3 leading-5">{metricOptions.find((item) => item.value === metricType)?.help}</p>
          </details>

          {metricType !== "percentage" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-dalili-ink">Column to calculate</span>
                <select value={valueColumn} onChange={(event) => setValueColumn(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                  {measureColumns.map((column) => <option key={column}>{column}</option>)}
                </select>
                {metricType !== "count" && !availableNumericColumns.length ? <p className="mt-2 text-xs font-semibold text-amber-700">No numeric columns detected. Check your data dictionary.</p> : null}
              </label>
              <label className="block">
                <span className="text-sm font-bold text-dalili-ink">Target {metricType === "average" ? "(optional)" : "(optional)"}</span>
                <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Optional" className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-dalili-green" />
              </label>
            </div>
          ) : (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-dalili-ink">Target (%)</span>
                  <input value={target} onChange={(event) => setTarget(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-dalili-green" />
                </label>
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
            </>
          )}

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-dalili-green" />
                <h2 className="font-bold text-dalili-ink">Records to include</h2>
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
            <p className="mt-3 text-xs font-semibold text-slate-500">Current filter: {useAllRecords ? "All records" : conditionText(denominator)}</p>
          </div>

          <label className="mt-3 block">
            <span className="text-sm font-bold text-dalili-ink">Break down by</span>
            <select value={disaggregateBy} onChange={(event) => setDisaggregateBy(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">No breakdown</option>
              {dataset.columns.map((column) => <option key={column}>{column}</option>)}
            </select>
            <p className="mt-2 text-xs text-slate-500">Example: choose district to get average age by district, or sex to compare results by sex.</p>
          </label>
        </section>

        <section className="space-y-4">
          <div className="compact-section">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Result</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-5xl font-black text-dalili-navy">{results.displayValue}</span>
              <span className="pb-2 text-sm font-bold text-slate-500">{results.displayLabel}</span>
            </div>
            {metricType === "percentage" ? (
              <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-dalili-green" style={{ width: `${Math.min(results.overall, 100)}%` }} />
              </div>
            ) : null}
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-bold text-dalili-ink">Show calculation</p>
              <p className="mt-1">{results.calculationText}</p>
              <p className="mt-1">Valid records: {results.validRecords.toLocaleString()}</p>
              {results.excludedRecords > 0 ? <p className="mt-1 text-amber-700">Excluded/missing/filtered records: {results.excludedRecords.toLocaleString()}</p> : null}
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
                  {gapToTarget >= 0 ? "+" : ""}{gapToTarget}{metricUnit(metricType)}
                </p>
                <p className="mt-2 text-sm text-slate-500">Target: {validTarget}{metricUnit(metricType)}</p>
              </div>
            )}
            <div className="mt-3 flex gap-3 rounded-2xl bg-emerald-50 p-3 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">This result is saved locally and will be available for the Insights and Reports modules.</p>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-dalili-ink">Backend storage</p>
                  <p className={`mt-1 text-xs font-semibold ${backendOnline ? "text-emerald-700" : "text-amber-700"}`}>{backendStatus}</p>
                  <p className="mt-1 text-xs text-slate-500">Project: {activeProject?.name ?? "No active project"}{activeProject?.backendId ? ` · Backend #${activeProject.backendId}` : ""}</p>
                </div>
                <button onClick={saveIndicatorToBackend} disabled={isSavingIndicator} className="rounded-xl bg-dalili-green px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {isSavingIndicator ? "Saving..." : "Save to backend"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="compact-section">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-50 p-2 text-amber-700"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h2 className="font-black text-dalili-ink">Dalili explanation</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">{aiExplanation}</p>
            <details className="compact-details mt-2 text-xs text-slate-500"><summary className="font-bold text-[#0B6B4B]">Show evidence note</summary><p className="mt-1">Python calculates the numbers. Dalili explains what they mean and warns when the evidence is weak.</p></details>
          </div>
        </div>
      </section>

      <section className="compact-section">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-dalili-green" />
          <h2 className="text-lg font-bold text-dalili-ink">Breakdown results</h2>
        </div>
        {results.groups.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Select a breakdown column to view grouped results, for example average age by district.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-bold">Group</th>
                  <th className="px-3 py-2 font-bold">Result</th>
                  <th className="px-3 py-2 font-bold">Valid records</th>
                  <th className="px-3 py-2 font-bold">Records considered</th>
                  <th className="px-3 py-2 font-bold">Excluded/missing</th>
                  <th className="px-3 py-2 font-bold">Gap</th>
                </tr>
              </thead>
              <tbody>
                {results.groups.map((item) => (
                  <tr key={item.group} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold text-dalili-ink">{item.group}</td>
                    <td className="px-3 py-2 font-bold text-dalili-green">{formatValue(item.value, metricType)}</td>
                    <td className="px-3 py-2 text-slate-600">{item.validRecords.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">{item.denominator.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">{item.excludedRecords.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">{item.gapToTarget === null ? "—" : `${item.gapToTarget >= 0 ? "+" : ""}${item.gapToTarget}${metricUnit(metricType)}`}</td>
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
