import "dotenv/config";
import path from "path";
import os from "os";
import fs from "fs";

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

export const env = {
  appId: process.env.APP_ID || "tipai-desktop",
  appSecret: process.env.APP_SECRET || "tipai-desktop-secret",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: getDatabaseUrl(),

  // AI Model API Keys (all optional — user configures after launch)
  kimiApiKey: process.env.KIMI_API_KEY || "",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};
