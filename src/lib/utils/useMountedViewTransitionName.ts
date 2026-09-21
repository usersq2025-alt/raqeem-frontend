"use client";

import { useSyncExternalStore } from "react";

export function useMountedViewTransitionName(name: string): { viewTransitionName?: string } {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  return mounted ? { viewTransitionName: name } : {};
}
