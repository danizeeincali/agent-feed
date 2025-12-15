import { vi } from 'vitest';

/**
 * TDD London School: Shared Mock Contracts for Swarm Coordination
 * 
 * Focus: Standardized contracts for cross-agent collaboration
 * Goal: Ensure consistent behavior verification across all swarm agents
 * Approach: Contract-driven mock definitions with swarm metadata
 */

// Base types for contract validation
export interface SwarmMock {
  __swarmContract: boolean;
  __mockName: string;
  __contractVersion: string;
  __interactions: Array<{ method: string; args: any[]; timestamp: number }>;
}

export interface ContractMethod {
  name: string;
  returnType: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
  behavior: string;
  sideEffects?: string[];
}

export interface SwarmContract {
  name: string;
  version: string;
  methods: ContractMethod[];
  dependencies: string[];
  description: string;
}

// Activity-related types for type safety
export interface Activity {
  id: string;
  type: string;
  title: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface AgentData {
  id: string;
  name: string;
  recentActivities?: Activity[] | null | undefined;
  status?: string;
  metrics?: Record<string, any>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// Core Contract Definitions for Swarm Coordination

export const API_SERVICE_CONTRACT: SwarmContract = {
  name: 'ApiService',
  version: '1.0.0',
  description: 'Handles all API interactions and response processing',
  dependencies: ['DataTransformer', 'ErrorHandler'],
  methods: [
    {
      name: 'fetchRealActivities',
      returnType: 'Promise<Activity[]>',
      parameters: [
        { name: 'agentId', type: 'string', required: false },
        { name: 'limit', type: 'number', required: false }
      ],
      behavior: 'Fetches activities from API and returns validated array',
      sideEffects: ['HTTP request', 'Error logging if fails']
    },
    {
      name: 'fetchAgentData',
      returnType: 'Promise<AgentData>',
      parameters: [
        { name: 'agentId', type: 'string', required: true }
      ],
      behavior: 'Fetches complete agent data including activities',
      sideEffects: ['HTTP request', 'Cache update']
    },
    {
      name: 'handleApiError',
      returnType: 'Activity[]',
      parameters: [
        { name: 'error', type: 'Error', required: true },
        { name: 'context', type: 'object', required: false }
      ],
      behavior: 'Provides fallback data when API fails',
      sideEffects: ['Error logging', 'Metrics update']
    }
  ]
};

export const DATA_TRANSFORMER_CONTRACT: SwarmContract = {
  name: 'DataTransformer',
  version: '1.0.0',
  description: 'Transforms and validates API response data',
  dependencies: ['TypeValidator'],
  methods: [
    {
      name: 'transformApiResponse',
      returnType: 'Activity[]',
      parameters: [
        { name: 'response', type: 'ApiResponse', required: true }
      ],
      behavior: 'Extracts and transforms data from API response',
      sideEffects: ['Data normalization']
    },
    {
      name: 'validateArrayStructure',
      returnType: 'boolean',
      parameters: [
        { name: 'data', type: 'any', required: true }
      ],
      behavior: 'Validates if data is a proper array structure',
      sideEffects: []
    },
    {
      name: 'sanitizeActivities',
      returnType: 'Activity[]',
      parameters: [
        { name: 'activities', type: 'any[]', required: true }
      ],
      behavior: 'Removes invalid items and ensures type safety',
      sideEffects: ['Data filtering', 'Invalid data logging']
    }
  ]
};

export const TYPE_VALIDATOR_CONTRACT: SwarmContract = {
  name: 'TypeValidator',
  version: '1.0.0',
  description: 'Provides comprehensive type validation and safety checks',
  dependencies: [],
  methods: [
    {
      name: 'isArray',
      returnType: 'boolean',
      parameters: [
        { name: 'value', type: 'any', required: true }
      ],
      behavior: 'Checks if value is a valid array',
      sideEffects: []
    },
    {
      name: 'isValidActivity',
      returnType: 'boolean',
      parameters: [
        { name: 'activity', type: 'any', required: true }
      ],
      behavior: 'Validates activity object structure and required fields',
      sideEffects: []
    },
    {
      name: 'isValidActivityArray',
      returnType: 'boolean',
      parameters: [
        { name: 'activities', type: 'any', required: true }
      ],
      behavior: 'Validates array of activities',
      sideEffects: []
    },
    {
      name: 'hasRequiredFields',
      returnType: 'boolean',
      parameters: [
        { name: 'object', type: 'any', required: true },
        { name: 'fields', type: 'string[]', required: true }
      ],
      behavior: 'Checks if object has all required fields',
      sideEffects: []
    },
    {
      name: 'sanitizeType',
      returnType: 'Activity[]',
      parameters: [
        { name: 'input', type: 'any', required: true }
      ],
      behavior: 'Converts input to valid activity array or returns empty array',
      sideEffects: ['Type coercion', 'Invalid data filtering']
    }
  ]
};

export const SAFETY_CHECKER_CONTRACT: SwarmContract = {
  name: 'SafetyChecker',
  version: '1.0.0',
  description: 'Ensures safe operations on potentially unsafe data',
  dependencies: ['TypeValidator'],
  methods: [
    {
      name: 'validateBeforeSlice',
      returnType: 'boolean',
      parameters: [
        { name: 'data', type: 'any', required: true }
      ],
      behavior: 'Validates data is safe for array slice operations',
      sideEffects: []
    },
    {
      name: 'ensureArrayType',
      returnType: 'Activity[]',
      parameters: [
        { name: 'data', type: 'any', required: true }
      ],
      behavior: 'Ensures data is returned as valid array',
      sideEffects: ['Type conversion']
    },
    {
      name: 'provideFallback',
      returnType: 'Activity[]',
      parameters: [
        { name: 'originalData', type: 'any', required: true },
        { name: 'context', type: 'string', required: false }
      ],
      behavior: 'Provides safe fallback data when original data is invalid',
      sideEffects: ['Fallback logging']
    },
    {
      name: 'checkDataIntegrity',
      returnType: 'boolean',
      parameters: [
        { name: 'data', type: 'any', required: true }
      ],
      behavior: 'Performs comprehensive data integrity checks',
      sideEffects: ['Integrity logging']
    }
  ]
};

export const ERROR_BOUNDARY_CONTRACT: SwarmContract = {
  name: 'ErrorBoundary',
  version: '1.0.0',
  description: 'Handles component errors and provides graceful recovery',
  dependencies: ['ErrorRecovery', 'ErrorMonitoring'],
  methods: [
    {
      name: 'componentDidCatch',
      returnType: 'void',
      parameters: [
        { name: 'error', type: 'Error', required: true },
        { name: 'errorInfo', type: 'object', required: true }
      ],
      behavior: 'Catches component errors and initiates recovery',
      sideEffects: ['Error logging', 'Recovery initiation', 'State update']
    },
    {
      name: 'getDerivedStateFromError',
      returnType: 'object',
      parameters: [
        { name: 'error', type: 'Error', required: true }
      ],
      behavior: 'Updates component state based on error',
      sideEffects: ['State change']
    },
    {
      name: 'logErrorInfo',
      returnType: 'void',
      parameters: [
        { name: 'error', type: 'Error', required: true },
        { name: 'errorInfo', type: 'object', required: true }
      ],
      behavior: 'Logs comprehensive error information',
      sideEffects: ['Console logging', 'External logging service']
    },
    {
      name: 'notifyErrorService',
      returnType: 'void',
      parameters: [
        { name: 'error', type: 'Error', required: true },
        { name: 'context', type: 'object', required: true }
      ],
      behavior: 'Notifies external error monitoring services',
      sideEffects: ['HTTP request to error service']
    },
    {
      name: 'renderErrorFallback',
      returnType: 'ReactElement',
      parameters: [
        { name: 'error', type: 'Error', required: true },
        { name: 'errorInfo', type: 'object', required: false }
      ],
      behavior: 'Renders user-friendly error UI',
      sideEffects: ['UI rendering']
    }
  ]
};

// Mock factory functions with swarm contract compliance

export const createSwarmMock = <T extends Record<string, any>>(
  contractName: string,
  implementation: T,
  contractVersion: string = '1.0.0'
): T & SwarmMock => {
  const interactions: Array<{ method: string; args: any[]; timestamp: number }> = [];
  
  const mock = {
    ...implementation,
    __swarmContract: true,
    __mockName: contractName,
    __contractVersion: contractVersion,
    __interactions: interactions
  } as T & SwarmMock;

  // Wrap all methods to track interactions for swarm coordination
  Object.keys(implementation).forEach(methodName => {
    if (typeof implementation[methodName] === 'function') {
      const originalMethod = implementation[methodName];
      mock[methodName] = vi.fn((...args: any[]) => {
        // Track interaction for swarm analysis
        interactions.push({
          method: methodName,
          args: args.map(arg => {
            // Safely serialize args for tracking
            try {
              return typeof arg === 'object' ? JSON.parse(JSON.stringify(arg)) : arg;
            } catch {
              return '[Circular Reference]';
            }
          }),
          timestamp: Date.now()
        });
        
        return originalMethod.apply(mock, args);
      });
    }
  });

  return mock;
};

export const createMockContract = (contractName: string, methods: string[]): Record<string, any> => {
  const contract: Record<string, any> = {};
  
  methods.forEach(method => {
    contract[method] = vi.fn().mockName(`${contractName}.${method}`);
  });

  return contract;
};

// Swarm contract verification utilities

export const verifySwarmContract = (mock: SwarmMock, expectedContract: SwarmContract): boolean => {
  // Verify mock has swarm metadata
  if (!mock.__swarmContract || mock.__mockName !== expectedContract.name) {
    return false;
  }

  // Verify all contract methods exist
  const mockMethods = Object.keys(mock).filter(key => typeof mock[key] === 'function');
  const contractMethods = expectedContract.methods.map(m => m.name);

  return contractMethods.every(method => mockMethods.includes(method));
};

export const getInteractionHistory = (mock: SwarmMock): Array<{ method: string; args: any[]; timestamp: number }> => {
  return [...mock.__interactions];
};

export const verifyInteractionSequence = (
  mocks: SwarmMock[],
  expectedSequence: Array<{ mockName: string; method: string }>
): boolean => {
  const allInteractions = mocks
    .flatMap(mock => 
      mock.__interactions.map(interaction => ({
        mockName: mock.__mockName,
        method: interaction.method,
        timestamp: interaction.timestamp
      }))
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (allInteractions.length !== expectedSequence.length) {
    return false;
  }

  return expectedSequence.every((expected, index) => {
    const actual = allInteractions[index];
    return actual.mockName === expected.mockName && actual.method === expected.method;
  });
};

// Pre-configured mock instances for common use cases

export const createApiServiceMock = () => createSwarmMock('ApiService', {
  fetchRealActivities: vi.fn().mockResolvedValue([]),
  fetchAgentData: vi.fn().mockResolvedValue({ id: 'test', name: 'Test Agent', recentActivities: [] }),
  handleApiError: vi.fn().mockReturnValue([])
});

export const createDataTransformerMock = () => createSwarmMock('DataTransformer', {
  transformApiResponse: vi.fn().mockReturnValue([]),
  validateArrayStructure: vi.fn().mockReturnValue(true),
  sanitizeActivities: vi.fn().mockReturnValue([])
});

export const createTypeValidatorMock = () => createSwarmMock('TypeValidator', {
  isArray: vi.fn().mockReturnValue(true),
  isValidActivity: vi.fn().mockReturnValue(true),
  isValidActivityArray: vi.fn().mockReturnValue(true),
  hasRequiredFields: vi.fn().mockReturnValue(true),
  sanitizeType: vi.fn().mockReturnValue([])
});

export const createSafetyCheckerMock = () => createSwarmMock('SafetyChecker', {
  validateBeforeSlice: vi.fn().mockReturnValue(true),
  ensureArrayType: vi.fn().mockReturnValue([]),
  provideFallback: vi.fn().mockReturnValue([]),
  checkDataIntegrity: vi.fn().mockReturnValue(true)
});

export const createErrorBoundaryMock = () => createSwarmMock('ErrorBoundary', {
  componentDidCatch: vi.fn(),
  getDerivedStateFromError: vi.fn().mockReturnValue({ hasError: true }),
  logErrorInfo: vi.fn(),
  notifyErrorService: vi.fn(),
  renderErrorFallback: vi.fn().mockReturnValue('Error fallback UI')
});

// Swarm coordination utilities

export interface SwarmTestSession {
  sessionId: string;
  startTime: number;
  mocks: SwarmMock[];
  interactions: Array<{
    mockName: string;
    method: string;
    args: any[];
    timestamp: number;
  }>;
}

export class SwarmTestCoordinator {
  private sessions: Map<string, SwarmTestSession> = new Map();

  startSession(sessionId: string): SwarmTestSession {
    const session: SwarmTestSession = {
      sessionId,
      startTime: Date.now(),
      mocks: [],
      interactions: []
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  registerMock(sessionId: string, mock: SwarmMock): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.mocks.push(mock);
    }
  }

  recordInteraction(sessionId: string, mockName: string, method: string, args: any[]): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.interactions.push({
        mockName,
        method,
        args,
        timestamp: Date.now()
      });
    }
  }

  getSessionReport(sessionId: string): SwarmTestSession | null {
    return this.sessions.get(sessionId) || null;
  }

  validateSwarmBehavior(sessionId: string): {
    contractsValid: boolean;
    interactionPatternsValid: boolean;
    errors: string[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        contractsValid: false,
        interactionPatternsValid: false,
        errors: ['Session not found']
      };
    }

    const errors: string[] = [];
    
    // Validate all mocks have proper swarm contracts
    const contractsValid = session.mocks.every(mock => {
      if (!mock.__swarmContract) {
        errors.push(`Mock ${mock.__mockName} missing swarm contract metadata`);
        return false;
      }
      return true;
    });

    // Validate interaction patterns (basic validation)
    const interactionPatternsValid = session.interactions.length > 0;
    if (!interactionPatternsValid) {
      errors.push('No interactions recorded during session');
    }

    return {
      contractsValid,
      interactionPatternsValid,
      errors
    };
  }
}

export const swarmCoordinator = new SwarmTestCoordinator();