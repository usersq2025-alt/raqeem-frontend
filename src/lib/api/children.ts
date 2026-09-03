import { professionCodeFromId } from "@/lib/config/professions";

export type ChildGender = "male" | "female";

export type ChildProfile = {
  id: number;
  fullName: string;
  gradeId: number;
  pointsBalance: number;
  professionId: number | null;
  professionCode: string | null;
  gender: ChildGender;
};

export type CreateChildPayload = {
  fullName: string;
  birthDate: string;
  gradeId: number;
  gender: ChildGender;
};

export type CreateChildResult = {
  id: number;
  fullName: string;
};

export class ChildrenApiError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION" | "NETWORK" | "UNAUTHENTICATED",
    public readonly status = 400
  ) {
    super(message);
    this.name = "ChildrenApiError";
  }
}

function toChildrenError(status: number, message: string): ChildrenApiError {
  if (status === 401) {
    return new ChildrenApiError(message, "UNAUTHENTICATED", 401);
  }
  if (status === 422) {
    return new ChildrenApiError(message, "VALIDATION", 422);
  }
  return new ChildrenApiError(message, "NETWORK", status);
}

function stripSecretIds<T extends Record<string, unknown>>(payload: T): Omit<T, "public_id" | "publicId"> {
  const { public_id: _publicIdSnake, publicId: _publicIdCamel, ...safe } = payload;
  void _publicIdSnake;
  void _publicIdCamel;
  return safe;
}

export async function createChild(payload: CreateChildPayload): Promise<CreateChildResult> {
  let response: Response;
  try {
    response = await fetch("/api/children", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: payload.fullName,
        birthDate: payload.birthDate,
        gradeId: payload.gradeId,
        gender: payload.gender,
      }),
    });
  } catch {
    throw new ChildrenApiError("NETWORK", "NETWORK");
  }

  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const safe = raw && typeof raw === "object" ? stripSecretIds(raw) : null;
  const message =
    safe && typeof safe.message === "string" ? safe.message : "NETWORK";

  if (!response.ok) {
    throw toChildrenError(response.status, message);
  }

  const id = typeof safe?.id === "number" ? safe.id : Number(safe?.id);
  if (!Number.isFinite(id)) {
    throw new ChildrenApiError("NETWORK", "NETWORK");
  }

  return {
    id,
    fullName:
      (typeof safe?.fullName === "string" && safe.fullName) ||
      (typeof safe?.full_name === "string" && safe.full_name) ||
      payload.fullName,
  };
}

export function mapChild(raw: Record<string, unknown>): ChildProfile | null {
  const id = typeof raw.id === "number" ? raw.id : Number(raw.id);
  if (!Number.isFinite(id)) return null;

  const profession =
    raw.profession && typeof raw.profession === "object"
      ? (raw.profession as Record<string, unknown>)
      : null;
  const grade =
    raw.grade && typeof raw.grade === "object" ? (raw.grade as Record<string, unknown>) : null;
  const professionIdRaw = raw.profession_id ?? raw.professionId ?? profession?.id;
  const professionId =
    professionIdRaw === null || professionIdRaw === undefined || professionIdRaw === ""
      ? null
      : Number(professionIdRaw);
  const code =
    (typeof profession?.code === "string" && profession.code) ||
    (typeof raw.profession_code === "string" && raw.profession_code) ||
    (typeof raw.professionCode === "string" && raw.professionCode) ||
    professionCodeFromId(Number.isFinite(professionId) ? professionId : null) ||
    null;

  const genderRaw = String(raw.gender ?? "").toLowerCase();
  const gender: ChildGender = genderRaw === "female" ? "female" : "male";

  return {
    id,
    fullName: String(raw.fullName ?? raw.full_name ?? ""),
    gradeId: Number(raw.grade_id ?? raw.gradeId ?? grade?.id ?? grade?.level ?? 0),
    pointsBalance: Number(raw.points_balance ?? raw.pointsBalance ?? 0) || 0,
    professionId: Number.isFinite(professionId) && professionId !== 0 ? professionId : null,
    professionCode: code,
    gender,
  };
}

export function hasChosenProfession(child: ChildProfile): boolean {
  return child.professionId != null;
}

export async function getChild(id: number): Promise<ChildProfile | null> {
  const list = await getChildren();
  return list.find((child) => child.id === id) ?? null;
}

export async function getChildren(): Promise<ChildProfile[]> {
  let response: Response;
  try {
    response = await fetch("/api/children", { credentials: "include" });
  } catch {
    throw new ChildrenApiError("NETWORK", "NETWORK");
  }

  const raw = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      raw && typeof raw === "object" && "message" in raw
        ? String((raw as { message: unknown }).message)
        : "NETWORK";
    throw toChildrenError(response.status, message);
  }

  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
      ? ((raw as { data: unknown[] }).data)
      : [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map(mapChild)
    .filter((row): row is ChildProfile => row !== null);
}
