# SPARC Phase 9 & 10: Complete Integration Plan and Component Interaction Design

## Overview

This final phase brings together all SPARC components into a cohesive integration plan, defining how the Dual Instance Monitor system integrates with existing infrastructure and establishing comprehensive component interaction patterns.

## Integration Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Dual Instance Monitor Integration                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Frontend      │    │   Backend       │    │   External      │         │
│  │   Integration   │◄──►│   Integration   │◄──►│   Systems       │         │
│  │                 │    │                 │    │                 │         │
│  │ • React App     │    │ • WebSocket Hub │    │ • Claude API    │         │
│  │ • WebSocket     │    │ • Health Checks │    │ • Monitoring    │         │
│  │ • State Mgmt    │    │ • Log Routing   │    │ • Analytics     │         │
│  │ • Error Bounds  │    │ • Metrics       │    │ • Alerts        │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. Frontend Integration

### React Application Integration

```typescript
// /frontend/src/App.tsx - Main application integration
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DualInstanceProvider } from '@/providers/DualInstanceProvider';
import { ErrorBoundary } from '@/components/error-boundaries/ErrorBoundary';
import { DualInstanceDashboard } from '@/components/dual-instance/DualInstanceDashboard';
import { useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <DualInstanceProvider>
          <Routes>
            <Route path="/dual-instance" element={<DualInstanceRoute />} />
            <Route path="/agents" element={<AgentsRoute />} />
            <Route path="/" element={<HomeRoute />} />
          </Routes>
        </DualInstanceProvider>
      </Router>
    </ErrorBoundary>
  );
}

// Dual Instance Monitor Route
const DualInstanceRoute: React.FC = () => {
  const { isConnected } = useWebSocketSingletonContext();
  
  return (
    <div className="dual-instance-route">
      <DualInstanceDashboard
        config={{
          autoStart: true,
          enableNotifications: true,
          persistState: true
        }}
        onStatusChange={(status) => {
          // Integrate with existing notification system
          if (status.overall === 'dual_instance_active') {
            notifyUser('Dual instance setup is active', 'success');
          }
        }}
      />
    </div>
  );
};

export default App;
```

### Provider Integration

