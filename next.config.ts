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
  // public/images and public/hq-lab are tens of MB of per-child/per-profession content;
  // they're cached deliberately at runtime (see src/app/sw.ts), never precached in bulk.
  globPublicPatterns: ["favicon*.png", "favicon.ico", "icon*.png", "apple-touch-icon.png", "manifest.webmanifest", "robots.txt", "fonts/**/*"],
  manifestTransforms: [
    async (manifestEntries) => ({
      // Next also emits a webpack chunk per Route Handler (app/api/**/route-*.js) under
      // .next/static/chunks - that's server-only code the browser never runs, but the
      // plugin's own "server/"-prefix exclusion doesn't catch these (they're not under
      // that prefix). Precaching ~80 of them made first install install alone take far
      // longer than it should on a single small container - never finished in testing.
      manifest: manifestEntries.filter((entry) => !/\/_next\/static\/chunks\/app\/api\//.test(entry.url)),
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
