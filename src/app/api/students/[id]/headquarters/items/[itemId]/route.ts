import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MOCK_HEADQUARTERS } from "@/lib/api/mockStudent";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelPatch } from "@/lib/server/parentLaravel";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

type Props = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id, itemId } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid body" }, { status: 422 });
  }

  if (USE_MOCK) {
    const items = Array.isArray(MOCK_HEADQUARTERS.items) ? MOCK_HEADQUARTERS.items : [];
    const existing = items.find((row) => Number((row as { id?: unknown }).id) === Number(itemId));
    const item = {
      id: Number(itemId),
      slot_key: typeof existing?.slot_key === "string" ? existing.slot_key : "stethoscope",
      slot: "table_desk",
      name: typeof existing?.name === "string" ? existing.name : "item",
      image_url: typeof existing?.image_url === "string" ? existing.image_url : null,
      x: Number(body.x) || 50,
      y: Number(body.y) || 50,
      width: Number(body.width ?? existing?.width_pct ?? 12) || 12,
      z_index: Number(body.z_index ?? existing?.z_index ?? 3) || 3,
      x_pct: Number(body.x) || 50,
      y_pct: Number(body.y) || 50,
      width_pct: Number(body.width ?? existing?.width_pct ?? 12) || 12,
    };
    return NextResponse.json({ item });
  }

  return parentLaravelPatch(
    `/students/${id}/headquarters/items/${itemId}`,
    {
      x: body.x,
      y: body.y,
      width: body.width,
      z_index: body.z_index ?? body.zIndex,
    },
    12_000
  );
}
