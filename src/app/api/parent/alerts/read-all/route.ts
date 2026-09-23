import { parentLaravelPost } from "@/lib/server/parentLaravel";

export async function POST() {
  return parentLaravelPost("/parent/alerts/read-all", {}, 12_000);
}
