/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '/workspaces/agent-feed/src',
      '@/hooks/useWebSocket': '/workspaces/agent-feed/src/hooks/useWebSocket.ts'
    };
    return config;
  }
}

export default nextConfig