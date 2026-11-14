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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // I font dei template Instagram vengono letti da disco nelle route API:
  // vanno inclusi esplicitamente nel bundle serverless.
  outputFileTracingIncludes: {
    "/api/instagram/**": ["./lib/instagram/fonts/**", "./lib/instagram/*.png", "./lib/instagram/characters/**", "./lib/instagram/covers/**"],
  },
};

export default nextConfig;
