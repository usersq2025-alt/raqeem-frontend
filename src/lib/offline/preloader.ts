import { getSubjects, getUnits } from "@/lib/api/student";
import { getUnitPath } from "@/lib/api/units";
import { HQ3D_ASSET_VERSION, HQ3D_BUNDLE, hq3dBase, type Hq3dProfession } from "@/lib/config/hq3d";
import { db } from "./db";
import { isDataSaverEnabled } from "./dataSaverPref";

const STATIC_PAGE_PATHS = ["/terms", "/privacy", "/contact", "/features"] as const;

type Hq3dCatalog = {
  room?: { glb?: string; thumb?: string | null };
  tools?: { glb?: string; thumb?: string | null }[];
};

function idle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback;
    if (typeof ric === "function") ric(() => resolve(), { timeout: 2000 });
    else setTimeout(resolve, 150);
  });
}

function isDataSaverActive(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  // The OS/browser signal (Android Chrome) and the explicit in-app toggle (the only
  // option on iOS Safari, which never exposes navigator.connection) both count.
  return Boolean(connection?.saveData) || isDataSaverEnabled();
}

/** Whether background preloading may proceed right now. Checked before every step, not
 * just once, so a connection drop or data-saver toggle mid-run stops it promptly. */
function canPreloadNow(respectDataSaver: boolean): boolean {
  if (typeof navigator === "undefined" || !navigator.onLine) return false;
  if (respectDataSaver && isDataSaverActive()) return false;
  return true;
}

async function fetchAndForget(url: string): Promise<void> {
  try {
    await fetch(url, { credentials: "include" });
  } catch {
    // Best effort - a later preload pass (or the SW's own runtime caching once the
    // page is visited normally) will pick it back up.
  }
}

// Bump when this function's own fetch/walk logic changes, to invalidate every child's
// recorded freshness below regardless of how recently they were preloaded.
const SUBJECT_TREE_PRELOAD_VERSION = "1";
// The subjects/units/path endpoints carry no server-exposed content version today, so a
// time-based refresh is the practical staleness signal - this is what actually keeps a
// re-opened app from re-fetching the whole tree on every single session.
const SUBJECT_TREE_TTL_MS = 6 * 60 * 60 * 1000;

function subjectTreeMetaKey(childId: number): string {
  return `subject-tree:${childId}`;
}

async function isSubjectTreeFresh(childId: number): Promise<boolean> {
  const row = await db.meta.get(subjectTreeMetaKey(childId));
  if (!row) return false;
  const [version, fetchedAtRaw] = row.value.split(":");
  if (version !== SUBJECT_TREE_PRELOAD_VERSION) return false;
  const fetchedAt = Number(fetchedAtRaw);
  return Number.isFinite(fetchedAt) && Date.now() - fetchedAt < SUBJECT_TREE_TTL_MS;
}

async function recordSubjectTreePreload(childId: number): Promise<void> {
  await db.meta.put({ key: subjectTreeMetaKey(childId), value: `${SUBJECT_TREE_PRELOAD_VERSION}:${Date.now()}` });
}

async function preloadSubjectTree(childId: number, respectDataSaver: boolean): Promise<void> {
  if (!canPreloadNow(respectDataSaver)) return;
  // `respectDataSaver: false` only ever comes from the explicit Settings "download all
  // now" action - that also means "yes, go fetch fresh data now" regardless of the TTL.
  if (respectDataSaver && (await isSubjectTreeFresh(childId))) return;

  const subjects = await getSubjects(childId).catch(() => []);
  for (const subject of subjects) {
    if (!canPreloadNow(respectDataSaver)) return;
    const units = await getUnits(subject.subjectId, childId).catch(() => []);
    await idle();
    for (const unit of units) {
      if (!canPreloadNow(respectDataSaver)) return;
      await getUnitPath(unit.unitId, childId).catch(() => undefined);
      await idle();
    }
  }
  // Only reached once the whole tree walk ran to completion (every early `return` above
  // skips this), so a connectivity drop or data-saver toggle mid-walk never gets
  // recorded as "fresh" - the next preload pass will retry the full walk.
  await recordSubjectTreePreload(childId);
}

