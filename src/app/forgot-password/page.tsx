"use client";

import Link from "next/link";
import { useState } from "react";
import { API_BASE } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not create reset token");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create reset token");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f4f7] p-6">
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#073B2A] font-black text-white">D</div>
          <div><h1 className="text-2xl font-black">Forgot password</h1><p className="text-sm text-slate-500">Create a local reset token for this development version.</p></div>
        </div>
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />
        {error && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        {result && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-bold">{result.message}</p>
            {result.reset_token ? <p className="mt-3 break-all text-xs">Token: {result.reset_token}</p> : null}
            {result.reset_url ? <Link className="mt-3 inline-block font-bold text-[#073B2A]" href={result.reset_url}>Open reset page</Link> : null}
          </div>
        )}
        <button disabled={loading} className="mt-6 w-full rounded-2xl bg-[#073B2A] px-5 py-3 font-bold text-white disabled:opacity-60">{loading ? "Preparing reset..." : "Prepare reset token"}</button>
        <p className="mt-5 text-center text-sm"><Link href="/login" className="font-bold text-[#073B2A]">Back to login</Link></p>
      </form>
    </main>
  );
}
