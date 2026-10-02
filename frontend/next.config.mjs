const API = process.env.API_INTERNAL_URL || 'http://localhost:4000';

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
