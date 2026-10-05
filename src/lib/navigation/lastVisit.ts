export const LAST_VISIT_KEY = "raqeem:last-visit";

export type LastVisit = { parentId: number; href: string; area: "student" | "parent" };

export function classifyLastVisit(href: string): Omit<LastVisit, "parentId"> | null {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return null;
  const url = new URL(href, "https://raqeem.invalid");
  const path = url.pathname;
  const student = /^\/(home|subjects|store|headquarters|settings|streak|career-selection)$/.test(path) ||
    /^\/subjects\/[1-9]\d*\/units$/.test(path) ||
    /^\/units\/[1-9]\d*\/(lessons|path|review)$/.test(path) ||
    /^\/lessons\/[1-9]\d*\/play$/.test(path);
  const parent = /^\/(children|add-child)$/.test(path) || /^\/family\/(settings|reports|exhibition|help)$/.test(path);
  if (!student && !parent) return null;
  if (student && !/^[1-9]\d*$/.test(url.searchParams.get("childId") ?? "")) return null;
  const query = new URLSearchParams();
  for (const key of ["childId", "studentId", "subjectId", "unitId"]) {
    const value = url.searchParams.get(key);
    if (value && /^[1-9]\d*$/.test(value)) query.set(key, value);
  }
  return { href: path + (query.size ? `?${query}` : ""), area: student ? "student" : "parent" };
}

export function readLastVisit(parentId: number): LastVisit | null {
  try {
    const stored = JSON.parse(localStorage.getItem(LAST_VISIT_KEY) ?? "null");
    if (stored?.parentId !== parentId || typeof stored.href !== "string") return null;
    const visit = classifyLastVisit(stored.href);
    return visit ? { parentId, ...visit } : null;
  } catch {
    return null;
  }
}

export function saveLastVisit(parentId: number, href: string) {
  const visit = classifyLastVisit(href);
  if (!visit) return;
  try {
    localStorage.setItem(LAST_VISIT_KEY, JSON.stringify({ parentId, ...visit }));
  } catch { /* The platform still works when device storage is unavailable. */ }
}

export function clearLastVisit() {
  try { localStorage.removeItem(LAST_VISIT_KEY); } catch { /* Storage unavailable. */ }
}
