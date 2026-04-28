/**
 * Database Migration Manager
 * Uses better-sqlite3 synchronous API for local-first architecture
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MigrationRecord {
  id: number;
  filename: string;
  appliedAt: string;
}

export class MigrationManager {
  private db: Database;
  private migrationsDir: string;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrationsDir = path.join(__dirname, "migrations");
    this.ensureMigrationTable();
  }

  private ensureMigrationTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS __migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  getAppliedMigrations(): MigrationRecord[] {
    return this.db
      .prepare("SELECT * FROM __migrations ORDER BY id")
      .all() as MigrationRecord[];
  }

  getPendingMigrations(): string[] {
    const applied = new Set(
      this.getAppliedMigrations().map((m) => m.filename)
    );

    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .filter((f) => !applied.has(f));
  }

  migrate(): { applied: string[]; currentVersion: number } {
    const pending = this.getPendingMigrations();
    const applied: string[] = [];

    const insert = this.db.prepare(
      "INSERT INTO __migrations (filename) VALUES (?)"
    );

    for (const filename of pending) {
      const filePath = path.join(this.migrationsDir, filename);
      const sql = fs.readFileSync(filePath, "utf-8");

      // Run migration inside transaction
      const runMigration = this.db.transaction(() => {
        this.db.exec(sql);
        insert.run(filename);
      });

      runMigration();
      applied.push(filename);
      console.log(`✅ Applied migration: ${filename}`);
    }

    const version = this.db
      .prepare("SELECT COUNT(*) as count FROM __migrations")
      .get() as { count: number };

    return {
      applied,
      currentVersion: version.count,
    };
  }

  rollback(steps: number = 1): string[] {
    const applied = this.getAppliedMigrations();
    const toRollback = applied.slice(-steps);
    const rolledBack: string[] = [];

    for (const migration of toRollback) {
      this.db
        .prepare("DELETE FROM __migrations WHERE id = ?")
        .run(migration.id);
      rolledBack.push(migration.filename);
      console.log(`⏪ Rolled back: ${migration.filename}`);
    }

    return rolledBack;
  }

  status(): {
    currentVersion: number;
    pendingCount: number;
    appliedCount: number;
  } {
    const applied = this.getAppliedMigrations();
    const pending = this.getPendingMigrations();

    return {
      currentVersion: applied.length,
      pendingCount: pending.length,
      appliedCount: applied.length,
    };
  }

  close() {
    this.db.close();
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./data.db";
  const manager = new MigrationManager(dbPath);
  const command = process.argv[2];

  switch (command) {
    case "status": {
      const status = manager.status();
      console.log(`Current version: ${status.currentVersion}`);
      console.log(`Pending migrations: ${status.pendingCount}`);
      console.log(`Applied migrations: ${status.appliedCount}`);
      break;
    }
    case "migrate": {
      const result = manager.migrate();
      if (result.applied.length === 0) {
        console.log("No pending migrations");
      } else {
        console.log(`Applied ${result.applied.length} migration(s)`);
        console.log(`Current version: ${result.currentVersion}`);
      }
      break;
    }
    case "rollback": {
      const steps = parseInt(process.argv[3]) || 1;
      const rolled = manager.rollback(steps);
      console.log(`Rolled back ${rolled.length} migration(s)`);
      break;
    }
    default:
      console.log("Usage: tsx db/migrate.ts [status|migrate|rollback [steps]]");
  }

  manager.close();
}
