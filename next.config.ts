import type { NextConfig } from 'next';

// FIX BUG-CONFIG-001: require() replaced with conditional import for ESM compatibility
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  staticPageGenerationTimeout: 120,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  outputFileTracingRoot: process.cwd(),
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
};

// Bundle analyzer: only when ANALYZE=true — avoids ESM require() issues
export default async () => {
  if (process.env.ANALYZE === 'true') {
    const withBundleAnalyzer = (await import('@next/bundle-analyzer')).default({ enabled: true });
    return withBundleAnalyzer(nextConfig);
  }
  return nextConfig;
};
