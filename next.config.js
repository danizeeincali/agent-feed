/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './frontend/src',
      '@/hooks/useWebSocket': './frontend/src/hooks/useWebSocket.ts'
    };
    return config;
  }
}

export default nextConfig