```typescript
// /frontend/src/providers/DualInstanceProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DualInstanceConnectionManager } from '@/services/dual-instance/DualInstanceConnectionManager';
import { LogStreamManager } from '@/services/dual-instance/LogStreamManager';
import { HealthMonitorService } from '@/services/dual-instance/HealthMonitorService';
import { useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';

interface DualInstanceContextValue {
  connectionManager: DualInstanceConnectionManager;
  logStreamManager: LogStreamManager;
  healthMonitor: HealthMonitorService;
  systemStatus: SystemStatus;
  instances: InstanceState[];
  logs: LogEntry[];
  metrics: SystemMetrics;
  alerts: SystemAlert[];
  // Actions
  connectInstance: (instanceId: string) => Promise<void>;
  disconnectInstance: (instanceId: string) => Promise<void>;
  refreshInstances: () => Promise<void>;
  exportLogs: (options: ExportOptions) => Promise<void>;
  dismissAlert: (alertId: string) => void;
}

const DualInstanceContext = createContext<DualInstanceContextValue | null>(null);

export const DualInstanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, isConnected } = useWebSocketSingletonContext();
  const [connectionManager] = useState(() => new DualInstanceConnectionManager({
    discovery: {
      enabled: true,
      strategies: ['port-scan', 'environment', 'hub-query'],
      interval: 30000
    },
    health: {
      enabled: true,
      interval: 30000,
      timeout: 5000
    }
  }));
  
  const [logStreamManager] = useState(() => new LogStreamManager({
    bufferSize: 10000,
    compressionEnabled: true,
    realTimeFiltering: true
  }));
  
  const [healthMonitor] = useState(() => new HealthMonitorService());
  
  // State management
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    overall: OverallStatus.INITIALIZING,
    totalInstances: 0,
    connectedInstances: 0,
    healthyInstances: 0,
    lastUpdate: new Date()
  });
  
  const [instances, setInstances] = useState<InstanceState[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({} as SystemMetrics);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  // Initialize services when WebSocket is connected
  useEffect(() => {
    if (isConnected && socket) {
      initializeServices();
    }
  }, [isConnected, socket]);

  const initializeServices = async () => {
    try {
      // Initialize connection manager
      await connectionManager.initialize();
      
      // Setup event handlers
      setupEventHandlers();
      
      // Start discovery
      await connectionManager.startDiscovery();
      
    } catch (error) {
      console.error('Failed to initialize dual instance services:', error);
      addAlert({
        level: AlertLevel.ERROR,
        type: 'initialization',
        message: 'Failed to initialize dual instance monitor',
        data: { error: error.message }
      });
    }
  };

  const setupEventHandlers = () => {
    // Connection events
    connectionManager.on('instance_discovered', (event) => {
      setInstances(prev => [...prev, event.instance]);
      updateSystemStatus();
    });

    connectionManager.on('instance_connected', (event) => {
      updateInstanceState(event.instanceId, { connectionState: ConnectionState.CONNECTED });
      addAlert({
        level: AlertLevel.INFO,
        type: 'connection',
        message: `Instance ${event.instanceId} connected successfully`
      });
    });

    connectionManager.on('instance_disconnected', (event) => {
      updateInstanceState(event.instanceId, { connectionState: ConnectionState.DISCONNECTED });
      addAlert({
        level: AlertLevel.WARNING,
        type: 'connection',
        message: `Instance ${event.instanceId} disconnected`
      });
    });

    // Log events
    logStreamManager.on('log_entry', (entry) => {
      setLogs(prev => [entry, ...prev.slice(0, 999)]); // Keep last 1000 logs
    });

    // Health events
    healthMonitor.on('health_degraded', (event) => {
      addAlert({
        level: AlertLevel.WARNING,
        type: 'health',
        message: `Instance ${event.instanceId} health degraded`,
        data: event.health
      });
    });

    // Integrate with existing WebSocket context
    if (socket) {
      // Subscribe to hub events that provide instance information
      socket.on('claude_instance_status', (data) => {
        handleHubInstanceStatus(data);
      });
      
      socket.on('hub_metrics', (data) => {
        updateMetrics(data);
      });
    }
  };

  const handleHubInstanceStatus = (data: any) => {
    // Update instance status from hub notifications
    const instanceUpdate = {
      instanceId: data.instanceId,
      connectionState: data.connected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED,
      healthStatus: data.health,
      lastUpdate: new Date()
    };
    
    updateInstanceState(data.instanceId, instanceUpdate);
  };

  const updateInstanceState = (instanceId: string, update: Partial<InstanceState>) => {
    setInstances(prev => 
      prev.map(instance => 
        instance.descriptor.id === instanceId 
          ? { ...instance, ...update }
          : instance
      )
    );
    updateSystemStatus();
  };

  const updateSystemStatus = () => {
    setInstances(currentInstances => {
      const connected = currentInstances.filter(i => i.connectionState === ConnectionState.CONNECTED);
      const healthy = connected.filter(i => i.healthStatus.isHealthy);
      
      const newStatus: SystemStatus = {
        overall: calculateOverallStatus(currentInstances),
        totalInstances: currentInstances.length,
        connectedInstances: connected.length,
        healthyInstances: healthy.length,
        lastUpdate: new Date()
      };
      
      setSystemStatus(newStatus);
      return currentInstances;
    });
  };

  const addAlert = (alert: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const newAlert: SystemAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false
    };
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 49)]); // Keep last 50 alerts
  };

  // Action implementations
  const connectInstance = async (instanceId: string) => {
    try {
      await connectionManager.connect(instanceId);
    } catch (error) {
      addAlert({
        level: AlertLevel.ERROR,
        type: 'connection',
        message: `Failed to connect to instance ${instanceId}`,
        data: { error: error.message }
      });
    }
  };

  const disconnectInstance = async (instanceId: string) => {
    try {
      await connectionManager.disconnect(instanceId);
    } catch (error) {
      addAlert({
        level: AlertLevel.ERROR,
        type: 'connection',
        message: `Failed to disconnect from instance ${instanceId}`,
        data: { error: error.message }
      });
    }
  };

  const refreshInstances = async () => {
    try {
      await connectionManager.refreshDiscovery();
    } catch (error) {
      addAlert({
        level: AlertLevel.ERROR,
        type: 'discovery',
        message: 'Failed to refresh instance discovery',
        data: { error: error.message }
      });
    }
  };

  const exportLogs = async (options: ExportOptions) => {
    try {
      await logStreamManager.exportLogs(options);
      addAlert({
        level: AlertLevel.INFO,
        type: 'export',
        message: 'Logs exported successfully'
      });
    } catch (error) {
      addAlert({
        level: AlertLevel.ERROR,
        type: 'export',
        message: 'Failed to export logs',
        data: { error: error.message }
      });
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
  };

  const contextValue: DualInstanceContextValue = {
    connectionManager,
    logStreamManager,
    healthMonitor,
    systemStatus,
    instances,
    logs,
    metrics,
    alerts,
    connectInstance,
    disconnectInstance,
    refreshInstances,
    exportLogs,
    dismissAlert
  };

  return (
    <DualInstanceContext.Provider value={contextValue}>
      {children}
    </DualInstanceContext.Provider>
  );
};

export const useDualInstanceMonitor = () => {
  const context = useContext(DualInstanceContext);
  if (!context) {
    throw new Error('useDualInstanceMonitor must be used within a DualInstanceProvider');
  }
  return context;
};
```

