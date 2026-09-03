"use client";

import { useEffect, useState } from "react";

export function useMountedViewTransitionName(name: string): { viewTransitionName?: string } {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? { viewTransitionName: name } : {};
}
