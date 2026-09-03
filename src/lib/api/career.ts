import type { ChildGender } from "@/lib/api/children";

export const CUSTOM_CAREER_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_CUSTOM_CAREER === "true";

export const CUSTOM_CAREER_MAX_ATTEMPTS = 3;

export type ModerationResult = {
  approved: boolean;
  reason?: string;
};

export type GenerateAvatarResult = {
  avatar_url: string;
  cached?: boolean;
  fallback?: boolean;
};

export async function moderateCareerText(text: string): Promise<ModerationResult> {
  const response = await fetch("/api/career/moderate-text", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json().catch(() => null)) as ModerationResult | null;
  if (!response.ok || !payload) {
    return { approved: false, reason: "unavailable" };
  }
  return payload;
}

export async function generateCareerAvatar(
  text: string,
  gender: ChildGender = "male"
): Promise<GenerateAvatarResult> {
  const response = await fetch("/api/career/generate-avatar", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, gender }),
    signal: AbortSignal.timeout(95_000),
  });
  const payload = (await response.json().catch(() => null)) as GenerateAvatarResult | null;
  if (!response.ok || !payload?.avatar_url) {
    throw new Error("GENERATE_FAILED");
  }
  return payload;
}

export async function chooseProfession(childId: number, professionId: number): Promise<void> {
  const response = await fetch(`/api/students/${childId}/choose-profession`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ professionId }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok && response.status !== 422) {
    throw new Error("CHOOSE_FAILED");
  }
}
