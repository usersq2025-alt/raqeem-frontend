import { db, type OutboxItem } from "./db";

type SyncHandler = (item: OutboxItem) => Promise<void>;

const handlers = new Map<string, SyncHandler>();

/** Each feature (HQ layout, later lesson answers, ...) registers how to actually send its
 * own outbox items to the server. The engine itself stays agnostic of payload shape. */
export function registerSyncHandler(kind: string, handler: SyncHandler): void {
  handlers.set(kind, handler);
}

/** Queues a write and immediately tries to flush it. `id` is the coalescing key
 * (see OutboxItem) - passing the same id again replaces the pending payload. */
export async function enqueue(id: string, kind: string, childId: number, payload: unknown): Promise<void> {
  await db.outbox.put({ id, kind, childId, payload, createdAt: Date.now(), attempts: 0 });
  void drainOutbox();
}

let draining = false;

export async function drainOutbox(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  draining = true;
  try {
    const items = await db.outbox.toArray();
    for (const item of items) {
      const handler = handlers.get(item.kind);
      if (!handler) continue;
      try {
        await handler(item);
        await db.outbox.delete(item.id);
      } catch (error) {
        await db.outbox.update(item.id, {
          attempts: item.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
        });
        // A real connectivity drop mid-drain: stop instead of burning through every
        // remaining item's retry count. A network blip on one item (handler bug, server
        // 4xx, ...) still lets the rest of the queue be attempted.
        if (typeof navigator !== "undefined" && !navigator.onLine) break;
      }
    }
  } finally {
    draining = false;
  }
}

let listenersAttached = false;

/** Call once per app session (e.g. in the student shell). Safe to call repeatedly. */
export function startSyncEngine(): void {
  if (typeof window === "undefined" || listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("online", () => void drainOutbox());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void drainOutbox();
  });
  void drainOutbox();
}
