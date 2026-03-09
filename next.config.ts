import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

export default nextConfig;
