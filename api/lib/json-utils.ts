/** Shared safe JSON parse — single source of truth for all 4 previous copies */
export function safeJsonParse<T>(value: string | undefined | null, fallback?: T): T | undefined {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
