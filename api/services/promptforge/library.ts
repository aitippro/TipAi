import type { SaveLibraryItemInput } from "./schemas";

// ── Native Addon ─────────────────────────────────────────
let native: any = null;
try {
  native = require("../../native");
} catch {
  // Browser fallback
}

export async function savePromptForgeLibraryItem(
  userId: number,
  input: SaveLibraryItemInput,
): Promise<{ id: number; success: true }> {
  if (!native) throw new Error("Native addon not available");
  const item = native.promptCreate({
    userId,
    title: input.title,
    originalIntent: input.originalIntent || "",
    generatedPrompt: input.generatedPrompt || "",
    framework: input.framework || "",
    domain: input.domain || "general",
    model: input.model || "kimi",
    tags: input.tags || "",
    isFavorite: input.isFavorite ? 1 : 0,
  });
  return { id: item.id, success: true };
}

export async function listPromptForgeLibraryItems(userId: number) {
  if (!native) return [];
  return native.promptList(userId);
}

export async function deletePromptForgeLibraryItem(
  userId: number,
  id: number,
): Promise<{ success: true }> {
  if (!native) throw new Error("Native addon not available");
  native.promptDelete(id, userId);
  return { success: true };
}
