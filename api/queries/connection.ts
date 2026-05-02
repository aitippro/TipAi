// Native Addon 连接 stub（原 Drizzle connection 已迁移）
let native: any = null;
try {
  native = require("../../native");
} catch {
  // fallback
}

export function getDb() {
  throw new Error("Drizzle ORM 已移除，请使用 Native Addon 直接调用");
}

export function getRawDb() {
  throw new Error("Drizzle ORM 已移除，请使用 Native Addon 直接调用");
}

export function closeDb() {
  // no-op
}
