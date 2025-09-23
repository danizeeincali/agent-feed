/**
 * Debug utility to inspect WebSocket connection state
 */

import { getGlobalConnectionManager } from '../services/connection/connection-manager';

export function debugWebSocketConnection() {
  const manager = getGlobalConnectionManager();
  const status = manager.getDetailedStatus();
  
  console.group('🔍 WebSocket Connection Debug');
  console.log('Manager State:', status.state);
  console.log('Is Connected Method:', status.isConnected);
  console.log('Socket Connected:', status.socketConnected);
  console.log('Socket ID:', status.socketId);
  console.log('Current Attempt:', status.currentAttempt);
  console.log('Max Attempts:', status.maxAttempts);
  console.log('Manual Disconnect:', status.manualDisconnect);
  console.log('Is Destroyed:', status.isDestroyed);
  console.log('Has Reconnection Timer:', status.hasReconnectionTimer);
  console.log('Options:', status.options);
  console.log('Metrics:', status.metrics);
  console.log('Health:', status.health);
  console.groupEnd();
  
  return status;
}

// Global function for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).debugWebSocket = debugWebSocketConnection;
}