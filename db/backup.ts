/**
 * Database Backup & Export Utilities
 * Supports: SQLite file backup, JSON export, SQL dump
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

interface BackupOptions {
  compress?: boolean;
  includeTimestamp?: boolean;
}

interface ExportOptions {
  tables?: string[];
  format?: "json" | "sql";
  includeSchema?: boolean;
}

export class DatabaseBackup {
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath.replace("file:", "");
  }

  /**
   * Create a file-level backup of the SQLite database
   */
  createBackup(
    backupDir: string = "./backups",
    options: BackupOptions = {}
  ): string {
    const { includeTimestamp = true } = options;

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = includeTimestamp
      ? new Date().toISOString().replace(/[:.]/g, "-")
      : "";

    const dbName = path.basename(this.dbPath);
    const backupName = timestamp
      ? `${dbName}.${timestamp}.backup`
      : `${dbName}.backup`;
    const backupPath = path.join(backupDir, backupName);

    // Use SQLite's backup API for consistency
    const source = new Database(this.dbPath);
    const backup = new Database(backupPath);

    source.backup(backup);

    source.close();
    backup.close();

    // Generate checksum
    const hash = createHash("sha256");
    hash.update(fs.readFileSync(backupPath));
    const checksum = hash.digest("hex");

    // Write checksum file
    fs.writeFileSync(`${backupPath}.sha256`, checksum);

    console.log(`✅ Backup created: ${backupPath}`);
    console.log(`   SHA256: ${checksum}`);

    return backupPath;
  }

  /**
   * List all backups in a directory
   */
  listBackups(backupDir: string = "./backups"): Array<{
    file: string;
    size: number;
    createdAt: Date;
    checksum?: string;
  }> {
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    return fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith(".backup") || f.endsWith(".db"))
      .map((file) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const checksumPath = `${filePath}.sha256`;
        const checksum = fs.existsSync(checksumPath)
          ? fs.readFileSync(checksumPath, "utf-8").trim()
          : undefined;

        return {
          file,
          size: stats.size,
          createdAt: stats.birthtime,
          checksum,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Verify backup integrity using checksum
   */
  verifyBackup(backupPath: string): boolean {
    const checksumPath = `${backupPath}.sha256`;

    if (!fs.existsSync(checksumPath)) {
      console.warn("No checksum file found, skipping verification");
      return true;
    }

    const expectedChecksum = fs.readFileSync(checksumPath, "utf-8").trim();
    const hash = createHash("sha256");
    hash.update(fs.readFileSync(backupPath));
    const actualChecksum = hash.digest("hex");

    const valid = expectedChecksum === actualChecksum;
    console.log(valid ? "✅ Backup verified" : "❌ Backup corrupted!");

    return valid;
  }

  /**
   * Export database to JSON format
   */
  exportToJSON(options: ExportOptions = {}): Record<string, unknown[]> {
    const db = new Database(this.dbPath);
    const { tables, includeSchema = true } = options;

    // Get all table names if not specified
    const targetTables =
      tables ||
      (
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__%';"
          )
          .all() as Array<{ name: string }>
      ).map((t) => t.name);

    const result: Record<string, unknown[]> = {};

    if (includeSchema) {
      result.__schema = db
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__%';"
        )
        .all() as unknown[];
    }

    for (const table of targetTables) {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all();
      result[table] = rows as unknown[];
    }

    db.close();
    return result;
  }

  /**
   * Export database to SQL dump format
   */
  exportToSQL(): string {
    const db = new Database(this.dbPath);
    const tables = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__%';"
        )
        .all() as Array<{ name: string }>
    ).map((t) => t.name);

    let sql = "-- TipAi Database Export\n";
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;
    sql += "PRAGMA foreign_keys = OFF;\n\n";

    // Schema
    for (const table of tables) {
      const schema = db
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?;"
        )
        .get(table) as { sql: string };

      if (schema?.sql) {
        sql += `-- Table: ${table}\n`;
        sql += `DROP TABLE IF EXISTS "${table}";\n`;
        sql += `${schema.sql};\n\n`;
      }
    }

    // Data
    for (const table of tables) {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all() as Array<
        Record<string, unknown>
      >;

      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => "?").join(", ");

      sql += `-- Data for ${table}\n`;
      const _insertStmt = db.prepare(
        `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`
      );

      for (const row of rows) {
        const values = columns.map((col) => {
          const val = row[col];
          if (val === null) return "NULL";
          if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === "boolean") return val ? 1 : 0;
          return String(val);
        });

        sql += `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});\n`;
      }

      sql += "\n";
    }

    sql += "PRAGMA foreign_keys = ON;\n";

    db.close();
    return sql;
  }

  /**
   * Save export to file
   */
  saveExport(
    exportDir: string = "./exports",
    options: ExportOptions = {}
  ): string {
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const format = options.format || "json";

    if (format === "sql") {
      const sql = this.exportToSQL();
      const filePath = path.join(exportDir, `tipai-export-${timestamp}.sql`);
      fs.writeFileSync(filePath, sql);
      console.log(`✅ SQL export saved: ${filePath}`);
      return filePath;
    } else {
      const json = this.exportToJSON(options);
      const filePath = path.join(exportDir, `tipai-export-${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
      console.log(`✅ JSON export saved: ${filePath}`);
      return filePath;
    }
  }

  /**
   * Import from JSON backup
   */
  importFromJSON(
    jsonData: Record<string, unknown[]>,
    clearExisting: boolean = false
  ): void {
    const db = new Database(this.dbPath);

    try {
      db.exec("PRAGMA foreign_keys = OFF;");
      db.exec("BEGIN TRANSACTION;");

      for (const [table, rows] of Object.entries(jsonData)) {
        if (table.startsWith("__")) continue;
        if (!Array.isArray(rows) || rows.length === 0) continue;

        if (clearExisting) {
          db.exec(`DELETE FROM "${table}";`);
        }

        const columns = Object.keys(rows[0] as Record<string, unknown>);
        const placeholders = columns.map(() => "?").join(", ");

        const stmt = db.prepare(
          `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`
        );

        for (const row of rows) {
          const values = columns.map((col) => {
            const val = (row as Record<string, unknown>)[col];
            if (val === null || val === undefined) return null;
            return val;
          });
          stmt.run(values);
        }
      }

      db.exec("COMMIT;");
      console.log("✅ Import completed successfully");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
      db.close();
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./data.db";
  const backup = new DatabaseBackup(dbPath);
  const command = process.argv[2];

  switch (command) {
    case "backup": {
      backup.createBackup();
      break;
    }
    case "list": {
      const backups = backup.listBackups();
      console.log(`Found ${backups.length} backup(s):`);
      backups.forEach((b) => {
        console.log(`  ${b.file} (${b.size} bytes)`);
      });
      break;
    }
    case "export-json": {
      backup.saveExport("./exports", { format: "json" });
      break;
    }
    case "export-sql": {
      backup.saveExport("./exports", { format: "sql" });
      break;
    }
    case "verify": {
      const filePath = process.argv[3];
      if (!filePath) {
        console.error("Usage: tsx db/backup.ts verify <backup-file>");
        process.exit(1);
      }
      backup.verifyBackup(filePath);
      break;
    }
    default: {
      console.log("Usage: tsx db/backup.ts [backup|list|export-json|export-sql|verify <file>]");
    }
  }
}
