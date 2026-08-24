
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  CloudOff,
  Download,
  FileText,
  Flag,
  RefreshCcw,
  Save,
  ShieldCheck,
  ThumbsDown,
  UserPlus,
  Users,
} from "lucide-react";

type MemberRole = "Organisation Admin" | "Analyst / M&E Officer" | "Reviewer / Approver" | "Viewer / Client";
type InsightStatus = "pending" | "approved" | "rejected" | "flagged";

type TeamMember = {
  id: string;
  backendId?: number;
  projectId?: number;
  name: string;
  email: string;
  role: MemberRole;
  status: "Active" | "Invited";
  source?: "backend" | "local";
};

type ProjectRecord = {
  id: string;
  backendId?: number;
  name: string;
  organisation?: string;
  source?: "backend" | "local";
};

type IndicatorPayload = {
  indicatorName: string;
  fileName: string;
  generatedAt: string;
  numerator: number;
  denominator: number;
  percentage: number;
  target: number | null;
};

type ApiTeamMember = {
  id: number;
  project_id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const defaultMembers: TeamMember[] = [];

function roleDescription(role: MemberRole) {
  if (role === "Organisation Admin") return "Manage organisation users, project access, settings, and billing.";
  if (role === "Analyst / M&E Officer") return "Upload data, run quality checks, define indicators, and draft insights.";
  if (role === "Reviewer / Approver") return "Review, approve, flag, or reject insights before they enter reports.";
  return "View approved insights, reports, and dashboards without editing source data.";
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

function approvalClass(status: InsightStatus) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "flagged") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function mapApiMember(member: ApiTeamMember): TeamMember {
  return {
    id: `backend-${member.id}`,
    backendId: member.id,
    projectId: member.project_id,
    name: member.name,
    email: member.email,
    role: member.role as MemberRole,
    status: member.status === "Active" ? "Active" : "Invited",
    source: "backend",
  };
}

export function TeamClient() {
  const [members, setMembers] = useState<TeamMember[]>(defaultMembers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("Reviewer / Approver");
  const [statuses, setStatuses] = useState<Record<string, InsightStatus>>({});
  const [indicator, setIndicator] = useState<IndicatorPayload | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Checking backend connection...");
  const [isSyncing, setIsSyncing] = useState(false);

  const approvalSummary = useMemo(() => {
    const values = Object.values(statuses);
    return {
      approved: values.filter((item) => item === "approved").length,
      flagged: values.filter((item) => item === "flagged").length,
      rejected: values.filter((item) => item === "rejected").length,
      pending: Math.max(0, 4 - values.length),
    };
  }, [statuses]);

  useEffect(() => {
    try {
      const savedMembers = window.localStorage.getItem("dalili.teamMembers");
      const savedStatuses = window.localStorage.getItem("dalili.insightStatuses");
      const savedIndicator = window.localStorage.getItem("dalili.latestIndicatorResult");
      const savedProject = readJson<ProjectRecord>("dalili.activeProject");
      setActiveProject(savedProject);
      if (savedMembers) setMembers(JSON.parse(savedMembers));
      if (savedStatuses) setStatuses(JSON.parse(savedStatuses));
      if (savedIndicator) setIndicator(JSON.parse(savedIndicator));
    } catch {
      setMembers(defaultMembers);
    }
  }, []);

  async function loadBackendMembers(projectOverride?: ProjectRecord | null) {
    const project = projectOverride ?? activeProject ?? readJson<ProjectRecord>("dalili.activeProject");
    setActiveProject(project);
    if (!project?.backendId) {
      setBackendOnline(false);
      setBackendStatus("Active project is browser-only. Create or select a backend-saved project before syncing team members.");
      return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_BASE}/team-members?project_id=${project.backendId}`);
      if (!response.ok) throw new Error("Backend team lookup failed");
      const data = (await response.json()) as ApiTeamMember[];
      setBackendOnline(true);
      if (data.length > 0) {
        const mapped = data.map(mapApiMember);
        setMembers(mapped);
        window.localStorage.setItem("dalili.teamMembers", JSON.stringify(mapped));
        setBackendStatus(`Loaded ${mapped.length} backend team member(s) for project #${project.backendId}.`);
      } else {
        setBackendStatus(`Backend connected. No team members have been saved for project #${project.backendId} yet.`);
      }
    } catch {
      setBackendOnline(false);
      setBackendStatus("Backend is not reachable. Keep FastAPI running on http://127.0.0.1:8000, or continue in browser-storage mode.");
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    loadBackendMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveMembers(next: TeamMember[]) {
    setMembers(next);
    window.localStorage.setItem("dalili.teamMembers", JSON.stringify(next));
  }

  async function inviteMember() {
    if (!name.trim() || !email.trim()) return;
    const project = activeProject ?? readJson<ProjectRecord>("dalili.activeProject");
    const localMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      status: "Invited",
      source: "local",
    };

    if (backendOnline && project?.backendId) {
      setIsSyncing(true);
      try {
        const response = await fetch(`${API_BASE}/team-members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: project.backendId,
            name: localMember.name,
            email: localMember.email,
            role: localMember.role,
            status: localMember.status,
          }),
        });
        if (!response.ok) throw new Error("Failed to save backend team member");
        const saved = mapApiMember((await response.json()) as ApiTeamMember);
        saveMembers([...members, saved]);
        setBackendStatus(`Saved ${saved.name} to backend team records.`);
      } catch {
        saveMembers([...members, localMember]);
        setBackendStatus("Could not save to backend, so the team member was kept in browser storage.");
      } finally {
        setIsSyncing(false);
      }
    } else {
      saveMembers([...members, localMember]);
      setBackendStatus("Team member added in browser storage. Start/select a backend project to save team records in the database.");
    }

    setName("");
    setEmail("");
    setRole("Reviewer / Approver");
  }

  async function updateRole(id: string, nextRole: MemberRole) {
    const member = members.find((item) => item.id === id);
    const nextMembers = members.map((item) => (item.id === id ? { ...item, role: nextRole } : item));
    saveMembers(nextMembers);
    if (member?.backendId && backendOnline) {
      try {
        const response = await fetch(`${API_BASE}/team-members/${member.backendId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: nextRole }),
        });
        if (!response.ok) throw new Error("Role update failed");
        setBackendStatus(`Updated ${member.name}'s role in the backend.`);
      } catch {
        setBackendStatus("Role changed locally, but the backend update failed. Try Sync backend again.");
      }
    }
  }

  async function removeMember(id: string) {
    const member = members.find((item) => item.id === id);
    saveMembers(members.filter((item) => item.id !== id));
    if (member?.backendId && backendOnline) {
      try {
        const response = await fetch(`${API_BASE}/team-members/${member.backendId}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Delete failed");
        setBackendStatus(`Removed ${member.name} from backend team records.`);
      } catch {
        setBackendStatus("Removed locally, but backend deletion failed. Reload backend members to confirm the database state.");
      }
    }
  }

  async function saveApprovalSnapshot() {
    const project = activeProject ?? readJson<ProjectRecord>("dalili.activeProject");
    if (!project?.backendId) {
      setBackendStatus("Cannot save approval snapshot because the active project is not saved in the backend.");
      return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_BASE}/approval-snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.backendId,
          approved_count: approvalSummary.approved,
          flagged_count: approvalSummary.flagged,
          rejected_count: approvalSummary.rejected,
          pending_count: approvalSummary.pending,
          summary_text: `Approved: ${approvalSummary.approved}; Flagged: ${approvalSummary.flagged}; Rejected: ${approvalSummary.rejected}; Pending: ${approvalSummary.pending}`,
          author: "Dalili user",
        }),
      });
      if (!response.ok) throw new Error("Approval snapshot failed");
      const saved = await response.json();
      setBackendOnline(true);
      setBackendStatus(`Approval snapshot saved to backend as record #${saved.id}.`);
    } catch {
      setBackendStatus("Approval snapshot could not be saved. Check that the backend is running and the active project is backend-saved.");
    } finally {
      setIsSyncing(false);
    }
  }

  function exportApprovalLog() {
    const lines = [
      "DALILI TEAM AND APPROVAL LOG",
      "============================",
      `Project: ${activeProject?.name ?? "Youth Empowerment Program"}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "TEAM MEMBERS",
      ...members.map((member, index) => `${index + 1}. ${member.name} | ${member.email} | ${member.role} | ${member.status} | ${member.source ?? "local"}${member.backendId ? ` #${member.backendId}` : ""}`),
      "",
      "LATEST INDICATOR",
      indicator
        ? `${indicator.indicatorName}: ${indicator.numerator}/${indicator.denominator} = ${indicator.percentage}% | Source: ${indicator.fileName}`
        : "No indicator result available yet.",
      "",
      "INSIGHT REVIEW STATUS",
      `Approved: ${approvalSummary.approved}`,
      `Flagged: ${approvalSummary.flagged}`,
      `Rejected: ${approvalSummary.rejected}`,
      `Pending estimate: ${approvalSummary.pending}`,
    ];
    downloadText("dalili-team-approval-log.txt", lines.join("\n"));
  }

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-[#073B2A] px-6 py-6 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">Team & approvals</p>
              <h1 className="mt-2 text-2xl font-bold">Control who reviews, approves and views evidence</h1>
              <p className="mt-2 max-w-3xl text-sm text-emerald-50/90">
                Dalili keeps the analyst in control. Assign roles, manage reviewers, and save approval evidence to the backend audit trail.
              </p>
            </div>
            <button
              onClick={exportApprovalLog}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#073B2A] shadow-sm"
            >
              <Download className="h-4 w-4" /> Export approval log
            </button>
          </div>
        </div>

        <div className={`m-6 rounded-2xl border p-4 ${backendOnline ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2 ${backendOnline ? "bg-[#073B2A] text-white" : "bg-amber-100 text-amber-800"}`}>
                {backendOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
              </div>
              <div>
                <div className="font-bold text-[#102033]">{backendOnline ? "Backend team storage connected" : "Browser-storage mode"}</div>
                <p className="mt-1 text-xs text-slate-600">{backendStatus}</p>
                <p className="mt-1 text-xs text-slate-500">Active project: {activeProject?.backendId ? `#${activeProject.backendId} — ${activeProject.name}` : activeProject?.name ?? "None selected"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => loadBackendMembers()} disabled={isSyncing} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#102033] disabled:opacity-60">
                <RefreshCcw className="h-4 w-4" /> Sync backend
              </button>
              <button onClick={saveApprovalSnapshot} disabled={isSyncing || !activeProject?.backendId} className="inline-flex items-center gap-2 rounded-2xl bg-[#073B2A] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                <Save className="h-4 w-4" /> Save approvals
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 pb-6 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Users className="h-4 w-4" /> Team members</div>
            <div className="mt-3 text-3xl font-black text-[#102033]">{members.length}</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Approved</div>
            <div className="mt-3 text-3xl font-black text-emerald-700">{approvalSummary.approved}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><Flag className="h-4 w-4" /> Flagged</div>
            <div className="mt-3 text-3xl font-black text-amber-700">{approvalSummary.flagged}</div>
          </div>
          <div className="rounded-2xl bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><ThumbsDown className="h-4 w-4" /> Rejected</div>
            <div className="mt-3 text-3xl font-black text-rose-700">{approvalSummary.rejected}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="card p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0B5E3C]">Members</p>
              <h2 className="mt-2 text-xl font-bold text-[#102033]">Project access</h2>
              <p className="mt-1 text-sm text-slate-500">Use roles to separate upload, analysis, review and viewing permissions.</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-4 font-semibold text-[#102033]">{member.name}</td>
                    <td className="px-4 py-4 text-slate-500">{member.email}</td>
                    <td className="px-4 py-4">
                      <select
                        value={member.role}
                        onChange={(event) => updateRole(member.id, event.target.value as MemberRole)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#102033]"
                      >
                        <option>Organisation Admin</option>
                        <option>Analyst / M&E Officer</option>
                        <option>Reviewer / Approver</option>
                        <option>Viewer / Client</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${member.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${member.source === "backend" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {member.source === "backend" ? `Backend #${member.backendId}` : "Local"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => removeMember(member.id)} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><UserPlus className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-bold text-[#102033]">Invite reviewer</h2>
                <p className="text-sm text-slate-500">Add a team member for this project.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#102033] outline-none focus:border-emerald-500"
              />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#102033] outline-none focus:border-emerald-500"
              />
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as MemberRole)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#102033] outline-none focus:border-emerald-500"
              >
                <option>Organisation Admin</option>
                <option>Analyst / M&E Officer</option>
                <option>Reviewer / Approver</option>
                <option>Viewer / Client</option>
              </select>
              <button
                onClick={inviteMember}
                disabled={isSyncing}
                className="w-full rounded-2xl bg-[#0B5E3C] px-4 py-3 text-sm font-bold text-white hover:bg-[#073B2A] disabled:opacity-60"
              >
                {backendOnline && activeProject?.backendId ? "Add to backend project" : "Add to project"}
              </button>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-bold text-[#102033]">Role permissions</h2>
                <p className="text-sm text-slate-500">Prototype access model.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {(["Organisation Admin", "Analyst / M&E Officer", "Reviewer / Approver", "Viewer / Client"] as MemberRole[]).map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-bold text-[#102033]">{item}</div>
                  <div className="mt-1 text-sm text-slate-500">{roleDescription(item)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0B5E3C]">Approval workflow</p>
            <h2 className="mt-2 text-xl font-bold text-[#102033]">Latest evidence review status</h2>
            <p className="mt-1 text-sm text-slate-500">This reads the latest insight statuses saved from the Insights page and can save the snapshot to the backend.</p>
          </div>
          <a href="/insights" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#102033] shadow-sm">
            Open insights
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {([
            ["approved", approvalSummary.approved, CheckCircle2],
            ["flagged", approvalSummary.flagged, Flag],
            ["rejected", approvalSummary.rejected, ThumbsDown],
            ["pending", approvalSummary.pending, ClipboardCheck],
          ] as [InsightStatus, number, typeof CheckCircle2][]).map(([status, count, Icon]) => (
            <div key={status} className={`rounded-2xl border p-5 ${approvalClass(status)}`}>
              <Icon className="h-5 w-5" />
              <div className="mt-3 text-3xl font-black">{count}</div>
              <div className="text-sm font-bold capitalize">{status}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 font-bold text-[#102033]"><FileText className="h-4 w-4" /> Latest indicator context</div>
          <p className="mt-2 text-sm text-slate-600">
            {indicator
              ? `${indicator.indicatorName}: ${indicator.numerator} of ${indicator.denominator} records = ${indicator.percentage}%. Source: ${indicator.fileName}.`
              : "No indicator result is available yet. Upload data and calculate an indicator before reviewing approvals."}
          </p>
        </div>
      </section>
    </div>
  );
}
