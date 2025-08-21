# Connection Management Usage Guide

## Overview

This guide provides comprehensive instructions for implementing and using the WebSocket connection management system in your application. It covers basic setup, advanced configuration, integration patterns, and troubleshooting.

## Quick Start

### Basic Setup

```typescript
// 1. Import the connection manager hook
import { useConnectionManager } from '@/hooks/useConnectionManager';

// 2. Use in your component
function MyComponent() {
  const {
    isConnected,
    state,
    connect,
    disconnect,
    health,
    metrics
  } = useConnectionManager({
    url: '/ws',
    autoConnect: true
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {health.latency && <p>Latency: {health.latency}ms</p>}
    </div>
  );
}
```

### Adding Connection Status Indicator

```typescript
import { ConnectionStatusIndicator } from '@/components/connection';

function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ConnectionStatusIndicator 
        showText 
        showLatency 
        variant="detailed" 
      />
    </header>
  );
}
```

### Adding Manual Controls

```typescript
import { ConnectionControlPanel } from '@/components/connection';

function SettingsPage() {
  return (
    <div>
      <h2>Connection Settings</h2>
      <ConnectionControlPanel 
        showAdvancedControls 
        showMetrics 
      />
    </div>
  );
}
```

## Integration Patterns

### Integrating with Existing Dual Instance Monitoring

```typescript
// Enhanced version that replaces existing hook
import { useDualInstanceMonitoringEnhanced } from '@/hooks/useDualInstanceMonitoringEnhanced';

function DualInstanceDashboard() {
  const {
    // Original API (backward compatible)
    status,
    messages,
    pendingConfirmations,
    sendHandoff,
    handleConfirmation,
    isConnected,
    
    // Enhanced connection management
    connectionState,
    connectionHealth,
    connectionQuality,
    connectWs,
    disconnectWs,
    reconnectWs
  } = useDualInstanceMonitoringEnhanced();

  return (
    <div>
      {/* Existing dual instance UI */}
      <DualInstanceStatus status={status} />
      
      {/* Enhanced connection controls */}
      <div className="connection-panel">
        <h3>Connection Status</h3>
        <p>State: {connectionState}</p>
        <p>Quality: {connectionQuality}</p>
        <p>Latency: {connectionHealth.latency}ms</p>
        
        <button onClick={reconnectWs} disabled={isConnected}>
          Reconnect
        </button>
      </div>
    </div>
  );
}
```

### Backward Compatibility Layer

```typescript
// Updated useWebSocketSingleton maintains compatibility
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';

function ExistingComponent() {
  // This continues to work without changes
  const { socket, isConnected } = useWebSocketSingleton({ url: '/ws' });

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('message', handleMessage);
      return () => socket.off('message', handleMessage);
    }
  }, [socket, isConnected]);

  // Existing code remains unchanged
}
```

## Advanced Configuration

### Custom Connection Options

```typescript
const connectionManager = useConnectionManager({
  url: 'wss://api.example.com/ws',
  namespace: '/custom',
  autoConnect: true,
  reconnection: true,
  maxReconnectAttempts: 15,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 30000,
  timeout: 20000,
  withCredentials: true,
  auth: {
    token: 'your-auth-token'
  },
  transports: ['websocket', 'polling']
});
```

### Custom Reconnection Strategy

```typescript
import { createReconnectionStrategy } from '@/services/connection';

// Using built-in strategies
const exponentialStrategy = createReconnectionStrategy('exponential', {
  baseDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 10,
  jitter: true
});

const adaptiveStrategy = createReconnectionStrategy('adaptive', {
  baseDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 15
});

// Custom strategy implementation
class CustomReconnectionStrategy implements ReconnectionStrategy {
  shouldReconnect(attempt: number, error: Error | null): boolean {
    // Custom logic for determining if reconnection should be attempted
    return attempt <= 5 && !error?.message.includes('unauthorized');
  }

  getDelay(attempt: number): number {
    // Custom delay calculation
    return Math.min(1000 * attempt, 10000);
  }

  getMaxAttempts(): number {
    return 5;
  }

  reset(): void {
    // Reset any internal state
  }
}
```

