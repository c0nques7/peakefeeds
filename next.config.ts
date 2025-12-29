import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["argon2"],
  turbopack: {},
  // 1. WEBPACK CONFIG
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
            // ⚡️ UPDATED: Added 'https://open.spotify.com' explicitly
            value: `
              frame-ancestors 'self' https://www.youtube.com https://youtu.be https://vercel.live; 
              frame-src 
                'self' 
                https://www.youtube.com 
                https://youtu.be 
                https://vercel.live 
                http://googleusercontent.com 
                https://open.spotify.com 
                https://w.soundcloud.com 
                https://www.tiktok.com 
                https://www.instagram.com 
                https://discord.com 
                https://www.reddit.com 
                https://embed.reddit.com 
                https://apnews.com 
                https://www.eporner.com; 
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com;
              connect-src 'self' https://vitals.vercel-insights.com https://*.backblazeb2.com https://www.youtube.com;
              media-src 'self' data: blob: https://www.youtube.com https://youtu.be https://*.backblazeb2.com;
            `.replace(/\s{2,}/g, ' ').trim() 
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          }
        ],
      },
    ];
  },

  // 3. REWRITES
  async rewrites() {
    return [
      {
        source: '/c/:slug*',
        destination: '/channels/:slug*',
      },
    ];
  },
};

export default nextConfig;