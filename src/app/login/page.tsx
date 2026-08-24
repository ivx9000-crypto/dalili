"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { API_BASE, readApiError, saveSession } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("created")) {
      setMessage("Account created. Please sign in.");
    }
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Login failed. Check your email, password and backend connection."));
      const data = await res.json();
      if (!data?.token || !data?.user) throw new Error("The backend did not return a valid login session.");
      saveSession(data);
      setMessage("Signed in successfully. Loading your dashboard...");
      window.setTimeout(() => { window.location.href = "/dashboard"; }, 350);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f2f4f7] md:grid-cols-[1fr_520px]">
      <section className="hidden bg-[#073B2A] p-12 text-white md:flex md:flex-col md:justify-between">
        <div>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#073B2A]">D</div>
            <div>
              <div className="text-2xl font-black">Dalili</div>
              <div className="text-sm text-emerald-100">Find the evidence in your data.</div>
            </div>
          </div>
          <h1 className="max-w-xl text-5xl font-black leading-tight">Secure access for M&E and research teams.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-emerald-50/90">Login to manage projects, datasets, quality checks, indicators, insights, reports and governance workflows.</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-5 text-sm text-emerald-50">For PostgreSQL testing, older SQLite-only accounts will not exist unless they are migrated. Create a new account in the active database.</div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#073B2A]"><LockKeyhole /></div>
            <h2 className="text-3xl font-black text-[#102033]">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Use your Dalili account to continue.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button disabled type="button" className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 opacity-80">Google</button>
            <button disabled type="button" className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 opacity-80">Microsoft</button>
            <p className="sm:col-span-2 text-xs leading-5 text-slate-500">Single sign-on is intentionally disabled until live callback URLs and provider credentials are configured online.</p>
          </div>

          <label className="mt-5 block text-sm font-semibold text-slate-700">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0FA67A]" />

          <label className="mt-5 block text-sm font-semibold text-slate-700">Password</label>
          <div className="relative mt-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 outline-none focus:border-[#0FA67A]" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {message && <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</div>}
          {error && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

          <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#073B2A] px-5 py-3 font-bold text-white disabled:opacity-60">
            {loading ? "Signing in..." : "Sign in"} <ArrowRight size={18} />
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">No account yet? <Link href="/signup" className="font-bold text-[#073B2A]">Create one</Link></p>
          <p className="mt-3 text-center text-sm"><Link href="/forgot-password" className="font-bold text-[#073B2A]">Forgot password?</Link></p>
        </form>
      </section>
    </main>
  );
}
