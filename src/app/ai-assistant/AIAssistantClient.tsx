"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Cloud, CloudOff, Database, FileText, Lightbulb, RefreshCcw, Send, ShieldCheck } from "lucide-react";
import { authFetch } from "@/lib/auth-client";

type ActiveProject = {
  backendId?: number;
  name?: string;
};

type AiContext = {
  project?: { id: number; name: string; sector?: string | null } | null;
  dataset?: { id: number; filename: string; row_count: number; column_count: number; quality_score?: number | null } | null;
  quality_report?: { score: number; file_name: string; duplicate_count: number; readiness_label: string } | null;
  indicator_result?: { indicator_name: string; percentage: number; numerator_count: number; denominator_count: number; target?: number | null } | null;
  document_record?: { file_name: string; word_count: number; paragraph_count: number; themes?: string[]; summary_text?: string | null } | null;
  map_summary?: { geography_column: string; unique_locations: number; mapped_locations: number; unmapped_locations: number } | null;
  insight_counts?: { approved?: number; flagged?: number; rejected?: number; pending?: number };
  compliance_setting?: { compliance_score: number; sensitivity_level: string } | null;
};

type Message = {
  role: "user" | "assistant";
  text: string;
};

const starterQuestions = [
  "Help me set up a simple M&E plan for this project",
  "What should this project track?",
  "What evidence should we collect next?",
  "Is the uploaded data good enough to use?",
  "Explain the latest tracked result in simple language",
  "What should I do next?",
  "Draft a donor or client update from saved evidence",
  "What risks or weak evidence should I mention?",
];

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Not available";
  return `${value.toFixed(1)}%`;
}

export function AIAssistantClient() {
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [context, setContext] = useState<AiContext | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "offline" | "unauthenticated">("checking");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello. I am Dalili Assistant. I can only answer from saved Dalili evidence: uploaded datasets, DQA reports, indicators, insight reviews, reports, documents, maps and compliance settings. If evidence is missing, I will say so instead of guessing.",
    },
  ]);

  const projectId = activeProject?.backendId;

  const loadContext = async () => {
    setBackendStatus("checking");
    const project = readJson<ActiveProject>("dalili.activeProject");
    setActiveProject(project);

    try {
      const query = project?.backendId ? `?project_id=${project.backendId}` : "";
      const response = await authFetch(`/ai/context${query}`);
      if (response.status === 401 || response.status === 403) {
        setBackendStatus("unauthenticated");
        return;
      }
      if (!response.ok) throw new Error("Backend context unavailable");
      const data = (await response.json()) as AiContext;
      setContext(data);
      setBackendStatus("connected");
    } catch {
      setBackendStatus("offline");
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  const contextItems = useMemo(() => [
    {
      label: "Project",
      value: context?.project?.name || activeProject?.name || "Not selected",
      icon: Database,
    },
    {
      label: "Dataset",
      value: context?.dataset ? `${context.dataset.row_count} rows` : "Not uploaded",
      icon: Database,
    },
    {
      label: "Quality",
      value: context?.quality_report ? `${context.quality_report.score}/100` : "Not checked",
      icon: ShieldCheck,
    },
    {
      label: "Indicator",
      value: context?.indicator_result ? formatPercent(context.indicator_result.percentage) : "Not calculated",
      icon: Lightbulb,
    },
  ], [context, activeProject]);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await authFetch("/ai/respond", {
        method: "POST",
        body: JSON.stringify({ question: trimmed, project_id: projectId ?? null }),
      });
      if (response.status === 401 || response.status === 403) {
        setBackendStatus("unauthenticated");
        throw new Error("Please log in again before using the backend assistant.");
      }
      if (!response.ok) throw new Error("The backend assistant could not answer this question.");
      const data = (await response.json()) as { answer: string; context?: AiContext; mode?: string };
      if (data.context) setContext(data.context);
      setBackendStatus("connected");
      setMessages((current) => [...current, { role: "assistant", text: data.answer }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The backend assistant is unavailable.";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `${message} Confirm that FastAPI is running at http://127.0.0.1:8000 and that you are logged in.`,
        },
      ]);
      if (backendStatus !== "unauthenticated") setBackendStatus("offline");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = backendStatus === "connected"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : backendStatus === "checking"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  const StatusIcon = backendStatus === "connected" ? Cloud : CloudOff;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#0b5e3c]">AI Assistant</p>
          <h1 className="text-3xl font-bold text-[#102033]">Ask Dalili to guide the M&E process</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Dalili acts like a guided M&E assistant for teams without dedicated M&E staff. It can suggest what to track, explain quality issues, interpret saved results and help draft report text. It still follows the safety rule: Python calculates; Dalili explains only from saved evidence.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold ${statusBadge}`}>
          <StatusIcon className="h-4 w-4" />
          {backendStatus === "connected" ? "Backend context connected" : backendStatus === "checking" ? "Checking backend" : backendStatus === "unauthenticated" ? "Login required" : "Backend offline"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {contextItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-[#0b5e3c]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                  <div className="line-clamp-1 text-lg font-bold text-[#102033]">{item.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="card flex min-h-[520px] flex-col p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#073B2A] p-3 text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-[#102033]">Guided M&E chat</h2>
                <p className="text-xs text-slate-500">Uses saved project evidence and keeps the user in control.</p>
              </div>
            </div>
            <button
              onClick={loadContext}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh context
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[88%] rounded-2xl p-4 text-sm leading-6 ${
                  message.role === "assistant"
                    ? "bg-slate-50 text-slate-700"
                    : "ml-auto bg-[#073B2A] text-white"
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[88%] rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Reading backend context...
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") ask(input);
              }}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0b5e3c]"
              placeholder="Ask what to track, what to do next, whether data is usable, or what to report..."
            />
            <button
              onClick={() => ask(input)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0b5e3c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#073B2A] disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Ask
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-bold text-[#102033]">Suggested questions</h2>
            <div className="mt-4 space-y-2">
              {starterQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => ask(question)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-[#0b5e3c] hover:bg-emerald-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#0b5e3c]" />
              <div>
                <h2 className="font-bold text-[#102033]">Guardrails</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This version does not send data to an external AI provider. It uses backend-saved records only and refuses to answer when supporting evidence is unavailable. Full LLM integration can be added later with explicit routing disclosure and source citations.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-[#102033]">Backend context available</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>Dataset: {context?.dataset?.filename || "None"}</p>
              <p>DQA: {context?.quality_report ? `${context.quality_report.score}/100` : "None"}</p>
              <p>Indicator: {context?.indicator_result?.indicator_name || "None"}</p>
              <p>Document: {context?.document_record?.file_name || "None"}</p>
              <p>Map: {context?.map_summary?.geography_column || "None"}</p>
              <p>Compliance: {context?.compliance_setting ? `${context.compliance_setting.compliance_score}/100` : "None"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
