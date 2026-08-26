export type DaliliProject = {
  id: string;
  backendId?: number;
  name: string;
  organisation?: string;
  sector?: string;
  donor?: string;
  country?: string;
  geography?: string;
  reportingPeriod?: string;
  status?: string;
  sensitivity?: string;
  description?: string;
  source?: string;
};

export type WorkflowStep = {
  key: string;
  title: string;
  plainTitle: string;
  description: string;
  href: string;
  cta: string;
  status: "complete" | "current" | "next" | "locked";
  beginnerHelp: string;
};

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

export function getProjects(): DaliliProject[] {
  const projects = readJson<DaliliProject[]>(PROJECTS_KEY) ?? [];
  return projects.filter((project) => project?.id && project?.name && !isDemoProject(project));
}

export function getActiveProject(): DaliliProject | null {
  const projects = getProjects();
  const activeId = readJson<string>(ACTIVE_PROJECT_KEY);
  if (activeId) {
    const active = projects.find((project) => project.id === activeId);
    if (active) return active;
  }
  return projects[0] ?? null;
}

export function isDemoProject(project: DaliliProject) {
  const text = `${project.id ?? ""} ${project.name ?? ""}`.toLowerCase();
  return ["demo", "sample", "pilot", "proj-yhp", "proj-agri", "youth health programme", "smallholder farmer"].some((fragment) => text.includes(fragment));
}

export function hasLatestDataset() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("dalili.latestDataset") || window.localStorage.getItem("dalili.latestQualityReport"));
}

export function hasLatestQuality() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("dalili.latestQualityReport"));
}

export function hasLatestIndicator() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("dalili.latestIndicatorResult"));
}

export function hasReviewedInsights() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("dalili.latestInsightReview") || window.localStorage.getItem("dalili.insightReviewStatus"));
}

export function hasLatestReport() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("dalili.latestBackendReportDraft") || window.localStorage.getItem("dalili.latestReportDraft"));
}

export function hasExportedOutput() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("dalili.reportStatus") === "final" || window.localStorage.getItem("dalili.lastExportedReport"));
}

export function getWorkflowSteps(): WorkflowStep[] {
  const project = getActiveProject();
  const flags = [
    Boolean(project),
    hasLatestDataset(),
    hasLatestQuality(),
    hasLatestIndicator(),
    hasReviewedInsights(),
    hasLatestReport(),
    hasExportedOutput(),
  ];
  const firstIncompleteIndex = flags.findIndex((flag) => !flag);
  const currentIndex = firstIncompleteIndex === -1 ? flags.length - 1 : firstIncompleteIndex;

  const base = [
    {
      key: "project",
      title: "Project setup",
      plainTitle: "Tell Dalili what project you are implementing",
      description: "Create the project, organisation/client, location, reporting period and sensitivity level.",
      href: "/projects?new=1",
      cta: "Create or review project",
      beginnerHelp: "Start here if you do not have an M&E person. Dalili needs the basic project details before it can guide what to track.",
    },
    {
      key: "evidence",
      title: "Add evidence",
      plainTitle: "Upload what you already have, or start with a simple tracking sheet",
      description: "Upload Excel, CSV, Kobo/ODK exports, documents or other project evidence.",
      href: "/data-room",
      cta: "Upload evidence",
      beginnerHelp: "Evidence can be a beneficiary list, attendance register, activity tracker, survey export, report or monitoring sheet.",
    },
    {
      key: "quality",
      title: "Check data readiness",
      plainTitle: "Let Dalili check whether your data is safe and usable",
      description: "Review missing values, duplicates, sensitive fields, invalid dates and location issues before analysis.",
      href: "/quality-check",
      cta: "Check my data",
      beginnerHelp: "This protects you from reporting weak numbers. Dalili explains problems in plain language.",
    },
    {
      key: "indicators",
      title: "Track results",
      plainTitle: "Choose the question your project must answer",
      description: "Dalili turns simple project questions into measurable results, with plain-language interpretation and optional advanced indicator settings.",
      href: "/indicators",
      cta: "Track results",
      beginnerHelp: "You do not need to know M&E jargon. Start with a question like: How many people did we reach? Who completed the activity? Are we on track?",
    },
    {
      key: "insights",
      title: "Review findings",
      plainTitle: "Review what Dalili found before using it in a report",
      description: "Approve, edit, reject or flag findings so only validated evidence goes into outputs.",
      href: "/insights",
      cta: "Review findings",
      beginnerHelp: "Dalili should not guess. This step keeps a human in control and keeps reports defensible.",
    },
    {
      key: "report",
      title: "Create output",
      plainTitle: "Turn the evidence into a report, brief or presentation",
      description: "Generate a donor-ready report, project brief, DQA report or management summary.",
      href: "/reports",
      cta: "Create report",
      beginnerHelp: "This is the main destination: a clean, branded output that explains progress, findings, gaps and next actions.",
    },
    {
      key: "share",
      title: "Export or share",
      plainTitle: "Download or share the final evidence product",
      description: "Export the final output and keep an audit trail of what was used and reviewed.",
      href: "/reports",
      cta: "Export final output",
      beginnerHelp: "Use this when the report has been reviewed and is ready for a donor, client, manager or project team.",
    },
  ];

  return base.map((step, index) => ({
    ...step,
    status: flags[index] ? "complete" : index === currentIndex ? "current" : index === currentIndex + 1 ? "next" : "locked",
  }));
}

export function getNextWorkflowStep(): WorkflowStep {
  return getWorkflowSteps().find((step) => step.status === "current") ?? getWorkflowSteps()[getWorkflowSteps().length - 1];
}

export function getWorkflowProgressPercent() {
  const steps = getWorkflowSteps();
  const complete = steps.filter((step) => step.status === "complete").length;
  return Math.round((complete / steps.length) * 100);
}
