import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        // Applies to all pages
        source: '/:path*',
        headers: [
          // 🛑 CRITICAL FIX: Allow YouTube to embed content
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://www.youtube.com https://youtu.be; frame-src 'self' https://www.youtube.com https://youtu.be; media-src 'self' data: https://www.youtube.com https://youtu.be;",
          },
          // Allows cross-origin embedding, which YouTube requires
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
