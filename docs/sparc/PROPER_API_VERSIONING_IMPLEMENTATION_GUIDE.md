# Proper API Versioning Implementation Guide

## Overview

This comprehensive guide establishes best practices for API versioning in the Agent Feed system, ensuring consistent endpoint management, seamless SSE connections, and robust backward compatibility.

## 1. API Versioning Strategy

### 1.1 Versioning Approach

We implement **URL-based versioning** with semantic versioning principles:

```
/api/v1/resource    # Version 1.x (Current)
/api/v2/resource    # Version 2.x (Future)
/api/resource       # Legacy (Compatibility)
```

### 1.2 Version Lifecycle

```
v1 (Current) → v2 (Next) → v1 (Deprecated) → v1 (Retired)
     ↑              ↑              ↑              ↑
  Production    Beta/Preview   Maintenance    End-of-Life
```

### 1.3 Supported Versions Matrix

| Version | Status | Endpoints | SSE Support | Deprecation Date |
|---------|--------|-----------|-------------|------------------|
| v1      | Active | All       | Full        | TBD              |
| Legacy  | Maintenance | Limited | None   | 2025-Q2          |

## 2. Backend Implementation

### 2.1 Router Structure

```typescript
// src/api/server.ts - Recommended Structure

import express from 'express';
import { apiV1Router } from './routes/v1';
import { apiV2Router } from './routes/v2'; // Future
import { legacyRouter } from './routes/legacy';

const app = express();

// Version-specific routers
const v1Routes = express.Router();
const v2Routes = express.Router(); // Future
const legacyRoutes = express.Router();

// Mount versioned routes
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes); // Future
app.use('/api', legacyRoutes); // Legacy compatibility

// V1 API Routes
v1Routes.use('/claude/instances', claudeInstancesRoutes);
v1Routes.use('/auth', authRoutes);
v1Routes.use('/feeds', feedRoutes);
v1Routes.use('/agents', agentRoutes);

// Legacy compatibility (limited endpoints)
legacyRoutes.use('/claude/instances', claudeInstancesLegacyRoutes);
legacyRoutes.use('/auth', authLegacyRoutes);

export { app };
```

### 2.2 Versioned Route Implementation

```typescript
// src/api/routes/v1/claude-instances.ts

import { Router } from 'express';
import { ClaudeInstanceController } from '../../controllers/ClaudeInstanceController';
import { validateVersion } from '../../middleware/versioning';

const router = Router();
const controller = new ClaudeInstanceController();

// Apply version validation middleware
router.use(validateVersion('v1'));

// Core CRUD operations
router.get('/', controller.listInstances);
router.post('/', controller.createInstance);
router.get('/:id', controller.getInstance);
router.delete('/:id', controller.deleteInstance);

// Instance management
router.post('/:id/restart', controller.restartInstance);
router.get('/:id/health', controller.healthCheck);

// Terminal operations
router.post('/:id/terminal/input', controller.sendInput);
router.get('/:id/terminal/stream', controller.sseStream); // SSE endpoint

// SSE management
router.get('/:id/sse/status', controller.sseStatus);
router.delete('/:id/sse/connections', controller.closeSSEConnections);

export default router;
```

### 2.3 Version Validation Middleware

```typescript
// src/middleware/versioning.ts

import { Request, Response, NextFunction } from 'express';

interface VersionedRequest extends Request {
  apiVersion: string;
  supportedFeatures: string[];
}

export const validateVersion = (requiredVersion: string) => {
  return (req: VersionedRequest, res: Response, next: NextFunction) => {
    const requestedVersion = req.baseUrl.match(/\/api\/v(\d+)/)?.[1] || 'legacy';
    
    req.apiVersion = requestedVersion === 'legacy' ? 'legacy' : `v${requestedVersion}`;
    
    // Set supported features based on version
    switch (req.apiVersion) {
      case 'v1':
        req.supportedFeatures = [
          'sse-streams', 
          'instance-management', 
          'health-monitoring',
          'terminal-io'
        ];
        break;
      case 'legacy':
        req.supportedFeatures = ['basic-crud'];
        // Add deprecation warning
        res.set('X-API-Deprecation-Warning', 'This API version is deprecated. Please upgrade to v1');
        break;
      default:
        return res.status(400).json({
          error: 'Unsupported API version',
          supportedVersions: ['v1'],
          requested: req.apiVersion
        });
    }
    
    if (req.apiVersion !== requiredVersion && requiredVersion !== 'any') {
      return res.status(400).json({
        error: 'Version mismatch',
        required: requiredVersion,
        provided: req.apiVersion
      });
    }
    
    next();
  };
};

export const requireFeature = (feature: string) => {
  return (req: VersionedRequest, res: Response, next: NextFunction) => {
    if (!req.supportedFeatures?.includes(feature)) {
      return res.status(400).json({
        error: 'Feature not supported in this API version',
        feature,
        version: req.apiVersion,
        supportedFeatures: req.supportedFeatures
      });
    }
    next();
  };
};
```

