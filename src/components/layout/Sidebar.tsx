"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  ClipboardList,
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
  ClipboardCheck,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { getSession, isAdminRole } from "@/lib/auth-client";

const primaryNavItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Start Analysis", href: "/start", icon: Sparkles },
  { name: "My Projects", href: "/projects", icon: FolderOpen },
  { name: "Project Workspace", href: "/workspace", icon: ClipboardList },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Support", href: "/support", icon: LifeBuoy },
];

const advancedNavItems = [
  { name: "Data Room", href: "/data-room", icon: Database },
  { name: "Quality Check", href: "/quality-check", icon: ShieldCheck },
  { name: "Track Results", href: "/indicators", icon: BarChart3 },
  { name: "Insights", href: "/insights", icon: Lightbulb },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Maps", href: "/maps", icon: Map },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "App Review", href: "/qa-review", icon: ClipboardCheck },
  { name: "Team", href: "/team", icon: Users },
  { name: "Account", href: "/account", icon: UserCircle },
  { name: "Admin Users", href: "/admin/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
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
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#073B2A]">
          D
        </div>
        <div>
          <div className="text-lg font-bold leading-tight text-white">Dalili</div>
          <div className="text-xs text-emerald-100">Evidence intelligence</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              className={item.name === "Start Analysis"
                ? "flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-black text-[#073B2A] transition hover:bg-emerald-50"
                : "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-emerald-50 transition hover:bg-white/10 hover:text-white"}
            >
              <Icon className={item.name === "Start Analysis" ? "h-4 w-4 text-[#073B2A]" : "h-4 w-4 text-emerald-100"} />
              <span>{item.name}</span>
            </a>
          );
        })}

        <details className="pt-2 text-emerald-50">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 hover:bg-white/10">
            Advanced tools <ChevronDown className="h-3.5 w-3.5" />
          </summary>
          <div className="mt-1 space-y-0.5">
            {advancedNavItems.filter((item) => item.name !== "Admin Users" || isAdminRole(role)).map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-emerald-50 transition hover:bg-white/10 hover:text-white"
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
        <div className="rounded-2xl bg-white/10 p-3 text-white">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-emerald-100">{role}</div>
        </div>
      </div>
    </aside>
  );
}
