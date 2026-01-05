import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: '.next_custom',
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
