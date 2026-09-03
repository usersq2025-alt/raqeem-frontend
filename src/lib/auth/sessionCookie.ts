export const SESSION_COOKIE_NAME = "raqeem_session";

export type SessionPayload = {
  token: string;
  parent: {
    id: number;
    public_id?: string;
    email?: string;
    full_name?: string;
  };
};

export function parseSessionCookie(raw: string | undefined): SessionPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SessionPayload;
    if (!data?.token || typeof data.parent?.id !== "number") return null;
    return data;
  } catch {
    return null;
  }
}
