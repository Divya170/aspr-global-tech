import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

// Also read the project-root .env used by server.js in production. The /api proxy target and
// NEXT_PUBLIC_* values are fixed at build time, so the build must see the same settings.
nextEnv.loadEnvConfig(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

const API = process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.API_PORT || 4000}`;

/** Old v1 URLs → their v2 pages, so links and search results keep working. */
const MOVED = [
  ['/company', '/about'], ['/about-us', '/about'], ['/work', '/portfolio'], ['/case-studies', '/portfolio'],
  ['/services/app-development', '/services/mobile-app-development'],
  ['/services/saas-and-software-solutions', '/services/web-application-development'],
  ['/services/business-management', '/services/business-automation'],
  ['/services/logo-design', '/services/branding-digital-design'],
  ['/services/graphics-design', '/services/branding-digital-design'],
  ['/privacy', '/privacy-policy'], ['/terms-and-conditions', '/terms'], ['/blog', '/insights'],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo root holds the production server.js and its own lockfile.
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [480, 640, 828, 1080, 1280, 1600, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Browser calls go to same-origin /api/* and are proxied to the NestJS backend.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API}/api/:path*` }];
  },
  async redirects() {
    return MOVED.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ];
  },
};

export default nextConfig;
