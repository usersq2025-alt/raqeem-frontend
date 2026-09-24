import { readDisplayJson } from "@/lib/format/displayNumerals";
import { asRows } from "@/lib/api/student";

export type StoreCategory = "equipment" | "furniture";

export type StoreCatalogItem = {
  id: number;
  category: StoreCategory;
  slotKey: string | null;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  pricePoints: number | null;
  isHidden: boolean;
  isLocked: boolean;
  isOwned: boolean;
  canPurchase: boolean;
};

export type StoreCatalog = {
  pointsBalance: number;
  items: StoreCatalogItem[];
};

export type HeadquartersItem = {
  id: number;
  slotKey: string;
  slot: string;
  name: string;
  imageUrl: string | null;
  x: number;
  y: number;
  width: number;
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

export type ProductCardState = "available" | "insufficient" | "hidden" | "locked" | "owned";

export function productCardState(item: StoreCatalogItem): ProductCardState {
  if (item.isHidden) return "hidden";
  if (item.isOwned) return "owned";
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
    description: isHidden ? null : typeof row.description === "string" ? row.description : null,
    imageUrl: isHidden
      ? null
      : withAssetVersion(
          typeof row.image_url === "string" ? row.image_url : typeof row.imageUrl === "string" ? row.imageUrl : null
        ),
    pricePoints: isHidden || !Number.isFinite(price) ? null : price,
    isHidden,
    isLocked: Boolean(row.is_locked ?? row.isLocked),
    isOwned: Boolean(row.is_owned ?? row.isOwned),
    canPurchase: Boolean(row.can_purchase ?? row.canPurchase),
  };
}

function mapHqItem(row: Record<string, unknown>): HeadquartersItem | null {
  const id = Number(row.id);
  const slotKey = typeof row.slot_key === "string" ? row.slot_key : typeof row.slotKey === "string" ? row.slotKey : "";
  if (!Number.isFinite(id) || !slotKey) return null;
  const x = Number(row.x ?? row.x_pct ?? row.xPct ?? 50) || 50;
  const y = Number(row.y ?? row.y_pct ?? row.yPct ?? 50) || 50;
  const width = Number(row.width ?? row.width_pct ?? row.widthPct ?? 12) || 12;
  return {
    id,
    slotKey,
    slot: typeof row.slot === "string" ? row.slot : "table_desk",
    name: typeof row.name === "string" ? row.name : slotKey,
    imageUrl: withAssetVersion(
      typeof row.image_url === "string" ? row.image_url : typeof row.imageUrl === "string" ? row.imageUrl : null
    ),
    x,
    y,
    width,
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
  const raw = await readDisplayJson(response);
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

export async function updateHeadquartersItemPosition(
  studentId: number,
  itemId: number,
  position: { x: number; y: number; width?: number; zIndex?: number }
): Promise<HeadquartersItem> {
  const raw = asRecord(
    await storeFetch(`/api/students/${studentId}/headquarters/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x: position.x,
        y: position.y,
        width: position.width,
        z_index: position.zIndex,
      }),
    })
  );
  const itemRaw = asRecord(raw.item ?? raw);
  const mapped = mapHqItem(itemRaw);
  if (!mapped) throw new StoreApiError("INVALID_ITEM", 422);
  return mapped;
}
