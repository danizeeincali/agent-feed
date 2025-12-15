/**
 * Test API Configuration
 * Provides correct API base URL for test environment
 */

/**
 * Get API base URL for test environment
 * Tests need full URL (http://host:port/api) because Node's fetch doesn't support relative URLs
 */
export function getTestApiBaseUrl(): string {
  // For test environment, always use full URL to backend
  return 'http://127.0.0.1:3001/api';
}
