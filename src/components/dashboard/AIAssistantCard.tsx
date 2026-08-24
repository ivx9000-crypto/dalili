import { Send } from "lucide-react";

export function AIAssistantCard() {
  const prompts = [
    "Summarise this project from saved evidence",
    "What data quality issues need attention?",
    "Which indicators are ready for reporting?",
    "Draft a donor update from reviewed outputs",
  ];
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-bold">AI Assistant</h2>
        <span className="badge bg-dalili-green/10 text-dalili-green">BETA</span>
      </div>
      <p className="mb-4 text-sm leading-6 text-slate-500">Ask questions grounded in uploaded datasets, quality reports, indicators, reviewed insights, documents and report drafts. Dalili should not guess beyond saved evidence.</p>
      <div className="space-y-2">
        {prompts.map((prompt) => <a href="/ai-assistant" key={prompt} className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50">{prompt}</a>)}
      </div>
      <a href="/ai-assistant" className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
        <span className="w-full">Open AI Assistant...</span>
        <Send size={18} />
      </a>
    </div>
  );
}
