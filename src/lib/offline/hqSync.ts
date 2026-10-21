import { db, type HqStateCache } from "./db";
import { enqueue, registerSyncHandler } from "./syncEngine";

const KIND = "hq3d-state";

function outboxId(childId: number): string {
  return `${KIND}:${childId}`;
}

// PUT /hq3d/state is a safe full overwrite server-side (row-locked, receipt-ordered - see
// Hq3dService::saveState), so a plain retry here is enough: no idempotency key needed.
registerSyncHandler(KIND, async (item) => {
  const response = await fetch(`/api/students/${item.childId}/hq3d/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ state: item.payload }),
    keepalive: true,
  });
  if (!response.ok) throw new Error(`HQ state sync failed: HTTP ${response.status}`);
});

export async function cacheHqLoad(
  childId: number,
  data: { pointsBalance: number; prices: Record<string, number>; owned: Record<string, number>; state: Record<string, unknown> | null }
): Promise<void> {
  await db.hqState.put({ childId, ...data, updatedAt: Date.now() });
}

export function getCachedHqLoad(childId: number): Promise<HqStateCache | undefined> {
  return db.hqState.get(childId);
}

/** Writes the layout locally and queues it for sync. Never rejects - the 3D bundle
 * should never see a "save failed" error just because the device is offline. */
export async function saveHqStateOffline(childId: number, state: unknown): Promise<void> {
  const existing = await db.hqState.get(childId);
  await db.hqState.put({
    childId,
    pointsBalance: existing?.pointsBalance ?? 0,
    prices: existing?.prices ?? {},
    owned: existing?.owned ?? {},
    state: state as Record<string, unknown>,
    updatedAt: Date.now(),
  });
  await enqueue(outboxId(childId), KIND, childId, state);
}
