import { parentLaravelGet } from "@/lib/server/parentLaravel";

export async function GET() {
  return parentLaravelGet("/parent/exhibition", 10_000);
}
