import type { ParentUser } from "@/lib/api/auth";

export async function persistSession(token: string, parent: ParentUser): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, parent }),
  });
  if (!response.ok) {
    throw new Error("SESSION");
  }
}
