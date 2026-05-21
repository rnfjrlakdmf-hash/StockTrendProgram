import type { NextConfig } from "next";

// 환경에 따라 백엔드 URL 자동 선택
// 1순위: 환경변수 (EC2 서버에서 직접 설정 가능)
// 2순위: 로컬 개발 환경 → localhost:8000
// 3순위: 운영 환경 → EC2 도메인
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : 'http://localhost:8000');  // EC2에서 프론트/백엔드 같은 서버이므로 localhost


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
  // [Fix] lightningcss 네이티브 모듈을 webpack 번들링 대상에서 제외
  // TailwindCSS v4가 사용하는 lightningcss가 Linux 환경에서 webpack 빌드 시 오류 발생하는 문제 해결
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'lightningcss',
        'lightningcss-linux-x64-gnu',
      ];
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
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
