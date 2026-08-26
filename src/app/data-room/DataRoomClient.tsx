"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eraser,
  FileSpreadsheet,
  FileText,
  Search,
  Table2,
  UploadCloud,
  XCircle,
} from "lucide-react";

type CellValue = string | number | boolean | null;
type Row = Record<string, CellValue>;

type QualityIssue = {
  type: "warning" | "error" | "success";
  title: string;
  description: string;
};

type MissingItem = {
  column: string;
  missing: number;
  missingRate: number;
};

type DuplicateItem = {
  rowNumber: number;
  duplicateOfRowNumber: number;
  sample: Row;
};

type ColumnProfile = {
  column: string;
  cleanLabel: string;
  detectedType: "Number" | "Date" | "Yes/No" | "Text" | "Empty";
  uniqueValues: number;
  missing: number;
  missingRate: number;
  sensitivityFlag: "None" | "Personal identifier" | "Sensitive category" | "Precise location" | "Date/age risk";
  recommendedUse: string;
};


type ProjectRecord = {
  id: string;
  backendId?: number;
  name: string;
  organisation?: string;
  source?: "backend" | "local";
};

type DatasetMetadataResponse = {
  id: number;
  project_id: number;
  filename: string;
  row_count: number;
  column_count: number;
  quality_score?: number | null;
  storage_path?: string | null;
  created_at: string;
};

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

function safeSetLocalStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
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

async function postDatasetMetadata(payload: {
  project_id: number;
  filename: string;
  row_count: number;
  column_count: number;
  quality_score: number;
  storage_path?: string | null;
}) {
  const response = await fetch(`${API_BASE}/datasets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Dataset metadata sync failed: ${response.status}`);
  }

  return response.json() as Promise<DatasetMetadataResponse>;
}

async function uploadDatasetFile(payload: {
  project_id: number;
  filename: string;
  row_count: number;
  column_count: number;
  quality_score: number;
  file: File;
}) {
  const formData = new FormData();
  formData.append("project_id", String(payload.project_id));
  formData.append("row_count", String(payload.row_count));
  formData.append("column_count", String(payload.column_count));
  formData.append("quality_score", String(payload.quality_score));
  formData.append("file", payload.file, payload.filename);

  const response = await fetch(`${API_BASE}/datasets/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Dataset file upload failed: ${response.status}`);
  }

  return response.json() as Promise<DatasetMetadataResponse>;
}

function normaliseCell(value: unknown): CellValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.replace(/\u00a0/g, " ").trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).trim() || null;
}

function cleanColumnName(value: string, existing: Set<string>) {
  const base = value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim() || "Unnamed column";
  let candidate = base;
  let counter = 2;

  while (existing.has(candidate)) {
    candidate = `${base} ${counter}`;
    counter += 1;
  }

  existing.add(candidate);
  return candidate;
}

function rowSignature(row: Row) {
  return JSON.stringify(
    Object.keys(row)
      .sort()
      .map((key) => [key, row[key]]),
  );
}

function isNumericLike(value: CellValue) {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  return value.trim() !== "" && !Number.isNaN(Number(value.replace(/,/g, "")));
}

