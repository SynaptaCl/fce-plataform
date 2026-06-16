import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling these server-only packages.
  // jsdom (via isomorphic-dompurify) initializes at module load time and
  // must resolve from node_modules at runtime, not be inlined into bundles.
  serverExternalPackages: ["jsdom", "isomorphic-dompurify"],
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
  org: "synapta",
  project: "fce-plataform",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
