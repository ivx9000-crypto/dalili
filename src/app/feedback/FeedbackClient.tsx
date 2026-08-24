"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch, getSession } from "@/lib/auth-client";

type ActiveProject = {
  id: number | string;
  backendId?: number | null;
  name?: string;
  organisation?: string;
  source?: string;
};

type FeedbackItem = {
  id: number;
  project_id?: number | null;
  reviewer_name: string;
  reviewer_role?: string | null;
  organisation?: string | null;
  page_area: string;
  rating: number;
  usefulness?: string | null;
  challenge?: string | null;
  suggested_improvement?: string | null;
  priority: string;
  status: string;
  created_at: string;
};

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

function getProjectId(project: ActiveProject | null): number | null {
  if (!project) return null;
  if (typeof project.backendId === "number") return project.backendId;
  if (typeof project.id === "number") return project.id;
  return null;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function FeedbackClient() {
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [message, setMessage] = useState("Ready to capture pilot feedback.");
  const [saving, setSaving] = useState(false);
  const session = typeof window !== "undefined" ? getSession() : null;
  const [form, setForm] = useState({
    reviewer_name: session?.user?.full_name ?? "Pilot reviewer",
    reviewer_role: session?.role ?? session?.user?.primary_role ?? "Reviewer / Approver",
    organisation: "",
    page_area: "Overall product",
    rating: 4,
    usefulness: "",
    challenge: "",
    suggested_improvement: "",
    priority: "Medium",
  });

  const projectId = useMemo(() => getProjectId(activeProject), [activeProject]);
  const averageRating = useMemo(() => {
    if (!items.length) return "—";
    const value = items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / items.length;
    return value.toFixed(1);
  }, [items]);

  useEffect(() => {
    setActiveProject(readJson<ActiveProject>(ACTIVE_PROJECT_KEY));
    checkBackend();
  }, []);

  async function checkBackend() {
    try {
      const response = await authFetch("/health");
      setBackendOnline(response.ok);
      if (response.ok) {
        setMessage("Backend is online. Pilot feedback can be saved to the database.");
      }
    } catch {
      setBackendOnline(false);
      setMessage("Backend is offline. Start FastAPI before saving pilot feedback.");
    }
  }

  async function loadFeedback() {
    try {
      const query = projectId ? `?project_id=${projectId}` : "";
      const response = await authFetch(`/pilot-feedback${query}`);
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as FeedbackItem[];
      setItems(data);
      setMessage(`Loaded ${data.length} feedback record(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load feedback.");
    }
  }

  async function saveFeedback() {
    if (!backendOnline) {
      setMessage("Backend is offline. Start the backend and try again.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        project_id: projectId,
        reviewer_name: form.reviewer_name,
        reviewer_role: form.reviewer_role,
        organisation: form.organisation || activeProject?.organisation || null,
        page_area: form.page_area,
        rating: Number(form.rating),
        usefulness: form.usefulness,
        challenge: form.challenge,
        suggested_improvement: form.suggested_improvement,
        priority: form.priority,
        status: "new",
      };
      const response = await authFetch("/pilot-feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = (await response.json()) as FeedbackItem;
      setItems((current) => [saved, ...current]);
      setMessage(`Saved feedback #${saved.id}.`);
      setForm((current) => ({ ...current, usefulness: "", challenge: "", suggested_improvement: "" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save feedback.");
    } finally {
      setSaving(false);
    }
  }

  function exportFeedback() {
    const lines = [
      "Dalili Pilot Feedback Summary",
      `Project: ${activeProject?.name ?? "No active project"}`,
      `Feedback records: ${items.length}`,
      `Average rating: ${averageRating}`,
      "",
      ...items.flatMap((item) => [
        `#${item.id} | ${item.page_area} | ${item.rating}/5 | ${item.priority}`,
        `Reviewer: ${item.reviewer_name} (${item.reviewer_role ?? "role not provided"})`,
        `Useful: ${item.usefulness ?? "—"}`,
        `Challenge: ${item.challenge ?? "—"}`,
        `Suggestion: ${item.suggested_improvement ?? "—"}`,
        "",
      ]),
    ];
    downloadText("dalili-pilot-feedback-summary.txt", lines.join("\n"));
  }

  const areas = [
    "Overall product",
    "Pilot Demo",
    "Projects",
    "Data Room",
    "Quality Check",
    "Indicators",
    "Insights",
    "Reports and exports",
    "AI Assistant",
    "Settings and compliance",
    "Maps",
    "Team approvals",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-dalili-green">Pilot learning</p>
          <h1 className="mt-2 text-3xl font-bold text-dalili-ink">Pilot Feedback Centre</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Capture feedback from early users while you demonstrate Dalili. This helps prioritise what to improve before a wider pilot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/pilot-demo" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Open pilot demo</a>
          <button onClick={loadFeedback} className="rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0B5E3C]">Load feedback</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-5"><div className="text-sm text-slate-500">Backend</div><div className="mt-2 text-xl font-bold">{backendOnline ? "Online" : "Offline"}</div></div>
        <div className="card p-5"><div className="text-sm text-slate-500">Active project</div><div className="mt-2 text-xl font-bold">{activeProject?.name ?? "None"}</div></div>
        <div className="card p-5"><div className="text-sm text-slate-500">Feedback records</div><div className="mt-2 text-xl font-bold">{items.length}</div></div>
        <div className="card p-5"><div className="text-sm text-slate-500">Average rating</div><div className="mt-2 text-xl font-bold">{averageRating}</div></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-dalili-ink">Capture feedback</h2>
          <p className="mt-1 text-sm text-slate-600">Use this after a demo session or when testing a specific module.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Reviewer name
              <input value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Reviewer role
              <input value={form.reviewer_role} onChange={(e) => setForm({ ...form, reviewer_role: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Organisation
              <input value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} placeholder={activeProject?.organisation ?? "Organisation or client"} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Area reviewed
              <select value={form.page_area} onChange={(e) => setForm({ ...form, page_area: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2">
                {areas.map((area) => <option key={area}>{area}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">Rating
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2">
                <option value={5}>5 - Very useful</option>
                <option value={4}>4 - Useful with minor improvements</option>
                <option value={3}>3 - Promising but needs work</option>
                <option value={2}>2 - Hard to use</option>
                <option value={1}>1 - Not useful yet</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">Priority
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2">
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">What felt useful?
              <textarea value={form.usefulness} onChange={(e) => setForm({ ...form, usefulness: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-700">What was confusing or difficult?
              <textarea value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Suggested improvement
              <textarea value={form.suggested_improvement} onChange={(e) => setForm({ ...form, suggested_improvement: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button disabled={saving} onClick={saveFeedback} className="rounded-xl bg-[#073B2A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0B5E3C] disabled:opacity-60">{saving ? "Saving..." : "Save feedback"}</button>
            <button onClick={exportFeedback} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Export summary</button>
            <span className="text-sm text-slate-500">{message}</span>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-dalili-ink">Recent feedback</h2>
          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No feedback loaded yet. Save a new record or click Load feedback.</div>
            ) : items.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-dalili-ink">{item.page_area}</div>
                  <span className="badge bg-emerald-50 text-emerald-700">{item.rating}/5</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{item.reviewer_name} · {item.priority} priority</div>
                {item.usefulness ? <p className="mt-3 text-sm text-slate-700">{item.usefulness}</p> : null}
                {item.suggested_improvement ? <p className="mt-2 text-sm text-slate-600"><strong>Improve:</strong> {item.suggested_improvement}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
