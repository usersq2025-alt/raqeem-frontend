export const SESSION_COOKIE_NAME = "raqeem_session";

// Non-httpOnly, non-sensitive companion flag (no token, no ids) set alongside the real
// session cookie. The offline app shell reads it client-side to tell "logged in but
// offline" apart from "never logged in", without ever exposing the token to JS.
export const SESSION_HINT_COOKIE_NAME = "raqeem_has_session";

export type SessionPayload = {
  token: string;
  parent: {
    id: number;
    public_id?: string;
    email?: string | null;
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