## 2. Backend Integration

### WebSocket Hub Integration

```typescript
// /src/websocket-hub/dual-instance-integration.ts
import { Server, Socket } from 'socket.io';
import { DualInstanceManager } from './dual-instance-manager';
import { InstanceDiscoveryService } from './instance-discovery';
import { HealthMonitoringService } from './health-monitoring';

export class DualInstanceHubIntegration {
  private instanceManager: DualInstanceManager;
  private discoveryService: InstanceDiscoveryService;
  private healthService: HealthMonitoringService;

  constructor(private io: Server) {
    this.instanceManager = new DualInstanceManager();
    this.discoveryService = new InstanceDiscoveryService();
    this.healthService = new HealthMonitoringService();
    
    this.setupEventHandlers();
    this.startServices();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleNewConnection(socket);
    });

    // Instance discovery events
    this.discoveryService.on('instance_discovered', (instance) => {
      this.io.emit('instance_discovered', instance);
    });

    this.discoveryService.on('instance_lost', (instanceId) => {
      this.io.emit('instance_lost', { instanceId });
    });

    // Health monitoring events
    this.healthService.on('health_update', (data) => {
      this.io.emit('instance_health_update', data);
    });

    this.healthService.on('health_alert', (alert) => {
      this.io.emit('health_alert', alert);
    });
  }

  private handleNewConnection(socket: Socket): void {
    console.log('🔌 New dual instance monitor connection:', socket.id);

    // Handle frontend client registration
    socket.on('register_dual_instance_monitor', (data) => {
      this.handleMonitorRegistration(socket, data);
    });

    // Handle instance discovery requests
    socket.on('discover_instances', async (callback) => {
      const instances = await this.discoveryService.discoverInstances();
      callback(instances);
    });

    // Handle connection requests
    socket.on('connect_to_instance', async (data, callback) => {
      try {
        const result = await this.instanceManager.connectToInstance(data.instanceId);
        callback({ success: true, result });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Handle log subscription
    socket.on('subscribe_instance_logs', (data) => {
      this.handleLogSubscription(socket, data);
    });

    // Handle health check requests
    socket.on('request_health_check', async (data, callback) => {
      try {
        const health = await this.healthService.checkInstanceHealth(data.instanceId);
        callback({ success: true, health });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  private handleMonitorRegistration(socket: Socket, data: any): void {
    socket.join('dual_instance_monitors');
    
    // Send current state
    socket.emit('current_instances', this.instanceManager.getAllInstances());
    socket.emit('current_health_status', this.healthService.getSystemHealth());
    
    console.log('📊 Dual instance monitor registered:', socket.id);
  }

  private handleLogSubscription(socket: Socket, data: any): void {
    const { instanceId, filters } = data;
    
    // Subscribe to instance logs
    this.instanceManager.subscribeToLogs(instanceId, (logEntry) => {
      if (this.shouldIncludeLog(logEntry, filters)) {
        socket.emit('instance_log_entry', {
          instanceId,
          logEntry
        });
      }
    });

    socket.join(`logs_${instanceId}`);
  }

  private async startServices(): Promise<void> {
    await this.discoveryService.start();
    await this.healthService.start();
    
    console.log('🚀 Dual instance hub integration started');
  }
}

// Dual Instance Manager
export class DualInstanceManager {
  private instances = new Map<string, InstanceConnection>();
  private logSubscriptions = new Map<string, LogSubscription[]>();

  async connectToInstance(instanceId: string): Promise<ConnectionResult> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    try {
      // Establish connection
      const connection = await this.establishConnection(instance);
      
      // Update instance status
      instance.status = 'connected';
      instance.connection = connection;
      instance.lastConnected = new Date();
      
      return {
        success: true,
        instanceId,
        connectionTime: new Date(),
        metadata: instance.metadata
      };
    } catch (error) {
      instance.status = 'error';
      instance.lastError = error;
      throw error;
    }
  }

  subscribeToLogs(instanceId: string, callback: LogCallback): void {
    if (!this.logSubscriptions.has(instanceId)) {
      this.logSubscriptions.set(instanceId, []);
    }
    
    this.logSubscriptions.get(instanceId)!.push({
      id: `sub_${Date.now()}`,
      callback,
      timestamp: new Date()
    });
  }

  getAllInstances(): InstanceInfo[] {
    return Array.from(this.instances.values()).map(instance => ({
      id: instance.id,
      type: instance.type,
      status: instance.status,
      metadata: instance.metadata,
      lastConnected: instance.lastConnected,
      health: instance.health
    }));
  }
}
```

