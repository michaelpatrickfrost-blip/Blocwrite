import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Avoid production build failures from local eslint-plugin resolution quirks.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
