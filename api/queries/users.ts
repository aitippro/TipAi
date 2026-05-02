/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

import { native } from "../lib/native";
import type { InsertUser } from "@db/schema";

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
    values.role = "user";
  }
  return native.userUpsert(values);
}
