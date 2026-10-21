import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// @serwist/next bundles the service worker with webpack and doesn't support Turbopack.
// Next 16 defaults both `next dev` and `next build` to Turbopack, under which this plugin's
// webpack() hook is never called and no public/sw.js is produced at all (silently - no
// error). Two things are needed together, not either alone: `disable` in dev (Turbopack
// there is fine to keep, since Serwist is off anyway), and `npm run build` uses
// `next build --webpack` (see package.json) so the production bundle actually runs this
// plugin's webpack hook.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  // We register the SW ourselves (src/components/offline/OfflineBoot.tsx) with
  // `{ immediate: true }` - the library's own default auto-register waits for the
  // window "load" event, which measured 10-30+ seconds on a real phone on a slow
  // connection with this app's first page. That delay was most of why the SW wasn't
  // even installing yet, let alone ready, before a child went offline in testing.
  register: false,
  // public/images and public/hq-lab are tens of MB of per-child/per-profession content;
  // they're cached deliberately at runtime (see src/app/sw.ts), never precached in bulk.
  // Custom fonts likewise aren't needed by the tiny /offline shell below - they're
  // cached lazily the first time a page that actually uses them is visited.
  globPublicPatterns: ["favicon*.png", "favicon.ico", "icon*.png", "apple-touch-icon.png", "manifest.webmanifest", "robots.txt"],
  manifestTransforms: [
    async (manifestEntries) => ({
      // The install-time precache manifest must stay a *small shell*, not the whole
      // app: on a real phone on a slow connection, precaching the ~120 entries Serwist
      // included by default (one JS chunk per page, ~20 webfont files) measured ~100s
      // and installing but not yet active, the page is uncontrolled and plain
      // browser fetches fail outright if the device goes offline meanwhile, exactly
      // what testing hit. Precaching here is only for the /offline fallback (see
      // fallbacks.entries in src/app/sw.ts) plus the framework JS every page needs to
      // hydrate; every other page's JS/CSS/fonts/API data is cached lazily, the first
      // time that page is actually visited online, by the runtime-caching rules below
      // (unchanged, still network-first/stale-while-revalidate as before) - that's the
      // normal and sufficient path for "works offline after being opened once".
      manifest: manifestEntries.filter((entry) => {
        if (/\/_next\/static\/chunks\/app\/api\//.test(entry.url)) return false; // server-only Route Handler code
        // This transform runs before @serwist/next's own built-in one that percent-encodes
        // "[" and "]" in URLs, so entries still read literally as "[locale]" here, not
        // "%5Blocale%5D".
        if (/\[locale\]/.test(entry.url)) return false; // every per-locale page's own JS, not the shared framework
        if (/\/_next\/static\/media\//.test(entry.url)) return false; // next/font webfont files
        return true;
      }),
      warnings: [],
    }),
  ],
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Admin-uploaded HQ assets are served from Laravel /storage on the API host.
    remotePatterns: [
      { protocol: "http", hostname: "**" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default withSerwist(withNextIntl(nextConfig));
