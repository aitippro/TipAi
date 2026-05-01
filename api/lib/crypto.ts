/**
 * API Key Encryption using Node.js crypto (AES-256-GCM)
 * - Uses AES-256-GCM for authenticated encryption
 * - Random IV for each encryption
 * - Secure key derived from API_KEY_SECRET via SHA-256
 *
 * IMPORTANT: API_KEY_SECRET env var MUST be set before any encrypt/decrypt call.
 * When absent, an ephemeral per-process fallback key is used (keys won't persist).
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

let runtimeFallbackKey: Buffer | null = null;
let warnedMissingSecret = false;

function getSecret(): string | undefined {
  return process.env.API_KEY_SECRET;
}

// Derive a 32-byte key from the secret using SHA-256
function getKey(): Buffer {
  const secret = getSecret();
  if (secret) {
    return createHash("sha256").update(secret).digest();
  }

  if (!runtimeFallbackKey) {
    runtimeFallbackKey = randomBytes(32);
  }
  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      "[SECURITY] API_KEY_SECRET environment variable is not set. " +
      "Using a runtime-generated encryption key. " +
      "Set API_KEY_SECRET to persist encrypted keys across app restarts."
    );
  }
  return runtimeFallbackKey;
}

/**
 * Encrypt text using AES-256-GCM
 * Output format: base64(iv + tag + ciphertext)
 */
export function encrypt(text: string): string {
  if (!text) return "";

  try {
    const iv = randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Combine: iv (16) + tag (16) + ciphertext
    const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, "hex")]);
    return combined.toString("base64");
  } catch {
    return "";
  }
}

/**
 * Decrypt text using AES-256-GCM
 * Input format: base64(iv + tag + ciphertext)
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) return "";

  try {
    const combined = Buffer.from(encrypted, "base64");

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    // Decryption failed (wrong key, tampered data, etc.)
    return "";
  }
}
