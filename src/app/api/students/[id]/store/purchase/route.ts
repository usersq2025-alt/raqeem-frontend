import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { storeItemId?: number; store_item_id?: number } | null;
  const storeItemId = Number(body?.storeItemId ?? body?.store_item_id);
  if (!Number.isFinite(storeItemId) || storeItemId <= 0) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }

  if (USE_MOCK) {
    return NextResponse.json(
      {
        id: 1,
        store_item_id: storeItemId,
        slot_key: "stethoscope",
        price_paid: 40,
        points_balance: 0,
      },
      { status: 201 }
    );
  }

  return parentLaravelPost(
    "/store/purchase",
    { student_id: Number(id), store_item_id: storeItemId },
    15_000
  );
}
