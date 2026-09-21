"use client";

import { useEffect, type RefObject } from "react";

/** Scroll the page so the current station sits near mid-viewport (no inner scroller). */
export function useScrollToCurrentLesson(
  _scrollerRef: RefObject<HTMLElement | null>,
  targetRef: RefObject<HTMLElement | null>,
  deps: unknown[]
) {
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency list from caller
  }, deps);
}