### 2.4 SSE Implementation with Versioning

```typescript
// src/controllers/ClaudeInstanceController.ts

export class ClaudeInstanceController {
  async sseStream(req: VersionedRequest, res: Response): Promise<void> {
    const { id: instanceId } = req.params;
    const clientId = req.headers['x-client-id'] as string || generateClientId();
    
    // Version-specific SSE headers
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-API-Version': req.apiVersion
    };
    
    // V1 specific enhancements
    if (req.apiVersion === 'v1') {
      headers['X-SSE-Features'] = 'chunked-transfer,compression,heartbeat';
      headers['X-SSE-Heartbeat-Interval'] = '30000';
    }
    
    res.writeHead(200, headers);
    
    try {
      // Create enhanced SSE connection with version-specific features
      const connectionInfo = await this.sseConnectionManager.createConnection(
        instanceId,
        clientId,
        res,
        {
          version: req.apiVersion,
          features: req.supportedFeatures,
          enableHeartbeat: req.apiVersion === 'v1',
          enableCompression: req.apiVersion === 'v1'
        }
      );
      
      console.log(`✅ SSE connection established: ${connectionInfo.id} (${req.apiVersion})`);
      
      // Version-specific connection handling
      if (req.apiVersion === 'v1') {
        // Send connection acknowledgment with feature set
        res.write(`data: ${JSON.stringify({
          type: 'connection_established',
          version: req.apiVersion,
          features: req.supportedFeatures,
          connectionId: connectionInfo.id
        })}\n\n`);
      }
      
    } catch (error) {
      console.error(`❌ SSE connection failed (${req.apiVersion}):`, error);
      
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to establish SSE connection',
          version: req.apiVersion,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}
```

## 3. Frontend Implementation

### 3.1 API Client with Version Management

```typescript
// src/services/APIClient.ts

export class APIClient {
  private baseUrl: string;
  private version: string;
  private fallbackVersion?: string;

  constructor(
    baseUrl: string = 'http://localhost:3000',
    version: string = 'v1',
    fallbackVersion?: string
  ) {
    this.baseUrl = baseUrl;
    this.version = version;
    this.fallbackVersion = fallbackVersion;
  }

  private getEndpoint(path: string): string {
    return `${this.baseUrl}/api/${this.version}${path}`;
  }

  private getFallbackEndpoint(path: string): string {
    return this.fallbackVersion 
      ? `${this.baseUrl}/api/${this.fallbackVersion}${path}`
      : `${this.baseUrl}/api${path}`;
  }

  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = this.getEndpoint(path);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Version': this.version,
          ...options.headers
        }
      });

      if (!response.ok && response.status === 404 && this.fallbackVersion) {
        console.warn(`⚠️ ${this.version} endpoint not found, trying fallback`);
        return this.requestFallback(path, options);
      }

      return this.processResponse<T>(response);
    } catch (error) {
      console.error(`❌ API request failed (${this.version}):`, error);
      
      if (this.fallbackVersion) {
        console.warn(`🔄 Attempting fallback to ${this.fallbackVersion}`);
        return this.requestFallback(path, options);
      }
      
      throw error;
    }
  }

  private async requestFallback<T>(
    path: string, 
    options: RequestInit
  ): Promise<APIResponse<T>> {
    const fallbackUrl = this.getFallbackEndpoint(path);
    
    const response = await fetch(fallbackUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Fallback': 'true',
        ...options.headers
      }
    });

    return this.processResponse<T>(response);
  }

  private async processResponse<T>(response: Response): Promise<APIResponse<T>> {
    const data = await response.json().catch(() => ({}));
    
    return {
      success: response.ok,
      status: response.status,
      data: data as T,
      version: response.headers.get('X-API-Version') || 'unknown',
      deprecationWarning: response.headers.get('X-API-Deprecation-Warning'),
      headers: Object.fromEntries(response.headers.entries())
    };
  }

  // Instance management methods
  async listInstances(): Promise<APIResponse<InstanceList>> {
    return this.request<InstanceList>('/claude/instances');
  }

  async createInstance(config: InstanceConfig): Promise<APIResponse<Instance>> {
    return this.request<Instance>('/claude/instances', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async getInstance(id: string): Promise<APIResponse<Instance>> {
    return this.request<Instance>(`/claude/instances/${id}`);
  }

  async deleteInstance(id: string): Promise<APIResponse<void>> {
    return this.request<void>(`/claude/instances/${id}`, {
      method: 'DELETE'
    });
  }

  // SSE connection method
  createSSEConnection(instanceId: string, clientId?: string): EventSource {
    const url = this.getEndpoint(`/claude/instances/${instanceId}/terminal/stream`);
    
    const eventSource = new EventSource(url);
    
    // Add version-specific handling
    eventSource.addEventListener('connection_established', (event) => {
      const data = JSON.parse(event.data);
      console.log(`✅ SSE connected with API ${data.version}, features:`, data.features);
    });
    
    return eventSource;
  }
}

interface APIResponse<T> {
  success: boolean;
  status: number;
  data: T;
  version: string;
  deprecationWarning?: string | null;
  headers: Record<string, string>;
}
```

