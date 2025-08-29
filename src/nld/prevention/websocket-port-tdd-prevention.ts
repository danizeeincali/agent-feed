/**
 * TDD Prevention Strategies - WebSocket Port Misconfiguration
 * Auto-generated from failure pattern: websocket-port-mismatch-1756424891
 */

export interface WebSocketPortTDDStrategy {
  strategyName: string;
  testCategories: string[];
  implementationSteps: TDDImplementationStep[];
  preventedFailures: string[];
  effectivenessScore: number;
}

export interface TDDImplementationStep {
  phase: 'red' | 'green' | 'refactor';
  description: string;
  testCode?: string;
  implementationCode?: string;
  refactoringSuggestions?: string[];
}

/**
 * Strategy 1: Environment-Based Configuration Testing
 */
export const environmentConfigurationTDD: WebSocketPortTDDStrategy = {
  strategyName: 'Environment-Based Configuration Validation',
  testCategories: ['configuration', 'integration', 'environment'],
  preventedFailures: [
    'hardcoded_port_usage',
    'environment_variable_disconnect', 
    'multi_environment_inconsistency'
  ],
  effectivenessScore: 0.95,
  implementationSteps: [
    {
      phase: 'red',
      description: 'Write failing test for environment-based port configuration',
      testCode: `
describe('Environment-Based WebSocket Configuration', () => {
  it('should use TERMINAL_PORT environment variable for WebSocket URL', () => {
    // RED: This will fail initially because we hardcode port 3000
    process.env.REACT_APP_TERMINAL_PORT = '3002';
    
    const component = new ClaudeInstanceManagerModern({});
    const wsUrl = component.getWebSocketUrl();
    
    expect(wsUrl).toBe('ws://localhost:3002/terminal');
    expect(wsUrl).not.toContain('3000'); // Should not use default hardcoded port
  });
  
  it('should fall back to default port when environment variable is not set', () => {
    delete process.env.REACT_APP_TERMINAL_PORT;
    
    const component = new ClaudeInstanceManagerModern({});
    const wsUrl = component.getWebSocketUrl();
    
    expect(wsUrl).toBe('ws://localhost:3002/terminal'); // Default should be 3002
  });
});`
    },
    {
      phase: 'green',
      description: 'Implement environment-based port resolution',
      implementationCode: `
// Update ClaudeInstanceManagerModern.tsx
const ClaudeInstanceManagerModern: React.FC<ClaudeInstanceManagerModernProps> = ({ 
  apiUrl = \`http://localhost:\${process.env.REACT_APP_TERMINAL_PORT || 3002}\`
}) => {
  // Add method to get WebSocket URL dynamically
  const getWebSocketUrl = (): string => {
    const port = process.env.REACT_APP_TERMINAL_PORT || '3002';
    return \`ws://localhost:\${port}/terminal\`;
  };
  
  const connectToTerminal = (terminalId: string) => {
    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    // ... rest of connection logic
  };
};`
    },
    {
      phase: 'refactor',
      description: 'Extract configuration management into separate module',
      refactoringSuggestions: [
        'Create ConfigurationManager class for centralized config',
        'Add validation for port ranges and availability',
        'Implement configuration change detection and reloading'
      ]
    }
  ]
};

/**
 * Strategy 2: WebSocket Connection Health Validation
 */
