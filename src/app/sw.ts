/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Bump this when editing src/app/offline/page.tsx so the fallback is re-precached.
const OFFLINE_FALLBACK_REVISION = "v1";

const serwist = new Serwist({
  precacheEntries: [...(self.__SW_MANIFEST ?? []), { url: "/offline", revision: OFFLINE_FALLBACK_REVISION }],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // The HQ 3D bundle (public/hq-lab) is tens of MB and deliberately versioned per child
    // and profession (see src/lib/offline/preloader.ts). It must never be swept by a
    // generic LRU image/asset cache - only our own code evicts it, on profession change
    // or a content-version bump, so a child mid-play never loses it to unrelated traffic.
    {
      matcher: ({ url }) => url.pathname.startsWith("/hq-lab/"),
      handler: new CacheFirst({ cacheName: "hq-lab-assets" }),
    },
    // defaultCache already forces /api/auth/* to NetworkOnly - auth is always online-only.
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
