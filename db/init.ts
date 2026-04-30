/**
 * Database Initialization Script
 * One-command setup for fresh installations
 */
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { MigrationManager } from "./migrate.ts";
import { seed } from "./seed.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDefaultDbPath() {
  const dataDir = process.platform === "win32"
    ? path.join(os.homedir(), "AppData", "Roaming", "TipAi")
    : path.join(os.homedir(), ".config", "TipAi");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "data.db");
}

function initDatabase() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || getDefaultDbPath();

  console.log("🚀 Initializing TipAi database...\n");

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create/connect to database
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run schema initialization
  const schemaPath = path.join(__dirname, "migrations", "001_initial_schema.sql");

  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schema);
    console.log("✅ Schema initialized");
  } else {
    console.warn("⚠️  Schema file not found, skipping schema init");
  }

  db.close();

  // Run migrations
  const manager = new MigrationManager(dbPath);
  const result = manager.migrate();

  if (result.applied.length > 0) {
    console.log(`✅ Applied ${result.applied.length} migration(s)`);
  }
  manager.close();

  // Run seed
  seed();

  console.log("\n✨ Database initialization complete!");
  console.log(`📁 Location: ${path.resolve(dbPath)}`);
}

initDatabase();