### Health Monitor Configuration

```typescript
import { PingHealthMonitor } from '@/services/connection';

const healthMonitor = new PingHealthMonitor(connectionManager, {
  interval: 15000,    // Ping every 15 seconds
  timeout: 5000,      // 5 second timeout
  maxFailures: 5      // Allow 5 consecutive failures
});

// Listen for health events
connectionManager.on('health_update', (health) => {
  console.log('Health update:', health);
  
  if (health.networkQuality === 'poor') {
    // Take action for poor connection quality
    showConnectionWarning();
  }
});
```

### Error Handling Configuration

```typescript
import { 
  ConnectionLogger, 
  RemoteLogHandler,
  AdaptiveRecoveryStrategy 
} from '@/services/connection';

// Configure logging
const logger = ConnectionLogger.getInstance();
logger.setLogLevel('DEBUG');
logger.addHandler(new RemoteLogHandler('/api/logs', 'your-api-key'));

// Configure recovery strategy
const recoveryStrategy = new AdaptiveRecoveryStrategy();

// Handle specific errors
connectionManager.on('error', (errorData) => {
  const { error, context, recoverable } = errorData;
  
  if (error.code === 'AUTHENTICATION_ERROR') {
    // Redirect to login
    window.location.href = '/login';
  } else if (recoverable) {
    // Show user-friendly error message
    showErrorNotification(error.userMessage, error.suggestedActions);
  }
});
```

## Component Usage Examples

### Simple Connection Indicator

```typescript
import { SimpleConnectionDot } from '@/components/connection';

function Navbar() {
  return (
    <nav>
      <div className="nav-items">
        <span>My App</span>
        <SimpleConnectionDot className="ml-2" />
      </div>
    </nav>
  );
}
```

### Latency Display

```typescript
import { ConnectionLatencyBadge } from '@/components/connection';

function StatusBar() {
  return (
    <div className="status-bar">
      <span>Real-time features:</span>
      <ConnectionLatencyBadge />
    </div>
  );
}
```

### Connection Quality Indicator

```typescript
import { ConnectionQualityIndicator } from '@/components/connection';

function Dashboard() {
  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <ConnectionQualityIndicator />
      </header>
      {/* Dashboard content */}
    </div>
  );
}
```

### Health Dashboard

```typescript
import { ConnectionHealthDashboard } from '@/components/connection';

function AdminPanel() {
  return (
    <div className="admin-panel">
      <h2>System Health</h2>
      <ConnectionHealthDashboard 
        showDetailedMetrics
        autoRefresh
        refreshInterval={5000}
      />
    </div>
  );
}
```

### Quick Controls

```typescript
import { QuickConnectionControls } from '@/components/connection';

function Toolbar() {
  return (
    <div className="toolbar">
      <QuickConnectionControls />
      {/* Other toolbar items */}
    </div>
  );
}
```

## Event Handling

### Connection Events

```typescript
const { manager } = useConnectionManager();

useEffect(() => {
  // State changes
  const handleStateChange = (data) => {
    console.log(`Connection state: ${data.from} → ${data.to}`);
  };

  // Connection established
  const handleConnected = (data) => {
    console.log('Connected at:', data.timestamp);
    showSuccessNotification('Connected to server');
  };

  // Connection lost
  const handleDisconnected = (data) => {
    console.log('Disconnected:', data.reason);
    if (!data.manual) {
      showWarningNotification('Connection lost, attempting to reconnect...');
    }
  };

  // Reconnection attempts
  const handleReconnectionAttempt = (data) => {
    console.log(`Reconnection attempt ${data.attempt}/${data.maxAttempts}`);
    showInfoNotification(`Reconnecting... (${data.attempt}/${data.maxAttempts})`);
  };

  // Health updates
  const handleHealthUpdate = (health) => {
    if (health.networkQuality === 'poor') {
      showWarningNotification('Poor connection quality detected');
    }
  };

  // Register listeners
  manager.on('state_change', handleStateChange);
  manager.on('connected', handleConnected);
  manager.on('disconnected', handleDisconnected);
  manager.on('reconnection_attempt', handleReconnectionAttempt);
  manager.on('health_update', handleHealthUpdate);

  return () => {
    // Cleanup listeners
    manager.off('state_change', handleStateChange);
    manager.off('connected', handleConnected);
    manager.off('disconnected', handleDisconnected);
    manager.off('reconnection_attempt', handleReconnectionAttempt);
    manager.off('health_update', handleHealthUpdate);
  };
}, [manager]);
```

