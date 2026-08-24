"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Database, Download, Layers, MapPin, Save, Search, Sparkles } from "lucide-react";

type Row = Record<string, string | number | boolean | null>;

type Dataset = {
  fileName: string;
  uploadedAt: string;
  columns: string[];
  rows: Row[];
  storedRowCount: number;
  totalRowCount: number;
  note: string;
};

type IndicatorResult = {
  indicatorName: string;
  fileName: string;
  numerator: number;
  denominator: number;
  percentage: number;
  target: number | null;
  disaggregateBy: string;
  groups: Array<{ group: string; numerator: number; denominator: number; percentage: number }>;
};

type QualityReport = {
  fileName: string;
  score: number;
  rowCount: number;
  columnCount: number;
};

type ProjectRecord = {
  id: string;
  name: string;
  backendId?: number;
};

type BackendDataset = {
  id: number;
  project_id: number;
  filename: string;
  row_count: number;
  column_count: number;
  quality_score?: number | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}


const districtCoordinates: Record<string, { x: number; y: number; region: string }> = {
  kampala: { x: 53, y: 60, region: "Central" },
  wakiso: { x: 50, y: 58, region: "Central" },
  mukono: { x: 57, y: 58, region: "Central" },
  mpigi: { x: 47, y: 63, region: "Central" },
  masaka: { x: 43, y: 72, region: "Central" },
  mbarara: { x: 29, y: 75, region: "Western" },
  kabale: { x: 22, y: 86, region: "Western" },
  kasese: { x: 22, y: 63, region: "Western" },
  fortportal: { x: 26, y: 56, region: "Western" },
  hoima: { x: 33, y: 45, region: "Western" },
  jinja: { x: 64, y: 57, region: "Eastern" },
  iganga: { x: 70, y: 58, region: "Eastern" },
  mbale: { x: 78, y: 50, region: "Eastern" },
  soroti: { x: 70, y: 38, region: "Eastern" },
  moroto: { x: 78, y: 20, region: "Northern/Eastern" },
  lira: { x: 56, y: 32, region: "Northern" },
  gulu: { x: 45, y: 25, region: "Northern" },
  arua: { x: 27, y: 21, region: "Northern" },
  kitgum: { x: 54, y: 17, region: "Northern" },
};

const aliasMap: Record<string, string> = {
  "kampala capital city": "kampala",
  "kcca": "kampala",
  "wakiso district": "wakiso",
  "mukono district": "mukono",
  "fort portal": "fortportal",
  "fort-portal": "fortportal",
  "mbarara city": "mbarara",
  "jinja city": "jinja",
  "mbale city": "mbale",
  "gulu city": "gulu",
  "arua city": "arua",
};