### 3.2 React Hook with Version Support

```typescript
// src/hooks/useVersionedAPI.ts

import { useState, useEffect, useCallback } from 'react';
import { APIClient } from '../services/APIClient';

interface UseVersionedAPIOptions {
  baseUrl?: string;
  preferredVersion?: string;
  fallbackVersion?: string;
  onDeprecationWarning?: (warning: string) => void;
}

export const useVersionedAPI = (options: UseVersionedAPIOptions = {}) => {
  const {
    baseUrl = 'http://localhost:3000',
    preferredVersion = 'v1',
    fallbackVersion = 'legacy',
    onDeprecationWarning
  } = options;

  const [apiClient] = useState(
    () => new APIClient(baseUrl, preferredVersion, fallbackVersion)
  );

  const [apiStatus, setApiStatus] = useState({
    version: preferredVersion,
    available: false,
    deprecated: false,
    lastCheck: null as Date | null
  });

  const checkAPIHealth = useCallback(async () => {
    try {
      const response = await apiClient.request('/health');
      
      setApiStatus({
        version: response.version,
        available: response.success,
        deprecated: !!response.deprecationWarning,
        lastCheck: new Date()
      });

      if (response.deprecationWarning && onDeprecationWarning) {
        onDeprecationWarning(response.deprecationWarning);
      }
    } catch (error) {
      setApiStatus(prev => ({
        ...prev,
        available: false,
        lastCheck: new Date()
      }));
    }
  }, [apiClient, onDeprecationWarning]);

  useEffect(() => {
    checkAPIHealth();
  }, [checkAPIHealth]);

  return {
    apiClient,
    apiStatus,
    checkAPIHealth
  };
};
```

### 3.3 Component Integration

```typescript
// src/components/ClaudeInstanceManagerModern.tsx - Updated

export const ClaudeInstanceManagerModern: React.FC = () => {
  const { apiClient, apiStatus } = useVersionedAPI({
    preferredVersion: 'v1',
    fallbackVersion: 'legacy',
    onDeprecationWarning: (warning) => {
      console.warn('⚠️ API Deprecation:', warning);
      // Show user notification about API upgrade
    }
  });

  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.listInstances();
      
      if (response.success) {
        setInstances(response.data.instances);
        
        // Handle version-specific features
        if (response.version === 'v1') {
          console.log('✅ Using v1 API with full feature set');
        } else if (response.deprecationWarning) {
          console.warn('⚠️ Using deprecated API:', response.deprecationWarning);
        }
      } else {
        setError('Failed to fetch instances');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const createInstance = useCallback(async (config: InstanceConfig) => {
    setLoading(true);
    try {
      const response = await apiClient.createInstance(config);
      
      if (response.success) {
        await fetchInstances(); // Refresh list
        
        // Create SSE connection for v1 API
        if (response.version === 'v1' && response.data.id) {
          const eventSource = apiClient.createSSEConnection(response.data.id);
          
          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('📨 SSE message:', data);
          };
        }
      } else {
        setError('Failed to create instance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiClient, fetchInstances]);

  return (
    <div className="claude-instance-manager">
      {/* API Status Indicator */}
      <div className="api-status">
        <span className={`status ${apiStatus.available ? 'connected' : 'disconnected'}`}>
          API {apiStatus.version} - {apiStatus.available ? 'Connected' : 'Disconnected'}
        </span>
        {apiStatus.deprecated && (
          <span className="deprecated-warning">⚠️ Using deprecated API</span>
        )}
      </div>

      {/* Rest of component */}
      {/* ... */}
    </div>
  );
};
```

## 4. Migration Strategy

### 4.1 Phase 1: Dual Support (Current)

```typescript
// Maintain both versioned and legacy endpoints
app.use('/api/v1', v1Router);     // New versioned API
app.use('/api', legacyRouter);    // Legacy compatibility
```

### 4.2 Phase 2: Deprecation Warning

