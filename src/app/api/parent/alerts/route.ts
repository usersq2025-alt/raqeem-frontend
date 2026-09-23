import { parentLaravelGet } from "@/lib/server/parentLaravel";

export async function GET() {
  return parentLaravelGet("/parent/alerts", 12_000);
}
