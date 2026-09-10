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
  if (!canUseStorage("sessionStorage")) return "";
  try {
    return window.sessionStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveRegisterPasswordDraft(password: string): void {
  if (!canUseStorage("sessionStorage")) return;
  try {
    if (!password) {
      window.sessionStorage.removeItem(PASSWORD_KEY);
      return;
    }
    window.sessionStorage.setItem(PASSWORD_KEY, password);
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
