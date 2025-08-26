/**
 * useHTTPSSE Hook Compatibility Verification
 * 
 * This file verifies that useHTTPSSE provides the same interface as useWebSocket
 * for seamless drop-in replacement throughout the agent-feed system.
 */

import { useHTTPSSE, useWebSocket } from '../frontend/src/hooks';

// Type compatibility verification
type WebSocketHookReturn = ReturnType<typeof useWebSocket>;
type HTTPSSEHookReturn = ReturnType<typeof useHTTPSSE>;

// Ensure all WebSocket methods are present in HTTP/SSE hook
const verifyCompatibility = () => {
  // This will fail to compile if any methods are missing
  const webSocketMethods: Record<keyof WebSocketHookReturn, boolean> = {
    socket: true,
    isConnected: true,
    lastMessage: true,
    connectionError: true,
    connect: true,
    disconnect: true,
    emit: true,
    subscribe: true,
    unsubscribe: true,
    on: true,
    off: true,
    startPolling: true,
    stopPolling: true,
    connectSSE: true
  };

  const httpSSEMethods: Record<keyof HTTPSSEHookReturn, boolean> = {
    socket: true,
    isConnected: true,
    lastMessage: true,
    connectionError: true,
    connect: true,
    disconnect: true,
    emit: true,
    subscribe: true,
    unsubscribe: true,
    on: true,
    off: true,
    startPolling: true,
    stopPolling: true,
    connectSSE: true
  };

  // Verify all keys match
  const webSocketKeys = Object.keys(webSocketMethods) as Array<keyof WebSocketHookReturn>;
  const httpSSEKeys = Object.keys(httpSSEMethods) as Array<keyof HTTPSSEHookReturn>;

  const missingKeys = webSocketKeys.filter(key => !httpSSEKeys.includes(key as keyof HTTPSSEHookReturn));
  const extraKeys = httpSSEKeys.filter(key => !webSocketKeys.includes(key as keyof WebSocketHookReturn));

  return {
    compatible: missingKeys.length === 0 && extraKeys.length === 0,
    missingKeys,
    extraKeys,
    summary: `useHTTPSSE is ${missingKeys.length === 0 && extraKeys.length === 0 ? 'fully' : 'not'} compatible with useWebSocket`
  };
};

// Interface verification for key components
interface CompatibilityTest {
  name: string;
  description: string;
  testFn: (hook: WebSocketHookReturn | HTTPSSEHookReturn) => boolean;
}

const compatibilityTests: CompatibilityTest[] = [
  {
    name: 'Connection Management',
    description: 'Verify connect, disconnect, and connection status',
    testFn: (hook) => {
      return (
        typeof hook.connect === 'function' &&
        typeof hook.disconnect === 'function' &&
        typeof hook.isConnected === 'boolean'
      );
    }
  },
  {
    name: 'Event Handling',
    description: 'Verify event subscription and emission',
    testFn: (hook) => {
      return (
        typeof hook.emit === 'function' &&
        typeof hook.on === 'function' &&
        typeof hook.off === 'function' &&
        typeof hook.subscribe === 'function' &&
        typeof hook.unsubscribe === 'function'
      );
    }
  },
  {
    name: 'Terminal Streaming',
    description: 'Verify SSE and polling methods for terminal output',
    testFn: (hook) => {
      return (
        typeof hook.connectSSE === 'function' &&
        typeof hook.startPolling === 'function' &&
        typeof hook.stopPolling === 'function'
      );
    }
  },
  {
    name: 'Error Handling',
    description: 'Verify error state management',
    testFn: (hook) => {
      return (
        hook.connectionError === null || typeof hook.connectionError === 'string'
      );
    }
  },
  {
    name: 'Message Handling',
    description: 'Verify message structure compatibility',
    testFn: (hook) => {
      return (
        hook.lastMessage === null || 
        (typeof hook.lastMessage === 'object' && 
         'type' in hook.lastMessage && 
         'data' in hook.lastMessage && 
         'timestamp' in hook.lastMessage)
      );
    }
  }
];

/**
 * Migration Guide for Components Using useWebSocket
 * 
 * 1. Replace import:
 *    OLD: import { useWebSocket } from '../hooks/useWebSocket';
 *    NEW: import { useHTTPSSE } from '../hooks/useHTTPSSE';
 * 
 * 2. Replace hook usage:
 *    OLD: const { socket, isConnected, ... } = useWebSocket(options);
 *    NEW: const { socket, isConnected, ... } = useHTTPSSE(options);
 * 
 * 3. For terminal components, call connectSSE or startPolling:
 *    // For SSE with HTTP polling fallback
 *    hook.connectSSE(instanceId);
 * 
 *    // For direct HTTP polling
 *    hook.startPolling(instanceId);
 * 
 * 4. All event handling remains the same:
 *    hook.on('terminal:output', handleOutput);
 *    hook.emit('terminal:input', { input: command });
 */

export const MIGRATION_EXAMPLES = {
  // ClaudeInstanceManager.tsx
  claudeInstanceManager: `
    // OLD
    import { useWebSocket } from '../hooks/useWebSocket';
    const { connectSSE, startPolling, on } = useWebSocket();
    
    // NEW
    import { useHTTPSSE } from '../hooks/useHTTPSSE';
    const { connectSSE, startPolling, on } = useHTTPSSE();
    
    // Usage remains identical
    connectSSE(instanceId);
    on('terminal:output', handleOutput);
  `,

  // TerminalLauncher.tsx
  terminalLauncher: `
    // OLD
    import { useWebSocket } from '../hooks/useWebSocket';
    const { socket, isConnected, emit } = useWebSocket();
    
    // NEW  
    import { useHTTPSSE } from '../hooks/useHTTPSSE';
    const { socket, isConnected, emit } = useHTTPSSE();
    
    // All methods work identically
    emit('terminal:input', { input: command });
  `,

  // Any other component using WebSocket
  genericComponent: `
    // OLD
    import { useWebSocket } from '../hooks/useWebSocket';
    
    // NEW
    import { useHTTPSSE } from '../hooks/useHTTPSSE';
    
    // Everything else remains the same
  `
};

export { verifyCompatibility, compatibilityTests };