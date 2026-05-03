 

import { native as _native } from "../lib/native";

// Native Addon 连接 stub（原 Drizzle connection 已迁移）

export function getDb() {
  throw new Error("Drizzle ORM 已移除，请使用 Native Addon 直接调用");
}

export function getRawDb() {
  throw new Error("Drizzle ORM 已移除，请使用 Native Addon 直接调用");
}

export function closeDb() {
  // no-op
}