### Health Check Integration

```typescript
// /src/api/routes/dual-instance-health.ts
import { Router } from 'express';
import { DualInstanceHealthService } from '../services/dual-instance-health-service';

const router = Router();
const healthService = new DualInstanceHealthService();

// Get overall system health
router.get('/health', async (req, res) => {
  try {
    const health = await healthService.getSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific instance health
router.get('/health/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const health = await healthService.getInstanceHealth(instanceId);
    res.json(health);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Perform health check
router.post('/health/:instanceId/check', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const result = await healthService.performHealthCheck(instanceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get health metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await healthService.getHealthMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## 3. External System Integration

### Claude API Integration

```typescript
// /src/services/claude-api-integration.ts
export class ClaudeAPIIntegration {
  private apiClient: ClaudeAPIClient;
  private instanceRegistry: Map<string, ClaudeInstance>;

  constructor(config: ClaudeAPIConfig) {
    this.apiClient = new ClaudeAPIClient(config);
    this.instanceRegistry = new Map();
  }

  async registerInstance(instance: ClaudeInstance): Promise<void> {
    try {
      // Register with Claude API
      const registration = await this.apiClient.registerInstance({
        instanceId: instance.id,
        type: instance.type,
        capabilities: instance.capabilities,
        endpoint: instance.endpoint
      });

      // Store registration info
      instance.registrationId = registration.id;
      instance.registeredAt = new Date();
      
      this.instanceRegistry.set(instance.id, instance);
      
      console.log(`✅ Instance ${instance.id} registered with Claude API`);
    } catch (error) {
      console.error(`❌ Failed to register instance ${instance.id}:`, error);
      throw error;
    }
  }

