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
    host: "0.0.0.0", // SPARC FIX: Bind to all interfaces for Codespaces
    cors: true,
    strictPort: true, // Exit if port is already in use
    // CRITICAL FIX: Enable SPA routing support
    historyApiFallback: true,
    // SPARC DEBUG FIX: Codespaces HMR configuration
    hmr: {
      clientPort: process.env.CODESPACES ? 443 : 5173,
      host: process.env.CODESPACES ? 'localhost' : undefined
    },
    // Proxy configuration for backend services
    proxy: {
      // SPARC FIX: Claude Code endpoint needs longer timeout (Claude responses take 10-60s)
      '/api/claude-code': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        timeout: 120000, // 120 seconds for long-running Claude Code requests
        followRedirects: true,
        xfwd: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔍 SPARC DEBUG: Claude Code proxy request:', req.method, req.url, '->', proxyReq.path);
          });
          proxy.on('error', (err, _req, _res) => {
            console.log('🔍 SPARC DEBUG: Claude Code proxy error:', err.message);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('🔍 SPARC DEBUG: Claude Code proxy response:', req.url, '->', proxyRes.statusCode);
          });
        }
      },
      // HTTP API proxy (working for Claude detection) - FIXED TO PORT 3001 FOR SPARC COMPLETION
      '/api': {
        target: 'http://127.0.0.1:3001', // Force IPv4 to avoid IPv6 connection issues
        changeOrigin: true,
        secure: false,
        timeout: 10000, // Fast timeout for regular API endpoints
        followRedirects: true,
        xfwd: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔍 SPARC DEBUG: HTTP API proxy request:', req.method, req.url, '->', proxyReq.path);
          });
          proxy.on('error', (err, _req, _res) => {
            console.log('🔍 SPARC DEBUG: HTTP API proxy error:', err.message);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
              console.log('🔍 SPARC DEBUG: HTTP API proxy response error:', req.url, '->', proxyRes.statusCode);
            }
          });
        }
      },
      // PHASE 3D FIX: Proxy /activities to /api/activities on backend
      '/activities': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/activities/, '/api/activities'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔍 PHASE 3D: Activities proxy:', req.url, '->', proxyReq.path);
          });
        }
      },
      // SOCKET.IO PROXY REMOVED: Socket.IO client connects DIRECTLY to localhost:3001
      // Direct connection prevents Vite proxy issues with WebSocket upgrade
      // See frontend/src/services/socket.js for direct connection configuration
      // Terminal WebSocket proxy
      '/terminal': {
        target: 'http://127.0.0.1:3001', // Force IPv4 to avoid IPv6 connection issues
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔍 SPARC DEBUG: WebSocket /terminal proxy request:', req.url, '->', proxyReq.path);
          });
          proxy.on('error', (err, _req, _res) => {
            console.log('🔍 SPARC DEBUG: WebSocket /terminal proxy error:', err.message);
          });
        }
      },
      // SSE Streaming Ticker proxy - CRITICAL FIX for 6-second disconnections
      '/streaming-ticker': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        // SSE connections need long timeout to support keepalive
        timeout: 0, // No timeout for SSE (keepalive maintains connection)
        proxyTimeout: 0, // No proxy timeout
        followRedirects: false, // SSE should not redirect
        xfwd: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Ensure SSE headers are preserved
            proxyReq.setHeader('Accept', 'text/event-stream');
            proxyReq.setHeader('Cache-Control', 'no-cache');
            proxyReq.setHeader('Connection', 'keep-alive');
            console.log('🔍 SPARC DEBUG: SSE proxy request:', req.method, req.url, '->', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Ensure SSE response headers are set correctly
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['connection'] = 'keep-alive';
            proxyRes.headers['content-type'] = 'text/event-stream';
            console.log('🔍 SPARC DEBUG: SSE proxy response:', req.url, '->', proxyRes.statusCode);
          });
          proxy.on('error', (err, req, res) => {
            console.error('🔍 SPARC DEBUG: SSE proxy error:', err.message);
          });
        }
      },
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
    // ARCHITECTURE FIX: Explicit SPA routing configuration
    historyApiFallback: true,
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
          charts: ['chart.js', 'react-chartjs-2', 'chartjs-adapter-date-fns'],
          // HTTP/SSE only - socket.io-client removed
          // realtime: ['socket.io-client'],
        },
      },
    },
    minify: false, // Disabled for faster emergency builds
  },
})