import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Excluir reset-password del pre-renderizado estático
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
