/**
 * Socket.IO Client Service
 *
 * Provides real-time WebSocket connection to the backend server
 * for receiving ticket status updates and other real-time events.
 *
 * Backend Events:
 * - ticket:status:update - Ticket status changes (pending, processing, completed, failed)
 * - worker:lifecycle - Agent worker lifecycle events
 * - connected - Initial connection confirmation
 */

import { io } from 'socket.io-client';

// Determine the backend URL based on environment
const getBackendUrl = () => {
  // Check if running in development or production
  if (typeof window !== 'undefined') {
    const isDevelopment = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';

    if (isDevelopment) {
      // DIRECT CONNECTION: Socket.IO connects directly to backend, bypassing Vite proxy
      // This prevents connection instability and ensures WebSocket upgrade works correctly
      return 'http://localhost:3001';
    }

    // Production: Use same origin
    return window.location.origin;
  }

  // Fallback for SSR or testing
  return 'http://localhost:3001';
};

// Create Socket.IO client instance
export const socket = io(getBackendUrl(), {
  // Don't connect automatically - let the hook control connection lifecycle
  autoConnect: false,

  // Reconnection settings
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,

  // Transport settings
  transports: ['websocket', 'polling'],

  // Path must match backend configuration
  path: '/socket.io/',

  // Timeout settings
  timeout: 20000,

  // Additional options
  withCredentials: true
});

// Debug logging for development
if (process.env.NODE_ENV === 'development') {
  socket.on('connect', () => {
    console.log('[Socket.IO] Connected to server:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket.IO] Connection error:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket.IO] Reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('[Socket.IO] Reconnection attempt', attemptNumber);
  });

  socket.on('reconnect_error', (error) => {
    console.error('[Socket.IO] Reconnection error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('[Socket.IO] Reconnection failed - max attempts reached');
  });
}

// Export utility functions for room subscriptions
export const subscribeToPost = (postId) => {
  console.log('[Socket] 📨 Emitting subscribe:post for', postId, '| Socket connected:', socket.connected);
  socket.emit('subscribe:post', postId);

  // Verify subscription with timeout
  setTimeout(() => {
    console.log('[Socket] 🔍 Subscription verification after 1s - socket.connected:', socket.connected);
  }, 1000);
};

export const unsubscribeFromPost = (postId) => {
  if (socket.connected) {
    console.log('[Socket] 📭 Emitting unsubscribe:post for', postId);
    socket.emit('unsubscribe:post', postId);
  }
};

export const subscribeToAgent = (agentId) => {
  if (socket.connected) {
    socket.emit('subscribe:agent', agentId);
  }
};

export const unsubscribeFromAgent = (agentId) => {
  if (socket.connected) {
    socket.emit('unsubscribe:agent', agentId);
  }
};

export default socket;
