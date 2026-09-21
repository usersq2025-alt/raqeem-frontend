import { parentLaravelGet } from "@/lib/server/parentLaravel";

export async function GET() {
  return parentLaravelGet("/parent/guardian-mode", 8_000);
}
