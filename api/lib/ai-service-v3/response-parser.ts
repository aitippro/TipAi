export function parseAIJsonResponse<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function toComplexity(
  value: unknown,
): "simple" | "medium" | "complex" {
  return value === "simple" || value === "medium" || value === "complex"
    ? value
    : "medium";
}
