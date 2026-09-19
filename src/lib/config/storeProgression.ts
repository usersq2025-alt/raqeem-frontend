/**
 * Store sequential path — derived from headquarters stages (single source of truth).
 * Must stay aligned with App\Support\StoreProgression on the backend.
 */

import { getStorePathForProfession } from "@/lib/config/headquartersStages";

export function storePathForProfession(professionCode: string | null | undefined): readonly string[] {
  return getStorePathForProfession(professionCode);
}

export function nextRequiredStoreItem(
  ownedSlotKeys: Iterable<string>,
  path: readonly string[]
): string | null {
  if (path.length === 0) return null;
  const owned = new Set(
    [...ownedSlotKeys].filter((key): key is string => typeof key === "string" && key.length > 0)
  );
  for (const key of path) {
    if (!owned.has(key)) return key;
  }
  return null;
}

export function storePathIndex(path: readonly string[], slotKey: string | null | undefined): number {
  if (!slotKey) return Number.MAX_SAFE_INTEGER;
  const index = path.indexOf(slotKey);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
