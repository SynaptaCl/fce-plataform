import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
