import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

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
    dbInstance = undefined as never;
    instance = undefined as never;
  }
}
