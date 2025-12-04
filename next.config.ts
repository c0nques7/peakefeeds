import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // 🟢 NEW: Webpack configuration to ignore broken test files
  webpack: (config) => {
    // 1. Ignore specific test files inside node_modules that cause build errors
    config.module.rules.push({
      test: /node_modules\/thread-stream\/test\/.*\.(js|ts|mjs)$/,
      use: 'ignore-loader',
    });

    // 2. Mock missing dev dependencies so import checks don't fail
    config.resolve.alias = {
        ...config.resolve.alias,
        'desm': false,
        'fastbench': false,
        'tap': false,
        'tape': false,
        'why-is-node-running': false,
        'pino-elasticsearch': false,
    };

    return config;
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://www.youtube.com https://youtu.be; frame-src 'self' https://www.youtube.com https://youtu.be; media-src 'self' data: https://www.youtube.com https://youtu.be;",
          },
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

