"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { cleanupProductionLocalStorage, getSession } from "@/lib/auth-client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    cleanupProductionLocalStorage();
    const session = getSession();
    if (!session?.token) {
      window.location.href = "/login";
      return;
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2f4f7] text-[#102033]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#073B2A] font-black text-white">D</div>
          <div className="font-bold">Checking secure session...</div>
          <div className="mt-1 text-sm text-slate-500">Redirecting to login if needed.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f4f7] text-[#102033]">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1 bg-[#f2f4f7] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
