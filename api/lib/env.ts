import "dotenv/config";
import path from "path";
import os from "os";
import fs from "fs";

export function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Desktop app: use SQLite in user data directory
// Web app: use DATABASE_URL from env
function getDatabaseUrl(): string {
  // If explicitly set, use it (web mode or custom path)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Desktop mode: store in user data directory
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
  kimiAuthUrl: process.env.KIMI_AUTH_URL || "", // Optional: only needed for Kimi OAuth login
  kimiOpenUrl: process.env.KIMI_OPEN_URL || "https://api.moonshot.cn",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  // Cloud sync (reserved for future)
  cloudSyncUrl: process.env.CLOUD_SYNC_URL || "",

  // AI-1: 多模型 API Key 配置（可选，非必填）
  // Kimi
  kimiApiKey: process.env.KIMI_API_KEY || "",
  kimiModel: process.env.KIMI_MODEL || "moonshot-v1-8k",

  // DeepSeek
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",

  // Gemini (Google)
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
};
