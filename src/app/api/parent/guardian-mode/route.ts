import { parentLaravelGet } from "@/lib/server/parentLaravel";

export async function GET() {
  return parentLaravelGet("/api/parent/guardian-mode", 8_000);
}
