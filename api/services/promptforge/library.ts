import { and, eq } from "drizzle-orm";

import { promptLibrary } from "@db/schema";

import { getDb } from "../../queries/connection";
import type { SaveLibraryItemInput } from "./schemas";

export async function savePromptForgeLibraryItem(
  userId: number,
  input: SaveLibraryItemInput,
): Promise<{ id: number; success: true }> {
  const [item] = await getDb()
    .insert(promptLibrary)
    .values({
      userId,
      ...input,
    })
    .returning();

  return { id: item.id, success: true };
}

export async function listPromptForgeLibraryItems(userId: number) {
  return getDb()
    .select()
    .from(promptLibrary)
    .where(eq(promptLibrary.userId, userId))
    .orderBy(promptLibrary.createdAt);
}

export async function deletePromptForgeLibraryItem(
  userId: number,
  id: number,
): Promise<{ success: true }> {
  await getDb()
    .delete(promptLibrary)
    .where(and(eq(promptLibrary.id, id), eq(promptLibrary.userId, userId)));

  return { success: true };
}
