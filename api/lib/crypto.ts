/**
 * API Key Encryption using Native Addon
 * - Rust layer handles AES-256-GCM encryption/decryption
 * - API_KEY_SECRET env var is used by the native addon
 */

import { native } from "./native";

export function encrypt(text: string): string {
  if (!text) return "";
  try {
    return native.encrypt(text, process.env.API_KEY_SECRET || "");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Encryption failed: ${message}`);
  }
}

export function decrypt(encrypted: string): string {
  if (!encrypted) return "";
  try {
    return native.decrypt(encrypted, process.env.API_KEY_SECRET || "");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Decryption failed: ${message}`);
  }
}
