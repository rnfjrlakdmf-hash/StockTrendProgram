import type { NextConfig } from "next";

// [Debug] Force Web Mode for Vercel Debugging
// const isVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  // Vercel deployment uses default build output and serverless functions
  // Mobile export uses static export to specific folder
  // 강제로 기본 빌드 (.next) 사용 -> Vercel 호환
  distDir: '.next',
  // output: 'export', // <--- Disable explicit export!

  images: {
    unoptimized: true, // Keep unoptimized for consistency, or change if needed
  },
  // Headers work on Vercel (Serverless) but are ignored in static export
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
