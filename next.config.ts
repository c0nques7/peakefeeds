import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // 🛑 REMOVED: webpack config (Not supported with --turbopack)
  // The missing dependencies you installed earlier will handle the build errors now.

  async headers() {
    return [
      {
        // Applies to all pages
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            vvalue: "frame-ancestors 'self' https://www.youtube.com https://youtu.be https://vercel.live; frame-src 'self' https://www.youtube.com https://youtu.be https://vercel.live; media-src 'self' data: https://www.youtube.com https://youtu.be;",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          }
        ],
      },
    ];
  }
};

export default nextConfig;