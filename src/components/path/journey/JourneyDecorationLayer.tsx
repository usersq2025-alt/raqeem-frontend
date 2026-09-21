"use client";

import { useEffect, useMemo, useState } from "react";
import type { LessonPathTheme, JourneyVisualStage } from "@/lib/config/lessonPathThemes";
import { themeBackgroundCandidates } from "@/lib/config/lessonPathThemes";

type Props = {
  theme: LessonPathTheme;
  stage: JourneyVisualStage;
  canvasHeight: number;
  isMobile: boolean;
};

function probeImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * Full-height soft scene. Probes long → mobile → short until one loads.
 * Soft gradient only as fallback — no green seam strips, no CSS hills/clouds, no tile.
 */
export function JourneyDecorationLayer({ theme, stage, canvasHeight, isMobile }: Props) {
  const candidates = useMemo(
    () => themeBackgroundCandidates(theme, { isMobile }),
    [theme, isMobile]
  );
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const candidate of candidates) {
        const ok = await probeImage(candidate);
        if (cancelled) return;
        if (ok) {
          setSrc(candidate);
          return;
        }
      }
      if (!cancelled) setSrc(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [candidates]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
      draggable={false}
      style={{ minHeight: canvasHeight }}
    >
      <div className="absolute inset-0" style={{ background: theme.softGradient }} />

      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          width={theme.backgroundSize?.width ?? 1080}
          height={theme.backgroundSize?.height ?? 1920}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
          style={{ objectPosition: theme.backgroundPosition ?? "center center" }}
          loading="eager"
          decoding="async"
        />
      ) : null}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_50%,rgba(26,43,71,0.03)_100%)]" />

      {stage === "near_completion" || stage === "completed" ? (
        <div
          className="absolute end-[10%] top-[8%] h-16 w-16 rounded-full opacity-15 blur-3xl"
          style={{ background: theme.currentColor }}
        />
      ) : null}
    </div>
  );
}