### Error Event Handling

```typescript
useEffect(() => {
  const handleError = (errorData) => {
    const { error, context, recoverable } = errorData;
    
    // Log error for debugging
    console.error('Connection error:', error);
    
    // Handle based on error type
    switch (error.code) {
      case 'NETWORK_CONNECTION_ERROR':
        showErrorNotification(
          'Network connection failed',
          'Check your internet connection and try again'
        );
        break;
        
      case 'AUTHENTICATION_ERROR':
        showErrorNotification(
          'Authentication failed',
          'Please refresh the page to re-authenticate',
          () => window.location.reload()
        );
        break;
        
      case 'MAX_RECONNECT_ATTEMPTS':
        showErrorNotification(
          'Unable to restore connection',
          'Please check your network and refresh the page',
          [
            { label: 'Refresh', action: () => window.location.reload() },
            { label: 'Retry', action: () => manager.reconnect() }
          ]
        );
        break;
        
      default:
        if (recoverable) {
          showWarningNotification(
            error.userMessage,
            'The system will automatically retry the connection'
          );
        } else {
          showErrorNotification(
            error.userMessage,
            error.suggestedActions.join('. ')
          );
        }
    }
  };

  manager.on('error', handleError);
  return () => manager.off('error', handleError);
}, [manager]);
```

## Performance Optimization

### Efficient Re-renders

```typescript
// Use memo to prevent unnecessary re-renders
const ConnectionStatus = React.memo(({ showDetails }) => {
  const { isConnected, health } = useConnectionManager();
  
  return (
    <div>
      <span>Status: {isConnected ? 'Online' : 'Offline'}</span>
      {showDetails && health.latency && (
        <span>Latency: {health.latency}ms</span>
      )}
    </div>
  );
});

// Optimize with selective subscriptions
function OptimizedComponent() {
  const { isConnected } = useConnectionManager({
    // Only subscribe to connection state, not all updates
    onStateChange: useCallback((data) => {
      // Handle only state changes
    }, [])
  });
  
  return <div>Connected: {isConnected}</div>;
}
```

### Memory Management

```typescript
// Proper cleanup in components
function ComponentWithConnection() {
  const connectionRef = useRef();
  
  useEffect(() => {
    // Create connection manager instance
    connectionRef.current = new WebSocketConnectionManager({
      url: '/ws'
    });
    
    return () => {
      // Always clean up
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
    };
  }, []);
  
  // Component logic...
}
```

## Troubleshooting

### Common Issues

#### Connection Fails to Establish

```typescript
// Debug connection issues
const { manager } = useConnectionManager({
  onError: (errorData) => {
    console.log('Connection error details:', {
      code: errorData.error.code,
      message: errorData.error.message,
      context: errorData.context,
      recoverable: errorData.recoverable
    });
  }
});

// Check detailed status
const debugConnection = () => {
  const status = manager.getDetailedStatus();
  console.log('Connection debug info:', status);
};
```

#### High Latency Issues

```typescript
// Monitor connection quality
const { health } = useConnectionManager();

useEffect(() => {
  if (health.latency > 1000) {
    console.warn('High latency detected:', health.latency);
    
    // Suggest actions
    showWarningNotification(
      'Slow connection detected',
      'Consider switching to a better network'
    );
  }
}, [health.latency]);
```

#### Memory Leaks

