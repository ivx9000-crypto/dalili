export type DaliliErrorLogItem = {
  id: string;
  createdAt: string;
  source: string;
  message: string;
  detail?: string;
  path?: string;
};

const ERROR_LOG_KEY = "dalili.errorLog";
const MAX_ERROR_LOG_ITEMS = 25;

export function readErrorLog(): DaliliErrorLogItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ERROR_LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as DaliliErrorLogItem[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ERROR_LOG_ITEMS) : [];
  } catch {
    return [];
  }
}

export function logDaliliError(source: string, error: unknown, detail?: string) {
  if (typeof window === "undefined") return;
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  const item: DaliliErrorLogItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    source,
    message,
    detail,
    path: window.location.pathname,
  };
  try {
    const next = [item, ...readErrorLog()].slice(0, MAX_ERROR_LOG_ITEMS);
    window.localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("dalili-error-log-changed"));
  } catch {
    // Local logging should never break the app.
  }
}

export function clearErrorLog() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ERROR_LOG_KEY);
  window.dispatchEvent(new Event("dalili-error-log-changed"));
}
