"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE, authFetch } from "@/lib/auth-client";
import { BarChart3, CheckCircle2, Database, FileText, Loader2, Map, ShieldCheck } from "lucide-react";

type BackendDataset = {
  id: number;
  project_id: number;
  filename: string;
  row_count?: number | null;
  column_count?: number | null;
  quality_score?: number | null;
};

type Context = "data-room" | "quality-check" | "indicators" | "documents" | "maps";

type ActionStatus = {
  label: string;
  state: "idle" | "working" | "success" | "error";
  message: string;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!response.ok) {
    const message = typeof parsed === "object" && parsed && "detail" in parsed ? String((parsed as { detail: unknown }).detail) : text || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return parsed;
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function EngineQuickActions({ context }: { context: Context }) {
  const [backendOnline, setBackendOnline] = useState(false);
  const [dataset, setDataset] = useState<BackendDataset | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [status, setStatus] = useState<ActionStatus>({ label: "Backend engine", state: "idle", message: "Ready to run backend intelligence actions." });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [geographyColumn, setGeographyColumn] = useState("");

  const columns = useMemo(() => profile?.columns?.map((item: { name: string }) => item.name) ?? [], [profile]);

  useEffect(() => {
    const latestDataset = readJson<BackendDataset>("dalili.latestBackendDataset");
    const latestProfile = readJson<any>("dalili.latestBackendProfile");
    setDataset(latestDataset);
    setProfile(latestProfile);
    const geographyGuess = latestProfile?.columns?.find((item: { name: string }) => /district|subcounty|village|site|facility|location|region/i.test(item.name))?.name ?? "";
    setGeographyColumn(geographyGuess);
    fetch(`${API_BASE}/health`).then((response) => setBackendOnline(response.ok)).catch(() => setBackendOnline(false));
  }, []);

  function working(label: string, message: string) {
    setStatus({ label, state: "working", message });
  }

  function success(label: string, message: string) {
    setStatus({ label, state: "success", message });
  }

  function error(label: string, err: unknown) {
    setStatus({ label, state: "error", message: getMessage(err) });
  }

  async function profileDataset() {
    if (!dataset?.id) {
      error("Profile dataset", new Error("No backend dataset found. Create/select a backend project, then upload a dataset in Data Room."));
      return;
    }
    const label = "Profile dataset";
    try {
      working(label, `Profiling ${dataset.filename} in the backend...`);
      const response = await authFetch(`/engine/datasets/${dataset.id}/profile`);
      const json = await parseJsonResponse(response);
      setProfile(json);
      saveJson("dalili.latestBackendProfile", json);
      const geographyGuess = (json as any)?.columns?.find((item: { name: string }) => /district|subcounty|village|site|facility|location|region/i.test(item.name))?.name ?? "";
      if (geographyGuess) setGeographyColumn(geographyGuess);
      success(label, `Profile complete: ${((json as any)?.quality?.row_count ?? 0)} rows and ${((json as any)?.quality?.column_count ?? 0)} columns.`);
    } catch (err) {
      error(label, err);
    }
  }

  async function generateDqa() {
    if (!dataset?.id) {
      error("Generate backend DQA", new Error("No backend dataset found. Upload a dataset to the backend first."));
      return;
    }
    const label = "Generate backend DQA";
    try {
      working(label, `Generating backend DQA for ${dataset.filename}...`);
      const response = await authFetch(`/engine/datasets/${dataset.id}/quality-report`, { method: "POST" });
      const json = await parseJsonResponse(response);
      const quality = (json as any).quality;
      saveJson("dalili.latestBackendQualityReport", json);
      saveJson("dalili.latestQualityReport", {
        fileName: dataset.filename,
        rowCount: quality?.row_count ?? 0,
        columnCount: quality?.column_count ?? 0,
        score: quality?.score ?? 0,
        duplicateRows: quality?.duplicate_count ?? 0,
        issues: quality?.issues ?? [],
        missingness: quality?.missingness ?? [],
        backendReportId: (json as any).report_id,
        cleanedFile: (json as any).cleaned_file,
      });
      success(label, `DQA saved to backend as report #${(json as any).report_id}. Score: ${quality?.score}/100.`);
    } catch (err) {
      error(label, err);
    }
  }

  async function calculateBackendIndicator() {
    if (!dataset?.id) {
      error("Calculate backend indicator", new Error("No backend dataset found. Upload a dataset to the backend first."));
      return;
    }
    const latestIndicator = readJson<any>("dalili.latestIndicatorResult");
    const firstColumn = columns[0] ?? latestIndicator?.numeratorColumn ?? "";
    if (!firstColumn && !latestIndicator?.numeratorColumn) {
      error("Calculate backend indicator", new Error("No column information found. Run Profile dataset first."));
      return;
    }
    const label = "Calculate backend indicator";
    try {
      working(label, "Running numerator/denominator logic in the backend...");
      const payload = {
        project_id: dataset.project_id,
        dataset_id: dataset.id,
        indicator_name: latestIndicator?.indicatorName ?? "Backend indicator result",
        numerator_column: latestIndicator?.numeratorColumn ?? firstColumn,
        numerator_operator: latestIndicator?.numeratorOperator ?? "is_not_blank",
        numerator_value: latestIndicator?.numeratorValue ?? null,
        denominator_column: latestIndicator?.denominatorOperator === "any" ? null : latestIndicator?.denominatorColumn ?? null,
        denominator_operator: latestIndicator?.denominatorOperator ?? "any",
        denominator_value: latestIndicator?.denominatorValue ?? null,
        target: typeof latestIndicator?.target === "number" ? latestIndicator.target : 80,
        disaggregate_by: latestIndicator?.disaggregateBy ?? (geographyColumn || null),
        save_result: true,
      };
      const response = await authFetch("/engine/indicators/calculate", { method: "POST", body: JSON.stringify(payload) });
      const json = await parseJsonResponse(response);
      saveJson("dalili.latestBackendIndicatorResult", json);
      saveJson("dalili.latestIndicatorResult", {
        indicatorName: (json as any).indicator_name,
        numerator: (json as any).numerator_count,
        denominator: (json as any).denominator_count,
        percentage: (json as any).percentage,
        target: (json as any).target,
        disaggregateBy: (json as any).disaggregate_by,
        groups: (json as any).groups,
        calculationText: (json as any).calculation_text,
        backendResultId: (json as any).indicator_result_id,
      });
      success(label, `Indicator saved to backend as result #${(json as any).indicator_result_id}: ${(json as any).calculation_text}.`);
    } catch (err) {
      error(label, err);
    }
  }

  async function extractDocument() {
    if (!dataset?.project_id) {
      error("Extract backend document", new Error("No active backend project found. Create/select a backend project and upload a dataset first."));
      return;
    }
    if (!documentFile) {
      error("Extract backend document", new Error("Choose a document file first."));
      return;
    }
    const label = "Extract backend document";
    try {
      working(label, `Extracting ${documentFile.name} in the backend...`);
      const formData = new FormData();
      formData.append("project_id", String(dataset.project_id));
      if (dataset.id) formData.append("dataset_id", String(dataset.id));
      formData.append("save_record", "true");
      formData.append("file", documentFile, documentFile.name);
      const response = await fetch(`${API_BASE}/engine/documents/extract`, { method: "POST", body: formData });
      const json = await parseJsonResponse(response);
      saveJson("dalili.latestBackendDocumentRecord", json);
      saveJson("dalili.latestDocumentSummary", json);
      success(label, `Document saved to backend as record #${(json as any).document_record_id}. Extracted ${(json as any).word_count} words.`);
    } catch (err) {
      error(label, err);
    }
  }

  async function summariseMap() {
    if (!dataset?.id) {
      error("Summarise backend map", new Error("No backend dataset found. Upload a dataset to the backend first."));
      return;
    }
    if (!geographyColumn) {
      error("Summarise backend map", new Error("Select a geography column first. Run Profile dataset if the list is empty."));
      return;
    }
    const label = "Summarise backend map";
    try {
      working(label, `Summarising ${geographyColumn} in the backend...`);
      const response = await authFetch("/engine/maps/summarise", {
        method: "POST",
        body: JSON.stringify({ dataset_id: dataset.id, project_id: dataset.project_id, geography_column: geographyColumn, save_summary: true }),
      });
      const json = await parseJsonResponse(response);
      saveJson("dalili.latestBackendMapSummary", json);
      success(label, `Map summary saved as #${(json as any).map_summary_id}. ${((json as any).unique_locations ?? 0)} unique locations found.`);
    } catch (err) {
      error(label, err);
    }
  }

  const actions = {
    "data-room": [
      { label: "Backend profile", icon: Database, run: profileDataset },
      { label: "Backend DQA", icon: ShieldCheck, run: generateDqa },
    ],
    "quality-check": [{ label: "Generate backend DQA", icon: ShieldCheck, run: generateDqa }],
    indicators: [
      { label: "Profile dataset", icon: Database, run: profileDataset },
      { label: "Calculate backend indicator", icon: BarChart3, run: calculateBackendIndicator },
    ],
    documents: [{ label: "Extract document in backend", icon: FileText, run: extractDocument }],
    maps: [
      { label: "Profile dataset", icon: Database, run: profileDataset },
      { label: "Save backend map summary", icon: Map, run: summariseMap },
    ],
  }[context];

  const tone = status.state === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status.state === "error" ? "border-red-200 bg-red-50 text-red-800" : status.state === "working" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600";

  return (
    <section className="card mt-6 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-dalili-green">Backend intelligence engine</p>
          <h2 className="mt-1 text-lg font-bold text-dalili-ink">Server-side processing actions</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Backend: <span className={backendOnline ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>{backendOnline ? "online" : "offline"}</span>
            {dataset ? ` · Dataset #${dataset.id}: ${dataset.filename}` : " · No backend dataset linked yet"}
          </p>
        </div>
        <a href="/quality-check" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-dalili-green hover:bg-emerald-50">Open quality check</a>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} onClick={action.run} className="inline-flex items-center gap-2 rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white hover:bg-[#0B5E3C] disabled:opacity-60" disabled={status.state === "working"}>
              {status.state === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {action.label}
            </button>
          );
        })}
      </div>

      {context === "documents" ? (
        <label className="mt-4 flex cursor-pointer flex-col rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 hover:bg-white">
          <span className="font-semibold text-dalili-ink">{documentFile ? documentFile.name : "Choose a document for backend extraction"}</span>
          <span className="mt-1 text-xs text-slate-400">PDF, DOCX, TXT, Markdown, CSV or JSON</span>
          <input type="file" className="hidden" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} accept=".pdf,.docx,.txt,.md,.csv,.json" />
        </label>
      ) : null}

      {context === "maps" ? (
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Geography column
          <select value={geographyColumn} onChange={(event) => setGeographyColumn(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select location column</option>
            {columns.map((column: string) => <option key={column} value={column}>{column}</option>)}
          </select>
        </label>
      ) : null}

      <div className={`mt-4 rounded-2xl border p-4 text-sm ${tone}`}>
        <div className="flex items-center gap-2 font-bold">
          {status.state === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : status.state === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
          {status.label}
        </div>
        <p className="mt-1 leading-6">{status.message}</p>
      </div>
    </section>
  );
}