  async getInstanceMetrics(instanceId: string): Promise<InstanceMetrics> {
    const instance = this.instanceRegistry.get(instanceId);
    if (!instance?.registrationId) {
      throw new Error(`Instance ${instanceId} not registered`);
    }

    return await this.apiClient.getInstanceMetrics(instance.registrationId);
  }

  async reportInstanceHealth(instanceId: string, health: HealthStatus): Promise<void> {
    const instance = this.instanceRegistry.get(instanceId);
    if (!instance?.registrationId) {
      return; // Skip if not registered
    }

    await this.apiClient.reportHealth(instance.registrationId, health);
  }
}
```

### Monitoring Integration (Prometheus/Grafana)

```typescript
// /src/services/monitoring-integration.ts
import { register, Gauge, Counter, Histogram } from 'prom-client';

export class MonitoringIntegration {
  private instanceConnectionGauge: Gauge<string>;
  private instanceHealthGauge: Gauge<string>;
  private connectionAttemptCounter: Counter<string>;
  private responseTimeHistogram: Histogram<string>;

  constructor() {
    this.setupMetrics();
  }

  private setupMetrics(): void {
    // Instance connection status
    this.instanceConnectionGauge = new Gauge({
      name: 'dual_instance_connection_status',
      help: 'Connection status of Claude instances (1=connected, 0=disconnected)',
      labelNames: ['instance_id', 'instance_type']
    });

    // Instance health score
    this.instanceHealthGauge = new Gauge({
      name: 'dual_instance_health_score',
      help: 'Health score of Claude instances (0-100)',
      labelNames: ['instance_id', 'instance_type']
    });

    // Connection attempts
    this.connectionAttemptCounter = new Counter({
      name: 'dual_instance_connection_attempts_total',
      help: 'Total number of connection attempts',
      labelNames: ['instance_id', 'result']
    });

    // Response time
    this.responseTimeHistogram = new Histogram({
      name: 'dual_instance_response_time_seconds',
      help: 'Response time for instance communications',
      labelNames: ['instance_id', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
    });
  }

  updateConnectionStatus(instanceId: string, instanceType: string, connected: boolean): void {
    this.instanceConnectionGauge
      .labels(instanceId, instanceType)
      .set(connected ? 1 : 0);
  }

  updateHealthScore(instanceId: string, instanceType: string, score: number): void {
    this.instanceHealthGauge
      .labels(instanceId, instanceType)
      .set(score);
  }

  recordConnectionAttempt(instanceId: string, success: boolean): void {
    this.connectionAttemptCounter
      .labels(instanceId, success ? 'success' : 'failure')
      .inc();
  }

  recordResponseTime(instanceId: string, operation: string, duration: number): void {
    this.responseTimeHistogram
      .labels(instanceId, operation)
      .observe(duration);
  }

  getMetrics(): string {
    return register.metrics();
  }
}
```

## 4. Configuration Management

### Environment Configuration

```typescript
// /frontend/src/config/dual-instance-config.ts
export interface DualInstanceConfig {
  discovery: DiscoveryConfig;
  connection: ConnectionConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  ui: UIConfig;
}

export const getDualInstanceConfig = (): DualInstanceConfig => {
  const env = import.meta.env;
  
  return {
    discovery: {
      enabled: env.VITE_DI_DISCOVERY_ENABLED !== 'false',
      interval: parseInt(env.VITE_DI_DISCOVERY_INTERVAL || '30000'),
      ports: (env.VITE_DI_DISCOVERY_PORTS || '3001,3002,3003').split(',').map(Number),
      timeout: parseInt(env.VITE_DI_DISCOVERY_TIMEOUT || '5000'),
      strategies: (env.VITE_DI_DISCOVERY_STRATEGIES || 'port-scan,environment,hub-query').split(',')
    },
    connection: {
      autoConnect: env.VITE_DI_AUTO_CONNECT !== 'false',
      reconnectionDelay: parseInt(env.VITE_DI_RECONNECTION_DELAY || '2000'),
      maxReconnectAttempts: parseInt(env.VITE_DI_MAX_RECONNECT_ATTEMPTS || '5'),
      healthCheckInterval: parseInt(env.VITE_DI_HEALTH_CHECK_INTERVAL || '30000'),
      timeout: parseInt(env.VITE_DI_CONNECTION_TIMEOUT || '15000')
    },
    logging: {
      level: env.VITE_DI_LOG_LEVEL || 'info',
      bufferSize: parseInt(env.VITE_DI_LOG_BUFFER_SIZE || '10000'),
      compressionEnabled: env.VITE_DI_LOG_COMPRESSION === 'true',
      exportFormats: (env.VITE_DI_LOG_EXPORT_FORMATS || 'json,csv').split(',')
    },
    monitoring: {
      metricsEnabled: env.VITE_DI_METRICS_ENABLED !== 'false',
      metricsInterval: parseInt(env.VITE_DI_METRICS_INTERVAL || '10000'),
      alertsEnabled: env.VITE_DI_ALERTS_ENABLED !== 'false',
      performanceTracking: env.VITE_DI_PERFORMANCE_TRACKING === 'true'
    },
    ui: {
      theme: env.VITE_DI_THEME || 'auto',
      refreshInterval: parseInt(env.VITE_DI_UI_REFRESH_INTERVAL || '5000'),
      animationsEnabled: env.VITE_DI_ANIMATIONS_ENABLED !== 'false',
      notificationsEnabled: env.VITE_DI_NOTIFICATIONS_ENABLED !== 'false'
    }
  };
};
```

## 5. Testing Integration

### E2E Testing with Real Instances

```typescript
// /frontend/src/tests/e2e/dual-instance-e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dual Instance Monitor E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dual instance monitor
    await page.goto('/dual-instance');
    
