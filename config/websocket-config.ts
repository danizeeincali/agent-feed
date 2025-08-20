/**
 * WebSocket Configuration Constants
 * CRITICAL: Keep client and server timeouts synchronized to prevent timeout issues
 */

export const WEBSOCKET_CONFIG = {
  // Server-side Socket.IO configuration
  SERVER: {
    pingTimeout: 20000,      // How long to wait for ping response
    pingInterval: 8000,      // How often to send pings
    upgradeTimeout: 15000,   // WebSocket upgrade timeout
    connectTimeout: 15000,   // Connection establishment timeout
    allowUpgrades: true,
    httpCompression: true,
    allowEIO3: true,
    transports: ['polling', 'websocket']
  },
  
  // Client-side Socket.IO configuration  
  CLIENT: {
    timeout: 15000,              // Connection timeout (matches server connectTimeout)
    pingTimeout: 20000,          // Matches server pingTimeout
    pingInterval: 8000,          // Matches server pingInterval
    reconnectionAttempts: 10,    // Number of reconnection attempts
    reconnectionDelay: 1000,     // Initial reconnection delay
    reconnectionDelayMax: 5000,  // Maximum reconnection delay
    forceNew: false,
    withCredentials: true,
    reconnection: true,
    autoConnect: true,
    upgrade: true,
    rememberUpgrade: true,
    transports: ['polling', 'websocket']
  },
  
  // Rate limiting configuration
  RATE_LIMIT: {
    socketRateLimit: 100,        // messages per minute
    rateLimitWindow: 60 * 1000   // 1 minute window
  },
  
  // Connection state management
  CONNECTION: {
    heartbeatInterval: 30000,    // Heartbeat every 30 seconds
    typingIndicatorTimeout: 10000, // Typing indicator timeout
    systemStatsInterval: 30000   // System stats broadcast interval
  }
} as const;

export default WEBSOCKET_CONFIG;