async function preloadStaticPages(respectDataSaver: boolean): Promise<void> {
  for (const path of STATIC_PAGE_PATHS) {
    if (!canPreloadNow(respectDataSaver)) return;
    for (const locale of ["ar", "en"]) {
      await fetchAndForget(`/${locale}${path}`);
    }
    await idle();
  }
}

function hqAssetVersionKey(profession: Hq3dProfession): string {
  return `hq3d-assets:${profession}`;
}

async function evictOtherProfessions(keep: Hq3dProfession): Promise<void> {
  if (typeof caches === "undefined") return;
  const cache = await caches.open("hq-lab-assets").catch(() => undefined);
  if (!cache) return;
  const keepBase = hq3dBase(keep);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((request) => {
        const pathname = new URL(request.url).pathname;
        return pathname.startsWith("/hq-lab/") && !pathname.startsWith(keepBase) && pathname !== HQ3D_BUNDLE;
      })
      .map((request) => cache.delete(request))
  );
}

/** Downloads the HQ 3D bundle's room + tool assets for one profession so the child can
 * browse/arrange the headquarters offline. Heaviest step, so callers run it last. Evicts
 * any other cached profession (a child only has one active profession at a time) and
 * re-downloads when HQ3D_ASSET_VERSION has changed since the last successful run. */
export async function preloadHqAssets(profession: Hq3dProfession, respectDataSaver: boolean): Promise<void> {
  if (!canPreloadNow(respectDataSaver)) return;
  const versionKey = hqAssetVersionKey(profession);
  const recorded = await db.meta.get(versionKey);
  if (recorded?.value === HQ3D_ASSET_VERSION) return;

  await evictOtherProfessions(profession);

  const base = hq3dBase(profession);
  const catalogUrl = `${base}catalog.json`;
  const catalog = (await fetch(catalogUrl, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as Hq3dCatalog | null;
  if (!catalog) return;

  const origin = typeof location !== "undefined" ? location.origin : "http://localhost";
  const resolve = (relative: string) => new URL(relative, new URL(base, origin)).pathname;

  const urls = new Set<string>([HQ3D_BUNDLE, `${base}hq3d.css`, catalogUrl]);
  if (catalog.room?.glb) urls.add(resolve(catalog.room.glb));
  if (catalog.room?.thumb) urls.add(resolve(catalog.room.thumb));
  for (const tool of catalog.tools ?? []) {
    if (tool.glb) urls.add(resolve(tool.glb));
    if (tool.thumb) urls.add(resolve(tool.thumb));
  }

  for (const url of urls) {
    if (!canPreloadNow(respectDataSaver)) return;
    await fetchAndForget(url);
    await idle();
  }

  await db.meta.put({ key: versionKey, value: HQ3D_ASSET_VERSION });
}

/**
 * Orchestrates background preloading for the active child: the subject/unit/path tree
 * and static pages first (small, high value for offline browsing), the HQ 3D bundle for
 * their current profession last (heaviest). Lesson content itself (for actually solving
 * exercises offline) isn't preloaded yet - that needs a dedicated server bundle endpoint
 * that doesn't exist yet (see the offline-sync plan's Phase 2); wiring it in here later
 * is a single additional step.
 *
 * `respectDataSaver: true` is the default idle-time behavior; the Settings "download
 * everything now" action passes `false` to override it after the user confirms.
 */
export async function runBackgroundPreload(
  childId: number,
  profession: Hq3dProfession | null,
  respectDataSaver = true
): Promise<void> {
  // Temporarily disabled (offline feature paused): no background preloading or cache
  // priming. Signature kept so callers need no changes when this is turned back on.
  void childId;
  void profession;
  void respectDataSaver;
}
