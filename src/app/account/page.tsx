"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Link2, LockKeyhole, LogOut, ShieldAlert, ShieldCheck, UserCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { authFetch, clearSession, getSession, logout, readApiError } from "@/lib/auth-client";

const TWO_FACTOR_KEY = "dalili.twoFactorSettings";

type TwoFactorSettings = {
  enabled: boolean;
  method: "authenticator" | "email";
  recoveryCodes: string[];
};

function makeRecoveryCodes() {
  return Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase());
}

function loadTwoFactor(): TwoFactorSettings {
  if (typeof window === "undefined") return { enabled: false, method: "authenticator", recoveryCodes: [] };
  try {
    const raw = window.localStorage.getItem(TWO_FACTOR_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, method: "authenticator", recoveryCodes: [] };
  } catch {
    return { enabled: false, method: "authenticator", recoveryCodes: [] };
  }
}

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sessionName, setSessionName] = useState("Dalili user");
  const [sessionEmail, setSessionEmail] = useState("");
  const [sessionRole, setSessionRole] = useState("");
  const [twoFactor, setTwoFactor] = useState<TwoFactorSettings>({ enabled: false, method: "authenticator", recoveryCodes: [] });

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }
    setSessionName(session.user.full_name);
    setSessionEmail(session.user.email);
    setSessionRole(session.role || session.user.primary_role);
    setTwoFactor(loadTwoFactor());
  }, []);

  const twoFactorStatus = useMemo(() => twoFactor.enabled ? `Enabled using ${twoFactor.method === "authenticator" ? "authenticator app" : "email code"}` : "Not enabled", [twoFactor]);

  function saveTwoFactor(next: TwoFactorSettings, note: string) {
    setTwoFactor(next);
    window.localStorage.setItem(TWO_FACTOR_KEY, JSON.stringify(next));
    setMessage(note);
    setError("");
  }

  function enableTwoFactor() {
    saveTwoFactor({ ...twoFactor, enabled: true, recoveryCodes: twoFactor.recoveryCodes.length ? twoFactor.recoveryCodes : makeRecoveryCodes() }, "Two-step authentication preference saved locally. In production this will be enforced by the backend after email/authenticator setup.");
  }

  function disableTwoFactor() {
    saveTwoFactor({ ...twoFactor, enabled: false }, "Two-step authentication preference disabled locally.");
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    try {
      const res = await authFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Password change failed"));
      const data = await res.json();
      setMessage(data.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    }
  }

  async function logoutAll() {
    setMessage("");
    setError("");
    try {
      const res = await authFetch("/auth/logout-all", { method: "POST" });
      if (!res.ok) throw new Error(await readApiError(res, "Could not revoke sessions"));
      clearSession();
      window.location.href = "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke sessions");
    }
  }

  async function deactivateMe() {
    setMessage("");
    setError("");
    try {
      const res = await authFetch("/auth/deactivate-me", {
        method: "POST",
        body: JSON.stringify({ confirmation: deleteConfirm }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Could not deactivate account"));
      clearSession();
      window.location.href = "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate account");
    }
  }

  return (
    <AppShell>
      <Topbar />
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-[#102033]">Account</h2>
          <p className="mt-2 text-sm text-slate-500">Manage your Dalili account, password, login methods and session security.</p>
        </div>

        {(message || error) && (
          <div className={`rounded-2xl p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</div>
        )}

        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <UserCircle className="text-[#073B2A]" />
            <div>
              <h3 className="text-xl font-bold">Profile</h3>
              <p className="text-sm text-slate-500">Current signed-in account.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Name</div><div className="font-bold">{sessionName}</div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Email</div><div className="font-bold">{sessionEmail}</div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Role</div><div className="font-bold">{sessionRole}</div></div>
            <div className="rounded-2xl bg-amber-50 p-4"><div className="text-xs text-amber-700">Email verification</div><div className="font-bold text-amber-800">Pending production email setup</div></div>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <Link2 className="text-[#073B2A]" />
            <div>
              <h3 className="text-xl font-bold">Connected login methods</h3>
              <p className="text-sm text-slate-500">Password works locally. Google and Microsoft are ready to connect during online deployment.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="font-bold text-emerald-800">Email + password</div><div className="mt-1 text-xs text-emerald-700">Active</div></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="font-bold text-slate-700">Google</div><div className="mt-1 text-xs text-slate-500">Configure OAuth callback URL online</div></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="font-bold text-slate-700">Microsoft</div><div className="mt-1 text-xs text-slate-500">Configure Microsoft Entra/Azure app online</div></div>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="text-[#073B2A]" />
            <div>
              <h3 className="text-xl font-bold">Two-step authentication</h3>
              <p className="text-sm text-slate-500">Optional but recommended, especially for organisation owners and admins.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Status</div>
              <div className="mt-1 font-bold text-[#102033]">{twoFactorStatus}</div>
              <label className="mt-4 block text-sm font-semibold text-slate-700">Preferred method</label>
              <select value={twoFactor.method} onChange={(event) => saveTwoFactor({ ...twoFactor, method: event.target.value as TwoFactorSettings["method"] }, "Two-step method preference saved locally.")} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
                <option value="authenticator">Authenticator app</option>
                <option value="email">Email verification code</option>
              </select>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={enableTwoFactor} className="rounded-2xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white">Enable preference</button>
                <button onClick={disableTwoFactor} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Disable</button>
                <button onClick={() => saveTwoFactor({ ...twoFactor, recoveryCodes: makeRecoveryCodes() }, "New recovery codes generated locally.")} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">Regenerate recovery codes</button>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <div className="font-bold">Recovery codes</div>
              <p className="mt-1 text-xs">Store these safely when you enable 2FA. Production enforcement requires backend email/authenticator verification.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                {(twoFactor.recoveryCodes.length ? twoFactor.recoveryCodes : ["Not generated yet"]).map((code) => <div key={code} className="rounded-xl bg-white/70 px-3 py-2">{code}</div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <KeyRound className="text-[#073B2A]" />
            <div>
              <h3 className="text-xl font-bold">Change password</h3>
              <p className="text-sm text-slate-500">Enter your current password before choosing a new one.</p>
            </div>
          </div>
          <form onSubmit={changePassword} className="grid gap-4 md:grid-cols-3">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" required className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" required className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required className="rounded-2xl border border-slate-200 px-4 py-3" />
            <button className="rounded-2xl bg-[#073B2A] px-5 py-3 font-bold text-white md:col-span-3">Change password</button>
          </form>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <LogOut className="text-[#073B2A]" />
            <div>
              <h3 className="text-xl font-bold">Sessions</h3>
              <p className="text-sm text-slate-500">Logout from this device or revoke all sessions.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={logout} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700">Logout this device</button>
            <button onClick={logoutAll} className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white">Logout all sessions</button>
          </div>
        </section>

        <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <ShieldAlert className="text-red-600" />
            <div>
              <h3 className="text-xl font-bold text-red-700">Deactivate my account</h3>
              <p className="text-sm text-slate-500">This is a safe delete for account governance: your account is deactivated and sessions are revoked, while audit records are retained.</p>
            </div>
          </div>
          <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE to confirm" className="w-full rounded-2xl border border-red-200 px-4 py-3" />
          <button onClick={deactivateMe} className="mt-3 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white">Deactivate my account</button>
        </section>
      </div>
    </AppShell>
  );
}
