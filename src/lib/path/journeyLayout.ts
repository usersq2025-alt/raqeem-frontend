export type JourneyPoint = { x: number; y: number };

export type JourneyNodeKind = "start" | "lesson" | "review";

export type LabelSide = "left" | "right";

export type JourneyLayoutNode = {
  kind: JourneyNodeKind;
  lessonId: number | null;
  lessonIndex: number | null;
  xPct: number;
  yPx: number;
  labelSide: LabelSide;
};

export type JourneyLayout = {
  canvasHeight: number;
  nodes: JourneyLayoutNode[];
  pathPoints: JourneyPoint[];
  isMobile: boolean;
  verticalStep: number;
};

const DESKTOP_PATTERN = [50, 34, 66, 38, 64, 42];
const MOBILE_PATTERN = [50, 36, 64, 40, 60];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Prefer the side with more horizontal room; never cover the path center. */
export function resolveLabelSide(xPct: number): LabelSide {
  if (xPct >= 54) return "left";
  if (xPct <= 46) return "right";
  // Center: pick the side with more map margin
  return xPct >= 50 ? "left" : "right";
}

export function computeJourneyLayout(lessonCount: number, widthPx: number): JourneyLayout {
  const isMobile = widthPx < 768;
  const count = Math.max(lessonCount, 0);
  const pattern = isMobile ? MOBILE_PATTERN : DESKTOP_PATTERN;

  // Compact paddings — no oversized gate art
  const bottomPadding = isMobile ? 120 : 140;
  const topPadding = isMobile ? 130 : 150;

  const stepMin = isMobile ? 145 : 165;
  const stepMax = isMobile ? 165 : 190;
  // Target a balanced map height (~ viewport-ish for 8–15 lessons)
  const targetSpan = isMobile ? 1500 : 1700;
  const available = Math.max(targetSpan - topPadding - bottomPadding, stepMin);
  const verticalStep =
    count <= 1
      ? stepMax
      : clamp(available / Math.max(count - 1, 1), stepMin, stepMax);

  // start + lessons + review spacing
  const canvasHeight =
    topPadding + bottomPadding + Math.max(count, 1) * verticalStep + verticalStep * 0.85;

  const nodes: JourneyLayoutNode[] = [];

  const startY = canvasHeight - bottomPadding * 0.42;
  nodes.push({
    kind: "start",
    lessonId: null,
    lessonIndex: null,
    xPct: 50,
    yPx: startY,
    labelSide: "right",
  });

  for (let i = 0; i < count; i++) {
    const yPx = canvasHeight - bottomPadding - i * verticalStep;
    const xPct = clampX(pattern[i % pattern.length] ?? 50, isMobile);
    nodes.push({
      kind: "lesson",
      lessonId: null,
      lessonIndex: i,
      xPct,
      yPx,
      labelSide: resolveLabelSide(xPct),
    });
  }

  const lastLessonY =
    count > 0 ? canvasHeight - bottomPadding - (count - 1) * verticalStep : canvasHeight / 2;
  const reviewY = Math.max(72, lastLessonY - verticalStep * 0.95);
  nodes.push({
    kind: "review",
    lessonId: null,
    lessonIndex: null,
    xPct: 50,
    yPx: reviewY,
    labelSide: "right",
  });

  const pathPoints: JourneyPoint[] = nodes.map((node) => ({
    x: node.xPct,
    y: (node.yPx / canvasHeight) * 100,
  }));

  return { canvasHeight, nodes, pathPoints, isMobile, verticalStep };
}

export function bindLessonIds(layout: JourneyLayout, lessonIds: number[]): JourneyLayout {
  let cursor = 0;
  const nodes = layout.nodes.map((node) => {
    if (node.kind !== "lesson") return node;
    const lessonId = lessonIds[cursor] ?? null;
    cursor += 1;
    return { ...node, lessonId };
  });
  return { ...layout, nodes };
}

export function smoothJourneyPath(points: JourneyPoint[]): string {
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

export function completedPathRatio(completedCount: number, lessonCount: number): number {
  if (lessonCount <= 0) return 0;
  const totalSegments = lessonCount + 1;
  const doneSegments = Math.min(completedCount, lessonCount);
  return Math.min(1, (doneSegments + (doneSegments > 0 ? 0.15 : 0)) / Math.max(totalSegments, 1));
}

function clampX(x: number, isMobile: boolean): number {
  const min = isMobile ? 30 : 28;
  const max = isMobile ? 70 : 72;
  return Math.min(max, Math.max(min, x));
}

function fmt(n: number): string {
  return n.toFixed(2);
}
