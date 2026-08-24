import { ArrowUpRight, Folder, Lightbulb, ShieldCheck, Table2, FileText } from "lucide-react";

const icons = [Folder, Table2, ShieldCheck, Lightbulb, FileText];

export function MetricCard({ label, value, note, index }: { label: string; value: string; note: string; index: number }) {
  const Icon = icons[index] ?? Folder;
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className="rounded-xl bg-dalili-green/10 p-2 text-dalili-green"><Icon size={20} /></div>
      </div>
      <div className="text-3xl font-bold text-dalili-ink">{value}</div>
      <div className="mt-2 flex items-center gap-1 text-xs text-dalili-green"><ArrowUpRight size={14} /> {note}</div>
    </div>
  );
}
