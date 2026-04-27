import "dotenv/config";
import path from "path";
import os from "os";
import fs from "fs";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredInProduction(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
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
  kimiAuthUrl: requiredInProduction("KIMI_AUTH_URL"),
  kimiOpenUrl: requiredInProduction("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  // Cloud sync (reserved for future)
  cloudSyncUrl: process.env.CLOUD_SYNC_URL || "",
};
