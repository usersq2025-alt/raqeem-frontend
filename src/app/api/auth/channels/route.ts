import { NextResponse } from "next/server";

// Availability is public metadata. Read it on the server so browser CORS or
// private-network restrictions cannot silently hide a registration method.
export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  try {
    if (!base) throw new Error("API unavailable");
    const response = await fetch(`${base}/otp-channels`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("API unavailable");
    const channels = await response.json();
    return NextResponse.json({ whatsapp: channels.whatsapp === true, sms: channels.sms === true });
  } catch {
    return NextResponse.json({ whatsapp: false, sms: false }, { status: 503 });
  }
}
