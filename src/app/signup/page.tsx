"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Info, MailCheck, ShieldCheck } from "lucide-react";
import { API_BASE, readApiError, saveSession } from "@/lib/auth-client";

function OAuthNotice() {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <button disabled type="button" className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 opacity-80" title="Available after OAuth credentials are configured online">
        Continue with Google
      </button>
      <button disabled type="button" className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 opacity-80" title="Available after Microsoft Entra/Azure credentials are configured online">
        Continue with Microsoft
      </button>
      <div className="sm:col-span-2 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        Google and Microsoft sign-in are intentionally disabled until production callback URLs and provider credentials are configured.
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [role, setRole] = useState("Organisation Admin");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLogin, setAutoLogin] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password should include at least one letter and one number.");
      return;
    }
    if (!organisationName.trim()) {
      setError("Enter your organisation name. You can change this later in Settings.");
      return;
    }
    if (!acceptedTerms) {
      setError("You must accept the Terms and Privacy Policy before creating an account.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), password, organisation_name: organisationName.trim(), country: "Uganda", role }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Signup failed. Please check your details and try again."));
      const data = await res.json();
      if (!data?.token || !data?.user) throw new Error("Account was created but the backend did not return a valid session. Please log in manually.");
      setMessage("Account created successfully. Preparing your organisation workspace...");
      if (autoLogin) {
        saveSession(data);
        window.localStorage.setItem("dalili.pendingEmailVerification", JSON.stringify({ email: data.user.email, createdAt: new Date().toISOString() }));
        window.setTimeout(() => { window.location.href = "/onboarding"; }, 650);
      } else {
        window.setTimeout(() => { window.location.href = "/login?created=1"; }, 650);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f2f4f7] px-6 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_520px] lg:items-center">
        <section>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#073B2A] text-lg font-black text-white">D</div>
            <div>
              <div className="text-2xl font-black text-[#102033]">Dalili</div>
              <div className="text-sm text-slate-500">Evidence intelligence</div>
            </div>
          </div>
          <h1 className="max-w-2xl text-5xl font-black leading-tight text-[#102033]">Create a secure workspace for your organisation.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Create your account, organisation workspace, and first access role. Dalili will then guide you to set up branding, projects, data quality checks and reports.</p>
          <div className="mt-8 rounded-3xl border border-emerald-100 bg-white p-5 text-sm leading-6 text-slate-600"><ShieldCheck className="mb-3 text-[#073B2A]" /> Password login works now. Google, Microsoft and optional two-step authentication are prepared for production setup and will be connected once live callback URLs are available.</div>
        </section>

        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-black text-[#102033]">Create account</h2>
          <p className="mt-2 text-sm text-slate-500">Set up your organisation workspace.</p>
          <OAuthNotice />

          <label className="mt-6 block text-sm font-semibold text-slate-700">Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />

          <label className="mt-4 block text-sm font-semibold text-slate-700">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />

          <label className="mt-4 block text-sm font-semibold text-slate-700">Password</label>
          <div className="relative mt-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Use at least 8 characters with letters and numbers.</p>

          <label className="mt-4 block text-sm font-semibold text-slate-700">Organisation</label>
          <input value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />

          <label className="mt-4 block text-sm font-semibold text-slate-700">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option>Organisation Admin</option>
            <option>Analyst / M&E Officer</option>
            <option>Reviewer / Approver</option>
            <option>Viewer / Client</option>
          </select>

          <label className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1" />
            <span>I agree to the <Link href="/terms" className="font-bold text-[#073B2A]">Terms</Link> and <Link href="/privacy" className="font-bold text-[#073B2A]">Privacy Policy</Link>, and I confirm I have authority to create this organisation workspace.</span>
          </label>

          <label className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            <input type="checkbox" checked={autoLogin} onChange={(e) => setAutoLogin(e.target.checked)} />
            Sign me in immediately after creating the account
          </label>

          <div className="mt-4 flex gap-2 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><MailCheck className="h-4 w-4 shrink-0" /> Email verification will be enforced in production once email sending is configured. For local testing, the account is usable immediately.</div>
          <div className="mt-3 flex gap-2 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><Info className="h-4 w-4 shrink-0" /> If signup fails, this page now shows the backend error and keeps your entries instead of silently resetting.</div>

          {message && <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</div>}
          {error && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

          <button disabled={loading || !acceptedTerms} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#073B2A] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Creating account..." : "Create account"} <ArrowRight size={18} />
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-bold text-[#073B2A]">Sign in</Link></p>
        </form>
      </div>
    </main>
  );
}
