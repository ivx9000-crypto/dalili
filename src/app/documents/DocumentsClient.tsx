"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FileText, MessageSquareText, Search, Sparkles, UploadCloud } from "lucide-react";
import mammoth from "mammoth";

type DocumentSummary = {
  fileName: string;
  fileType: string;
  sizeKb: number;
  uploadedAt: string;
  characterCount: number;
  wordCount: number;
  paragraphCount: number;
  extractedText: string;
  themes: string[];
  entities: string[];
  limitations: string[];
};

type ProjectRecord = {
  backendId?: number;
  name?: string;
};

type BackendDataset = {
  id: number;
  project_id: number;
  filename: string;
  row_count: number;
  column_count: number;
  quality_score?: number | null;
};

type BackendDocumentRecord = {
  id: number;
  project_id: number;
  dataset_id?: number | null;
  file_name: string;
  word_count: number;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const KEYWORDS = [
  "health", "srh", "hiv", "prep", "family planning", "contraception", "mental health", "youth", "adolescent", "gender", "poverty", "income", "school", "education", "wash", "water", "sanitation", "nutrition", "agriculture", "training", "service", "facility", "provider", "satisfaction", "quality", "barrier", "stigma", "cost", "distance", "transport", "waiting", "referral", "retention", "continuation", "target", "indicator", "baseline", "endline", "evaluation", "outcome", "impact"
];

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function checkBackendOnline() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function createDocumentRecord(payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/document-records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Failed to save document record");
  }
  return (await response.json()) as BackendDocumentRecord;
}

