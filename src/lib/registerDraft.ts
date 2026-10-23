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
const PHONE_CHALLENGE_KEY = "raqeem.register.phoneChallenge.v1";

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
export type PhoneChallengeDraft = { challengeId: string; phone: string; retryAt: number };

export function loadPhoneChallenge(): PhoneChallengeDraft | null {
  if (!canUseStorage("sessionStorage")) return null;
  try {
    const raw = window.sessionStorage.getItem(PHONE_CHALLENGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PhoneChallengeDraft>;
    if (typeof parsed.challengeId !== "string" || !parsed.challengeId) return null;
    return {
      challengeId: parsed.challengeId,
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      retryAt: typeof parsed.retryAt === "number" ? parsed.retryAt : 0,
    };
  } catch {
    return null;
  }
}

export function savePhoneChallenge(draft: PhoneChallengeDraft): void {
  if (!canUseStorage("sessionStorage")) return;
  try {
    window.sessionStorage.setItem(PHONE_CHALLENGE_KEY, JSON.stringify(draft));
  } catch {
    /* private mode / quota */
  }
}

export function clearPhoneChallenge(): void {
  try {
    window.sessionStorage.removeItem(PHONE_CHALLENGE_KEY);
  } catch {
    /* ignore */
  }
}