function cleanLocation(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Missing location";
  const key = raw
    .toLowerCase()
    .replace(/district|city|municipality|subcounty|division/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const compact = key.replace(/\s+/g, "");
  return aliasMap[key] ?? aliasMap[compact] ?? compact;
}

function displayLocation(value: string) {
  if (value === "fortportal") return "Fort Portal";
  if (value === "Missing location") return value;
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function detectLocationColumns(columns: string[]) {
  const keywords = ["district", "subcounty", "sub county", "county", "parish", "village", "region", "location", "facility_district", "site"];
  const scored = columns
    .map((column) => {
      const lower = column.toLowerCase();
      const score = keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 1 : 0), 0);
      return { column, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((item) => item.column);
}

function currentUserName() {
  try {
    const raw = window.localStorage.getItem("dalili_auth_session");
    const session = raw ? JSON.parse(raw) : null;
    return session?.user?.full_name || "Dalili user";
  } catch {
    return "Dalili user";
  }
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

export function MapsClient() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [indicator, setIndicator] = useState<IndicatorResult | null>(null);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [geoColumn, setGeoColumn] = useState("");
  const [search, setSearch] = useState("");
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [backendDataset, setBackendDataset] = useState<BackendDataset | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [isSavingMap, setIsSavingMap] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Backend not checked yet.");

  useEffect(() => {
    const savedDataset = window.localStorage.getItem("dalili.latestDataset");
    const savedIndicator = window.localStorage.getItem("dalili.latestIndicatorResult");
    const savedQuality = window.localStorage.getItem("dalili.latestQualityReport");
    setActiveProject(readJson<ProjectRecord>("dalili.activeProject"));
    setBackendDataset(readJson<BackendDataset>("dalili.latestBackendDataset"));

    fetch(`${API_BASE}/health`)
      .then((response) => {
        if (!response.ok) throw new Error("Backend health check failed");
        setBackendOnline(true);
        setBackendStatus("Backend connected. Map summaries can be saved to the active project.");
      })
      .catch(() => {
        setBackendOnline(false);
        setBackendStatus("Backend offline. You can still export a local map review.");
      });

    if (savedDataset) {
      const parsed = JSON.parse(savedDataset) as Dataset;
      setDataset(parsed);
      const detected = detectLocationColumns(parsed.columns);
      setGeoColumn(detected[0] ?? parsed.columns[0] ?? "");
    }
    if (savedIndicator) setIndicator(JSON.parse(savedIndicator) as IndicatorResult);
    if (savedQuality) setQuality(JSON.parse(savedQuality) as QualityReport);
  }, []);

  const locationColumns = useMemo(() => (dataset ? detectLocationColumns(dataset.columns) : []), [dataset]);

  const geoStats = useMemo(() => {
    if (!dataset || !geoColumn) return [];
    const counts = new Map<string, number>();
    dataset.rows.forEach((row) => {
      const location = cleanLocation(row[geoColumn]);
      counts.set(location, (counts.get(location) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([location, count]) => ({
        location,
        label: displayLocation(location),
        count,
        known: Boolean(districtCoordinates[location]),
        region: districtCoordinates[location]?.region ?? "Unmapped/needs review",
      }))
      .sort((a, b) => b.count - a.count);
  }, [dataset, geoColumn]);

  const filteredStats = geoStats.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  const mappedLocations = geoStats.filter((item) => item.known);
  const unmappedLocations = geoStats.filter((item) => !item.known && item.location !== "Missing location");
  const missingLocationCount = geoStats.find((item) => item.location === "Missing location")?.count ?? 0;
  const maxCount = Math.max(...geoStats.map((item) => item.count), 1);
  const indicatorByLocation = useMemo(() => {
    if (!indicator?.groups?.length || !geoColumn) return [];
    const sameField = indicator.disaggregateBy?.toLowerCase() === geoColumn.toLowerCase();
    if (!sameField) return [];
    return indicator.groups
      .map((group) => ({
        label: displayLocation(cleanLocation(group.group)),
        numerator: group.numerator,
        denominator: group.denominator,
        percentage: group.percentage,
      }))
      .filter((item) => item.denominator > 0)
      .sort((a, b) => a.percentage - b.percentage);
  }, [indicator, geoColumn]);

  const lowestIndicatorLocation = indicatorByLocation[0];
  const highestIndicatorLocation = indicatorByLocation[indicatorByLocation.length - 1];

  const mapInsight = useMemo(() => {
    if (!dataset || !geoStats.length) return "Upload a dataset with location fields to generate a geographic insight.";
    const top = geoStats[0];
    const mappedShare = Math.round((mappedLocations.reduce((sum, item) => sum + item.count, 0) / dataset.rows.length) * 100);
    const indicatorText = lowestIndicatorLocation ? ` The lowest indicator result is in ${lowestIndicatorLocation.label} at ${lowestIndicatorLocation.percentage}%.` : "";
    return `${top.label} has the highest record concentration (${top.count.toLocaleString()} records). ${mappedShare}% of stored records matched Dalili's built-in Uganda map dictionary; unmatched names should be cleaned before final mapping.${indicatorText}`;
  }, [dataset, geoStats, mappedLocations, lowestIndicatorLocation]);


  async function saveMapSummaryToBackend() {
    if (!dataset) return;
    const project = activeProject ?? readJson<ProjectRecord>("dalili.activeProject");
    const latestBackendDataset = backendDataset ?? readJson<BackendDataset>("dalili.latestBackendDataset");

    if (!project?.backendId) {
      setBackendStatus("Select or create a backend-saved project first on /projects.");
      return;
    }

    if (latestBackendDataset && latestBackendDataset.project_id !== project.backendId) {
      setBackendStatus("The latest backend dataset belongs to another project. Re-upload under the active project before saving the map summary.");
      return;
    }

    setIsSavingMap(true);
    try {
      const response = await fetch(`${API_BASE}/map-summaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.backendId,
          dataset_id: latestBackendDataset?.id ?? null,
          file_name: dataset.fileName,
          geography_column: geoColumn || "Not selected",
          total_records: dataset.storedRowCount,
          unique_locations: geoStats.length,
          mapped_locations: mappedLocations.length,
          unmapped_locations: unmappedLocations.length,
          missing_location_count: missingLocationCount,
          quality_score: quality?.score ?? null,
          latest_indicator_name: indicator?.indicatorName ?? null,
          latest_indicator_percentage: indicator?.percentage ?? null,
          location_counts_json: JSON.stringify(geoStats),
          unmapped_locations_json: JSON.stringify(unmappedLocations),
          map_insight: mapInsight,
          author: currentUserName(),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = await response.json();
      window.localStorage.setItem("dalili.latestBackendMapSummary", JSON.stringify(saved));
      setBackendStatus(`Map summary saved to backend: record #${saved.id} under project #${project.backendId}.`);
    } catch (error) {
      setBackendStatus(error instanceof Error ? error.message : "Could not save map summary to backend.");
    } finally {
      setIsSavingMap(false);
    }
  }

  function exportLocationTable() {
    const rows: Array<Array<string | number>> = [["Location", "Records", "Mapped", "Region", "Indicator %", "Indicator numerator", "Indicator denominator"]];
    geoStats.forEach((item) => {
      const indicatorRow = indicatorByLocation.find((entry) => entry.label.toLowerCase() === item.label.toLowerCase());
      rows.push([
        item.label,
        item.count,
        item.known ? "Yes" : "No",
        item.region,
        indicatorRow?.percentage ?? "",
        indicatorRow?.numerator ?? "",
        indicatorRow?.denominator ?? "",
      ]);
    });
    downloadCsv("dalili-location-table.csv", rows);
  }

  function exportMapReview() {
    if (!dataset) return;
    const lines = [
      "DALILI GEOGRAPHIC REVIEW",
      "========================",
      `Dataset: ${dataset.fileName}`,
      `Geography column: ${geoColumn || "Not selected"}`,
      `Records reviewed: ${dataset.storedRowCount.toLocaleString()} of ${dataset.totalRowCount.toLocaleString()}`,
      quality ? `Latest data quality score: ${quality.score}/100` : "Latest data quality score: Not available",
      indicator ? `Latest indicator: ${indicator.indicatorName} (${indicator.percentage}%)` : "Latest indicator: Not calculated",
      "",
      "SUMMARY",
      mapInsight,
      "",
      "LOCATION COUNTS",
      ...geoStats.map((item) => `${item.label}: ${item.count} records | ${item.region}${item.known ? "" : " | needs mapping review"}`),
      "",
      `Missing location records: ${missingLocationCount}`,
      `Unmapped location names: ${unmappedLocations.length}`,
      "",
      "Prototype note: this page uses an internal Uganda district dictionary and a simplified map preview. Production should use official district/subcounty shapefiles and backend geocoding/standardisation.",
    ];
    downloadText("dalili-geographic-review.txt", lines.join("\n"));
  }

  if (!dataset) {
    return (
      <div className="card p-8">
        <div className="flex max-w-3xl items-start gap-4">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Maps</p>
            <h1 className="mt-2 text-2xl font-bold text-dalili-ink">No dataset available for mapping</h1>
            <p className="mt-3 text-slate-500">
              Go to Data Room and upload an Excel or CSV file that includes a district, subcounty, village, facility, or location column. Dalili will then produce a geographic readiness review.
            </p>
            <a href="/data-room" className="mt-6 inline-flex rounded-2xl bg-dalili-green px-5 py-3 text-sm font-bold text-white">
              Upload a dataset
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dalili-green">Maps</p>
              <h1 className="mt-2 text-2xl font-bold text-dalili-ink">Geographic intelligence</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Review location coverage, clean geography names, and prepare programme data for Uganda district/subcounty mapping.
              </p>
              <p className="mt-4 text-sm font-semibold text-slate-600">Dataset: {dataset.fileName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportLocationTable} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-dalili-ink">
                <Download className="h-4 w-4" />
                Export location table
              </button>
              <button onClick={exportMapReview} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dalili-navy px-5 py-3 text-sm font-bold text-white">
                <Download className="h-4 w-4" />
                Export map review
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Locations</p>
              <p className="mt-2 text-3xl font-black text-dalili-ink">{geoStats.length}</p>
              <p className="text-xs text-slate-500">unique names</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mapped</p>
              <p className="mt-2 text-3xl font-black text-dalili-ink">{mappedLocations.length}</p>
              <p className="text-xs text-slate-500">matched to dictionary</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Needs review</p>
              <p className="mt-2 text-3xl font-black text-dalili-ink">{unmappedLocations.length}</p>
              <p className="text-xs text-slate-500">unmapped names</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Missing</p>
              <p className="mt-2 text-3xl font-black text-dalili-ink">{missingLocationCount}</p>
              <p className="text-xs text-slate-500">records</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-dalili-ink">Uganda map preview</h2>
                  <p className="mt-1 text-xs text-slate-500">Simplified preview. Production will use official shapefiles.</p>
                </div>
                <Layers className="h-5 w-5 text-dalili-green" />
              </div>

              <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <svg viewBox="0 0 100 100" className="h-80 w-full" role="img" aria-label="Simplified Uganda map preview">
                  <path
                    d="M39 6 L58 8 L74 18 L83 34 L78 52 L86 67 L73 87 L52 94 L34 88 L20 74 L12 54 L18 37 L16 20 Z"
                    fill="#e8f5ef"
                    stroke="#0FA67A"
                    strokeWidth="1.5"
                  />
                  {mappedLocations.slice(0, 18).map((item) => {
                    const point = districtCoordinates[item.location];
                    const radius = 2.5 + (item.count / maxCount) * 5.5;
                    return (
                      <g key={item.location}>
                        <circle cx={point.x} cy={point.y} r={radius} fill="#0FA67A" opacity="0.72" />
                        <circle cx={point.x} cy={point.y} r={radius + 1.5} fill="none" stroke="#0FA67A" opacity="0.25" />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-bold text-dalili-ink">Geography column</h2>
                  <p className="mt-1 text-xs text-slate-500">Select the column Dalili should treat as the location field.</p>
                </div>
                <select
                  value={geoColumn}
                  onChange={(event) => setGeoColumn(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-dalili-ink shadow-sm"
                >
                  {locationColumns.length > 0 && <optgroup label="Detected geography fields">{locationColumns.map((column) => <option key={column}>{column}</option>)}</optgroup>}
                  <optgroup label="All columns">
                    {dataset.columns.map((column) => <option key={column}>{column}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-dalili-green" />
                  <div>
                    <p className="text-sm font-bold text-dalili-ink">Dalili map insight</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{mapInsight}</p>
                  </div>
                </div>
              </div>

              {indicator && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Latest indicator context</p>
                  <p className="mt-2 text-sm font-bold text-dalili-ink">{indicator.indicatorName}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {indicator.numerator.toLocaleString()} / {indicator.denominator.toLocaleString()} = {indicator.percentage}%
                    {indicator.target !== null ? ` | target ${indicator.target}%` : ""}
                  </p>
                </div>
              )}

              {indicatorByLocation.length > 0 && (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="mt-0.5 h-5 w-5 text-dalili-green" />
                    <div>
                      <p className="text-sm font-bold text-dalili-ink">Indicator by selected location</p>
                      <p className="mt-1 text-xs text-slate-600">Lowest: {lowestIndicatorLocation?.label} at {lowestIndicatorLocation?.percentage}% · Highest: {highestIndicatorLocation?.label} at {highestIndicatorLocation?.percentage}%</p>
                    </div>
                  </div>
                  <div className="mt-4 max-h-48 space-y-2 overflow-auto">
                    {indicatorByLocation.slice(0, 8).map((item) => (
                      <div key={item.label} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                        <div className="flex justify-between gap-3"><span className="font-bold text-dalili-ink">{item.label}</span><span>{item.percentage}%</span></div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-dalili-green" style={{ width: `${Math.min(100, Math.max(3, item.percentage))}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {indicator && indicatorByLocation.length === 0 && (
                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                  To show indicator-by-location, calculate the indicator using this geography column as the disaggregation field.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-[#073B2A]">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-dalili-ink">Backend map storage</h2>
                <p className="mt-1 text-sm text-slate-500">Save the geographic review summary against the active backend project.</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p><span className="font-semibold text-dalili-ink">Backend:</span> {backendOnline ? "online" : "offline"}</p>
              <p><span className="font-semibold text-dalili-ink">Project:</span> {activeProject?.backendId ? `#${activeProject.backendId} — ${activeProject.name}` : "not backend-saved"}</p>
              <p><span className="font-semibold text-dalili-ink">Dataset:</span> {backendDataset?.id ? `#${backendDataset.id}` : "not linked"}</p>
            </div>
            <button onClick={saveMapSummaryToBackend} disabled={isSavingMap || !activeProject?.backendId} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#073B2A] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="h-4 w-4" />
              {isSavingMap ? "Saving..." : "Save map summary"}
            </button>
            <p className="mt-3 text-xs leading-5 text-slate-500">{backendStatus}</p>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-dalili-ink">Location cleaning</h2>
            <p className="mt-2 text-sm text-slate-500">Dalili standardises names before mapping. Review unmatched items before report export.</p>
            <div className="mt-5 space-y-3">
              {unmappedLocations.slice(0, 6).map((item) => (
                <div key={item.location} className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-dalili-ink">{item.label}</p>
                  <p className="text-xs text-amber-700">{item.count} records need geography dictionary review</p>
                </div>
              ))}
              {unmappedLocations.length === 0 && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">All non-missing location names matched the current dictionary.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-dalili-ink">Search locations</h2>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search district or location" className="w-full border-0 p-1 text-sm outline-none" />
            </div>
            <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
              {filteredStats.slice(0, 12).map((item) => (
                <div key={item.location} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MapPin className={`h-4 w-4 ${item.known ? "text-dalili-green" : "text-amber-600"}`} />
                      <span className="text-sm font-bold text-dalili-ink">{item.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white">
                    <div className="h-2 rounded-full bg-dalili-green" style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{item.region}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
