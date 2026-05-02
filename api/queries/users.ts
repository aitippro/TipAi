import type { InsertUser } from "@db/schema";

// ── Native Addon ─────────────────────────────────────────
let native: any = null;
try {
  native = require("../../native");
} catch {
  // Browser fallback
}

export async function findUserByUnionId(unionId: string) {
  if (!native) return null;
  return native.userFindByUnionId(unionId);
}

export async function findUserByUsername(username: string) {
  if (!native) return null;
  return native.userFindByUsername(username);
}

export async function upsertUser(data: InsertUser) {
  if (!native) throw new Error("Native addon not available");
  const values = { ...data };
  if (values.role === undefined && values.unionId) {
    values.role = "admin";
  }
  return native.userUpsert(values);
}
