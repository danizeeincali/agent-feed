/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  experimental: {
    // Enable modern JavaScript features for better performance
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'date-fns', 'recharts'],
  },

  // Performance optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Performance monitoring in development
    if (dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
          },
        },
      };
    }

    // Bundle analysis configuration
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
          analyzerMode: 'static',
          reportFilename: 'bundle-analysis.html',
          openAnalyzer: false,
        })
      );
    }

    return config;
  },

  // Performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Cache static assets
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Output configuration for performance monitoring
  output: 'standalone',

  // Disable source maps in production for smaller bundles
  productionBrowserSourceMaps: false,

  // Optimize fonts
  optimizeFonts: true,

  // Enable SWC minification for better performance
  swcMinify: true,
};

module.exports = withBundleAnalyzer(nextConfig);