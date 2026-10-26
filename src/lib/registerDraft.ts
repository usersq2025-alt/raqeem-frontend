const DRAFT_KEY = "raqeem.register.draft.v1";
const PASSWORD_KEY = "raqeem.register.draft.password";

export type RegisterDraft = {
  fullName: string;
  email: string;
  acceptedTerms: boolean;
};

function canUseStorage(kind: "localStorage" | "sessionStorage"): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window[kind]);
  } catch {
    return false;
  }
}

export function loadRegisterDraft(): RegisterDraft | null {
  if (!canUseStorage("localStorage")) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegisterDraft>;
    return {
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      acceptedTerms: parsed.acceptedTerms === true,
    };
  } catch {
    return null;
  }
}

export function saveRegisterDraft(draft: RegisterDraft): void {
  if (!canUseStorage("localStorage")) return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode / quota */
  }
}

export function loadRegisterPasswordDraft(): string {
  // Discard passwords saved by older versions. Passwords stay in form memory only.
  saveRegisterPasswordDraft("");
  return "";
}

export function saveRegisterPasswordDraft(_password: string): void {
  void _password;
  if (!canUseStorage("sessionStorage")) return;
  try {
    window.sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    /* private mode / quota */
  }
}

export function clearRegisterDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    /* ignore */
  }
}

const PHONE_DRAFT_KEY = "raqeem.register.phoneDraft.v1";
const PHONE_CHALLENGE_KEYS = {
  register: "raqeem.register.phoneChallenge.v1",
  login: "raqeem.login.phoneChallenge.v1",
} as const;

export type ChallengeScope = keyof typeof PHONE_CHALLENGE_KEYS;

export type PhoneRegisterDraft = { fullName: string; phone: string };

export function loadPhoneRegisterDraft(): PhoneRegisterDraft | null {
  if (!canUseStorage("localStorage")) return null;
  try {
    const raw = window.localStorage.getItem(PHONE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PhoneRegisterDraft>;
    return {
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return null;
  }
}

export function savePhoneRegisterDraft(draft: PhoneRegisterDraft): void {
  if (!canUseStorage("localStorage")) return;
  try {
    window.localStorage.setItem(PHONE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode / quota */
  }
}

export function clearPhoneRegisterDraft(): void {
  try {
    window.localStorage.removeItem(PHONE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** The pending registration challenge survives a reload/backgrounded tab so leaving
 * the page after a code was sent doesn't force the parent to start over. The code
 * itself is never stored here -- only its identifier. */
export type PhoneChallengeDraft = { challengeId: string; phone: string; retryAt: number; issuedAt?: number; binding?: boolean };

export function loadPhoneChallenge(scope: ChallengeScope = "register"): PhoneChallengeDraft | null {
  if (!canUseStorage("sessionStorage")) return null;
  try {
    const raw = window.sessionStorage.getItem(PHONE_CHALLENGE_KEYS[scope]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PhoneChallengeDraft>;
    if (typeof parsed.challengeId !== "string" || !parsed.challengeId) return null;
    return {
      challengeId: parsed.challengeId,
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      retryAt: typeof parsed.retryAt === "number" ? parsed.retryAt : 0,
      issuedAt: typeof parsed.issuedAt === "number" ? parsed.issuedAt : undefined,
      binding: parsed.binding === true,
    };
  } catch {
    return null;
  }
}

export function savePhoneChallenge(draft: PhoneChallengeDraft, scope: ChallengeScope = "register"): void {
  if (!canUseStorage("sessionStorage")) return;
  try {
    window.sessionStorage.setItem(PHONE_CHALLENGE_KEYS[scope], JSON.stringify(draft));
  } catch {
    /* private mode / quota */
  }
}

export function clearPhoneChallenge(scope: ChallengeScope = "register"): void {
  try {
    window.sessionStorage.removeItem(PHONE_CHALLENGE_KEYS[scope]);
  } catch {
    /* ignore */
  }
}

const PENDING_LOGIN_KEY = "raqeem.login.pending.v1";

/** What a parent typed before being sent from sign-up to log-in. Kept in session
 * storage, never in the URL, and never includes a password. */
export type PendingLogin = { kind: "email" | "phone"; value: string };

export function savePendingLogin(pending: PendingLogin): void {
  if (!canUseStorage("sessionStorage")) return;
  try {
    window.sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(pending));
  } catch {
    /* private mode / quota */
  }
}

export function consumePendingLogin(): PendingLogin | null {
  if (!canUseStorage("sessionStorage")) return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_LOGIN_KEY);
    window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingLogin>;
    if ((parsed.kind !== "email" && parsed.kind !== "phone") || typeof parsed.value !== "string" || !parsed.value) return null;
    return { kind: parsed.kind, value: parsed.value };
  } catch {
    return null;
  }
}
const AUTH_METHOD_KEY = "raqeem.auth.method.v1";

/** Last way the parent chose to sign up or log in ("password" = email or ID). A convenience only. */
export function loadAuthMethod(): "phone" | "email" | null {
  if (!canUseStorage("localStorage")) return null;
  try {
    const value = window.localStorage.getItem(AUTH_METHOD_KEY);
    return value === "phone" || value === "email" ? value : null;
  } catch {
    return null;
  }
}

export function saveAuthMethod(method: "phone" | "email"): void {
  if (!canUseStorage("localStorage")) return;
  try {
    window.localStorage.setItem(AUTH_METHOD_KEY, method);
  } catch {
    /* private mode / quota */
  }
}