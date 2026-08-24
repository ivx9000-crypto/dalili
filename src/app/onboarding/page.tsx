"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { Building2, CheckCircle2, FolderOpen, ShieldCheck, Upload, Users } from "lucide-react";

const steps = [
  { title: "Complete organisation profile", description: "Add your organisation name, logo, country, contact email and default report footer.", href: "/settings", icon: Building2 },
  { title: "Create your first project", description: "Set the project sector, geography, donor, reporting period and sensitivity level.", href: "/projects?new=1", icon: FolderOpen },
  { title: "Upload your first dataset", description: "Use Excel, CSV, or a Kobo/ODK export. Dalili will create a data dictionary and sensitivity warnings.", href: "/data-room", icon: Upload },
  { title: "Run governance checks", description: "Confirm PII, lawful purpose, retention and reviewer approval settings before external reporting.", href: "/settings", icon: ShieldCheck },
  { title: "Invite your team", description: "Add analysts, reviewers and viewers so reports are reviewed before sharing.", href: "/team", icon: Users },
];

export default function OnboardingPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const pending = window.localStorage.getItem("dalili.pendingEmailVerification");
      if (pending) setEmail(JSON.parse(pending).email || "");
    } catch {
      setEmail("");
    }
  }, []);

  return (
    <AppShell>
      <Topbar />
      <div className="space-y-6">
        <section className="rounded-3xl bg-[#073B2A] p-7 text-white shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
            <CheckCircle2 className="h-4 w-4" /> Account created
          </div>
          <h1 className="mt-4 text-3xl font-black">Set up your Dalili workspace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50/90">Complete these steps before inviting users or generating external reports. This keeps the product clean, branded and ready for sensitive M&E data.</p>
          {email ? <p className="mt-3 text-xs text-emerald-100">Email verification pending for {email}. It will be enforced once production email sending is configured.</p> : null}
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <a key={step.title} href={step.href} className="card block p-6 hover:border-emerald-200 hover:bg-emerald-50/30">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#073B2A]"><Icon /></div>
                <h2 className="text-lg font-black text-[#102033]">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
              </a>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