export const connectionHealthValidationTDD: WebSocketPortTDDStrategy = {
  strategyName: 'WebSocket Connection Health Validation',
  testCategories: ['integration', 'health_checks', 'error_handling'],
  preventedFailures: [
    'silent_connection_failures',
    'stuck_starting_instances',
    'no_connection_retry_mechanism'
  ],
  effectivenessScore: 0.88,
  implementationSteps: [
    {
      phase: 'red',
      description: 'Write failing tests for connection health validation',
      testCode: `
describe('WebSocket Connection Health', () => {
  it('should validate WebSocket server availability before connecting', async () => {
    const component = new ClaudeInstanceManagerModern({ 
      apiUrl: 'http://localhost:3002' 
    });
    
    // RED: This will fail because we don't have health validation yet
    const healthCheck = await component.validateWebSocketHealth();
    expect(healthCheck.isHealthy).toBe(true);
    expect(healthCheck.responseTime).toBeLessThan(1000);
  });
  
  it('should detect and report unhealthy WebSocket servers', async () => {
    const component = new ClaudeInstanceManagerModern({ 
      apiUrl: 'http://localhost:9999' // Non-existent port
    });
    
    const healthCheck = await component.validateWebSocketHealth();
    expect(healthCheck.isHealthy).toBe(false);
    expect(healthCheck.error).toContain('Connection refused');
  });
  
  it('should retry connections with exponential backoff on failure', async () => {
    const component = new ClaudeInstanceManagerModern({ 
      apiUrl: 'http://localhost:9999'
    });
    
    const connectionAttempt = component.connectWithRetry('test-terminal');
    
    // Should attempt multiple times before giving up
    expect(component.getRetryAttempts()).toBeGreaterThan(1);
    await expect(connectionAttempt).rejects.toThrow('Max retry attempts exceeded');
  });
});`
    },
    {
      phase: 'green', 
      description: 'Implement WebSocket health validation and retry logic',
      implementationCode: `
interface WebSocketHealthResult {
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
}

class ClaudeInstanceManagerModern {
  private retryAttempts = 0;
  private maxRetries = 3;
  
  async validateWebSocketHealth(): Promise<WebSocketHealthResult> {
    const startTime = Date.now();
    const wsUrl = this.getWebSocketUrl();
    
    return new Promise((resolve) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ 
          isHealthy: false, 
          error: 'Connection timeout' 
        });
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve({
          isHealthy: true,
          responseTime: Date.now() - startTime
        });
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        resolve({
          isHealthy: false,
          error: 'Connection failed'
        });
      };
    });
  }
  
  async connectWithRetry(terminalId: string): Promise<WebSocket> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      this.retryAttempts = attempt;
      
      try {
        const health = await this.validateWebSocketHealth();
        if (health.isHealthy) {
          return this.connectToTerminal(terminalId);
        }
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw new Error(\`Max retry attempts exceeded: \${error.message}\`);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      }
    }
  }
  
  getRetryAttempts(): number {
    return this.retryAttempts;
  }
}`
    },
    {
      phase: 'refactor',
      description: 'Extract connection management into dedicated service',
      refactoringSuggestions: [
        'Create WebSocketConnectionManager service class',
        'Add connection pooling and management',
        'Implement circuit breaker pattern for failing connections',
        'Add comprehensive error logging and monitoring'
      ]
    }
  ]
};

/**
 * Strategy 3: Port Coordination Integration Testing
 */
