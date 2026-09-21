import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelPost } from "@/lib/server/parentLaravel";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";


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

  if (isMockAuthEnabled()) {
    // Mirror seeder prices for local prototype demos (authoritative in real API is StoreItem.price_points)
    const mockPrices: Record<number, { slot_key: string; price_paid: number }> = {
      1: { slot_key: "stethoscope", price_paid: 40 },
      6: { slot_key: "heartbeat_rug", price_paid: 6 },
    };
    const matched = mockPrices[storeItemId] ?? { slot_key: "stethoscope", price_paid: 40 };
    return NextResponse.json(
      {
        id: storeItemId,
        store_item_id: storeItemId,
        slot_key: matched.slot_key,
        price_paid: matched.price_paid,
        points_balance: Math.max(0, 80 - matched.price_paid),
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
