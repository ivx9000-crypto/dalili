"use client";

import { Bell, CheckCircle2, FileText, LogOut, Plus, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, logout } from "@/lib/auth-client";

type Project = {
  id: string;
  backendId?: number;
  name: string;
  source?: "backend" | "local";
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
  level: "info" | "warning" | "success";
};

const PROJECTS_KEY = "dalili.projects";
const ACTIVE_PROJECT_KEY = "dalili.activeProject";
const ORG_LOGO_KEY = "dalili.organisationLogo";

function isDemoProject(project: Project) {
  const text = `${project.id} ${project.name}`.toLowerCase();
  return text.includes("demo") || text.includes("proj-yhp") || text.includes("proj-agri") || text.includes("youth health programme q2 review") || text.includes("smallholder farmer livelihoods endline");
}

function readProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    const projects = raw ? (JSON.parse(raw) as Project[]) : [];
    return projects.filter((project) => project?.id && project?.name && !isDemoProject(project));
  } catch {
    return [];
  }
}

function readActiveProjectId(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
    return raw ? (JSON.parse(raw) as string) : "";
  } catch {
    return "";
  }
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function buildNotifications(projects: Project[], activeProject?: Project): NotificationItem[] {
  if (typeof window === "undefined") return [];
  const latestDataset = window.localStorage.getItem("dalili.latestDataset");
  const latestQuality = window.localStorage.getItem("dalili.latestQualityReport");
  const latestIndicator = window.localStorage.getItem("dalili.latestIndicatorResult");
  const latestReport = window.localStorage.getItem("dalili.latestBackendReportDraft");
  const reportStatus = window.localStorage.getItem("dalili.reportStatus") || "draft";
  const items: NotificationItem[] = [];

  if (!projects.length) {
    items.push({ id: "no-project", title: "Create your first project", description: "Dalili will then guide you through the M&E steps, even if you do not have an M&E person.", href: "/projects?new=1", level: "warning" });
  } else if (!activeProject) {
    items.push({ id: "select-project", title: "Select an active project", description: "Choose the project you want Dalili to analyse.", href: "/projects", level: "warning" });
  }

  if (activeProject && !latestDataset) {
    items.push({ id: "no-dataset", title: "Upload a dataset", description: "Upload an Excel, CSV, Kobo export or document, or open the project guide to see what evidence to collect.", href: "/workspace", level: "info" });
  }
  if (latestDataset && !latestQuality) {
    items.push({ id: "no-dqa", title: "Run quality check", description: "Check whether your data is ready and safe to use before reporting.", href: "/quality-check", level: "warning" });
  }
  if (latestQuality && !latestIndicator) {
    items.push({ id: "no-indicator", title: "Calculate an indicator", description: "Choose the question your project needs to answer, then create a simple measure.", href: "/indicators", level: "info" });
  }
  if (latestIndicator && !latestReport) {
    items.push({ id: "no-report", title: "Generate a report", description: "Turn reviewed findings into a donor/client-ready output.", href: "/reports", level: "info" });
  }
  if (latestReport && reportStatus !== "final") {
    items.push({ id: "report-review", title: "Report needs final status", description: `Current report status is ${reportStatus}. Mark it approved or final before sharing externally.`, href: "/reports", level: "warning" });
  }
  if (!items.length) {
    items.push({ id: "all-clear", title: "No urgent reminders", description: "Your active workflow has the main analysis outputs in place.", href: "/dashboard", level: "success" });
  }
  return items;
}

export function Topbar() {
  const router = useRouter();
  const [name, setName] = useState("there");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [organisationLogo, setOrganisationLogo] = useState<string | null>(null);

  function refreshProjects() {
    const nextProjects = readProjects();
    const nextActiveId = readActiveProjectId();
    const validActiveId = nextActiveId && nextProjects.some((p) => p.id === nextActiveId) ? nextActiveId : nextProjects[0]?.id || "";
    setProjects(nextProjects);
    setActiveProjectId(validActiveId);
    setOrganisationLogo(window.localStorage.getItem(ORG_LOGO_KEY));
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(nextProjects));
    if (validActiveId) window.localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(validActiveId));
    if (!validActiveId) window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }

  useEffect(() => {
    const session = getSession();
    if (session?.user?.full_name) setName(session.user.full_name.trim().split(/\s+/)[0] || "there");
    refreshProjects();

    const onStorage = () => refreshProjects();
    window.addEventListener("storage", onStorage);
    window.addEventListener("dalili-projects-changed", onStorage);
    window.addEventListener("dalili-branding-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dalili-projects-changed", onStorage);
      window.removeEventListener("dalili-branding-changed", onStorage);
    };
  }, []);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId),
    [activeProjectId, projects],
  );
  const notifications = useMemo(() => buildNotifications(projects, activeProject), [projects, activeProject]);
  const warningCount = notifications.filter((item) => item.level !== "success").length;

  function handleProjectChange(projectId: string) {
    setActiveProjectId(projectId);
    if (projectId) window.localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(projectId));
    else window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    window.dispatchEvent(new Event("dalili-projects-changed"));
  }

  function goToNewProject() {
    router.push("/projects?new=1");
  }

  return (
    <div className="relative mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {organisationLogo ? (
          <img src={organisationLogo} alt="Organisation logo" className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm" />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-dalili-ink">{getTimeGreeting()}, {name} 👋</h1>
          <p className="text-sm text-slate-500">
            {activeProject ? `Active project: ${activeProject.name}` : "Create or select a project to begin."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={activeProject?.id ?? ""}
          onChange={(event) => handleProjectChange(event.target.value)}
          className="max-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#102033] shadow-sm"
          title="Select active project"
        >
          {projects.length === 0 ? <option value="">No project selected</option> : null}
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}{project.source === "backend" ? " · backend" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowNotifications((value) => !value)}
          className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm"
          title="Notifications"
        >
          <Bell size={18} />
          {warningCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">{warningCount}</span> : null}
        </button>
        <button
          onClick={goToNewProject}
          className="flex items-center gap-2 rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B4A35]"
        >
          <Plus size={18} /> New Project
        </button>
        <button onClick={logout} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <LogOut size={16} /> Logout
        </button>
      </div>

      {showNotifications ? (
        <div className="absolute right-0 top-full z-30 mt-3 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:w-96">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#102033]">Notifications</p>
              <p className="text-xs text-slate-500">Workflow reminders for your active project.</p>
            </div>
            <button onClick={() => setShowNotifications(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 space-y-2">
            {notifications.map((item) => (
              <a key={item.id} href={item.href ?? "#"} className="flex gap-3 rounded-2xl border border-slate-100 p-3 hover:bg-slate-50">
                <div className={`mt-0.5 rounded-xl p-2 ${item.level === "success" ? "bg-emerald-50 text-emerald-700" : item.level === "warning" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                  {item.level === "success" ? <CheckCircle2 className="h-4 w-4" /> : item.level === "warning" ? <ShieldAlert className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#102033]">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
