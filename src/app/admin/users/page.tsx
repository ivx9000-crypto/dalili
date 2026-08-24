"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { authFetch, getSession, isAdminRole } from "@/lib/auth-client";

type User = {
  id: number;
  full_name: string;
  email: string;
  primary_role: string;
  status: string;
  created_at: string;
};

const roles = ["Platform Admin", "Organisation Admin", "Analyst / M&E Officer", "Reviewer / Approver", "Viewer / Client"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not load users");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }
    const role = session.role || session.user?.primary_role;
    if (!isAdminRole(role)) {
      setAllowed(false);
      return;
    }
    setAllowed(true);
    loadUsers();
  }, []);

  async function updateRole(userId: number, role: string) {
    setError("");
    setMessage("");
    try {
      const res = await authFetch(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not update role");
      setUsers((items) => items.map((item) => (item.id === userId ? data : item)));
      setMessage("User role updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
    }
  }

  async function updateStatus(userId: number, status: string) {
    setError("");
    setMessage("");
    try {
      const res = await authFetch(`/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not update user status");
      setUsers((items) => items.map((item) => (item.id === userId ? data : item)));
      setMessage(`User marked ${status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user status");
    }
  }

  if (allowed === false) {
    return (
      <AppShell>
        <Topbar />
        <section className="card p-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <ShieldCheck />
          </div>
          <h2 className="text-2xl font-black text-[#102033]">You do not have permission to view this page.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Admin Users is restricted to Platform Admins, Organisation Admins and Owners. Contact your organisation admin if you need access.</p>
          <a href="/dashboard" className="mt-5 inline-flex rounded-2xl bg-[#073B2A] px-5 py-3 text-sm font-bold text-white">Return to dashboard</a>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Topbar />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-black text-[#102033]">Admin users</h2>
            <p className="mt-2 text-sm text-slate-500">Manage user roles and safe account deactivation for your organisation.</p>
          </div>
          <button onClick={loadUsers} className="rounded-2xl bg-[#073B2A] px-5 py-3 font-bold text-white">Refresh users</button>
        </div>
        {(message || error) && <div className={`rounded-2xl p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</div>}
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3"><Users className="text-[#073B2A]" /><div><h3 className="text-xl font-bold">User list</h3><p className="text-sm text-slate-500">Only Platform Admin and Organisation Admin users can use these controls.</p></div></div>
          {loading ? <p className="text-sm text-slate-500">Loading users...</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead><tr className="border-b border-slate-200"><th className="py-3">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="py-3 font-semibold">{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <select value={user.primary_role} onChange={(e) => updateRole(user.id, e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
                        {roles.map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge ${user.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user.status}</span></td>
                    <td className="space-x-2">
                      <button onClick={() => updateStatus(user.id, "Deactivated")} className="rounded-xl border border-red-200 px-3 py-2 font-semibold text-red-700">Deactivate</button>
                      <button onClick={() => updateStatus(user.id, "Active")} className="rounded-xl border border-emerald-200 px-3 py-2 font-semibold text-emerald-700">Restore</button>
                      <button onClick={() => updateStatus(user.id, "Deleted")} className="rounded-xl bg-red-600 px-3 py-2 font-semibold text-white">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><ShieldCheck className="mb-2" /> Delete is implemented as a soft delete/status change so audit history and data retention rules remain intact.</section>
      </div>
    </AppShell>
  );
}
