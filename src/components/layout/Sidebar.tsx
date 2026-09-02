"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  Database,
  FileText,
  FolderOpen,
  Home,
  Lightbulb,
  Map,
  Settings,
  ShieldCheck,
  Users,
  UserCircle,
  LifeBuoy,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { getSession, isAdminRole } from "@/lib/auth-client";

const primaryNavItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Start", href: "/start", icon: Sparkles },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Support", href: "/support", icon: LifeBuoy },
  { name: "Settings", href: "/settings", icon: Settings },
];

const advancedNavItems = [
  { name: "Project Workspace", href: "/workspace", icon: ClipboardCheck },
  { name: "Project Evidence", href: "/data-room", icon: Database },
  { name: "Data Issues", href: "/quality-check", icon: ShieldCheck },
  { name: "Calculations", href: "/indicators", icon: BarChart3 },
  { name: "Findings", href: "/insights", icon: Lightbulb },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Maps", href: "/maps", icon: Map },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "App Review", href: "/qa-review", icon: ClipboardCheck },
  { name: "Team", href: "/team", icon: Users },
  { name: "Account", href: "/account", icon: UserCircle },
  { name: "Admin Users", href: "/admin/users", icon: Users },
];

export function Sidebar() {
  const [name, setName] = useState("Dalili User");
  const [role, setRole] = useState("Team member");

  useEffect(() => {
    const session = getSession();
    if (session?.user?.full_name) setName(session.user.full_name);
    if (session?.role || session?.user?.primary_role) setRole(session.role || session.user.primary_role);
  }, []);

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 bg-[#073B2A] text-white lg:flex lg:flex-col">
      <div className="px-4 py-4">
        <a href="/dashboard" className="group flex items-center gap-3 rounded-3xl bg-white/10 p-3 ring-1 ring-white/10 transition hover:bg-white/15">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#073B2A] shadow-sm">
            D
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black leading-tight text-white">Dalili</div>
            <div className="truncate text-xs text-emerald-100">Find the evidence in your data</div>
          </div>
        </a>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/90">Main</div>
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              className={item.name === "Start"
                ? "flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-sm font-black text-[#073B2A] shadow-sm transition hover:bg-emerald-50"
                : "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-white/10 hover:text-white"}
            >
              <Icon className={item.name === "Start" ? "h-4 w-4 text-[#073B2A]" : "h-4 w-4 text-emerald-100"} />
              <span>{item.name}</span>
            </a>
          );
        })}

        <details className="pt-4 text-emerald-50">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/90 hover:bg-white/10">
            Advanced <ChevronDown className="h-3.5 w-3.5" />
          </summary>
          <div className="mt-1 space-y-0.5">
            {advancedNavItems.filter((item) => item.name !== "Admin Users" || isAdminRole(role)).map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-emerald-50 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon className="h-4 w-4 text-emerald-100" />
                  <span>{item.name}</span>
                </a>
              );
            })}
          </div>
        </details>
      </nav>

      <div className="px-3 pb-4">
        <div className="rounded-3xl bg-white/10 p-3 text-white ring-1 ring-white/10">
          <div className="truncate text-sm font-bold">{name}</div>
          <div className="truncate text-xs text-emerald-100">{role}</div>
        </div>
      </div>
    </aside>
  );
}
