"use client";

import { useEffect, useState } from "react";

/**
 * Animate a 0–100 fill without a synchronous setState in an effect body
 * (react-hooks/set-state-in-effect). All updates go through rAF.
 */
export function useAnimatedFill(percentage: number): number {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFill(percentage);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [percentage]);

  return fill;
}
