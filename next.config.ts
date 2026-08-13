import type { NextConfig } from "next";

// The "without nonces" CSP Next's own docs recommend for apps that don't
// load third-party scripts (we don't — no analytics/CDN scripts anywhere in
// this app). 'unsafe-inline' is required because Next injects inline
// scripts for hydration; 'unsafe-eval' only in dev, for React's debug stack
// reconstruction. next/font self-hosts Geist at build time, so no external
// font origin is needed either.
const isDev = process.env.NODE_ENV === "development";
const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  experimental: {
    // Enables next/navigation's forbidden() — src/lib/session.ts uses it so
    // a wrong-role session sees a proper 403 (src/app/forbidden.tsx) instead
    // of crashing to the generic error boundary.
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
