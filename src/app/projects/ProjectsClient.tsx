"use client";

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileText,
  FolderOpen,
  Globe2,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { API_BASE, authFetch } from "@/lib/auth-client";

type ProjectStatus = "Planning" | "Active" | "Reporting" | "Closed";
type Project = {
  id: string;
  backendId?: number;
  organisationId?: number;
  name: string;
  organisation: string;
  sector: string;
  donor: string;
  country: string;
  geography: string;
  reportingPeriod: string;
  status: ProjectStatus;
  sensitivity: "Low" | "Moderate" | "High" | "Very high";
  description: string;
  createdAt: string;
  source?: "backend" | "local";
};

type ApiOrganisation = {
  id: number;
  name: string;
  country: string;
  sector?: string | null;
  created_at: string;
};

type ApiProject = {
  id: number;
  organisation_id: number;
  name: string;
  sector?: string | null;
  donor?: string | null;
  geography?: string | null;
  reporting_period?: string | null;
  sensitivity_level: string;
  status: string;
  created_at: string;
};

type LatestDataset = {
  fileName?: string;
  rowCount?: number;
  columnCount?: number;
};

type LatestQuality = {
  fileName?: string;
  rowCount?: number;
  columnCount?: number;
  score?: number;
  issues?: { title: string; severity: string }[];
};

type LatestIndicator = {
  indicatorName?: string;
  percentage?: number;
  numerator?: number;
  denominator?: number;
  target?: number;
};

const STORAGE_KEY = "dalili.projects";
const ACTIVE_KEY = "dalili.activeProject";

const demoProjectNameFragments = [
  "youth health programme q2 review",
  "smallholder farmer livelihoods endline",
  "demo project",
  "proj-yhp",
  "proj-agri",
];

function isDemoProject(project: Project) {
  const text = `${project.id} ${project.name}`.toLowerCase();
  return demoProjectNameFragments.some((fragment) => text.includes(fragment));
}

