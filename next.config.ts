import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true, // Keep this if you are using the experimental compiler
  
  // ⚡️ RE-ADDED: Essential for fixing the "@metamask/sdk" build error.
  // This is used during 'next build' (Webpack) even if you use '--turbo' for dev.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },

  async headers() {
    return [
      {
        // Applies to all pages
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://www.youtube.com https://youtu.be https://vercel.live; frame-src 'self' https://www.youtube.com https://youtu.be https://vercel.live; media-src 'self' data: https://www.youtube.com https://youtu.be;",
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