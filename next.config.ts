import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // 1. WEBPACK CONFIG (Keeps your build working)
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

  // 2. HEADERS (Security)
  async headers() {
    return [
      {
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
  },

  // 3. ⚡️ REWRITES (The Magic Alias)
  async rewrites() {
    return [
      {
        // When user visits /c/anything...
        source: '/c/:slug*',
        // ...serve them /channels/anything
        destination: '/channels/:slug*',
      },
    ];
  },
};

export default nextConfig;
