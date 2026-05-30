import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.digitalcorvids.com' }],
        destination: 'https://digitalcorvids.com/:path*',
        permanent: true,
      },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/Aboutus.html', destination: '/about', permanent: true },
      { source: '/aboutus.html', destination: '/about', permanent: true },
      { source: '/about.html', destination: '/about', permanent: true },
      { source: '/Contactus/Contactus.html', destination: '/contact', permanent: true },
      { source: '/contact.html', destination: '/contact', permanent: true },
      { source: '/contact-us.html', destination: '/contact', permanent: true },
      { source: '/blog_listing.html', destination: '/blog', permanent: true },
      { source: '/blog_read.html', destination: '/blog', permanent: true },
      { source: '/search-engine-optimization.html', destination: '/services/seo', permanent: true },
      { source: '/web-development.html', destination: '/services/web-development', permanent: true },
      { source: '/seo.html', destination: '/services/seo', permanent: true },
      { source: '/ppc.html', destination: '/services/ppc', permanent: true },
      { source: '/social-media-marketing.html', destination: '/services/social-media-marketing', permanent: true },
      { source: '/video-production.html', destination: '/services/video-production-ad', permanent: true },
      { source: '/influencer-marketing.html', destination: '/services/influencer-marketing', permanent: true },
      { source: '/manage-company.html', destination: '/services/manage-company', permanent: true },
    ];
  },
};

export default nextConfig;
