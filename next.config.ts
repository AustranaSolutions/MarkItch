import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 12c: /api/admin/migrate reads the ./drizzle SQL files at runtime
  // (drizzle-orm's migrator). Next's serverless bundler only includes files
  // it can trace from actual require()/import calls, and raw .sql files
  // read via fs are invisible to that trace — without this they'd be
  // missing from the deployed function and every migration attempt would
  // fail with "no such file or directory" in production despite working
  // locally. See node_modules/next/dist/docs .../output.md.
  outputFileTracingIncludes: {
    "/api/admin/migrate": ["./drizzle/**/*"],
  },
  // Raises Next's own default Server Action body limit from 1MB — found
  // 2026-09-19 when a real device upload silently failed with a generic
  // browser error, not one of this app's own validation messages. Note
  // this alone does NOT fix video uploads: Vercel's Serverless Functions
  // additionally cap any request body at 4.5MB, hard, not configurable
  // here or anywhere else — that's *why* video uploads (Solo-Pitch, Duell-
  // Video, Kontern, Reaktion, Casting-/Creator-Einreichung) go straight
  // from the browser to storage now instead (see storage.ts's
  // createVideoUploadTarget). This setting still matters for the smaller
  // payloads that DO still cross a Server Action — e.g. a brand logo image
  // (capped at 2MB in actions/brand.ts, comfortably under Vercel's 4.5MB
  // ceiling but over Next's old 1MB default).
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // 2026-10-03 (Luca): name and concept must not be findable via search
  // engines until domain/trademark are secured. X-Robots-Tag on every
  // response keeps the site out of Google & co. without blocking anything
  // else — browsers, the native app and its /api/mobile calls are
  // unaffected. Deliberately NOT a robots.txt "Disallow": crawlers would
  // then never fetch the pages and never see the noindex, so already-
  // indexed URLs would stay in the results. Remove at public launch.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