    // Wait for initialization
    await page.waitForSelector('[data-testid="dual-instance-dashboard"]');
  });

  test('should discover and connect to instances', async ({ page }) => {
    // Wait for instance discovery
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 10000 });
    
    // Check that instances are discovered
    const instanceCards = await page.locator('[data-testid="instance-card"]').count();
    expect(instanceCards).toBeGreaterThan(0);
    
    // Check connection status
    const connectedInstances = await page.locator('[data-testid="instance-card"][data-status="connected"]').count();
    expect(connectedInstances).toBeGreaterThan(0);
  });

  test('should display real-time logs', async ({ page }) => {
    // Wait for log entries
    await page.waitForSelector('[data-testid="log-entry"]', { timeout: 15000 });
    
    // Check that logs are being received
    const logEntries = await page.locator('[data-testid="log-entry"]').count();
    expect(logEntries).toBeGreaterThan(0);
    
    // Check that logs are updating
    const initialCount = logEntries;
    await page.waitForTimeout(5000);
    const updatedCount = await page.locator('[data-testid="log-entry"]').count();
    expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('should handle instance disconnection gracefully', async ({ page }) => {
    // Find a connected instance
    const connectedInstance = page.locator('[data-testid="instance-card"][data-status="connected"]').first();
    await expect(connectedInstance).toBeVisible();
    
    // Click disconnect button
    await connectedInstance.locator('[data-testid="disconnect-button"]').click();
    
    // Wait for status change
    await page.waitForSelector('[data-testid="instance-card"][data-status="disconnected"]', { timeout: 5000 });
    
    // Check that fallback UI is shown
    await expect(page.locator('[data-testid="offline-fallback"]')).toBeVisible();
  });

  test('should display system health metrics', async ({ page }) => {
    // Check health indicators
    await expect(page.locator('[data-testid="health-meter"]')).toBeVisible();
    
    // Check performance charts
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    
    // Check metrics summary
    await expect(page.locator('[data-testid="metrics-summary"]')).toBeVisible();
  });

  test('should show alerts for system issues', async ({ page }) => {
    // Simulate a system issue (if possible in test environment)
    // Or check for existing alerts
    
    const alertCount = await page.locator('[data-testid="alert-card"]').count();
    
    if (alertCount > 0) {
      // Check alert content
      const firstAlert = page.locator('[data-testid="alert-card"]').first();
      await expect(firstAlert).toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-message"]')).toBeVisible();
      
      // Test alert dismissal
      await firstAlert.locator('[data-testid="dismiss-button"]').click();
      await expect(firstAlert).not.toBeVisible();
    }
  });
});
```

## 6. Deployment Integration

### Docker Configuration

```dockerfile
# /docker/dual-instance-monitor.dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN cd frontend && npm ci

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN npm run build