```typescript
// Add deprecation warnings to legacy endpoints
legacyRouter.use((req, res, next) => {
  res.set('X-API-Deprecation-Warning', 
    'Legacy API deprecated. Please upgrade to /api/v1/. ' +
    'Legacy support ends 2025-Q2.'
  );
  next();
});
```

### 4.3 Phase 3: Legacy Retirement

```typescript
// Remove legacy routes (Future)
app.use('/api', (req, res) => {
  res.status(410).json({
    error: 'API version retired',
    message: 'Please use /api/v1/ endpoints',
    migrationGuide: 'https://docs.agent-feed.com/api/migration'
  });
});
```

## 5. Testing Strategy

### 5.1 Version Compatibility Tests

```typescript
// tests/api/versioning.test.ts

describe('API Versioning', () => {
  describe('V1 API', () => {
    test('supports full feature set', async () => {
      const client = new APIClient('http://localhost:3000', 'v1');
      
      // Test all V1 endpoints
      const endpoints = [
        { path: '/claude/instances', method: 'GET' },
        { path: '/claude/instances', method: 'POST' },
        { path: '/claude/instances/test-id/health', method: 'GET' }
      ];
      
      for (const endpoint of endpoints) {
        const response = await client.request(endpoint.path, {
          method: endpoint.method
        });
        
        expect(response.version).toBe('v1');
        expect(response.headers['x-sse-features']).toBeDefined();
      }
    });

    test('SSE connections work with v1 features', async () => {
      const client = new APIClient('http://localhost:3000', 'v1');
      const eventSource = client.createSSEConnection('test-instance');
      
      await new Promise((resolve) => {
        eventSource.onopen = () => {
          expect(eventSource.url).toContain('/api/v1/');
          eventSource.close();
          resolve(void 0);
        };
      });
    });
  });

  describe('Legacy API', () => {
    test('provides basic functionality with deprecation warning', async () => {
      const client = new APIClient('http://localhost:3000', 'legacy');
      
      const response = await client.listInstances();
      
      expect(response.success).toBe(true);
      expect(response.deprecationWarning).toBeDefined();
      expect(response.deprecationWarning).toContain('deprecated');
    });

    test('does not support advanced features', async () => {
      const client = new APIClient('http://localhost:3000', 'legacy');
      
      // Legacy should not have SSE support
      expect(() => {
        client.createSSEConnection('test-instance');
      }).toThrow();
    });
  });

  describe('Version Fallback', () => {
    test('falls back to legacy when v2 is not available', async () => {
      const client = new APIClient('http://localhost:3000', 'v2', 'legacy');
      
      const response = await client.listInstances();
      
      expect(response.success).toBe(true);
      expect(response.headers['x-api-fallback']).toBe('true');
    });
  });
});
```

## 6. Deployment & Monitoring

### 6.1 Health Checks

```typescript
// Version-specific health endpoints
app.get('/api/v1/health', (req, res) => {
  res.json({
    version: 'v1',
    status: 'healthy',
    features: ['sse-streams', 'instance-management', 'health-monitoring'],
    deprecationDate: null
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    version: 'legacy',
    status: 'deprecated',
    features: ['basic-crud'],
    deprecationDate: '2025-06-01',
    migrationGuide: '/api/v1/docs/migration'
  });
});
```

### 6.2 Metrics Collection

```typescript
// Track API version usage
const versionMetrics = {
  v1: { requests: 0, errors: 0 },
  legacy: { requests: 0, errors: 0 }
};

app.use((req, res, next) => {
  const version = req.path.includes('/api/v1/') ? 'v1' : 'legacy';
  versionMetrics[version].requests++;
  
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      versionMetrics[version].errors++;
    }
  });
  
  next();
});
```

## 7. Best Practices Summary

### 7.1 Do's

- ✅ Use semantic versioning (`v1`, `v2`, etc.)
- ✅ Maintain backward compatibility during transition
- ✅ Provide clear deprecation warnings
- ✅ Document migration paths
- ✅ Test all supported versions
- ✅ Monitor version usage metrics

### 7.2 Don'ts

- ❌ Break existing functionality without notice
- ❌ Remove versions without deprecation period
- ❌ Mix versioning strategies
- ❌ Ignore version-specific feature requests
- ❌ Skip migration testing

### 7.3 Version Lifecycle

1. **Development**: Implement new version with enhanced features
2. **Beta**: Release alongside current version for testing
3. **Production**: Promote to stable, maintain dual support
4. **Deprecation**: Announce timeline, add warnings
5. **Retirement**: Remove deprecated version, redirect to current

This comprehensive guide ensures robust API versioning that supports the evolution of the Agent Feed system while maintaining stability and backward compatibility.