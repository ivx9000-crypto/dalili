"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || "";
    setToken(value);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Password reset failed");
      setMessage(data.message || "Password reset successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f4f7] p-6">
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-[#102033]">Reset password</h1>
        <p className="mt-2 text-sm text-slate-500">Paste the local reset token and choose a new password.</p>
        <label className="mt-6 block text-sm font-semibold">Reset token</label>
        <textarea value={token} onChange={(e) => setToken(e.target.value)} required rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <label className="mt-4 block text-sm font-semibold">New password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />
        <label className="mt-4 block text-sm font-semibold">Confirm password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />
        {error && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        {message && <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div>}
        <button disabled={loading} className="mt-6 w-full rounded-2xl bg-[#073B2A] px-5 py-3 font-bold text-white disabled:opacity-60">{loading ? "Resetting..." : "Reset password"}</button>
        <p className="mt-5 text-center text-sm"><Link href="/login" className="font-bold text-[#073B2A]">Back to login</Link></p>
      </form>
    </main>
  );
}
