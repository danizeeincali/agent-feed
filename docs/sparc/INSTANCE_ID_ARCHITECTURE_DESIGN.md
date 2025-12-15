# SPARC Phase 3: Architecture - Instance ID Flow System Design

## Architecture Overview

The Instance ID flow system consists of three main architectural layers that must work together to maintain data integrity:

1. **Backend API Layer** - Provides instance creation and management
2. **Frontend State Management Layer** - Manages instance state and selections  
3. **Connection Management Layer** - Handles terminal connections (SSE/polling)

## Critical Fix Architecture

### Current Broken Flow
```
Backend Response: { success: true, instance: { id: "claude-2643" } }
                         ↓
Frontend Access:  data.instanceId  ← UNDEFINED (wrong property access)
                         ↓
Connection Call:  connectSSE(undefined)
                         ↓
Terminal Request: /api/claude/instances/undefined/terminal/stream ← FAILS
```

### Fixed Flow Architecture
```
Backend Response: { success: true, instance: { id: "claude-2643" } }
                         ↓
Frontend Access:  data.instance?.id ← "claude-2643" (correct property access)
                         ↓
Validation Layer: validateInstanceId("claude-2643") ← PASSES
                         ↓
Connection Call:  connectSSE("claude-2643")
                         ↓
Terminal Request: /api/claude/instances/claude-2643/terminal/stream ← SUCCESS
```

## Component Architecture Design

### 1. Response Parsing Layer

```typescript
interface APIResponseHandler {
  parseInstanceCreationResponse(response: any): {
    instanceId: string | null;
    error: string | null;
  }
}

class InstanceResponseParser implements APIResponseHandler {
  parseInstanceCreationResponse(response: any) {
    // Extract instanceId from multiple possible response structures
    const instanceId = response.instanceId || response.instance?.id || null;
    
    if (!instanceId) {
      return { 
        instanceId: null, 
        error: "Instance creation succeeded but no instance ID found" 
      };
    }
    
    if (!this.validateInstanceIdFormat(instanceId)) {
      return { 
        instanceId: null, 
        error: `Invalid instance ID format: ${instanceId}` 
      };
    }
    
    return { instanceId, error: null };
  }
  
  private validateInstanceIdFormat(id: string): boolean {
    return /^claude-\d+$/.test(id);
  }
}
```

### 2. State Management Architecture

```typescript
interface InstanceState {
  instances: ClaudeInstance[];
  selectedInstanceId: string | null;
  connectionStates: Map<string, ConnectionState>;
  outputBuffers: Map<string, string>;
}

interface StateManager {
  updateInstanceList(instances: ClaudeInstance[]): void;
  selectInstance(instanceId: string): void;
  getSelectedInstance(): ClaudeInstance | null;
  validateInstanceExists(instanceId: string): boolean;
}

class InstanceStateManager implements StateManager {
  private state: InstanceState;
  
  selectInstance(instanceId: string): void {
    // Validate instance exists before selection
    if (!this.validateInstanceExists(instanceId)) {
      throw new Error(`Cannot select non-existent instance: ${instanceId}`);
    }
    
    this.state.selectedInstanceId = instanceId;
    
    // Initialize output buffer for new instance
    if (!this.state.outputBuffers.has(instanceId)) {
      this.state.outputBuffers.set(instanceId, '');
    }
  }
  
  validateInstanceExists(instanceId: string): boolean {
    return this.state.instances.some(instance => instance.id === instanceId);
  }
}
```

### 3. Connection Management Architecture

```typescript
interface ConnectionManager {
  connectToInstance(instanceId: string): Promise<void>;
  disconnectFromInstance(): void;
  validateConnectionState(): boolean;
  recoverConnection(): Promise<void>;
}

class TerminalConnectionManager implements ConnectionManager {
  private connectionState: ConnectionState;
  private validator: InstanceValidator;
  
  async connectToInstance(instanceId: string): Promise<void> {
    // Validation gate - critical for preventing undefined connections
    const validationResult = this.validator.validateInstanceId(instanceId);
    if (!validationResult.isValid) {
      throw new ConnectionError(`Invalid instance ID: ${validationResult.error}`);
    }
    
    // Cleanup existing connections
    await this.cleanup();
    
    // Attempt SSE connection with validated ID
    try {
      await this.establishSSEConnection(instanceId);
    } catch (sseError) {
      console.warn('SSE failed, falling back to polling:', sseError);
      await this.establishPollingConnection(instanceId);
    }
  }
  
  private async establishSSEConnection(instanceId: string): Promise<void> {
    const eventSource = new EventSource(
      `/api/claude/instances/${instanceId}/terminal/stream`
    );
    
    return new Promise((resolve, reject) => {
      eventSource.onopen = () => {
        this.connectionState = {
          instanceId,
          connectionType: 'sse',
          eventSource,
          isConnected: true
        };
        resolve();
      };
      
      eventSource.onerror = (error) => {
        eventSource.close();
        reject(new ConnectionError('SSE connection failed'));
      };
    });
  }
}
```

