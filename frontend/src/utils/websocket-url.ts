/**
 * WebSocket URL Utility
 * 
 * Provides dynamic URL generation for WebSocket connections that work
 * with Vite proxy configuration and production environments.
 */

/**
 * Get the WebSocket URL based on current environment
 * - In development: Uses relative path for Vite proxy
 * - In production: Uses current host with appropriate protocol
 */
export function getWebSocketUrl(path: string = ''): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return `ws://localhost:3001${cleanPath}`;
  }

  const { protocol, hostname, port } = window.location;
  
  // Determine if we're in development (Vite dev server typically runs on 5173)
  const isDevelopment = hostname === 'localhost' && (port === '5173' || port === '3000');
  
  if (isDevelopment) {
    // Use WebSocket protocol with same host, Vite proxy will handle routing
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${hostname}:${port}${cleanPath}`;
  }

  // Production: Use current host with appropriate WebSocket protocol
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const wsPort = port ? `:${port}` : '';
  return `${wsProtocol}//${hostname}${wsPort}${cleanPath}`;
}

/**
 * Get HTTP/HTTPS URL for API calls
 * - In development: Uses relative path for Vite proxy
 * - In production: Uses current host
 */
export function getApiUrl(path: string = ''): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return `http://localhost:3001${cleanPath}`;
  }

  // Always use relative paths in the browser - Vite proxy or reverse proxy will handle routing
  return cleanPath;
}

/**
 * Get Socket.IO URL for connections
 * - In development: Uses current host with Vite proxy
 * - In production: Uses current host
 */
export function getSocketIOUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return 'http://localhost:3001';
  }

  const { protocol, hostname, port } = window.location;
  
  // Use current host and protocol - proxy will handle backend routing
  return `${protocol}//${hostname}:${port}`;
}

/**
 * Legacy compatibility function for existing code
 * @deprecated Use getSocketIOUrl() instead
 */
export function getWebSocketBaseUrl(): string {
  return getSocketIOUrl();
}