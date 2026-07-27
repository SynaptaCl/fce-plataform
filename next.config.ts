import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// CSP se define en src/proxy.ts con nonce por-request (elimina 'unsafe-inline').
// Aquí solo headers estáticos que no dependen del request.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/pacientes/:id/evolucion",
        destination: "/dashboard/pacientes/:id",
        permanent: false,
      },
      {
        source: "/dashboard/pacientes/:id/evaluacion",
        destination: "/dashboard/pacientes/:id",
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "synapta-spa",
  project: process.env.SENTRY_PROJECT ?? "fce-plataform",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
    // Si no hay token, no se intenta subir (evita que un build caiga por token caduco).
    ...(process.env.SENTRY_AUTH_TOKEN ? {} : { disable: true }),
  },
});
