import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // 1. 🟢 THE FIX: Configure Webpack to ignore broken test files in node_modules
  webpack: (config, { isServer }) => {
    // A. Externals: Tell Webpack "don't try to bundle these, they are optional"
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
      'pino-pretty': 'commonjs pino-pretty',
      'lokijs': 'commonjs lokijs',
    });

    // B. Rules: Use null-loader for any test files found inside node_modules
    // This stops Vercel from crashing when it finds 'tap' or 'desm' imports in tests
    config.module.rules.push({
      test: /node_modules\/.*\/test\/.*\.(js|ts|mjs)$/,
      use: 'null-loader',
    });

    // C. Aliases: Force resolve these specific missing deps to nothing/false
    // This is a safety net if the regex above misses something
    config.resolve.alias = {
        ...config.resolve.alias,
        'desm': false,
        'tap': false,
        'fastbench': false,
        'pino-elasticsearch': false,
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