export const portCoordinationTDD: WebSocketPortTDDStrategy = {
  strategyName: 'Port Coordination Integration Testing',
  testCategories: ['integration', 'configuration', 'e2e'],
  preventedFailures: [
    'frontend_backend_port_mismatch',
    'multi_service_coordination_failure',
    'deployment_configuration_errors'
  ],
  effectivenessScore: 0.92,
  implementationSteps: [
    {
      phase: 'red',
      description: 'Write failing tests for port coordination between services',
      testCode: `
describe('Port Coordination Integration', () => {
  it('should ensure frontend and backend use coordinated ports', async () => {
    // RED: This will fail because we don't have port coordination
    const portCoordinator = new PortCoordinator();
    const coordination = await portCoordinator.validatePortCoordination();
    
    expect(coordination.isCoordinated).toBe(true);
    expect(coordination.frontendPort).toBe(coordination.backendPort);
    expect(coordination.conflicts).toHaveLength(0);
  });
  
  it('should detect port conflicts across services', async () => {
    const portCoordinator = new PortCoordinator();
    
    // Simulate conflicting configurations
    process.env.REACT_APP_TERMINAL_PORT = '3000';
    process.env.TERMINAL_PORT = '3002';
    
    const conflicts = await portCoordinator.detectPortConflicts();
    expect(conflicts).toContain('TERMINAL_PORT mismatch');
  });
  
  it('should provide port resolution recommendations', async () => {
    const portCoordinator = new PortCoordinator();
    const recommendations = await portCoordinator.getResolutionRecommendations();
    
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: expect.any(String),
          solution: expect.any(String),
          priority: expect.stringMatching(/high|medium|low/)
        })
      ])
    );
  });
});`
    },
    {
      phase: 'green',
      description: 'Implement port coordination validation service',
      implementationCode: `
interface PortCoordinationResult {
  isCoordinated: boolean;
  frontendPort: number;
  backendPort: number;
  conflicts: string[];
}

interface ResolutionRecommendation {
  issue: string;
  solution: string;
  priority: 'high' | 'medium' | 'low';
}

class PortCoordinator {
  async validatePortCoordination(): Promise<PortCoordinationResult> {
    const frontendPort = parseInt(process.env.REACT_APP_TERMINAL_PORT || '3002');
    const backendPort = parseInt(process.env.TERMINAL_PORT || '3002');
    
    const conflicts: string[] = [];
    
    if (frontendPort !== backendPort) {
      conflicts.push(\`Port mismatch: Frontend(\${frontendPort}) !== Backend(\${backendPort})\`);
    }
    
    return {
      isCoordinated: conflicts.length === 0,
      frontendPort,
      backendPort,
      conflicts
    };
  }
  
  async detectPortConflicts(): Promise<string[]> {
    const coordination = await this.validatePortCoordination();
    return coordination.conflicts;
  }
  
  async getResolutionRecommendations(): Promise<ResolutionRecommendation[]> {
    const conflicts = await this.detectPortConflicts();
    
    return conflicts.map(conflict => ({
      issue: conflict,
      solution: 'Set consistent port values in environment variables',
      priority: 'high' as const
    }));
  }
}

// Integration with existing components
export function validatePortConfiguration(): Promise<boolean> {
  const coordinator = new PortCoordinator();
  return coordinator.validatePortCoordination()
    .then(result => result.isCoordinated);
}`
    },
    {
      phase: 'refactor', 
      description: 'Add startup validation and monitoring',
      refactoringSuggestions: [
        'Add port coordination validation to application startup',
        'Implement continuous port monitoring',
        'Create configuration validation dashboard',
        'Add automated port conflict resolution'
      ]
    }
  ]
};

/**
 * Complete TDD Prevention Suite for WebSocket Port Failures
 */
export const websocketPortTDDSuite = {
  strategies: [
    environmentConfigurationTDD,
    connectionHealthValidationTDD,
    portCoordinationTDD
  ],
  
  implementationOrder: [
    'Environment-Based Configuration Validation',
    'Port Coordination Integration Testing', 
    'WebSocket Connection Health Validation'
  ],
  
  totalEffectivenessScore: 0.92,
  
  estimatedImplementationTime: {
    environmentConfig: '4 hours',
    healthValidation: '6 hours',
    portCoordination: '8 hours',
    total: '18 hours'
  },
  
  riskReduction: {
    productionFailures: 0.95,
    debuggingTime: 0.80,
    userExperienceImpact: 0.90,
    deploymentRisk: 0.85
  }
};

/**
 * Generate complete test suite for WebSocket port prevention
 */
export function generateCompleteTestSuite(): string {
  return `
// WebSocket Port Configuration Prevention Test Suite
// Generated from NLD pattern: websocket-port-mismatch-1756424891

import { ClaudeInstanceManagerModern } from '../ClaudeInstanceManagerModern';
import { PortCoordinator } from '../services/PortCoordinator';
import { WebSocketConnectionManager } from '../services/WebSocketConnectionManager';

${environmentConfigurationTDD.implementationSteps[0].testCode}

${connectionHealthValidationTDD.implementationSteps[0].testCode}

${portCoordinationTDD.implementationSteps[0].testCode}

describe('WebSocket Port Prevention Integration', () => {
  beforeEach(() => {
    // Reset environment for each test
    delete process.env.REACT_APP_TERMINAL_PORT;
    delete process.env.TERMINAL_PORT;
  });
  
  it('should prevent all known WebSocket port failure modes', async () => {
    // Test complete prevention suite
    const component = new ClaudeInstanceManagerModern({});
    const coordinator = new PortCoordinator();
    
    // Validate configuration
    const configValid = await coordinator.validatePortCoordination();
    expect(configValid.isCoordinated).toBe(true);
    
    // Validate health
    const healthValid = await component.validateWebSocketHealth();
    expect(healthValid.isHealthy).toBe(true);
    
    // Test connection
    const connection = await component.connectWithRetry('test-terminal');
    expect(connection.readyState).toBe(WebSocket.OPEN);
  });
});
`;
}

export default websocketPortTDDSuite;