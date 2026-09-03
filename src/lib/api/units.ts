export type PathStationStatus = "completed" | "available" | "locked";

export type PathStation = {
  lessonId: number;
  title: string;
  sortOrder: number;
  status: PathStationStatus;
  stars: number | null;
  isFinale: boolean;
};

export type UnitPath = {
  unitId: number;
  subjectId: number;
  title: string;
  pathBackgroundUrl: string | null;
  unitIconUrl: string | null;
  accentColor: string;
  stations: PathStation[];
};

export class UnitPathApiError extends Error {
  constructor(
    message: string,
    public readonly code: "NETWORK" | "UNAUTHENTICATED" | "NOT_FOUND",
    public readonly status = 400
  ) {
    super(message);
    this.name = "UnitPathApiError";
  }
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function asRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  }
  return [];
}

export function mapPathStation(row: Record<string, unknown>): PathStation | null {
  const lessonId = Number(row.lesson_id ?? row.lessonId);
  if (!Number.isFinite(lessonId) || lessonId <= 0) return null;
  const statusRaw = String(row.status ?? "locked");
  const status: PathStationStatus =
    statusRaw === "completed" || statusRaw === "available" ? statusRaw : "locked";
  const starsRaw = row.stars;
  const stars = starsRaw == null ? null : Number(starsRaw);
  return {
    lessonId,
    title: String(row.title ?? ""),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0) || 0,
    status,
    stars: stars != null && Number.isFinite(stars) ? Math.max(0, Math.min(3, stars)) : null,
    isFinale: Boolean(row.is_finale ?? row.isFinale),
  };
}

export function mapUnitPath(raw: unknown): UnitPath | null {
  const row = asRecord(raw);
  const unitId = Number(row.unit_id ?? row.unitId ?? row.id);
  if (!Number.isFinite(unitId) || unitId <= 0) return null;
  const accent = String(row.accent_color ?? row.accentColor ?? "").trim();
  const bg = row.path_background_url ?? row.pathBackgroundUrl;
  const icon = row.unit_icon_url ?? row.unitIconUrl;
  return {
    unitId,
    subjectId: Number(row.subject_id ?? row.subjectId ?? 0) || 0,
    title: String(row.title ?? ""),
    pathBackgroundUrl: typeof bg === "string" && bg.trim() ? bg.trim() : null,
    unitIconUrl: typeof icon === "string" && icon.trim() ? icon.trim() : null,
    accentColor: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent) ? accent : "#4CAF7D",
    stations: asRows(row.stations)
      .map(mapPathStation)
      .filter((station): station is PathStation => station !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function getUnitPath(unitId: number, studentId: number): Promise<UnitPath> {
  let response: Response;
  try {
    response = await fetch(`/api/units/${unitId}/path?studentId=${studentId}`, {
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new UnitPathApiError("NETWORK", "NETWORK", 503);
  }
  const raw = await response.json().catch(() => null);
  if (response.status === 401) throw new UnitPathApiError("UNAUTHENTICATED", "UNAUTHENTICATED", 401);
  if (response.status === 404) throw new UnitPathApiError("NOT_FOUND", "NOT_FOUND", 404);
  if (!response.ok) throw new UnitPathApiError("NETWORK", "NETWORK", response.status);
  const mapped = mapUnitPath(raw);
  if (!mapped) throw new UnitPathApiError("NOT_FOUND", "NOT_FOUND", 404);
  return mapped;
}
