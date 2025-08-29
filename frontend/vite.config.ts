import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Allow external connections
    cors: true,
    strictPort: true, // Exit if port is already in use
    // SPARC DEBUG FIX: Codespaces HMR configuration
    hmr: {
      clientPort: process.env.CODESPACES ? 443 : 5173,
      host: process.env.CODESPACES ? 'localhost' : undefined
    },
    // Proxy configuration for backend services
    proxy: {
      // HTTP API proxy (working for Claude detection) - FIXED TO PORT 3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔍 SPARC DEBUG: HTTP API proxy request:', req.method, req.url, '->', proxyReq.path);
          });
          proxy.on('error', (err, _req, _res) => {
            console.log('🔍 SPARC DEBUG: HTTP API proxy error:', err.message);
          });
        }
      },
      // CRITICAL FIX: WebSocket proxy for Socket.IO (fixing terminal regression) - FIXED TO PORT 3002  
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,           // Enable WebSocket proxying
        changeOrigin: true, // Change origin headers to match target
        secure: false,
        headers: {
          'Connection': 'upgrade',
          'Upgrade': 'websocket'
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔍 SPARC DEBUG: WebSocket proxy request:', req.url, '->', proxyReq.path);
            // Ensure proper headers for WebSocket upgrade
            if (req.headers.connection) {
              proxyReq.setHeader('Connection', req.headers.connection);
            }
            if (req.headers.upgrade) {
              proxyReq.setHeader('Upgrade', req.headers.upgrade);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('🔍 SPARC DEBUG: WebSocket proxy response:', req.url, '->', proxyRes.statusCode);
          });
          proxy.on('error', (err, _req, _res) => {
            console.log('🔍 SPARC DEBUG: WebSocket proxy error:', err.message);
          });
          proxy.on('upgrade', (req, socket, head) => {
            console.log('🔍 SPARC DEBUG: WebSocket upgrade request:', req.url);
          });
        }
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['lucide-react'],
          // HTTP/SSE only - socket.io-client removed
          // realtime: ['socket.io-client'],
        },
      },
    },
    minify: false, // Disabled for faster emergency builds
  },
})