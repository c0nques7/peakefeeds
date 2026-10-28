import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["argon2", "ws"],
  // 1. BUNDLER ALIASES: wallet libraries import React Native storage, pino-pretty and Node
  // built-ins they never use in the browser. Turbopack (dev and build) and webpack (fallback,
  // `next build --webpack`) get the same stand-ins.
  turbopack: {
    resolveAlias: {
      '@react-native-async-storage/async-storage': './src/lib/empty-module.ts',
      'pino-pretty': './src/lib/empty-module.ts',
      fs: { browser: './src/lib/empty-module.ts' },
      net: { browser: './src/lib/empty-module.ts' },
      tls: { browser: './src/lib/empty-module.ts' },
    },
  },
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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.backblazeb2.com',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'abs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Wallet connection (AppKit/WalletConnect, Coinbase) needs its hosts in connect-src, font-src and frame-src
            value: `
              frame-ancestors 'self' https://www.youtube.com https://youtu.be https://vercel.live; 
              frame-src 
                'self' 
                https://www.youtube.com 
                https://www.youtube-nocookie.com 
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
                https://verify.walletconnect.com 
                https://verify.walletconnect.org 
                https://secure.walletconnect.org 
                https://secure.walletconnect.com 
                https://*.reown.com; 
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com https://www.youtube.com https://s.ytimg.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: blob: https:;
              font-src 'self' data: https://fonts.reown.com;
              connect-src 'self' https://vitals.vercel-insights.com https://*.backblazeb2.com https://www.youtube.com https://*.googlevideo.com
                https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org
                https://*.web3modal.org https://*.web3modal.com https://*.reown.com wss://*.reown.com
                https://cca-lite.coinbase.com
                https://sepolia.optimism.io https://eth.merkle.io https://sepolia.drpc.org;
              media-src 'self' data: blob: https://www.youtube.com https://youtu.be https://*.backblazeb2.com https://*.googlevideo.com;
            `.replace(/\s{2,}/g, ' ').trim() 
          },
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