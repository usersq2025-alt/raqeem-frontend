import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { professionId?: number } | null;
  const professionId = Number(body?.professionId);

  if (!Number.isFinite(professionId)) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ id: Number(id), profession_id: professionId });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/students/${id}/choose-profession`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ profession_id: professionId }),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { message: "NETWORK" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "NETWORK" }, { status: 503 });
  }
}
