import { parentLaravelPatch } from "@/lib/server/parentLaravel";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  return parentLaravelPatch("/parent/alerts/preferences", body, 12_000);
}
