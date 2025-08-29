/**
 * Neural Training Export - WebSocket Port Misconfiguration Failure Pattern
 * Generated: 2025-08-29T13:24:51.892Z
 * Pattern ID: websocket-port-mismatch-1756424891
 */

export interface WebSocketPortFailurePattern {
  patternId: string;
  failureType: 'websocket_port_mismatch';
  severity: 'critical';
  features: WebSocketFailureFeatures;
  outcomes: FailureOutcomes;
  preventionStrategies: PreventionStrategy[];
}

export interface WebSocketFailureFeatures {
  // Configuration Analysis
  hasHardcodedPorts: number;           // 0-1 score
  usesEnvironmentVariables: number;    // 0-1 score  
  hasPortValidation: number;           // 0-1 score
  portCoordinationScore: number;       // 0-1 coordination between services
  
  // Code Pattern Analysis
  websocketUrlConstruction: 'naive' | 'validated' | 'dynamic';
  defaultPortStrategy: 'hardcoded' | 'environment' | 'discovery';
  connectionRetryMechanism: boolean;
  healthCheckImplementation: boolean;
  
  // Component Architecture
  componentCoupling: 'tight' | 'loose';
  configurationSource: 'props' | 'environment' | 'service_discovery';
  errorHandlingRobustness: number;     // 0-1 score
  
  // Development Patterns
  testCoverageWebSocket: number;       // 0-1 coverage score
  integrationTestPresence: boolean;
  multiEnvironmentSupport: boolean;
  portConfigurationValidation: boolean;
}

export interface FailureOutcomes {
  instanceStatus: 'stuck_starting' | 'error' | 'disconnected';
  connectionErrors: string[];
  userExperienceImpact: 'complete_failure' | 'partial_degradation' | 'minor_issues';
  debuggingComplexity: 'trivial' | 'moderate' | 'complex' | 'very_complex';
  timeToResolution: number;            // minutes
  productionRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface PreventionStrategy {
  strategyId: string;
  name: string;
  implementationComplexity: 'low' | 'medium' | 'high';
  effectivenessScore: number;          // 0-1 score
  requiredChanges: string[];
  testRequirements: string[];
}

/**
 * Training Dataset for WebSocket Port Misconfiguration Patterns
 */
export const websocketPortFailureTrainingData: WebSocketPortFailurePattern[] = [
  {
    patternId: 'websocket-port-mismatch-1756424891',
    failureType: 'websocket_port_mismatch',
    severity: 'critical',
    features: {
      hasHardcodedPorts: 1.0,
      usesEnvironmentVariables: 0.5,
      hasPortValidation: 0.0,
      portCoordinationScore: 0.2,
      websocketUrlConstruction: 'naive',
      defaultPortStrategy: 'hardcoded', 
      connectionRetryMechanism: false,
      healthCheckImplementation: false,
      componentCoupling: 'tight',
      configurationSource: 'props',
      errorHandlingRobustness: 0.3,
      testCoverageWebSocket: 0.15,
      integrationTestPresence: false,
      multiEnvironmentSupport: false,
      portConfigurationValidation: false
    },
    outcomes: {
      instanceStatus: 'stuck_starting',
      connectionErrors: [
        'WebSocket connection failed',
        'Connection refused',
        'ERR_CONNECTION_REFUSED',
        'WebSocket close event: code 1006'
      ],
      userExperienceImpact: 'complete_failure',
      debuggingComplexity: 'moderate',
      timeToResolution: 45,
      productionRisk: 'critical'
    },
    preventionStrategies: [
      {
        strategyId: 'env-based-url-construction',
        name: 'Environment-based URL Construction',
        implementationComplexity: 'low',
        effectivenessScore: 0.95,
        requiredChanges: [
          'Replace hardcoded ports with environment variables',
          'Add runtime port resolution logic',
          'Implement fallback port mechanisms'
        ],
        testRequirements: [
          'Environment variable override tests',
          'Port configuration validation tests',
          'Multi-environment connection tests'
        ]
      },
      {
        strategyId: 'websocket-health-validation',
        name: 'WebSocket Connection Health Validation',
        implementationComplexity: 'medium',
        effectivenessScore: 0.88,
        requiredChanges: [
          'Add WebSocket connection health checks',
          'Implement connection validation before usage',
          'Add connection retry with exponential backoff'
        ],
        testRequirements: [
          'Connection health validation tests',
          'Retry mechanism tests',
          'Failure recovery tests'
        ]
      },
      {
        strategyId: 'service-discovery-pattern',
        name: 'Dynamic Service Discovery',
        implementationComplexity: 'high',
        effectivenessScore: 0.92,
        requiredChanges: [
          'Implement service discovery mechanism',
          'Add dynamic port resolution',
          'Create service registry integration'
        ],
        testRequirements: [
          'Service discovery integration tests',
          'Dynamic port resolution tests',
          'Service registry communication tests'
        ]
      }
    ]
  }
];

/**
 * Neural Network Features for Failure Prediction
 */
export interface WebSocketFailurePredictionFeatures {
  // Static Code Analysis Features
  portHardcodingScore: number;         // Higher = more hardcoded ports
  configurationCouplingScore: number;  // Higher = tighter coupling
  urlConstructionComplexity: number;   // Higher = more complex construction
  
