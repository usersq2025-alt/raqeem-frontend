import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

type Props = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  return parentLaravelPost(`/attempts/${id}/complete`, {}, 15_000);
}
