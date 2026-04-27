import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

declare module "better-sqlite3" {
  // 类型声明由运行时提供，此处仅消除 TypeScript 错误
}

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let dbInstance: Database.Database;

export function getDb() {
  if (!instance) {
    dbInstance = new Database(env.databaseUrl.replace("file:", ""));
    dbInstance.pragma("journal_mode = WAL");
    instance = drizzle(dbInstance, { schema: fullSchema });
  }
  return instance;
}

export function getRawDb(): Database.Database {
  if (!dbInstance) {
    getDb();
  }
  return dbInstance!;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = undefined as any;
    instance = undefined as any;
  }
}