  // Runtime Analysis Features  
  connectionSuccessRate: number;       // Historical success rate
  portMismatchFrequency: number;       // How often port mismatches occur
  environmentConsistencyScore: number; // Config consistency across environments
  
  // Development Practice Features
  testCoverageScore: number;           // WebSocket-specific test coverage
  integrationTestScore: number;        // Integration test coverage
  documentationScore: number;          // Configuration documentation quality
}

/**
 * Failure Probability Calculation
 */
export function calculateWebSocketFailureProbability(
  features: WebSocketFailurePredictionFeatures
): number {
  const weights = {
    portHardcodingScore: 0.35,
    configurationCouplingScore: 0.25,
    urlConstructionComplexity: 0.15,
    connectionSuccessRate: -0.30,        // Negative weight (lower = higher risk)
    portMismatchFrequency: 0.20,
    environmentConsistencyScore: -0.15,   // Negative weight
    testCoverageScore: -0.25,            // Negative weight
    integrationTestScore: -0.20,         // Negative weight
    documentationScore: -0.10            // Negative weight
  };
  
  let probability = 0.0;
  
  probability += features.portHardcodingScore * weights.portHardcodingScore;
  probability += features.configurationCouplingScore * weights.configurationCouplingScore;
  probability += features.urlConstructionComplexity * weights.urlConstructionComplexity;
  probability += (1 - features.connectionSuccessRate) * Math.abs(weights.connectionSuccessRate);
  probability += features.portMismatchFrequency * weights.portMismatchFrequency;
  probability += (1 - features.environmentConsistencyScore) * Math.abs(weights.environmentConsistencyScore);
  probability += (1 - features.testCoverageScore) * Math.abs(weights.testCoverageScore);
  probability += (1 - features.integrationTestScore) * Math.abs(weights.integrationTestScore);
  probability += (1 - features.documentationScore) * Math.abs(weights.documentationScore);
  
  return Math.min(Math.max(probability, 0.0), 1.0);
}

/**
 * Generate TDD Prevention Test Cases
 */
export function generateWebSocketTDDTests(): string[] {
  return [
    `
    describe('WebSocket Port Configuration', () => {
      it('should use environment variable for WebSocket port', () => {
        process.env.REACT_APP_TERMINAL_PORT = '3002';
        const component = new ClaudeInstanceManagerModern({});
        expect(component.getWebSocketUrl()).toBe('ws://localhost:3002/terminal');
      });
      
      it('should validate WebSocket connection before usage', async () => {
        const component = new ClaudeInstanceManagerModern({ apiUrl: 'http://localhost:3002' });
        const isValid = await component.validateWebSocketConnection();
        expect(isValid).toBe(true);
      });
      
      it('should handle WebSocket connection failures gracefully', async () => {
        const component = new ClaudeInstanceManagerModern({ apiUrl: 'http://localhost:9999' });
        const connectionAttempt = component.connectToTerminal('test-id');
        await expect(connectionAttempt).rejects.toThrow('WebSocket connection failed');
        expect(component.getConnectionStatus()).toBe('error');
      });
    });
    `,
    `
    describe('Port Configuration Integration', () => {
      it('should coordinate ports between frontend and backend', async () => {
        const backendPort = process.env.TERMINAL_PORT || 3002;
        const frontendPort = process.env.REACT_APP_TERMINAL_PORT || 3002;
        expect(backendPort).toBe(frontendPort);
      });
      
      it('should detect port mismatches at startup', () => {
        const validator = new PortConfigurationValidator();
        const mismatchDetected = validator.detectPortMismatches();
        expect(mismatchDetected).toBe(false);
      });
    });
    `
  ];
}

/**
 * Export for Claude Flow Neural Training Integration
 */
export const claudeFlowNeuralExport = {
  patternType: 'websocket_port_misconfiguration',
  trainingData: websocketPortFailureTrainingData,
  predictionFunction: calculateWebSocketFailureProbability,
  tddTestGenerator: generateWebSocketTDDTests,
  memoryKey: 'nld/patterns/websocket-port-failures',
  version: '1.0.0',
  exportTimestamp: '2025-08-29T13:24:51.892Z'
};