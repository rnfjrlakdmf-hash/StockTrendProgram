import type { NextConfig } from "next";

// 환경에 따라 백엔드 URL 자동 선택
// 1순위: 환경변수 (Vercel 대시보드에서 설정 가능)
// 2순위: 운영 환경(Vercel) → Railway 서버
// 3순위: 로컬 개발 환경 → localhost:8000
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8000' 
    : 'https://stocktrendprogram-production.up.railway.app');

const nextConfig: NextConfig = {
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