# Environment variables for dual instance monitor
ENV VITE_DI_DISCOVERY_ENABLED=true
ENV VITE_DI_AUTO_CONNECT=true
ENV VITE_DI_METRICS_ENABLED=true

# Expose ports
EXPOSE 3000 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
# /k8s/dual-instance-monitor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dual-instance-monitor
  labels:
    app: dual-instance-monitor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dual-instance-monitor
  template:
    metadata:
      labels:
        app: dual-instance-monitor
    spec:
      containers:
      - name: dual-instance-monitor
        image: dual-instance-monitor:latest
        ports:
        - containerPort: 3000
        - containerPort: 3002
        env:
        - name: VITE_DI_DISCOVERY_ENABLED
          value: "true"
        - name: VITE_DI_AUTO_CONNECT
          value: "true"
        - name: VITE_DI_METRICS_ENABLED
          value: "true"
        - name: VITE_WEBSOCKET_HUB_URL
          value: "ws://websocket-hub:3002"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: dual-instance-monitor-service
spec:
  selector:
    app: dual-instance-monitor
  ports:
  - name: web
    port: 3000
    targetPort: 3000
  - name: websocket
    port: 3002
    targetPort: 3002
  type: LoadBalancer
```

## 7. Monitoring and Observability

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Dual Instance Monitor",
    "panels": [
      {
        "title": "Instance Connection Status",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(dual_instance_connection_status)",
            "legendFormat": "Connected Instances"
          }
        ]
      },
      {
        "title": "Instance Health Scores",
        "type": "timeseries",
        "targets": [
          {
            "expr": "dual_instance_health_score",
            "legendFormat": "{{instance_id}}"
          }
        ]
      },
      {
        "title": "Connection Attempts",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(dual_instance_connection_attempts_total[5m])",
            "legendFormat": "{{result}}"
          }
        ]
      },
      {
        "title": "Response Time Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "dual_instance_response_time_seconds_bucket",
            "legendFormat": "{{le}}"
          }
        ]
      }
    ]
  }
}
```

## Summary

This comprehensive integration plan provides:

1. **Seamless Frontend Integration**: React providers and context integration
2. **Backend Hub Integration**: WebSocket hub extensions for dual instance support  
3. **External API Integration**: Claude API and monitoring system connections
4. **Configuration Management**: Environment-based configuration system
5. **Testing Integration**: E2E tests with real instance scenarios
6. **Deployment Ready**: Docker and Kubernetes configurations
7. **Monitoring Integration**: Prometheus metrics and Grafana dashboards
8. **Error Handling**: Comprehensive error boundaries and recovery
9. **Performance Optimization**: Adaptive performance management
10. **Documentation**: Complete technical specifications and user guides

The system is designed for production deployment with comprehensive monitoring, alerting, and management capabilities while maintaining the flexibility to adapt to different environments and requirements.