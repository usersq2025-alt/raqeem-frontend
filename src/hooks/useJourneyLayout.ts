"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { bindLessonIds, computeJourneyLayout, type JourneyLayout } from "@/lib/path/journeyLayout";

export function useJourneyLayout(
  lessonIds: number[],
  containerRef?: RefObject<HTMLElement | null>
): JourneyLayout {
  const [width, setWidth] = useState(390);

  useEffect(() => {
    let ro: ResizeObserver | null = null;
    let raf = 0;

    const attach = () => {
      const el = containerRef?.current;
      if (el && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width;
          if (w && w > 0) setWidth(w);
        });
        ro.observe(el);
        setWidth(el.clientWidth || window.innerWidth || 390);
        return true;
      }
      return false;
    };

    if (!attach()) {
      // Ref may attach after first paint
      raf = window.requestAnimationFrame(() => {
        if (!attach()) {
          setWidth(window.innerWidth || 390);
        }
      });
    }

    const onResize = () => {
      const el = containerRef?.current;
      if (el?.clientWidth) setWidth(el.clientWidth);
      else setWidth(window.innerWidth || 390);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [containerRef, lessonIds.length]);

  return useMemo(() => {
    const base = computeJourneyLayout(lessonIds.length, width);
    return bindLessonIds(base, lessonIds);
  }, [lessonIds, width]);
}
