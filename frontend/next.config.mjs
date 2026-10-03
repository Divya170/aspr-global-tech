import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

// Also read the project-root .env used by server.js in production. The /api proxy target and
// NEXT_PUBLIC_* values are fixed at build time, so the build must see the same settings.
nextEnv.loadEnvConfig(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

const API = process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.API_PORT || 4000}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Browser calls go to same-origin /api/* and are proxied to the NestJS backend.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API}/api/:path*` }];
  },
  // Friendly URLs for the company section, which routes by hash like the design.
  async redirects() {
    return ['about', 'process', 'work', 'careers', 'insights', 'faq', 'contact'].map((p) => ({
      source: `/${p}`, destination: `/company#${p}`, permanent: false,
    }));
  },
};

export default nextConfig;
