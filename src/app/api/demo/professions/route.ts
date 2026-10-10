import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/public-demo/professions`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { message: "NETWORK" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "NETWORK" }, { status: 503 });
  }
}
