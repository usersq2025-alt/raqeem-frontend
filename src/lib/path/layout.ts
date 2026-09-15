export type PathPoint = { x: number; y: number };

/** Percentages inside the scrollable path stage (0–100). */
const TOP = 10;
const BOTTOM = 92;
/** Stronger zigzag so nodes clearly alternate left/right. */
const AMPLITUDE = 18;

export function pathPointAt(t: number): PathPoint {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    x: 50 + AMPLITUDE * Math.sin(clamped * Math.PI * 2.15),
    y: BOTTOM - clamped * (BOTTOM - TOP),
  };
}

export function stationPoints(count: number): PathPoint[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 50, y: (TOP + BOTTOM) / 2 }];
  return Array.from({ length: count }, (_, i) => pathPointAt(i / (count - 1)));
}

export function curveSamples(steps = 64): PathPoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => pathPointAt(i / steps));
}

export function smoothPath(points: PathPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
}

/** Pixel height of the path stage so nodes stay spacious while scrolling. */
export function pathStageHeightPx(lessonCount: number): number {
  const n = Math.max(lessonCount, 1);
  return Math.max(720, n * 148 + 220);
}

export function mixHex(hex: string, toward: string, amount: number): string {
  const a = parseHex(hex);
  const b = parseHex(toward);
  if (!a || !b) return hex;
  const t = Math.min(1, Math.max(0, amount));
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `#${[mix(0), mix(1), mix(2)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[\da-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function fmt(n: number): string {
  return n.toFixed(2);
}
