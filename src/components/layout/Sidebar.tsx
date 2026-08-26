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
} from "lucide-react";
import { getSession, isAdminRole } from "@/lib/auth-client";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Project Guide", href: "/workspace", icon: ClipboardList },
  { name: "Data Room", href: "/data-room", icon: Database },
  { name: "Quality Check", href: "/quality-check", icon: ShieldCheck },
  { name: "Track Results", href: "/indicators", icon: BarChart3 },
  { name: "Insights", href: "/insights", icon: Lightbulb },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Maps", href: "/maps", icon: Map },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
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
    <aside className="hidden min-h-screen w-72 shrink-0 bg-[#073B2A] text-white lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#073B2A]">
          D
        </div>
        <div>
          <div className="text-xl font-bold leading-tight text-white">Dalili</div>
          <div className="text-xs text-emerald-100">Evidence intelligence</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
        {navItems.filter((item) => item.name !== "Admin Users" || isAdminRole(role)).map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-emerald-50 transition hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-4 w-4 text-emerald-100" />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      <div className="px-4 pb-5">
        <div className="rounded-2xl bg-white/10 p-4 text-white">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-emerald-100">{role}</div>
        </div>
      </div>
    </aside>
  );
}
