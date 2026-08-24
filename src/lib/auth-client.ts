export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export type DaliliUser = {
  id: number;
  full_name: string;
  email: string;
  primary_role: string;
  status: string;
};

export type AuthSession = {
  token: string;
  user: DaliliUser;
  organisation_id?: number | null;
  role?: string | null;
};

const SESSION_KEY = "dalili_auth_session";

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function isAdminRole(role?: string | null) {
  const value = (role || "").toLowerCase();
  return value.includes("platform admin") || value.includes("organisation admin") || value.includes("owner") || value.includes("admin");
}

export async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map((item: { msg?: string }) => item.msg || JSON.stringify(item)).join("; ");
    if (typeof data?.message === "string") return data.message;
  } catch {
    try {
      const text = await response.text();
      if (text) return text;
    } catch {
      // ignore parse errors
    }
  }
  return fallback;
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const session = getSession();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    // Keep the response available to the caller, but clear obviously invalid sessions.
    if (response.status === 401) clearSession();
  }
  return response;
}

export async function logout() {
  const session = getSession();
  try {
    if (session?.token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    }
  } finally {
    clearSession();
    window.location.href = "/login";
  }
}

export function updateStoredUser(user: DaliliUser) {
  const session = getSession();
  if (!session) return;
  saveSession({ ...session, user });
}

export function cleanupProductionLocalStorage() {
  if (typeof window === "undefined") return;
  const projectKeys = ["dalili.projects", "dalili.activeProject"];
  const demoFragments = ["demo", "sample", "pilot", "proj-yhp", "proj-agri", "youth health programme", "smallholder farmer"];
  for (const key of projectKeys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      if (key === "dalili.projects") {
        const projects = JSON.parse(raw) as Array<{ id?: string; name?: string }>;
        const cleaned = projects.filter((project) => {
          const text = `${project.id || ""} ${project.name || ""}`.toLowerCase();
          return !demoFragments.some((fragment) => text.includes(fragment));
        });
        window.localStorage.setItem(key, JSON.stringify(cleaned));
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }
}