function cleanText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitSentences(text: string) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function wordCount(text: string) {
  const matches = cleanText(text).match(/\b[\w'-]+\b/g);
  return matches ? matches.length : 0;
}

function extractThemes(text: string) {
  const lower = text.toLowerCase();
  return KEYWORDS
    .map((term) => ({ term, count: (lower.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")) || []).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((item) => `${item.term} (${item.count})`);
}

function extractEntities(text: string) {
  const matches = text.match(/\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\b/g) || [];
  const stop = new Set(["The", "This", "That", "These", "Those", "There", "Their", "They", "It", "In", "On", "For", "From", "With", "And", "Or", "But", "Table", "Figure", "Section", "Annex"]);
  const counts = new Map<string, number>();
  for (const item of matches) {
    if (stop.has(item)) continue;
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name} (${count})`);
}

function buildLimitations(file: File, text: string) {
  const limitations: string[] = [];
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    limitations.push("PDF text extraction is not yet enabled in this browser prototype. Production Dalili should process PDFs through the backend.");
  }
  if (wordCount(text) < 50) {
    limitations.push("The extracted text is short, so theme and summary outputs may be incomplete.");
  }
  if (!text) {
    limitations.push("No readable text was extracted from this file.");
  }
  limitations.push("This prototype uses deterministic browser-side text checks. Production Dalili should add source citations, page numbers and full audit logs.");
  return limitations;
}

async function readFileText(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".docx")) {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return cleanText(result.value || "");
  }

  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv") || lower.endsWith(".json")) {
    return cleanText(await file.text());
  }

  if (lower.endsWith(".pdf")) {
    return "";
  }

  return cleanText(await file.text().catch(() => ""));
}

function generateSummary(text: string) {
  const sentences = splitSentences(text);
  if (!sentences.length) return ["No readable text was available for summarisation."];
  const useful = sentences.filter((sentence) => sentence.length > 50);
  return (useful.length ? useful : sentences).slice(0, 5);
}

function findRelevantPassages(text: string, query: string) {
  if (!query.trim()) return [];
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  const sentences = splitSentences(text);
  return sentences
    .map((sentence, index) => {
      const lower = sentence.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
      return { sentence, index, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
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

function saveDocument(summary: DocumentSummary) {
  window.localStorage.setItem("dalili.latestDocument", JSON.stringify(summary));
}

function buildDocumentMemo(summary: DocumentSummary, keySentences: string[]) {
  return [
    "DALILI DOCUMENT INTELLIGENCE SUMMARY",
    "====================================",
    `File: ${summary.fileName}`,
    `Uploaded: ${new Date(summary.uploadedAt).toLocaleString()}`,
    `Words: ${summary.wordCount}`,
    `Paragraphs: ${summary.paragraphCount}`,
    "",
    "1. Draft summary",
    ...keySentences.map((item, index) => `${index + 1}. ${item}`),
    "",
    "2. Detected themes",
    ...(summary.themes.length ? summary.themes.map((item) => `- ${item}`) : ["No repeated priority themes were detected."]),
    "",
    "3. Detected entities",
    ...(summary.entities.length ? summary.entities.map((item) => `- ${item}`) : ["No likely entities were detected."]),
    "",
    "4. Limitations",
    ...summary.limitations.map((item) => `- ${item}`),
  ].join("\n");
}

export function DocumentsClient() {
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [query, setQuery] = useState("barriers service access quality");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [backendDataset, setBackendDataset] = useState<BackendDataset | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [savingBackend, setSavingBackend] = useState(false);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<BackendDocumentRecord | null>(null);

  const keySentences = useMemo(() => generateSummary(summary?.extractedText || ""), [summary]);
  const passages = useMemo(() => findRelevantPassages(summary?.extractedText || "", query), [summary, query]);

  useEffect(() => {
    setSummary(readJson<DocumentSummary>("dalili.latestDocument"));
    setActiveProject(readJson<ProjectRecord>("dalili.activeProject"));
    setBackendDataset(readJson<BackendDataset>("dalili.latestBackendDataset"));
    setSavedRecord(readJson<BackendDocumentRecord>("dalili.latestBackendDocumentRecord"));
    checkBackendOnline().then(setBackendOnline);
  }, []);

  async function handleUpload(file?: File) {
    if (!file) return;
    setLoading(true);
    setError(null);
    setBackendMessage(null);
    try {
      const text = await readFileText(file);
      const cleaned = cleanText(text);
      const payload: DocumentSummary = {
        fileName: file.name,
        fileType: file.type || file.name.split(".").pop() || "unknown",
        sizeKb: Math.round((file.size / 1024) * 10) / 10,
        uploadedAt: new Date().toISOString(),
        characterCount: cleaned.length,
        wordCount: wordCount(cleaned),
        paragraphCount: cleaned ? cleaned.split(/\n\s*\n/).filter(Boolean).length : 0,
        extractedText: cleaned,
        themes: extractThemes(cleaned),
        entities: extractEntities(cleaned),
        limitations: buildLimitations(file, cleaned),
      };
      setSummary(payload);
      saveDocument(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The document could not be processed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToBackend() {
    if (!summary) return;
    setSavingBackend(true);
    setBackendMessage(null);
    try {
      const online = await checkBackendOnline();
      setBackendOnline(online);
      if (!online) throw new Error("Backend is offline. Start FastAPI on http://127.0.0.1:8000 first.");

      const project = activeProject ?? readJson<ProjectRecord>("dalili.activeProject");
      if (!project?.backendId) throw new Error("Select or create a backend-saved project first on /projects.");

      const latestDataset = backendDataset ?? readJson<BackendDataset>("dalili.latestBackendDataset");
      if (latestDataset && latestDataset.project_id !== project.backendId) {
        throw new Error("The latest backend dataset belongs to a different project. Upload a dataset under the active project or clear the dataset.");
      }

      const saved = await createDocumentRecord({
        project_id: project.backendId,
        dataset_id: latestDataset?.id ?? null,
        file_name: summary.fileName,
        file_type: summary.fileType,
        size_kb: summary.sizeKb,
        character_count: summary.characterCount,
        word_count: summary.wordCount,
        paragraph_count: summary.paragraphCount,
        themes_json: JSON.stringify(summary.themes),
        entities_json: JSON.stringify(summary.entities),
        limitations_json: JSON.stringify(summary.limitations),
        summary_text: buildDocumentMemo(summary, keySentences),
        extracted_text: summary.extractedText,
        author: "Dalili user",
      });
      setSavedRecord(saved);
      window.localStorage.setItem("dalili.latestBackendDocumentRecord", JSON.stringify(saved));
      setBackendMessage(`Saved document record #${saved.id} to backend.`);
    } catch (err) {
      setBackendMessage(err instanceof Error ? err.message : "Could not save document record to backend.");
    } finally {
      setSavingBackend(false);
    }
  }

  function exportSummary() {
    if (!summary) return;
    const lines = [
      buildDocumentMemo(summary, keySentences),
      "",
      "5. Query passages",
      ...(passages.length ? passages.map((item) => `- Sentence ${item.index + 1}: ${item.sentence}`) : ["No query passages available."]),
    ].join("\n");
    downloadText(`dalili-document-summary-${summary.fileName.replace(/\W+/g, "-")}.txt`, lines);
  }

  return (
    <div className="space-y-6 text-[#102033]">
      <section className="rounded-3xl bg-[#073b2a] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100/80">Document Intelligence</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Analyse reports, transcripts and evidence documents</h1>
            <p className="mt-2 max-w-3xl text-sm text-emerald-50/85">
              Upload a text, CSV, JSON, Markdown or DOCX file. Dalili extracts readable text, identifies themes, finds likely entities and prepares source-aware passages for review.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#f4b400] px-5 py-3 text-sm font-bold text-[#102033] transition hover:brightness-105">
            <UploadCloud size={18} />
            Upload document
            <input
              type="file"
              className="hidden"
              accept=".txt,.md,.csv,.json,.docx,.pdf"
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
          </label>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database size={18} className="text-[#0b5e3c]" />
              <h2 className="text-xl font-bold">Backend document storage</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Backend: {backendOnline ? "online" : "offline"} · Active project: {activeProject?.backendId ? `#${activeProject.backendId}` : "not backend-saved"} · Dataset: {backendDataset?.id ? `#${backendDataset.id}` : "not linked"}
            </p>
            {savedRecord ? <p className="mt-1 text-xs text-emerald-700">Latest saved document record: #{savedRecord.id} · {savedRecord.file_name}</p> : null}
          </div>
          <button
            onClick={saveToBackend}
            disabled={!summary || savingBackend}
            className="rounded-2xl bg-[#0b5e3c] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {savingBackend ? "Saving..." : "Save document to backend"}
          </button>
        </div>
        {backendMessage ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{backendMessage}</div> : null}
      </section>

      {error ? (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="card p-6 text-sm text-slate-600">Processing document...</div>
      ) : null}

      {!summary && !loading ? (
        <div className="card p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><FileText /></div>
            <div>
              <h2 className="text-xl font-bold">No document uploaded yet</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Upload a DOCX, TXT, Markdown, CSV or JSON file to test the document intelligence workflow. PDF upload is accepted, but text extraction is intentionally left for the backend phase.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="card p-5">
              <p className="text-sm text-slate-500">File</p>
              <p className="mt-2 truncate text-lg font-bold">{summary.fileName}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Words</p>
              <p className="mt-2 text-2xl font-bold">{summary.wordCount.toLocaleString()}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Paragraphs</p>
              <p className="mt-2 text-2xl font-bold">{summary.paragraphCount.toLocaleString()}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Size</p>
              <p className="mt-2 text-2xl font-bold">{summary.sizeKb} KB</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Draft source-aware summary</h2>
                  <p className="mt-1 text-sm text-slate-500">This is deterministic text extraction for the prototype; production summaries will cite exact pages/passages.</p>
                </div>
                <button onClick={exportSummary} className="inline-flex items-center gap-2 rounded-xl bg-[#0b5e3c] px-4 py-2 text-sm font-semibold text-white">
                  <Download size={16} /> Export
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {keySentences.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <span className="font-bold text-[#0b5e3c]">{index + 1}. </span>{item}
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-6">
              <div className="card p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-[#f4b400]" size={18} />
                  <h2 className="text-lg font-bold">Detected themes</h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {summary.themes.length ? summary.themes.map((item) => (
                    <span key={item} className="badge bg-emerald-50 text-emerald-700">{item}</span>
                  )) : <p className="text-sm text-slate-500">No repeated priority themes were detected.</p>}
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-[#0b5e3c]" size={18} />
                  <h2 className="text-lg font-bold">Likely entities</h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {summary.entities.length ? summary.entities.map((item) => (
                    <span key={item} className="badge bg-slate-100 text-slate-700">{item}</span>
                  )) : <p className="text-sm text-slate-500">No likely entities were detected.</p>}
                </div>
              </div>
            </aside>
          </div>

          <section className="card p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Search size={18} className="text-[#0b5e3c]" />
                  <h2 className="text-xl font-bold">Ask the document</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">Type keywords or a question. The prototype returns relevant passages from the extracted text.</p>
              </div>
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm md:max-w-md" placeholder="Example: barriers to service access" />
            </div>
            <div className="mt-5 space-y-3">
              {passages.length ? passages.map((item) => (
                <div key={`${item.index}-${item.sentence}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sentence {item.index + 1} · match score {item.score}</p>
                  <p className="mt-1">{item.sentence}</p>
                </div>
              )) : <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No relevant passages found for the current query.</p>}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-600" />
              <h2 className="text-xl font-bold">Limitations and next production step</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
              {summary.limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