```typescript
// Ensure proper cleanup
useEffect(() => {
  const manager = getGlobalConnectionManager();
  
  // Always remove listeners when component unmounts
  return () => {
    manager.off('state_change', handleStateChange);
    manager.off('error', handleError);
    // Remove all other listeners...
  };
}, []);
```

### Debug Mode

```typescript
// Enable debug logging
import { ConnectionLogger } from '@/services/connection';

// Set debug level
ConnectionLogger.getInstance().setLogLevel('DEBUG');

// Add custom debug handler
class DebugLogHandler implements LogHandler {
  handle(entry: LogEntry): void {
    if (entry.level === 'DEBUG' || entry.level === 'TRACE') {
      console.debug(`[${entry.category}] ${entry.event}:`, entry.data);
    }
  }
}

ConnectionLogger.getInstance().addHandler(new DebugLogHandler());
```

### Performance Monitoring

```typescript
// Monitor performance metrics
const { metrics } = useConnectionManager();

useEffect(() => {
  // Log performance data
  console.log('Connection metrics:', {
    successRate: metrics.successfulConnections / metrics.connectionAttempts,
    averageLatency: metrics.averageLatency,
    totalMessages: metrics.messagesReceived + metrics.messagesSent,
    uptime: Date.now() - (metrics.lastConnectionTime?.getTime() || 0)
  });
}, [metrics]);
```

## Migration Guide

### From useWebSocketSingleton

```typescript
// Before (old pattern)
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';

function OldComponent() {
  const { socket, isConnected } = useWebSocketSingleton({ url: '/ws' });
  
  // Manual connection management
  const handleReconnect = () => {
    socket?.disconnect();
    socket?.connect();
  };
  
  return (
    <div>
      <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      <button onClick={handleReconnect}>Reconnect</button>
    </div>
  );
}

// After (enhanced pattern)
import { useConnectionManager } from '@/hooks/useConnectionManager';
import { ConnectionStatusIndicator, QuickConnectionControls } from '@/components/connection';

function NewComponent() {
  const { socket, isConnected, reconnect } = useConnectionManager({ url: '/ws' });
  
  return (
    <div>
      <ConnectionStatusIndicator showText />
      <QuickConnectionControls />
    </div>
  );
}
```

### Gradual Migration Strategy

1. **Phase 1**: Install new connection management system alongside existing
2. **Phase 2**: Update `useWebSocketSingleton` to use new system internally
3. **Phase 3**: Gradually replace manual connection handling with components
4. **Phase 4**: Remove old connection management code

## Best Practices

### Component Organization

```typescript
// Organize connection-related logic in custom hooks
function useConnectionWithNotifications() {
  const connection = useConnectionManager();
  
  useEffect(() => {
    const handleError = (errorData) => {
      toast.error(errorData.error.userMessage);
    };
    
    const handleConnected = () => {
      toast.success('Connected to server');
    };
    
    connection.manager.on('error', handleError);
    connection.manager.on('connected', handleConnected);
    
    return () => {
      connection.manager.off('error', handleError);
      connection.manager.off('connected', handleConnected);
    };
  }, [connection.manager]);
  
  return connection;
}
```

### Error Boundary Integration

```typescript
class ConnectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    if (error.name === 'ConnectionError') {
      return { hasError: true, error };
    }
    return null;
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Connection Error</h2>
          <p>{this.state.error.userMessage}</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Testing Integration

```typescript
// Mock for testing
export const mockConnectionManager = {
  isConnected: true,
  state: 'connected',
  health: { latency: 50, networkQuality: 'excellent' },
  connect: jest.fn(),
  disconnect: jest.fn(),
  reconnect: jest.fn()
};

// Test utility
export function renderWithConnection(component, connectionState = {}) {
  const mockConnection = { ...mockConnectionManager, ...connectionState };
  
  return render(
    <ConnectionProvider value={mockConnection}>
      {component}
    </ConnectionProvider>
  );
}
```

This comprehensive usage guide should help developers implement and use the connection management system effectively while maintaining backward compatibility and following best practices.