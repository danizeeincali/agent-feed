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
export declare function getWebSocketUrl(path?: string): string;
/**
 * Get HTTP/HTTPS URL for API calls
 * - In development: Uses relative path for Vite proxy
 * - In production: Uses current host
 */
export declare function getApiUrl(path?: string): string;
/**
 * Get Socket.IO URL for connections
 * - In development: Uses current host with Vite proxy
 * - In production: Uses current host
 */
export declare function getSocketIOUrl(): string;
/**
 * Legacy compatibility function for existing code
 * @deprecated Use getSocketIOUrl() instead
 */
export declare function getWebSocketBaseUrl(): string;
//# sourceMappingURL=websocket-url.d.ts.map