import Dexie, { type EntityTable } from "dexie";

/**
 * A pending write waiting to reach the server. `id` is the coalescing key: for a
 * "whole value overwrite" mutation (like saving the HQ layout), callers pass a stable
 * id (e.g. `hq3d-state:${childId}`) so repeated local edits replace the same row
 * instead of piling up a queue - only the latest local state is kept, matching how the
 * server itself already treats these writes (last one to arrive wins).
 */
export interface OutboxItem {
  id: string;
  kind: string;
  childId: number;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface HqStateCache {
  childId: number;
  pointsBalance: number;
  prices: Record<string, number>;
  owned: Record<string, number>;
  state: Record<string, unknown> | null;
  updatedAt: number;
}

/** Small key/value bookkeeping table - e.g. "which content version is currently
 * precached under this key", so a version bump can be detected and evicted. */
export interface MetaRow {
  key: string;
  value: string;
}

class RaqeemOfflineDB extends Dexie {
  outbox!: EntityTable<OutboxItem, "id">;
  hqState!: EntityTable<HqStateCache, "childId">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("raqeem-offline");
    this.version(1).stores({
      outbox: "id, kind, childId",
      hqState: "childId",
      meta: "key",
    });
  }
}

export const db = new RaqeemOfflineDB();