### 4. Validation Architecture

```typescript
interface InstanceValidator {
  validateInstanceId(instanceId: any): ValidationResult;
  validateConnectionState(state: ConnectionState): ValidationResult;
  validateResponse(response: any): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  correctedValue?: any;
}

class ComprehensiveInstanceValidator implements InstanceValidator {
  validateInstanceId(instanceId: any): ValidationResult {
    // Check for null/undefined
    if (instanceId == null) {
      return { 
        isValid: false, 
        error: `Instance ID is ${instanceId}` 
      };
    }
    
    // Check for correct type
    if (typeof instanceId !== 'string') {
      return { 
        isValid: false, 
        error: `Instance ID must be string, got ${typeof instanceId}` 
      };
    }
    
    // Check format
    if (!/^claude-\d+$/.test(instanceId)) {
      return { 
        isValid: false, 
        error: `Invalid instance ID format: ${instanceId}` 
      };
    }
    
    return { isValid: true };
  }
  
  validateResponse(response: any): ValidationResult {
    if (!response || typeof response !== 'object') {
      return { isValid: false, error: 'Invalid response object' };
    }
    
    if (!response.success) {
      return { isValid: false, error: response.error || 'Request failed' };
    }
    
    // Extract instance ID from various possible structures
    const instanceId = response.instanceId || response.instance?.id;
    if (!instanceId) {
      return { 
        isValid: false, 
        error: 'Response missing instance ID in both instanceId and instance.id' 
      };
    }
    
    return this.validateInstanceId(instanceId);
  }
}
```

## Error Handling Architecture

### 1. Error Recovery Strategies

```typescript
enum RecoveryStrategy {
  RETRY_CONNECTION = 'retry_connection',
  FALLBACK_TO_POLLING = 'fallback_to_polling',
  RECOVER_FROM_STATE = 'recover_from_state',
  MANUAL_SELECTION = 'manual_selection'
}

interface ErrorRecoveryManager {
  handleConnectionError(error: ConnectionError): Promise<void>;
  recoverFromIdLoss(): Promise<void>;
  escalateToUser(error: Error): void;
}

class InstanceErrorRecoveryManager implements ErrorRecoveryManager {
  async handleConnectionError(error: ConnectionError): Promise<void> {
    switch (error.type) {
      case 'INVALID_INSTANCE_ID':
        await this.recoverFromIdLoss();
        break;
        
      case 'CONNECTION_FAILED':
        await this.retryWithFallback(error.instanceId);
        break;
        
      case 'INSTANCE_NOT_FOUND':
        await this.refreshInstancesAndReconnect();
        break;
        
      default:
        this.escalateToUser(error);
    }
  }
  
  async recoverFromIdLoss(): Promise<void> {
    // Strategy 1: Recover from selected instance state
    const selectedId = this.stateManager.getSelectedInstanceId();
    if (selectedId && this.validator.validateInstanceId(selectedId).isValid) {
      await this.connectionManager.connectToInstance(selectedId);
      return;
    }
    
    // Strategy 2: Use first running instance
    const runningInstances = this.stateManager.getRunningInstances();
    if (runningInstances.length > 0) {
      await this.connectionManager.connectToInstance(runningInstances[0].id);
      this.stateManager.selectInstance(runningInstances[0].id);
      return;
    }
    
    // Strategy 3: Escalate to user
    this.escalateToUser(new Error('No valid instances available for recovery'));
  }
}
```

### 2. Logging and Monitoring Architecture

```typescript
interface InstanceFlowLogger {
  logInstanceCreation(instanceId: string, response: any): void;
  logConnectionAttempt(instanceId: string, method: string): void;
  logConnectionSuccess(instanceId: string, connectionType: string): void;
  logConnectionError(error: Error, context: any): void;
  logIdValidation(instanceId: any, result: ValidationResult): void;
}

class DebugInstanceFlowLogger implements InstanceFlowLogger {
  logInstanceCreation(instanceId: string, response: any): void {
    console.group('🆕 Instance Creation');
    console.log('Response structure:', response);
    console.log('Extracted instanceId:', instanceId);
    console.log('ValidationResult:', this.validator.validateInstanceId(instanceId));
    console.groupEnd();
  }
  
  logConnectionAttempt(instanceId: string, method: string): void {
    console.group(`🔗 Connection Attempt - ${method}`);
    console.log('Instance ID:', instanceId, `(type: ${typeof instanceId})`);
    console.log('Validation:', this.validator.validateInstanceId(instanceId));
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
  
  logConnectionError(error: Error, context: any): void {
    console.group('❌ Connection Error');
    console.error('Error:', error.message);
    console.log('Context:', context);
    console.log('Stack:', error.stack);
    console.groupEnd();
  }
}
```

## Integration Architecture

### 1. Component Integration Pattern

