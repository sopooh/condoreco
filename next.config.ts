import type { NextConfig } from "next";

// Header di sicurezza (art. 32 GDPR). Niente CSP completa per ora: mappe,
// Supabase e immagini esterne la renderebbero fragile; frame-ancestors basta
// a impedire che il sito venga incorniciato da altri (clickjacking).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Proxy PostHog (cloud UE) sul nostro dominio: le richieste partono da
  // condoreco.com/ingest invece che da un dominio terzo.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://eu-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
