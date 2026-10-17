import type { NextConfig } from "next";

import removedBlogPosts from "./lib/marketing-blog-removed-posts.json";

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
        statusCode: 301,
      },
      { source: '/index.html', destination: '/', statusCode: 301 },
      { source: '/Aboutus.html', destination: '/about', statusCode: 301 },
      { source: '/aboutus.html', destination: '/about', statusCode: 301 },
      { source: '/about.html', destination: '/about', statusCode: 301 },
      { source: '/Contactus/Contactus.html', destination: '/contact', statusCode: 301 },
      { source: '/contact.html', destination: '/contact', statusCode: 301 },
      { source: '/contact-us.html', destination: '/contact', statusCode: 301 },
      { source: '/blog_listing.html', destination: '/blog', statusCode: 301 },
      { source: '/blog_read.html', destination: '/blog', statusCode: 301 },
      { source: '/search-engine-optimization.html', destination: '/services/seo', statusCode: 301 },
      { source: '/web-development.html', destination: '/services/web-development', statusCode: 301 },
      { source: '/seo.html', destination: '/services/seo', statusCode: 301 },
      { source: '/ppc.html', destination: '/services/ppc', statusCode: 301 },
      { source: '/social-media-marketing.html', destination: '/services/social-media-marketing', statusCode: 301 },
      { source: '/video-production.html', destination: '/services/video-production-ad', statusCode: 301 },
      { source: '/influencer-marketing.html', destination: '/services/influencer-marketing', statusCode: 301 },
      { source: '/manage-company.html', destination: '/services/manage-company', statusCode: 301 },
      {
        source: '/blog/how-to-manage-your-company-using-ai-powered-tools-2026-strategy',
        destination: '/services/manage-company',
        statusCode: 301,
      },
      {
        source: '/blog/glass-city-marathon-2026-content-strategy-scaling-event-production',
        destination: '/services/video-production-ad',
        statusCode: 301,
      },
      {
        source: '/blog/mastering-country-calling-2026-content-strategy-ai-production',
        destination: '/blog/how-to-build-a-storytelling-campaign-strategy-the-2026-model',
        statusCode: 301,
      },
      // Blog posts removed in the 2026-10 content cleanup (see lib/marketing-blog-cleanup.ts).
      ...Object.entries(removedBlogPosts.redirects).map(([slug, destination]) => ({
        source: `/blog/${slug}`,
        destination,
        statusCode: 301 as const,
      })),
    ];
  },
};

export default nextConfig;