const emptyForm: Omit<Project, "id" | "createdAt" | "source" | "backendId" | "organisationId"> = {
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
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : null;
  } catch {
    return null;
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
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

function normaliseSensitivity(value: string): Project["sensitivity"] {
  const match = ["Low", "Moderate", "High", "Very high"].find((item) => item.toLowerCase() === value.toLowerCase());
  return (match as Project["sensitivity"]) ?? "Moderate";
}

function normaliseStatus(value: string): ProjectStatus {
  const match = ["Planning", "Active", "Reporting", "Closed"].find((item) => item.toLowerCase() === value.toLowerCase());
  return (match as ProjectStatus) ?? "Active";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(path, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function getOrCreateOrganisation(name: string, country: string, sector: string): Promise<ApiOrganisation> {
  const organisations = await fetchJson<ApiOrganisation[]>("/organisations");
  const existing = organisations.find((org) => org.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing;
  return fetchJson<ApiOrganisation>("/organisations", {
    method: "POST",
    body: JSON.stringify({ name, country, sector }),
  });
}

function mapBackendProjects(projects: ApiProject[], organisations: ApiOrganisation[]): Project[] {
  return projects.map((project) => {
    const org = organisations.find((item) => item.id === project.organisation_id);
    return {
      id: `api-${project.id}`,
      backendId: project.id,
      organisationId: project.organisation_id,
      name: project.name,
      organisation: org?.name ?? `Organisation ${project.organisation_id}`,
      sector: project.sector ?? org?.sector ?? "Not specified",
      donor: project.donor ?? "Not specified",
      country: org?.country ?? "Uganda",
      geography: project.geography ?? "Uganda",
      reportingPeriod: project.reporting_period ?? "Not specified",
      status: normaliseStatus(project.status),
      sensitivity: normaliseSensitivity(project.sensitivity_level),
      description: "Saved in the Dalili backend database.",
      createdAt: project.created_at.slice(0, 10),
      source: "backend",
    };
  });
}

export function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [latestDataset, setLatestDataset] = useState<LatestDataset | null>(null);
  const [latestQuality, setLatestQuality] = useState<LatestQuality | null>(null);
  const [latestIndicator, setLatestIndicator] = useState<LatestIndicator | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Checking backend connection...");
  const [isSyncing, setIsSyncing] = useState(false);

  async function loadBackendProjects() {
    setIsSyncing(true);
    try {
      await fetchJson<{ status: string }>("/health");
      const [organisations, backendProjects] = await Promise.all([
        fetchJson<ApiOrganisation[]>("/organisations"),
        fetchJson<ApiProject[]>("/projects"),
      ]);
      setBackendOnline(true);
      if (backendProjects.length > 0) {
        const mapped = mapBackendProjects(backendProjects, organisations).filter((project) => !isDemoProject(project));
        setProjects(mapped);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        const savedActive = readJson<string>(ACTIVE_KEY);
        const nextActive = savedActive && mapped.some((p) => p.id === savedActive) ? savedActive : mapped[0]?.id ?? "";
        setActiveProjectId(nextActive);
        if (nextActive) window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(nextActive));
        else window.localStorage.removeItem(ACTIVE_KEY);
        setSyncMessage(mapped.length ? `Connected to backend. Loaded ${mapped.length} project${mapped.length === 1 ? "" : "s"}.` : "Connected to backend. Only removed demo/sample projects were found; create a real project to continue.");
      } else {
        setSyncMessage("Connected to backend. No backend projects yet; create one to save it to the database.");
      }
    } catch {
      setBackendOnline(false);
      setSyncMessage("Backend offline. Projects are still working from browser storage.");
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    const savedProjects = readJson<Project[]>(STORAGE_KEY);
    const savedActive = readJson<string>(ACTIVE_KEY);
    const cleanedSavedProjects = (savedProjects ?? []).filter((project) => !isDemoProject(project));
    if (cleanedSavedProjects.length) {
      const nextActive = savedActive && cleanedSavedProjects.some((p) => p.id === savedActive) ? savedActive : cleanedSavedProjects[0].id;
      setProjects(cleanedSavedProjects);
      setActiveProjectId(nextActive);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedSavedProjects));
      window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(nextActive));
    } else {
      setProjects([]);
      setActiveProjectId("");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      window.localStorage.removeItem(ACTIVE_KEY);
    }

    setLatestDataset(readJson<LatestDataset>("dalili.latestDataset"));
    setLatestQuality(readJson<LatestQuality>("dalili.latestQualityReport"));
    setLatestIndicator(readJson<LatestIndicator>("dalili.latestIndicatorResult"));
    void loadBackendProjects();
  }, []);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );

  function persist(nextProjects: Project[], nextActiveId = activeProjectId) {
    setProjects(nextProjects);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProjects));
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(nextActiveId));
    window.dispatchEvent(new Event("dalili-projects-changed"));
  }

  function selectProject(projectId: string) {
    setActiveProjectId(projectId);
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(projectId));
    window.dispatchEvent(new Event("dalili-projects-changed"));
  }

  async function createProject() {
    if (!form.name.trim() || !form.organisation.trim()) return;

    const baseProject: Project = {
      ...form,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      geography: form.geography.trim() || "Uganda",
      reportingPeriod: form.reportingPeriod.trim() || "Not specified",
      donor: form.donor.trim() || "Not specified",
      description: form.description.trim() || "No description added yet.",
      source: "local",
    };

    if (backendOnline) {
      try {
        const org = await getOrCreateOrganisation(baseProject.organisation, baseProject.country, baseProject.sector);
        const savedProject = await fetchJson<ApiProject>("/projects", {
          method: "POST",
          body: JSON.stringify({
            organisation_id: org.id,
            name: baseProject.name,
            sector: baseProject.sector,
            donor: baseProject.donor,
            geography: baseProject.geography,
            reporting_period: baseProject.reportingPeriod,
            sensitivity_level: baseProject.sensitivity,
            status: baseProject.status,
          }),
        });
        const nextProject: Project = {
          ...baseProject,
          id: `api-${savedProject.id}`,
          backendId: savedProject.id,
          organisationId: org.id,
          source: "backend",
          createdAt: savedProject.created_at.slice(0, 10),
        };
        const nextProjects = [nextProject, ...projects];
        setForm(emptyForm);
        setActiveProjectId(nextProject.id);
        persist(nextProjects, nextProject.id);
        setSyncMessage("Project saved. Opening the guided M&E workspace next.");
        window.location.href = "/workspace";
        return;
      } catch (error) {
        setSyncMessage("Backend save failed, so the project was kept in browser storage only.");
      }
    }

    const nextProjects = [baseProject, ...projects];
    setForm(emptyForm);
    setActiveProjectId(baseProject.id);
    persist(nextProjects, baseProject.id);
    window.location.href = "/workspace";
  }

  function removeProject(projectId: string) {
    const nextProjects = projects.filter((project) => project.id !== projectId);
    const nextActiveId = activeProjectId === projectId ? nextProjects[0]?.id ?? "" : activeProjectId;
    setActiveProjectId(nextActiveId);
    persist(nextProjects, nextActiveId);
    if (!nextActiveId) window.localStorage.removeItem(ACTIVE_KEY);
    setSyncMessage("Project removed from the browser view. Backend deletion will be added in the next database module.");
  }

  function buildProjectBriefText() {
    if (!activeProject) return "";
    const lines = [
      "DALILI PROJECT BRIEF",
      "====================",
      `Project: ${activeProject.name}`,
      `Organisation: ${activeProject.organisation}`,
      `Sector: ${activeProject.sector}`,
      `Donor: ${activeProject.donor}`,
      `Country: ${activeProject.country}`,
      `Geography: ${activeProject.geography}`,
      `Reporting period: ${activeProject.reportingPeriod}`,
      `Status: ${activeProject.status}`,
      `Data sensitivity: ${activeProject.sensitivity}`,
      `Storage source: ${activeProject.source === "backend" ? "Dalili backend database" : "Browser storage"}`,
      "",
      "Description",
      activeProject.description,
      "",
      "Current linked Dalili context",
      `Latest dataset: ${latestDataset?.fileName ?? latestQuality?.fileName ?? "No dataset uploaded yet"}`,
      `Rows: ${latestDataset?.rowCount ?? latestQuality?.rowCount ?? "N/A"}`,
      `Columns: ${latestDataset?.columnCount ?? latestQuality?.columnCount ?? "N/A"}`,
      `Quality score: ${latestQuality?.score ?? "N/A"}`,
      `Latest indicator: ${latestIndicator?.indicatorName ?? "No indicator calculated yet"}`,
      `Latest indicator result: ${typeof latestIndicator?.percentage === "number" ? `${latestIndicator.percentage.toFixed(1)}%` : "N/A"}`,
      "",
      "Next recommended steps",
      "1. Upload or confirm the project dataset in Data Room.",
      "2. Run Quality Check and resolve high-priority issues.",
      "3. Define indicators with transparent numerator and denominator rules.",
      "4. Review AI-style insights and approve only validated findings.",
      "5. Generate the donor/reporting output in Reports Studio.",
    ];
    return lines.join("\n");
  }

  function buildProjectBriefHtml() {
    if (!activeProject) return "";
    const logo = typeof window !== "undefined" ? window.localStorage.getItem("dalili.organisationLogo") : null;
    const text = buildProjectBriefText();
    const content = text.split("\n").map((line) => {
      if (!line.trim()) return "<br />";
      if (line === "DALILI PROJECT BRIEF") return `<h1>${escapeHtml(line)}</h1>`;
      if (["Description", "Current linked Dalili context", "Next recommended steps"].includes(line)) return `<h2>${escapeHtml(line)}</h2>`;
      if (/^[0-9]+\./.test(line)) return `<p class="bullet">${escapeHtml(line)}</p>`;
      return `<p>${escapeHtml(line)}</p>`;
    }).join("\n");
    return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(activeProject.name)} project brief</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#102033;margin:48px;line-height:1.55}.header{display:flex;align-items:center;gap:16px;border-bottom:4px solid #F5B400;padding-bottom:18px;margin-bottom:24px}.logo{height:64px;max-width:160px;object-fit:contain;border:1px solid #e2e8f0;border-radius:14px;padding:6px}h1{color:#073B2A;font-size:26px;margin:0}h2{color:#073B2A;font-size:16px;margin-top:22px}p{font-size:12.5px;margin:7px 0}.bullet{margin-left:16px}.footer{margin-top:34px;border-top:1px solid #e2e8f0;padding-top:12px;color:#64748b;font-size:11px}</style></head><body><div class="header">${logo ? `<img class="logo" src="${logo}" alt="Organisation logo" />` : ""}<div><h1>Dalili Project Brief</h1><p>${escapeHtml(activeProject.organisation || "Organisation not specified")}</p></div></div>${content}<div class="footer">Generated by Dalili. Review and validate before external sharing.</div></body></html>`;
  }

  function exportProjectBrief(format: "doc" | "html" | "txt" | "print") {
    if (!activeProject) return;
    const base = `${slugify(activeProject.name)}-project-brief`;
    if (format === "txt") {
      downloadText(`${base}.txt`, buildProjectBriefText());
      return;
    }
    const html = buildProjectBriefHtml();
    if (format === "doc") {
      downloadBlob(`${base}.doc`, html, "application/msword;charset=utf-8");
      return;
    }
    if (format === "html") {
      downloadBlob(`${base}.html`, html, "text/html;charset=utf-8");
      return;
    }
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  }

  const projectStats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((project) => project.status === "Active").length,
      reporting: projects.filter((project) => project.status === "Reporting").length,
      highSensitivity: projects.filter((project) => ["High", "Very high"].includes(project.sensitivity)).length,
      backend: projects.filter((project) => project.source === "backend").length,
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#073B2A]">
            <FolderOpen className="h-3.5 w-3.5" />
            Project workspace
          </div>
          <h1 className="mt-3 text-3xl font-bold text-[#102033]">Projects</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Create and manage analysis workspaces for each programme, evaluation, donor report or client assignment. When the FastAPI backend is running, new projects are saved to the database.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void loadBackendProjects()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-[#073B2A] shadow-sm transition hover:bg-emerald-50"
          >
            <RefreshCcw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Sync backend
          </button>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button onClick={() => exportProjectBrief("doc")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#073B2A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0B4A35]"><Download className="h-4 w-4" /> DOC</button>
            <button onClick={() => exportProjectBrief("print")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#102033] transition hover:bg-slate-50">PDF/Print</button>
            <button onClick={() => exportProjectBrief("html")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#102033] transition hover:bg-slate-50">HTML</button>
            <button onClick={() => exportProjectBrief("txt")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#102033] transition hover:bg-slate-50">TXT</button>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${backendOnline ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2 ${backendOnline ? "bg-[#073B2A] text-white" : "bg-amber-100 text-amber-800"}`}>
            {backendOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
          </div>
          <div>
            <div className="font-bold text-[#102033]">{backendOnline ? "Backend connected" : "Browser-storage mode"}</div>
            <p className="mt-1 text-sm text-slate-600">{syncMessage}</p>
            <p className="mt-1 text-xs text-slate-500">Backend URL: {API_BASE}. Keep the backend Command Prompt running while testing database features.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={FolderOpen} label="Projects" value={projectStats.total.toString()} note="All sources" />
        <StatCard icon={Cloud} label="Backend" value={projectStats.backend.toString()} note="Database" />
        <StatCard icon={CheckCircle2} label="Active" value={projectStats.active.toString()} note="In analysis" />
        <StatCard icon={FileText} label="Reporting" value={projectStats.reporting.toString()} note="Ready" />
        <StatCard icon={ShieldCheck} label="Sensitive" value={projectStats.highSensitivity.toString()} note="Governance" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-5">
          <h2 className="text-lg font-bold text-[#102033]">Project register</h2>
          <p className="mt-1 text-sm text-slate-500">Select the active project or remove test projects from the browser view.</p>

          <div className="mt-5 space-y-3">
            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <FolderOpen className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-lg font-bold text-[#102033]">No projects yet</h3>
                <p className="mt-2 text-sm text-slate-500">Create your first project to start uploading datasets, running quality checks and generating reports.</p>
              </div>
            ) : null}
            {projects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <div
                  key={project.id}
                  className={`rounded-2xl border p-4 transition ${
                    isActive ? "border-[#0FA67A] bg-emerald-50/70" : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[#102033]">{project.name}</h3>
                        {isActive ? <span className="badge bg-[#073B2A] text-white">Active project</span> : null}
                        <span className="badge bg-slate-100 text-slate-700">{project.status}</span>
                        <span className="badge bg-amber-50 text-amber-800">{project.sensitivity}</span>
                        <span className={`badge ${project.source === "backend" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                          {project.source === "backend" ? "Backend" : "Local"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{project.description}</p>
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                        <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {project.organisation}</span>
                        <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> {project.geography}</span>
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {project.reportingPeriod}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => selectProject(project.id)}
                        className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-[#073B2A] transition hover:bg-emerald-50"
                      >
                        Use project
                      </button>
                      <button
                        onClick={() => removeProject(project.id)}
                        disabled={false}
                        className="rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Remove project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="card p-5">
            <h2 className="text-lg font-bold text-[#102033]">Create project</h2>
            <p className="mt-1 text-sm text-slate-500">Create a project first. Dalili will then guide you through the M&E steps: what to collect, how to check it, what to measure, and how to report.</p>

            <div className="mt-5 space-y-3">
              <Field label="Project name">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]" placeholder="e.g. Uganda Endline Evaluation" />
              </Field>
              <Field label="Organisation/client">
                <input value={form.organisation} onChange={(event) => setForm({ ...form, organisation: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]" placeholder="e.g. Tiko Uganda" />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Sector">
                  <select value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]">
                    <option>Health / SRH / HIV</option><option>Education</option><option>WASH</option><option>Agriculture / Livelihoods</option><option>Protection / SGBV</option><option>Research / Evaluation</option><option>Other</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]">
                    <option>Planning</option><option>Active</option><option>Reporting</option><option>Closed</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Donor/funder">
                  <input value={form.donor} onChange={(event) => setForm({ ...form, donor: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]" placeholder="e.g. FCDO, USAID, Gates" />
                </Field>
                <Field label="Sensitivity">
                  <select value={form.sensitivity} onChange={(event) => setForm({ ...form, sensitivity: event.target.value as Project["sensitivity"] })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]">
                    <option>Low</option><option>Moderate</option><option>High</option><option>Very high</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Country">
                  <input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]" />
                </Field>
                <Field label="Geography">
                  <input value={form.geography} onChange={(event) => setForm({ ...form, geography: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]" placeholder="e.g. Wakiso, Mukono" />
                </Field>
              </div>
              <Field label="Reporting period">
                <input value={form.reportingPeriod} onChange={(event) => setForm({ ...form, reportingPeriod: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]" placeholder="e.g. Q2 2026 or Baseline 2026" />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0FA67A]" placeholder="What is the project trying to achieve, and what report/client/donor decision should Dalili help you produce?" />
              </Field>
              <button onClick={() => void createProject()} disabled={!form.name.trim() || !form.organisation.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#073B2A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0B4A35] disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="h-4 w-4" />
                Create project and open guide
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-5">
          <h2 className="text-lg font-bold text-[#102033]">Active project context</h2>
          {activeProject ? (
            <div className="mt-4 space-y-3 text-sm">
              <ContextRow label="Project" value={activeProject.name} />
              <ContextRow label="Sector" value={activeProject.sector} />
              <ContextRow label="Donor" value={activeProject.donor} />
              <ContextRow label="Geography" value={activeProject.geography} />
              <ContextRow label="Reporting period" value={activeProject.reportingPeriod} />
              <ContextRow label="Sensitivity" value={activeProject.sensitivity} />
              <ContextRow label="Storage" value={activeProject.source === "backend" ? "Backend database" : "Browser storage"} />
            </div>
          ) : null}
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold text-[#102033]">Linked Dalili workflow</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <WorkflowCard icon={Database} title="Dataset" value={latestDataset?.fileName ?? latestQuality?.fileName ?? "Not uploaded"} note={`${latestDataset?.rowCount ?? latestQuality?.rowCount ?? 0} rows`} href="/data-room" />
            <WorkflowCard icon={CheckCircle2} title="Quality score" value={typeof latestQuality?.score === "number" ? `${latestQuality.score}/100` : "Not checked"} note={`${latestQuality?.issues?.length ?? 0} issues`} href="/quality-check" />
            <WorkflowCard icon={BarChart3} title="Latest indicator" value={latestIndicator?.indicatorName ?? "Not calculated"} note={typeof latestIndicator?.percentage === "number" ? `${latestIndicator.percentage.toFixed(1)}% result` : "No result yet"} href="/indicators" />
            <WorkflowCard icon={FileText} title="Reporting" value="Reports Studio" note="Generate donor-ready outputs" href="/reports" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-[#102033]">{value}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note }: { icon: ElementType; label: string; value: string; note: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-emerald-50 p-3 text-[#073B2A]"><Icon className="h-5 w-5" /></div>
        <span className="text-xs font-semibold text-slate-400">{note}</span>
      </div>
      <div className="mt-4 text-2xl font-black text-[#102033]">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function WorkflowCard({ icon: Icon, title, value, note, href }: { icon: ElementType; title: string; value: string; note: string; href: string }) {
  return (
    <a href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/60">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#073B2A] p-3 text-white"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#102033]">{title}</div>
          <div className="mt-1 truncate text-sm text-slate-600">{value}</div>
          <div className="mt-1 text-xs text-slate-400">{note}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#073B2A]" />
      </div>
    </a>
  );
}
