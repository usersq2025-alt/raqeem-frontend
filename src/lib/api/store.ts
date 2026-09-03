import { asRows } from "@/lib/api/student";

export type StoreCategory = "equipment" | "furniture";

export type StoreCatalogItem = {
  id: number;
  category: StoreCategory;
  slotKey: string | null;
  name: string | null;
  imageUrl: string | null;
  pricePoints: number | null;
  isHidden: boolean;
  isLocked: boolean;
  canPurchase: boolean;
};

export type StoreCatalog = {
  pointsBalance: number;
  items: StoreCatalogItem[];
};

export type HeadquartersItem = {
  id: number;
  slotKey: string;
  name: string;
  imageUrl: string | null;
  xPct: number;
  yPct: number;
  widthPct: number;
  zIndex: number;
};

export type HeadquartersSceneData = {
  pointsBalance: number;
  professionCode: string | null;
  gender: "male" | "female";
  items: HeadquartersItem[];
};

export type PurchaseResult = {
  id: number;
  storeItemId: number;
  slotKey: string | null;
  pricePaid: number;
  pointsBalance: number;
};

export class StoreApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "StoreApiError";
  }
}

export type ProductCardState = "available" | "insufficient" | "hidden" | "locked";

export function productCardState(item: StoreCatalogItem): ProductCardState {
  if (item.isHidden) return "hidden";
  if (item.isLocked) return "locked";
  if (item.canPurchase) return "available";
  return "insufficient";
}

function withAssetVersion(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/images/") && !url.includes("?")) return `${url}?v=1`;
  return url;
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function mapItem(row: Record<string, unknown>): StoreCatalogItem | null {
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  const category = row.category === "furniture" ? "furniture" : "equipment";
  const isHidden = Boolean(row.is_hidden ?? row.isHidden);
  const priceRaw = row.price_points ?? row.pricePoints;
  const price = Number(priceRaw);
  return {
    id,
    category,
    slotKey: typeof row.slot_key === "string" ? row.slot_key : typeof row.slotKey === "string" ? row.slotKey : null,
    name: isHidden ? null : typeof row.name === "string" ? row.name : null,
    imageUrl: isHidden
      ? null
      : withAssetVersion(
          typeof row.image_url === "string" ? row.image_url : typeof row.imageUrl === "string" ? row.imageUrl : null
        ),
    pricePoints: isHidden || !Number.isFinite(price) ? null : price,
    isHidden,
    isLocked: Boolean(row.is_locked ?? row.isLocked),
    canPurchase: Boolean(row.can_purchase ?? row.canPurchase),
  };
}

function mapHqItem(row: Record<string, unknown>): HeadquartersItem | null {
  const id = Number(row.id);
  const slotKey = typeof row.slot_key === "string" ? row.slot_key : typeof row.slotKey === "string" ? row.slotKey : "";
  if (!Number.isFinite(id) || !slotKey) return null;
  return {
    id,
    slotKey,
    name: typeof row.name === "string" ? row.name : slotKey,
    imageUrl: withAssetVersion(
      typeof row.image_url === "string" ? row.image_url : typeof row.imageUrl === "string" ? row.imageUrl : null
    ),
    xPct: Number(row.x_pct ?? row.xPct ?? 40) || 40,
    yPct: Number(row.y_pct ?? row.yPct ?? 40) || 40,
    widthPct: Number(row.width_pct ?? row.widthPct ?? 14) || 14,
    zIndex: Number(row.z_index ?? row.zIndex ?? 2) || 2,
  };
}

async function storeFetch(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: "include", cache: "no-store", ...init });
  } catch {
    throw new StoreApiError("NETWORK", 503);
  }
  const raw = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      raw && typeof raw === "object" && "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "NETWORK";
    throw new StoreApiError(message, response.status);
  }
  return raw;
}

export function mapStoreCatalog(raw: unknown): StoreCatalog {
  const row = asRecord(raw);
  return {
    pointsBalance: Number(row.points_balance ?? row.pointsBalance ?? 0) || 0,
    items: asRows(row.items ?? raw)
      .map(mapItem)
      .filter((item): item is StoreCatalogItem => item !== null),
  };
}

export function mapHeadquarters(raw: unknown): HeadquartersSceneData {
  const row = asRecord(raw);
  const gender = row.gender === "female" ? "female" : "male";
  return {
    pointsBalance: Number(row.points_balance ?? row.pointsBalance ?? 0) || 0,
    professionCode: typeof row.profession_code === "string" ? row.profession_code : typeof row.professionCode === "string" ? row.professionCode : null,
    gender,
    items: asRows(row.items)
      .map(mapHqItem)
      .filter((item): item is HeadquartersItem => item !== null),
  };
}

export async function getStoreItems(studentId: number): Promise<StoreCatalog> {
  return mapStoreCatalog(await storeFetch(`/api/students/${studentId}/store`));
}

export async function purchaseItem(studentId: number, storeItemId: number): Promise<PurchaseResult> {
  const raw = asRecord(
    await storeFetch(`/api/students/${studentId}/store/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeItemId }),
    })
  );
  return {
    id: Number(raw.id) || 0,
    storeItemId: Number(raw.store_item_id ?? raw.storeItemId) || storeItemId,
    slotKey: typeof raw.slot_key === "string" ? raw.slot_key : typeof raw.slotKey === "string" ? raw.slotKey : null,
    pricePaid: Number(raw.price_paid ?? raw.pricePaid) || 0,
    pointsBalance: Number(raw.points_balance ?? raw.pointsBalance) || 0,
  };
}

export async function getHeadquarters(studentId: number): Promise<HeadquartersSceneData> {
  return mapHeadquarters(await storeFetch(`/api/students/${studentId}/headquarters`));
}
