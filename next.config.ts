import type { NextConfig } from "next";

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

export default nextConfig;
