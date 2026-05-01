import "dotenv/config";
import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";

// Desktop app: use SQLite in user data directory
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const userDataPath = process.env.USER_DATA_PATH ||
    (process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Roaming", "TipAi")
      : path.join(os.homedir(), ".config", "TipAi"));

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  return `file:${path.join(userDataPath, "data.db")}`;
}

/**
 * Generate a machine-specific deterministic secret.
 * Avoids hard-coding a weak default that is identical across all installations.
 */
function getMachineSecret(): string {
  if (process.env.APP_SECRET) return process.env.APP_SECRET;

  // Persist a random secret in user data dir so it survives restarts
  const userDataPath = process.env.USER_DATA_PATH ||
    (process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Roaming", "TipAi")
      : path.join(os.homedir(), ".config", "TipAi"));

  const secretFile = path.join(userDataPath, ".app-secret");
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, "utf-8").trim();
  }

  // Generate a new cryptographically secure random secret
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(secretFile, secret, { mode: 0o600 }); // user-read/write only
  return secret;
}

export const env = {
  appId: process.env.APP_ID || "tipai-desktop",
  appSecret: getMachineSecret(),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: getDatabaseUrl(),

  // AI Model API Keys (all optional — user configures after launch)
  kimiApiKey: process.env.KIMI_API_KEY || "",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};
