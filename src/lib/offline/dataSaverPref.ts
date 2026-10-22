const STORAGE_KEY = "raqeem:data-saver";

/**
 * An explicit in-app override, independent of navigator.connection.saveData (which
 * iOS Safari never exposes at all, so it's the only way to respect "save my data" on
 * iPhone/iPad). The background preloader treats either signal as "don't preload now".
 */
export function isDataSaverEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDataSaverEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