function isDateLike(value: CellValue) {
  if (typeof value !== "string") return false;
  if (!/[/-]/.test(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function isYesNoLike(value: CellValue) {
  if (typeof value === "boolean") return true;
  if (typeof value !== "string") return false;
  return ["yes", "no", "true", "false", "y", "n", "1", "0"].includes(value.toLowerCase().trim());
}

function cleanLabelFromColumn(column: string) {
  return column
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detectSensitivityFlag(column: string): ColumnProfile["sensitivityFlag"] {
  const value = column.toLowerCase();
  if (/(phone|mobile|email|name|nin|national id|id number|respondent|beneficiary|client id|case id)/.test(value)) return "Personal identifier";
  if (/(hiv|art|prep|srh|fp|contracept|mental|sgbv|violence|pregnan|disab|income|poverty|vulnerability|refugee)/.test(value)) return "Sensitive category";
  if (/(gps|latitude|longitude|coordinate|household location|exact location)/.test(value)) return "Precise location";
  if (/(date of birth|dob|age|service date|visit date|enrolment date)/.test(value)) return "Date/age risk";
  return "None";
}

function recommendedUseForColumn(column: string, detectedType: ColumnProfile["detectedType"], sensitivityFlag: ColumnProfile["sensitivityFlag"]) {
  const value = column.toLowerCase();
  if (sensitivityFlag !== "None") return "Review before analysis/export";
  if (/(district|region|county|subcounty|parish|village|facility|site|location)/.test(value)) return "Geography/disaggregation";
  if (/(sex|gender|age group|age_group|age category)/.test(value)) return "Demographic disaggregation";
  if (/(target|actual|result|score|count|total|number|amount)/.test(value) || detectedType === "Number") return "Indicator calculation";
  if (detectedType === "Date") return "Time trend/reporting period";
  return "Context/descriptor";
}

function detectColumnType(values: CellValue[]): ColumnProfile["detectedType"] {
  const present = values.filter((value) => value !== null && value !== "");
  if (present.length === 0) return "Empty";

  const numericShare = present.filter(isNumericLike).length / present.length;
  const dateShare = present.filter(isDateLike).length / present.length;
  const yesNoShare = present.filter(isYesNoLike).length / present.length;

  if (numericShare >= 0.8) return "Number";
  if (dateShare >= 0.8) return "Date";
  if (yesNoShare >= 0.8) return "Yes/No";
  return "Text";
}

function analyseRows(rows: Row[]) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const totalCells = rows.length * Math.max(columns.length, 1);
  let missingCells = 0;

  const missingByColumn: MissingItem[] = columns.map((column) => {
    const missing = rows.filter((row) => row[column] === null || row[column] === "").length;
    missingCells += missing;
    return {
      column,
      missing,
      missingRate: rows.length === 0 ? 0 : Math.round((missing / rows.length) * 100),
    };
  });

  const seen = new Map<string, number>();
  const duplicates: DuplicateItem[] = [];

  rows.forEach((row, index) => {
    const signature = rowSignature(row);
    const firstSeen = seen.get(signature);
    if (firstSeen !== undefined) {
      duplicates.push({
        rowNumber: index + 2,
        duplicateOfRowNumber: firstSeen + 2,
        sample: row,
      });
    } else {
      seen.set(signature, index);
    }
  });

  const emptyColumns = missingByColumn.filter((item) => item.missing === rows.length && rows.length > 0);
  const highMissingColumns = missingByColumn.filter((item) => item.missingRate >= 30 && item.missing < rows.length);

  const columnProfiles: ColumnProfile[] = columns.map((column) => {
    const values = rows.map((row) => row[column]);
    const missingItem = missingByColumn.find((item) => item.column === column);
    const uniqueValues = new Set(values.filter((value) => value !== null && value !== "").map(String)).size;

    const detectedType = detectColumnType(values);
    const sensitivityFlag = detectSensitivityFlag(column);
    return {
      column,
      cleanLabel: cleanLabelFromColumn(column),
      detectedType,
      uniqueValues,
      missing: missingItem?.missing ?? 0,
      missingRate: missingItem?.missingRate ?? 0,
      sensitivityFlag,
      recommendedUse: recommendedUseForColumn(column, detectedType, sensitivityFlag),
    };
  });

  const missingRate = totalCells === 0 ? 0 : missingCells / totalCells;
  const duplicatePenalty = rows.length === 0 ? 0 : duplicates.length / rows.length;
  const emptyColumnPenalty = columns.length === 0 ? 0 : emptyColumns.length / columns.length;
  const score = Math.max(
    0,
    Math.round(100 - missingRate * 45 - duplicatePenalty * 25 - emptyColumnPenalty * 20),
  );

  const sensitiveColumns = columnProfiles.filter((profile) => profile.sensitivityFlag !== "None");

  const issues: QualityIssue[] = [];

  if (rows.length === 0) {
    issues.push({
      type: "error",
      title: "No usable records found",
      description: "Dalili could not detect data rows in this file. Check whether the first sheet has headers and records.",
    });
  } else {
    issues.push({
      type: "success",
      title: `${rows.length.toLocaleString()} records detected`,
      description: `${columns.length} columns were identified and prepared for review.`,
    });
  }

  if (duplicates.length > 0) {
    issues.push({
      type: "warning",
      title: `${duplicates.length.toLocaleString()} duplicate rows detected`,
      description: "These records appear identical across all columns and should be reviewed before analysis.",
    });
  }

  if (emptyColumns.length > 0) {
    issues.push({
      type: "warning",
      title: `${emptyColumns.length} empty column(s) detected`,
      description: `Examples: ${emptyColumns.slice(0, 3).map((item) => item.column).join(", ")}`,
    });
  }

  if (highMissingColumns.length > 0) {
    issues.push({
      type: "warning",
      title: `${highMissingColumns.length} column(s) have high missingness`,
      description: `Examples: ${highMissingColumns
        .slice(0, 3)
        .map((item) => `${item.column} (${item.missingRate}%)`)
        .join(", ")}`,
    });
  }

  if (sensitiveColumns.length > 0) {
    issues.push({
      type: "warning",
      title: `${sensitiveColumns.length} sensitive or identifiable column(s) detected`,
      description: `Review before export: ${sensitiveColumns.slice(0, 4).map((item) => item.column).join(", ")}`,
    });
  }

  if (issues.length === 1 && issues[0].type === "success") {
    issues.push({
      type: "success",
      title: "No major quality issues found",
      description: "This dataset is ready for indicator setup and insight generation.",
    });
  }

  return {
    columns,
    rows,
    score,
    missingByColumn,
    duplicates,
    duplicateCount: duplicates.length,
    columnProfiles,
    emptyColumns,
    highMissingColumns,
    issues,
  };
}

function downloadBlob(content: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function rowsToCsv(rows: Row[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => ({ ...row })));
  return XLSX.utils.sheet_to_csv(worksheet);
}

function safeFileBase(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "dalili_dataset";
}

export function DataRoomClient() {
  const [fileName, setFileName] = useState<string>("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string>("");
  const [isReading, setIsReading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [metadataStatus, setMetadataStatus] = useState("Backend not checked yet.");
  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);
  const syncedDatasetKeyRef = useRef<string>("");

  const analysis = useMemo(() => analyseRows(rows), [rows]);
  const previewRows = useMemo(() => analysis.rows.slice(0, 8), [analysis.rows]);
  const previewColumns = useMemo(() => analysis.columns.slice(0, 8), [analysis.columns]);
  const filteredColumnProfiles = analysis.columnProfiles.filter((profile) =>
    profile.column.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    const project = getActiveProjectFromStorage();
    setActiveProject(project);

    checkBackendHealth()
      .then(() => {
        setBackendOnline(true);
        setMetadataStatus(project?.backendId ? "Backend connected. Dataset metadata can sync to this project." : "Backend connected, but the active project is browser-only.");
      })
      .catch(() => {
        setBackendOnline(false);
        setMetadataStatus("Backend offline. Dataset remains available in browser storage.");
      });
  }, []);

  async function syncDatasetMetadataToBackend(options?: { force?: boolean }) {
    if (!fileName || rows.length === 0) {
      setMetadataStatus("Upload a dataset before syncing metadata.");
      return;
    }

    const project = activeProject ?? getActiveProjectFromStorage();
    setActiveProject(project);

    if (!project?.backendId) {
      setMetadataStatus("Active project is not saved in the backend. Go to Projects, create/sync a backend project, then upload again.");
      return;
    }

    const syncKey = `${project.backendId}:${fileName}:${rows.length}:${analysis.columns.length}:${analysis.score}`;
    if (!options?.force && syncedDatasetKeyRef.current === syncKey) return;

    setIsSyncingMetadata(true);
    try {
      await checkBackendHealth();
      setBackendOnline(true);
      const saved = currentFile
        ? await uploadDatasetFile({
            project_id: project.backendId,
            filename: fileName,
            row_count: rows.length,
            column_count: analysis.columns.length,
            quality_score: analysis.score,
            file: currentFile,
          })
        : await postDatasetMetadata({
            project_id: project.backendId,
            filename: fileName,
            row_count: rows.length,
            column_count: analysis.columns.length,
            quality_score: analysis.score,
            storage_path: null,
          });

      syncedDatasetKeyRef.current = syncKey;
      window.localStorage.setItem("dalili.latestBackendDataset", JSON.stringify(saved));
      setMetadataStatus(
        saved.storage_path
          ? `Dataset file saved to backend: record #${saved.id} under project #${project.backendId}.`
          : `Dataset metadata saved to backend: record #${saved.id} under project #${project.backendId}.`,
      );
    } catch {
      setBackendOnline(false);
      setMetadataStatus("Backend file/metadata sync failed. The dataset is still saved in browser storage.");
    } finally {
      setIsSyncingMetadata(false);
    }
  }

  useEffect(() => {
    if (!fileName || rows.length === 0) return;

    const payload = {
      fileName,
      uploadedAt: new Date().toISOString(),
      rowCount: rows.length,
      columnCount: analysis.columns.length,
      score: analysis.score,
      duplicateCount: analysis.duplicateCount,
      missingByColumn: analysis.missingByColumn,
      columnProfiles: analysis.columnProfiles,
      issues: analysis.issues,
      previewColumns,
      previewRows,
    };

    const datasetPayload = {
      fileName,
      uploadedAt: new Date().toISOString(),
      columns: analysis.columns,
      rows: rows.slice(0, 1000),
      storedRowCount: Math.min(rows.length, 1000),
      totalRowCount: rows.length,
      note:
        rows.length > 1000
          ? "Browser storage keeps the first 1,000 rows for quick calculations. Backend file sync preserves the uploaded file when an active backend project is selected."
          : "Dataset stored in browser for quick calculations.",
    };

    const qualitySaved = safeSetLocalStorage("dalili.latestQualityReport", payload);
    const datasetSaved = safeSetLocalStorage("dalili.latestDataset", datasetPayload);
    const cleanedSaved = safeSetLocalStorage("dalili.latestCleanedDataset", datasetPayload);
    const dictionarySaved = safeSetLocalStorage("dalili.latestDataDictionary", { fileName, generatedAt: new Date().toISOString(), columns: analysis.columnProfiles });

    if (!qualitySaved || !datasetSaved || !cleanedSaved || !dictionarySaved) {
      const slimDatasetPayload = {
        ...datasetPayload,
        rows: rows.slice(0, 200),
        storedRowCount: Math.min(rows.length, 200),
        note: "Browser storage was limited, so Dalili kept a preview only. The backend file upload still preserves the uploaded file when a backend project is selected.",
      };
      safeSetLocalStorage("dalili.latestDataset", slimDatasetPayload);
      safeSetLocalStorage("dalili.latestCleanedDataset", slimDatasetPayload);
      setMetadataStatus("Dataset was read successfully, but your browser could only store a preview. Backend sync will preserve the uploaded file where available.");
    }

    void syncDatasetMetadataToBackend();
  }, [fileName, rows.length, analysis, previewColumns, previewRows, currentFile]);

  async function handleFile(file: File) {
    setError("");
    setIsReading(true);
    setFileName(file.name);
    setCurrentFile(file);
    syncedDatasetKeyRef.current = "";

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: null,
        raw: false,
      });

      const cleanedRows = rawRows.map((row) => {
        const cleaned: Row = {};
        const usedColumnNames = new Set<string>();

        Object.entries(row).forEach(([key, value]) => {
          const cleanKey = cleanColumnName(key, usedColumnNames);
          cleaned[cleanKey] = normaliseCell(value);
        });

        return cleaned;
      });

      setRows(cleanedRows);
    } catch (err) {
      setRows([]);
      setError("Dalili could not read this file. Try a CSV, XLS, or XLSX file with a clear header row.");
    } finally {
      setIsReading(false);
    }
  }

  function exportCleanedCsv() {
    if (rows.length === 0) return;
    downloadBlob(rowsToCsv(rows), `${safeFileBase(fileName)}_dalili_cleaned.csv`, "text/csv;charset=utf-8");
  }

  function exportCleanedExcel() {
    if (rows.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => ({ ...row })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned data");
    XLSX.writeFile(workbook, `${safeFileBase(fileName)}_dalili_cleaned.xlsx`);
  }

  function exportMissingnessTable() {
    if (rows.length === 0) return;
    const csv = XLSX.utils.sheet_to_csv(
      XLSX.utils.json_to_sheet(
        analysis.missingByColumn.map((item) => ({
          column: item.column,
          missing_records: item.missing,
          missing_rate_percent: item.missingRate,
        })),
      ),
    );
    downloadBlob(csv, `${safeFileBase(fileName)}_missingness_table.csv`, "text/csv;charset=utf-8");
  }

  function exportDataDictionary() {
    if (rows.length === 0) return;
    const csv = XLSX.utils.sheet_to_csv(
      XLSX.utils.json_to_sheet(
        analysis.columnProfiles.map((profile) => ({
          column_name: profile.column,
          clean_label: profile.cleanLabel,
          detected_type: profile.detectedType,
          unique_values: profile.uniqueValues,
          missing_records: profile.missing,
          missing_rate_percent: profile.missingRate,
          sensitivity_flag: profile.sensitivityFlag,
          recommended_use: profile.recommendedUse,
        })),
      ),
    );
    downloadBlob(csv, `${safeFileBase(fileName)}_data_dictionary.csv`, "text/csv;charset=utf-8");
  }

  function exportDuplicateReview() {
    if (rows.length === 0) return;
    const csv = XLSX.utils.sheet_to_csv(
      XLSX.utils.json_to_sheet(
        analysis.duplicates.map((item) => ({
          duplicate_row_number: item.rowNumber,
          duplicate_of_row_number: item.duplicateOfRowNumber,
          sample_values: JSON.stringify(item.sample),
        })),
      ),
    );
    downloadBlob(csv, `${safeFileBase(fileName)}_duplicate_review.csv`, "text/csv;charset=utf-8");
  }


  function clearDataset() {
    setFileName("");
    setCurrentFile(null);
    setRows([]);
    setError("");
    window.localStorage.removeItem("dalili.latestQualityReport");
    window.localStorage.removeItem("dalili.latestDataset");
    window.localStorage.removeItem("dalili.latestCleanedDataset");
    window.localStorage.removeItem("dalili.latestBackendDataset");
    window.localStorage.removeItem("dalili.latestDataDictionary");
    syncedDatasetKeyRef.current = "";
    setMetadataStatus(backendOnline ? "Dataset cleared. Backend records already saved remain in the backend audit trail." : "Dataset cleared from browser storage.");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Data Room</p>
              <h1 className="mt-2 text-2xl font-bold text-dalili-ink">Upload and clean programme data</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Start with Excel, CSV, or Kobo exports. Dalili profiles the file, standardises headers, detects missingness and duplicates, then saves the dataset to the backend when an active backend project is selected.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <div className="rounded-2xl bg-[#073B2A] px-4 py-3 text-sm font-semibold text-white">
                Project: {activeProject?.name ?? "No active project"}
              </div>
              <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${backendOnline ? "bg-emerald-50 text-[#073B2A]" : "bg-amber-50 text-amber-700"}`}>
                {activeProject?.backendId ? `Backend project #${activeProject.backendId}` : "Browser-only project"}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Sensitive data check before upload</p>
                <p className="mt-1">Only upload data you are authorised to process. Dalili will flag likely names, phone numbers, IDs, GPS, health, HIV, SRH, SGBV, child/adolescent and vulnerability fields for review before analysis or external reporting.</p>
              </div>
            </div>
          </div>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition hover:border-dalili-green hover:bg-emerald-50">
            <UploadCloud className="h-12 w-12 text-dalili-green" />
            <span className="mt-4 text-lg font-bold text-dalili-ink">Drop your file here or click to browse</span>
            <span className="mt-2 text-sm text-slate-500">Supported now: .xlsx, .xls, .csv</span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          {isReading && <p className="mt-4 text-sm font-semibold text-dalili-green">Reading file...</p>}
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          {fileName && !error && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-dalili-green" />
                <div>
                  <p className="font-semibold text-dalili-ink">{fileName}</p>
                  <p className="text-sm text-slate-500">Cleaned headers and normalised blank cells are ready for analysis.</p>
                </div>
              </div>
              <button
                onClick={clearDataset}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Eraser className="h-4 w-4" />
                Clear
              </button>
            </div>
          )}

          <div className={`mt-4 rounded-2xl border p-4 ${backendOnline ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-[#102033]">Backend dataset storage</p>
                <p className="mt-1 text-sm text-slate-600">{metadataStatus}</p>
              </div>
              <button
                onClick={() => void syncDatasetMetadataToBackend({ force: true })}
                disabled={rows.length === 0 || isSyncingMetadata || !activeProject?.backendId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <UploadCloud className="h-4 w-4" />
                {isSyncingMetadata ? "Syncing..." : "Sync file"}
              </button>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Quality snapshot</p>
          <div className="mt-5 flex items-end gap-3">
            <span className="text-6xl font-black text-[#073B2A]">{analysis.score}</span>
            <span className="pb-2 text-lg font-bold text-slate-500">/ 100</span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-dalili-green" style={{ width: `${analysis.score}%` }} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xl font-bold text-dalili-ink">{rows.length}</p>
              <p className="text-xs text-slate-500">Rows</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xl font-bold text-dalili-ink">{analysis.columns.length}</p>
              <p className="text-xs text-slate-500">Columns</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xl font-bold text-dalili-ink">{analysis.duplicateCount}</p>
              <p className="text-xs text-slate-500">Duplicates</p>
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            <button
              onClick={exportCleanedCsv}
              disabled={rows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#073B2A] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Download cleaned CSV
            </button>
            <button
              onClick={exportCleanedExcel}
              disabled={rows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-dalili-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Download cleaned Excel
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-dalili-ink">Quality findings</h2>
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-5 space-y-3">
            {analysis.issues.map((issue, index) => {
              const Icon = issue.type === "success" ? CheckCircle2 : issue.type === "error" ? XCircle : AlertTriangle;
              const style =
                issue.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : issue.type === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700";
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

        <section className="card overflow-hidden p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-dalili-ink">Dataset preview</h2>
              <p className="mt-1 text-sm text-slate-500">First 8 rows and first 8 columns after header/cell cleaning</p>
            </div>
            <Table2 className="h-5 w-5 text-slate-400" />
          </div>

          {previewRows.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              Upload a dataset to preview records here.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    {previewColumns.map((column) => (
                      <th key={column} className="whitespace-nowrap px-3 py-3 font-bold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-slate-100">
                      {previewColumns.map((column) => (
                        <td key={column} className="max-w-[180px] truncate px-3 py-3 text-slate-600">
                          {row[column] === null ? <span className="text-slate-300">Missing</span> : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-dalili-ink">Missingness and column profile</h2>
            <p className="mt-1 text-sm text-slate-500">Review missing values, detected data types, and unique values before setting indicators.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search columns"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-dalili-ink outline-none focus:border-dalili-green"
              />
            </div>
            <button
              onClick={exportDataDictionary}
              disabled={rows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Data dictionary CSV
            </button>
            <button
              onClick={exportMissingnessTable}
              disabled={rows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-dalili-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Missingness CSV
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-bold">Column</th>
                <th className="px-3 py-3 font-bold">Clean label</th>
                <th className="px-3 py-3 font-bold">Detected type</th>
                <th className="px-3 py-3 font-bold">Unique values</th>
                <th className="px-3 py-3 font-bold">Missing</th>
                <th className="px-3 py-3 font-bold">Missing rate</th>
                <th className="px-3 py-3 font-bold">Sensitivity</th>
                <th className="px-3 py-3 font-bold">Recommended use</th>
              </tr>
            </thead>
            <tbody>
              {filteredColumnProfiles.slice(0, 20).map((profile) => (
                <tr key={profile.column} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-dalili-ink">{profile.column}</td>
                  <td className="px-3 py-3 text-slate-600">{profile.cleanLabel}</td>
                  <td className="px-3 py-3 text-slate-600">{profile.detectedType}</td>
                  <td className="px-3 py-3 text-slate-600">{profile.uniqueValues}</td>
                  <td className="px-3 py-3 text-slate-600">{profile.missing}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        profile.missingRate >= 30
                          ? "bg-amber-50 text-amber-700"
                          : profile.missingRate > 0
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {profile.missingRate}%
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${profile.sensitivityFlag === "None" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {profile.sensitivityFlag}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{profile.recommendedUse}</td>
                </tr>
              ))}
              {filteredColumnProfiles.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                    No columns to show yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-dalili-ink">Duplicate review</h2>
            <p className="mt-1 text-sm text-slate-500">Dalili flags exact duplicate rows. Production cleaning will also support user-approved deduplication rules.</p>
          </div>
          <button
            onClick={exportDuplicateReview}
            disabled={rows.length === 0 || analysis.duplicates.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-dalili-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Duplicate review CSV
          </button>
        </div>

        {analysis.duplicates.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
            No exact duplicate rows detected in the current dataset.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-bold">Duplicate row</th>
                  <th className="px-3 py-3 font-bold">Duplicate of</th>
                  <th className="px-3 py-3 font-bold">Sample values</th>
                </tr>
              </thead>
              <tbody>
                {analysis.duplicates.slice(0, 10).map((item) => (
                  <tr key={`${item.rowNumber}-${item.duplicateOfRowNumber}`} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-dalili-ink">Row {item.rowNumber}</td>
                    <td className="px-3 py-3 text-slate-600">Row {item.duplicateOfRowNumber}</td>
                    <td className="max-w-[520px] truncate px-3 py-3 text-slate-600">{JSON.stringify(item.sample)}</td>
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