```typescript
// ClaudeInstanceManager.tsx integration
const ClaudeInstanceManager: React.FC = () => {
  const responseParser = new InstanceResponseParser();
  const stateManager = new InstanceStateManager();
  const connectionManager = new TerminalConnectionManager();
  const validator = new ComprehensiveInstanceValidator();
  const logger = new DebugInstanceFlowLogger();
  
  const createInstance = async (command: string) => {
    try {
      const response = await fetch('/api/claude/instances', {
        method: 'POST',
        body: JSON.stringify(getInstanceConfig(command))
      });
      
      const data = await response.json();
      
      // Parse response with proper error handling
      const { instanceId, error } = responseParser.parseInstanceCreationResponse(data);
      
      if (error) {
        setError(error);
        logger.logConnectionError(new Error(error), { response: data });
        return;
      }
      
      logger.logInstanceCreation(instanceId!, data);
      
      // Update state with validated instance ID
      await fetchInstances();
      stateManager.selectInstance(instanceId!);
      
      // Connect with validated instance ID
      await connectionManager.connectToInstance(instanceId!);
      
    } catch (error) {
      logger.logConnectionError(error, { command });
      setError('Failed to create instance');
    }
  };
};
```

### 2. Hook Integration Pattern

```typescript
// useHTTPSSE.ts integration
export const useHTTPSSE = (options: UseHTTPSSEOptions = {}): UseHTTPSSEReturn => {
  const validator = new ComprehensiveInstanceValidator();
  const logger = new DebugInstanceFlowLogger();
  const errorRecovery = new InstanceErrorRecoveryManager();
  
  const connectSSE = useCallback(async (instanceId: string) => {
    logger.logConnectionAttempt(instanceId, 'SSE');
    
    const validation = validator.validateInstanceId(instanceId);
    if (!validation.isValid) {
      const error = new ConnectionError('INVALID_INSTANCE_ID', validation.error!);
      logger.logConnectionError(error, { instanceId });
      await errorRecovery.handleConnectionError(error);
      return;
    }
    
    // Proceed with validated instance ID...
  }, [validator, logger, errorRecovery]);
  
  return {
    connectSSE,
    // ... other methods
  };
};
```

## Testing Architecture

### 1. Unit Test Structure

```typescript
describe('Instance ID Flow Architecture', () => {
  describe('ResponseParser', () => {
    it('should extract instanceId from response.instance.id', () => {
      const parser = new InstanceResponseParser();
      const response = { success: true, instance: { id: 'claude-1234' } };
      
      const result = parser.parseInstanceCreationResponse(response);
      
      expect(result.instanceId).toBe('claude-1234');
      expect(result.error).toBeNull();
    });
    
    it('should handle missing instance ID gracefully', () => {
      const parser = new InstanceResponseParser();
      const response = { success: true };
      
      const result = parser.parseInstanceCreationResponse(response);
      
      expect(result.instanceId).toBeNull();
      expect(result.error).toContain('no instance ID found');
    });
  });
  
  describe('ConnectionManager', () => {
    it('should reject undefined instance IDs', async () => {
      const manager = new TerminalConnectionManager();
      
      await expect(manager.connectToInstance(undefined as any))
        .rejects.toThrow('Invalid instance ID');
    });
  });
});
```

### 2. Integration Test Structure

```typescript
describe('Complete Instance ID Flow', () => {
  it('should successfully create instance and establish terminal connection', async () => {
    // Mock backend response with nested structure
    mockFetch.mockResolvedValueOnce({
      json: () => ({ success: true, instance: { id: 'claude-1234' } })
    });
    
    const { result } = renderHook(() => useHTTPSSE());
    const component = render(<ClaudeInstanceManager />);
    
    // Trigger instance creation
    fireEvent.click(component.getByText('🚀 prod/claude'));
    
    await waitFor(() => {
      expect(mockEventSource).toHaveBeenCalledWith(
        '/api/claude/instances/claude-1234/terminal/stream'
      );
    });
  });
});
```

## Deployment Architecture

### 1. Environment Configuration

```typescript
interface DeploymentConfig {
  apiUrl: string;
  connectionTimeout: number;
  retryAttempts: number;
  debugLogging: boolean;
}

const configs: Record<string, DeploymentConfig> = {
  development: {
    apiUrl: 'http://localhost:3000',
    connectionTimeout: 30000,
    retryAttempts: 3,
    debugLogging: true
  },
  production: {
    apiUrl: process.env.REACT_APP_API_URL,
    connectionTimeout: 10000,
    retryAttempts: 5,
    debugLogging: false
  }
};
```

### 2. Performance Monitoring

```typescript
interface PerformanceTracker {
  trackInstanceCreation(duration: number, success: boolean): void;
  trackConnectionEstablishment(duration: number, method: string): void;
  trackErrorRate(errorType: string): void;
}
```

This architecture ensures robust instance ID handling with proper validation, error recovery, and comprehensive logging throughout the entire flow.

---

*This architecture document defines the structural design for fixing the instance ID propagation bug with emphasis on validation, error handling, and maintainable code organization.*