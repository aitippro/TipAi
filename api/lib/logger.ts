/**
 * Server-side persistent logger — writes to log file with rotation
 */
import fs from "node:fs";
import path from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
  stack?: string;
  detail?: unknown;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const LOG_DIR = path.join(
  process.env.USER_DATA_PATH || process.cwd(),
  "logs",
);

let logFile: string | null = null;

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFile(): string {
  if (logFile) return logFile;
  ensureDir();
  const date = new Date().toISOString().slice(0, 10);
  logFile = path.join(LOG_DIR, `tipai-${date}.log`);
  return logFile;
}

function rotateIfNeeded(filePath: string) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < MAX_FILE_SIZE) return;
    const bak = filePath.replace(/\.log$/, `-${Date.now()}.log`);
    fs.renameSync(filePath, bak);
  } catch {
    // file may not exist yet
  }
}

function formatEntry(entry: LogEntry): string {
  let line = `[${entry.ts}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}`;
  if (entry.stack) {
    line += `\n  stack: ${entry.stack}`;
  }
  if (entry.detail !== undefined) {
    try {
      line += `\n  detail: ${JSON.stringify(entry.detail, null, 2)}`;
    } catch {
      line += `\n  detail: ${String(entry.detail)}`;
    }
  }
  return line + "\n";
}

function writeLog(entry: LogEntry) {
  try {
    const fp = getLogFile();
    rotateIfNeeded(fp);
    fs.appendFileSync(fp, formatEntry(entry), "utf-8");
  } catch {
    // fallback to stderr
    console.error("[logger] write failed:", entry.message);
  }
}

export const serverLogger = {
  debug(source: string, message: string, detail?: unknown) {
    writeLog({ ts: new Date().toISOString(), level: "debug", source, message, detail });
  },
  info(source: string, message: string, detail?: unknown) {
    writeLog({ ts: new Date().toISOString(), level: "info", source, message, detail });
  },
  warn(source: string, message: string, detail?: unknown) {
    writeLog({ ts: new Date().toISOString(), level: "warn", source, message, detail });
    console.warn(`[${source}]`, message);
  },
  error(source: string, message: string, detail?: unknown) {
    const stack = detail instanceof Error ? detail.stack : undefined;
    writeLog({ ts: new Date().toISOString(), level: "error", source, message, stack, detail });
    console.error(`[${source}]`, message, detail ?? "");
  },
  fatal(source: string, message: string, err?: unknown) {
    const stack = err instanceof Error ? err.stack : undefined;
    writeLog({ ts: new Date().toISOString(), level: "fatal", source, message, stack, detail: err });
    console.error(`[FATAL] [${source}]`, message, err ?? "");
  },
  /** Get today's log file path */
  getLogPath(): string {
    return getLogFile();
  },
  /** Read recent log entries */
  readRecent(count = 100): string[] {
    try {
      const fp = getLogFile();
      if (!fs.existsSync(fp)) return [];
      const content = fs.readFileSync(fp, "utf-8");
      const lines = content.trim().split("\n");
      return lines.slice(-count);
    } catch {
      return [];
    }
  },
};
