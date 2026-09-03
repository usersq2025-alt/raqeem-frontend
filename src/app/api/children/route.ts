import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type IncomingBody = {
  fullName?: string;
  full_name?: string;
  birthDate?: string;
  birth_date?: string;
  gradeId?: number;
  grade_id?: number;
  gender?: string;
};

function parentSafeChild(id: number, fullName: string) {
  // RQMS-XXXXXX stays on the server. Never include public_id here.
  return { id, fullName };
}

const MOCK_CHILDREN = [
  {
    id: 11,
    full_name: "أحمد",
    grade_id: 3,
    points_balance: 450,
    gender: "male",
    profession_id: 1,
    profession: { id: 1, code: "doctor", name_ar: "طبيب", name_en: "Doctor" },
  },
  {
    id: 12,
    full_name: "لين",
    grade_id: 2,
    points_balance: 280,
    gender: "female",
    profession_id: 5,
    profession: { id: 5, code: "astronaut", name_ar: "رائد فضاء", name_en: "Astronaut" },
  },
  {
    id: 13,
    full_name: "يوسف",
    grade_id: 1,
    points_balance: 0,
    gender: "male",
    profession_id: null,
    profession: null,
  },
];

function stripPublicId(row: Record<string, unknown>) {
  const { public_id: _a, publicId: _b, ...rest } = row;
  void _a;
  void _b;
  return rest;
}

export async function GET() {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ data: MOCK_CHILDREN });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/students?per_page=50`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      const message =
        payload && typeof payload.message === "string" ? payload.message : "NETWORK";
      return NextResponse.json({ message }, { status: response.status });
    }

    const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    const data = rows
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
      .map(stripPublicId);

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ message: "NETWORK" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const body = (await request.json()) as IncomingBody;
  const fullName = String(body.fullName ?? body.full_name ?? "").trim();
  const birthDate = String(body.birthDate ?? body.birth_date ?? "");
  const gradeId = Number(body.gradeId ?? body.grade_id);
  const gender = body.gender;

  if (!fullName || !birthDate || !Number.isFinite(gradeId) || (gender !== "male" && gender !== "female")) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }

  const laravelPayload = {
    full_name: fullName,
    birth_date: birthDate,
    grade_id: gradeId,
    gender,
  };

  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 520));
    return NextResponse.json(parentSafeChild(Date.now() % 100000, fullName), { status: 201 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(laravelPayload),
      signal: AbortSignal.timeout(10000),
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      const message =
        payload && typeof payload.message === "string" ? payload.message : "NETWORK";
      return NextResponse.json({ message }, { status: response.status });
    }

    const id = typeof payload?.id === "number" ? payload.id : Number(payload?.id);
    const name =
      (typeof payload?.full_name === "string" && payload.full_name) ||
      (typeof payload?.fullName === "string" && payload.fullName) ||
      fullName;

    return NextResponse.json(parentSafeChild(id, name), { status: 201 });
  } catch {
    return NextResponse.json({ message: "NETWORK" }, { status: 503 });
  }
}
