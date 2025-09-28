/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    // CRITICAL FIX: Enforce single React instance to prevent useEffect null errors
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './frontend/src',
      '@/hooks/useWebSocket': './frontend/src/hooks/useWebSocket.ts',
      // Force all React imports to use root node_modules version (18.2.0)
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime')
    };

    // Ensure consistent React resolution across all imports
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    };

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/agents',
        destination: 'http://localhost:3001/api/agents'
      },
      {
        source: '/api/activities',
        destination: 'http://localhost:3001/api/activities'
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*'
      }
    ];
  }
}

export default nextConfig