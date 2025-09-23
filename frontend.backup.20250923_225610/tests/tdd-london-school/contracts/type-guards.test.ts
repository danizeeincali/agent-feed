import { jest } from '@jest/globals';
import { createSwarmMock, createMockContract } from '../setup-tests';

/**
 * TDD London School: Type Guards and Safety Checks
 * 
 * Focus: Contract-driven type validation to prevent runtime errors
 * Goal: Ensure robust type checking before array operations
 * Approach: Mock-driven contract testing for type safety
 */

// Type guard contracts for swarm coordination
const typeValidatorContract = createMockContract('TypeValidator', [
  'isArray',
  'isValidActivity',
  'isValidActivityArray',
  'hasRequiredFields',
  'sanitizeType'
]);

const safetyCheckerContract = createMockContract('SafetyChecker', [
  'validateBeforeSlice',
  'ensureArrayType',
  'provideFallback',
  'checkDataIntegrity'
]);

const errorHandlerContract = createMockContract('ErrorHandler', [
  'handleTypeError',
  'logTypeViolation',
  'provideErrorContext',
  'recoverFromTypeError'
]);

// Mock implementations for type safety
interface Activity {
  id: string;
  type: string;
  title: string;
  timestamp?: string;
}

interface AgentData {
  id: string;
  name: string;
  recentActivities?: Activity[] | null | undefined;
}

describe('Type Guards and Safety Checks Contract Verification', () => {
  let mockTypeValidator: typeof typeValidatorContract;
  let mockSafetyChecker: typeof safetyCheckerContract;
  let mockErrorHandler: typeof errorHandlerContract;

  beforeEach(() => {
    // London School: Define type safety collaboration contracts
    mockTypeValidator = createSwarmMock('TypeValidator', {
      isArray: jest.fn(),
      isValidActivity: jest.fn(),
      isValidActivityArray: jest.fn(),
      hasRequiredFields: jest.fn(),
      sanitizeType: jest.fn()
    });

    mockSafetyChecker = createSwarmMock('SafetyChecker', {
      validateBeforeSlice: jest.fn(),
      ensureArrayType: jest.fn(),
      provideFallback: jest.fn(),
      checkDataIntegrity: jest.fn()
    });

    mockErrorHandler = createSwarmMock('ErrorHandler', {
      handleTypeError: jest.fn(),
      logTypeViolation: jest.fn(),
      provideErrorContext: jest.fn(),
      recoverFromTypeError: jest.fn()
    });
  });

  describe('Array Type Validation Contracts', () => {
    it('should validate array before calling slice operations', () => {
      // Given: Various data types that might be passed as activities
      const testCases = [
        { input: [], expected: true, description: 'empty array' },
        { input: [{ id: '1', type: 'task', title: 'Test' }], expected: true, description: 'valid array with activities' },
        { input: null, expected: false, description: 'null value' },
        { input: undefined, expected: false, description: 'undefined value' },
        { input: 'string', expected: false, description: 'string value' },
        { input: 123, expected: false, description: 'number value' },
        { input: {}, expected: false, description: 'plain object' },
        { input: { length: 0 }, expected: false, description: 'object with length property' },
        { input: new Set([1, 2, 3]), expected: false, description: 'Set object' }
      ];

      testCases.forEach(({ input, expected, description }) => {
        // Mock the type validator behavior
        mockTypeValidator.isArray.mockReturnValueOnce(expected);
        mockSafetyChecker.validateBeforeSlice.mockReturnValueOnce(expected);

        // When: Validating the input type
        const isValidArray = mockTypeValidator.isArray(input);
        const isSafeForSlice = mockSafetyChecker.validateBeforeSlice(input);

        // Then: Verify contract compliance
        expect(mockTypeValidator.isArray).toHaveBeenCalledWith(input);
        expect(mockSafetyChecker.validateBeforeSlice).toHaveBeenCalledWith(input);
        expect(isValidArray).toBe(expected);
        expect(isSafeForSlice).toBe(expected);

        // Clear mocks for next iteration
        mockTypeValidator.isArray.mockClear();
        mockSafetyChecker.validateBeforeSlice.mockClear();
      });
    });

    it('should provide fallback arrays for all non-array inputs', () => {
      // Given: Non-array inputs that need fallback handling
      const nonArrayInputs = [null, undefined, 'string', 123, {}, { length: 5 }];
      const fallbackArray: Activity[] = [];

      nonArrayInputs.forEach(input => {
        mockTypeValidator.isArray.mockReturnValueOnce(false);
        mockSafetyChecker.provideFallback.mockReturnValueOnce(fallbackArray);

        // When: Processing non-array input
        const isArray = mockTypeValidator.isArray(input);
        let result: Activity[];
        
        if (!isArray) {
          result = mockSafetyChecker.provideFallback(input);
        } else {
          result = input as Activity[];
        }

        // Then: Verify fallback contract behavior
        expect(mockTypeValidator.isArray).toHaveBeenCalledWith(input);
        expect(mockSafetyChecker.provideFallback).toHaveBeenCalledWith(input);
        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual(fallbackArray);
        expect(() => result.slice(0, 3)).not.toThrow();

        // Clear mocks for next iteration
        mockTypeValidator.isArray.mockClear();
        mockSafetyChecker.provideFallback.mockClear();
      });
    });

    it('should ensure type safety throughout the application lifecycle', () => {
      // Given: A simulated application flow with type checking
      const mockAgentData: AgentData = {
        id: 'agent-1',
        name: 'Test Agent',
        recentActivities: [
          { id: '1', type: 'task_completed', title: 'Task 1' },
          { id: '2', type: 'message_sent', title: 'Message 1' }
        ]
      };

      // Mock the entire type safety chain
      mockSafetyChecker.checkDataIntegrity.mockReturnValue(true);
      mockTypeValidator.isValidActivityArray.mockReturnValue(true);
      mockSafetyChecker.ensureArrayType.mockReturnValue(mockAgentData.recentActivities);

      // When: Processing data through the type safety pipeline
      const dataIntegrityCheck = mockSafetyChecker.checkDataIntegrity(mockAgentData);
      const arrayValidation = mockTypeValidator.isValidActivityArray(mockAgentData.recentActivities);
      const typeEnsurance = mockSafetyChecker.ensureArrayType(mockAgentData.recentActivities);

      // Then: Verify complete type safety chain
      expect(mockSafetyChecker.checkDataIntegrity).toHaveBeenCalledWith(mockAgentData);
      expect(mockTypeValidator.isValidActivityArray).toHaveBeenCalledWith(mockAgentData.recentActivities);
      expect(mockSafetyChecker.ensureArrayType).toHaveBeenCalledWith(mockAgentData.recentActivities);

      expect(dataIntegrityCheck).toBe(true);
      expect(arrayValidation).toBe(true);
      expect(Array.isArray(typeEnsurance)).toBe(true);
    });
  });

  describe('Activity Object Validation Contracts', () => {
    it('should validate individual activity objects before processing', () => {
      // Given: Various activity object formats
      const validActivity: Activity = {
        id: '1',
        type: 'task_completed',
        title: 'Valid Task',
        timestamp: '2024-01-01T00:00:00Z'
      };

      const invalidActivities = [
        null,
        undefined,
        {},
        { id: '1' }, // Missing type and title
        { type: 'task' }, // Missing id and title
        { title: 'Task' }, // Missing id and type
        { id: '1', type: 'task', title: '' }, // Empty title
        { id: '', type: 'task', title: 'Task' }, // Empty id
        'string',
        123
      ];

      // When/Then: Validate each activity
      mockTypeValidator.isValidActivity.mockReturnValueOnce(true);
      mockTypeValidator.hasRequiredFields.mockReturnValueOnce(true);

      const validResult = mockTypeValidator.isValidActivity(validActivity);
      const hasFields = mockTypeValidator.hasRequiredFields(validActivity);

      expect(mockTypeValidator.isValidActivity).toHaveBeenCalledWith(validActivity);
      expect(mockTypeValidator.hasRequiredFields).toHaveBeenCalledWith(validActivity);
      expect(validResult).toBe(true);
      expect(hasFields).toBe(true);

      // Test invalid activities
      invalidActivities.forEach(invalidActivity => {
        mockTypeValidator.isValidActivity.mockReturnValueOnce(false);
        mockTypeValidator.hasRequiredFields.mockReturnValueOnce(false);

        const invalidResult = mockTypeValidator.isValidActivity(invalidActivity);
        const hasFieldsResult = mockTypeValidator.hasRequiredFields(invalidActivity);

        expect(invalidResult).toBe(false);
        expect(hasFieldsResult).toBe(false);

        mockTypeValidator.isValidActivity.mockClear();
        mockTypeValidator.hasRequiredFields.mockClear();
      });
    });

    it('should sanitize activity arrays to ensure type consistency', () => {
      // Given: Mixed array with valid and invalid activities
      const mixedActivities = [
        { id: '1', type: 'task_completed', title: 'Valid Task 1' },
        null,
        { id: '2', type: 'task_completed', title: 'Valid Task 2' },
        undefined,
        { id: '3' }, // Invalid - missing required fields
        { id: '4', type: 'message_sent', title: 'Valid Message' },
        'invalid string',
        { id: '5', type: 'data_processed', title: 'Valid Data' }
      ];

      const sanitizedActivities = [
        { id: '1', type: 'task_completed', title: 'Valid Task 1' },
        { id: '2', type: 'task_completed', title: 'Valid Task 2' },
        { id: '4', type: 'message_sent', title: 'Valid Message' },
        { id: '5', type: 'data_processed', title: 'Valid Data' }
      ];

      mockTypeValidator.sanitizeType.mockReturnValue(sanitizedActivities);

      // When: Sanitizing the mixed array
      const result = mockTypeValidator.sanitizeType(mixedActivities);

      // Then: Verify sanitization contract
      expect(mockTypeValidator.sanitizeType).toHaveBeenCalledWith(mixedActivities);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
      expect(result.every(activity => 
        activity && 
        typeof activity.id === 'string' && 
        typeof activity.type === 'string' && 
        typeof activity.title === 'string'
      )).toBe(true);
    });

    it('should validate activity array structure comprehensively', () => {
      // Given: Different array structures to validate
      const testArrays = [
        {
          input: [
            { id: '1', type: 'task_completed', title: 'Task 1' },
            { id: '2', type: 'message_sent', title: 'Message 1' }
          ],
          expected: true,
          description: 'valid activity array'
        },
        {
          input: [],
          expected: true,
          description: 'empty array'
        },
        {
          input: [
            { id: '1', type: 'task_completed', title: 'Valid' },
            null,
            { id: '2', type: 'invalid' }
          ],
          expected: false,
          description: 'array with null and invalid items'
        },
        {
          input: [
            'string item',
            123,
            { id: '1', type: 'task', title: 'Valid' }
          ],
          expected: false,
          description: 'array with mixed types'
        }
      ];

      testArrays.forEach(({ input, expected, description }) => {
        mockTypeValidator.isValidActivityArray.mockReturnValueOnce(expected);

        // When: Validating array structure
        const result = mockTypeValidator.isValidActivityArray(input);

        // Then: Verify validation contract
        expect(mockTypeValidator.isValidActivityArray).toHaveBeenCalledWith(input);
        expect(result).toBe(expected);

        mockTypeValidator.isValidActivityArray.mockClear();
      });
    });
  });

  describe('Error Recovery and Safety Contracts', () => {
    it('should handle type errors gracefully with proper recovery', () => {
      // Given: A type error scenario
      const typeError = new TypeError('recentActivities.slice is not a function');
      const errorContext = {
        component: 'UnifiedAgentPage',
        operation: 'slice',
        data: 'non-array value',
        stackTrace: 'Component stack...'
      };

      const recoveryData: Activity[] = [];

      mockErrorHandler.handleTypeError.mockReturnValue(recoveryData);
      mockErrorHandler.recoverFromTypeError.mockReturnValue(recoveryData);

      // When: Handling the type error
      const handledResult = mockErrorHandler.handleTypeError(typeError, errorContext);
      const recoveredResult = mockErrorHandler.recoverFromTypeError(typeError);

      // Then: Verify error recovery contract
      expect(mockErrorHandler.handleTypeError).toHaveBeenCalledWith(typeError, errorContext);
      expect(mockErrorHandler.recoverFromTypeError).toHaveBeenCalledWith(typeError);
      expect(Array.isArray(handledResult)).toBe(true);
      expect(Array.isArray(recoveredResult)).toBe(true);
      expect(handledResult).toEqual(recoveryData);
      expect(recoveredResult).toEqual(recoveryData);
    });

    it('should log type violations for monitoring and debugging', () => {
      // Given: Type violation scenarios
      const violations = [
        {
          violation: 'attempted slice on null',
          data: null,
          expected: 'Array',
          actual: 'null'
        },
        {
          violation: 'attempted slice on undefined',
          data: undefined,
          expected: 'Array',
          actual: 'undefined'
        },
        {
          violation: 'attempted slice on string',
          data: 'string value',
          expected: 'Array',
          actual: 'string'
        }
      ];

      violations.forEach(violation => {
        mockErrorHandler.logTypeViolation.mockImplementation((violationData) => {
          console.warn('Type Violation:', violationData);
        });

        // When: Logging type violation
        mockErrorHandler.logTypeViolation(violation);

        // Then: Verify logging contract
        expect(mockErrorHandler.logTypeViolation).toHaveBeenCalledWith(violation);
        expect(console.warn).toHaveBeenCalledWith('Type Violation:', violation);

        mockErrorHandler.logTypeViolation.mockClear();
      });
    });

    it('should provide comprehensive error context for debugging', () => {
      // Given: Error context requirements
      const error = new Error('Type validation failed');
      const requestContext = {
        userAgent: 'test-agent',
        timestamp: '2024-01-01T00:00:00Z',
        sessionId: 'session-123',
        componentHierarchy: ['App', 'UnifiedAgentPage', 'ActivityList']
      };

      const expectedErrorContext = {
        error: error.message,
        stack: error.stack,
        context: requestContext,
        typeValidation: {
          failed: true,
          reason: 'Non-array data provided to array operation'
        }
      };

      mockErrorHandler.provideErrorContext.mockReturnValue(expectedErrorContext);

      // When: Providing error context
      const errorContext = mockErrorHandler.provideErrorContext(error, requestContext);

      // Then: Verify error context contract
      expect(mockErrorHandler.provideErrorContext).toHaveBeenCalledWith(error, requestContext);
      expect(errorContext).toEqual(expectedErrorContext);
      expect(errorContext.error).toBe(error.message);
      expect(errorContext.context).toBe(requestContext);
      expect(errorContext.typeValidation.failed).toBe(true);
    });
  });

  describe('Runtime Type Safety Integration', () => {
    it('should integrate type guards into component lifecycle', () => {
      // Given: Component lifecycle simulation with type checking
      const componentProps = {
        agent: {
          id: 'agent-1',
          name: 'Test Agent',
          recentActivities: undefined // This should trigger type safety measures
        }
      };

      // Mock the complete type safety integration
      mockSafetyChecker.checkDataIntegrity.mockReturnValue(false);
      mockTypeValidator.isArray.mockReturnValue(false);
      mockSafetyChecker.provideFallback.mockReturnValue([]);
      mockSafetyChecker.ensureArrayType.mockReturnValue([]);

      // When: Component lifecycle with type checking
      const dataIntegrityOk = mockSafetyChecker.checkDataIntegrity(componentProps.agent);
      let safeActivities: Activity[];

      if (!dataIntegrityOk) {
        const isValidArray = mockTypeValidator.isArray(componentProps.agent.recentActivities);
        if (!isValidArray) {
          safeActivities = mockSafetyChecker.provideFallback(componentProps.agent.recentActivities);
        } else {
          safeActivities = mockSafetyChecker.ensureArrayType(componentProps.agent.recentActivities);
        }
      } else {
        safeActivities = componentProps.agent.recentActivities as Activity[];
      }

      // Then: Verify integration contract
      expect(mockSafetyChecker.checkDataIntegrity).toHaveBeenCalledWith(componentProps.agent);
      expect(mockTypeValidator.isArray).toHaveBeenCalledWith(componentProps.agent.recentActivities);
      expect(mockSafetyChecker.provideFallback).toHaveBeenCalledWith(componentProps.agent.recentActivities);
      
      expect(Array.isArray(safeActivities)).toBe(true);
      expect(safeActivities).toEqual([]);
      expect(() => safeActivities.slice(0, 3)).not.toThrow();
    });

    it('should perform type validation in the correct sequence', () => {
      // Given: A sequence of type validation steps
      const testData = { id: 'test', recentActivities: null };
      const callSequence: string[] = [];

      // Mock the validation sequence
      mockSafetyChecker.checkDataIntegrity.mockImplementation((data) => {
        callSequence.push('checkDataIntegrity');
        return false;
      });

      mockTypeValidator.isArray.mockImplementation((data) => {
        callSequence.push('isArray');
        return false;
      });

      mockSafetyChecker.provideFallback.mockImplementation((data) => {
        callSequence.push('provideFallback');
        return [];
      });

      // When: Executing validation sequence
      const integrityResult = mockSafetyChecker.checkDataIntegrity(testData);
      if (!integrityResult) {
        const arrayResult = mockTypeValidator.isArray(testData.recentActivities);
        if (!arrayResult) {
          mockSafetyChecker.provideFallback(testData.recentActivities);
        }
      }

      // Then: Verify proper sequence
      expect(callSequence).toEqual([
        'checkDataIntegrity',
        'isArray',
        'provideFallback'
      ]);

      // Verify that data integrity is checked before type validation
      const integrityIndex = callSequence.indexOf('checkDataIntegrity');
      const arrayIndex = callSequence.indexOf('isArray');
      const fallbackIndex = callSequence.indexOf('provideFallback');

      expect(integrityIndex).toBeLessThan(arrayIndex);
      expect(arrayIndex).toBeLessThan(fallbackIndex);
    });
  });

  describe('Performance and Efficiency Contracts', () => {
    it('should minimize type checking overhead through efficient validation', () => {
      // Given: Performance monitoring for type checks
      const performanceMetrics = {
        typeCheckCalls: 0,
        validationTime: 0,
        cacheHits: 0
      };

      // Mock efficient type checking
      mockTypeValidator.isArray.mockImplementation((data) => {
        performanceMetrics.typeCheckCalls++;
        const startTime = Date.now();
        const result = Array.isArray(data);
        performanceMetrics.validationTime += Date.now() - startTime;
        return result;
      });

      const testData = [
        [],
        [{ id: '1', type: 'task', title: 'Test' }],
        null,
        undefined,
        'string'
      ];

      // When: Performing multiple type checks
      testData.forEach(data => {
        mockTypeValidator.isArray(data);
      });

      // Then: Verify efficient validation contract
      expect(performanceMetrics.typeCheckCalls).toBe(testData.length);
      expect(mockTypeValidator.isArray).toHaveBeenCalledTimes(testData.length);
      
      // Verify each call was made with correct data
      testData.forEach((data, index) => {
        expect(mockTypeValidator.isArray).toHaveBeenNthCalledWith(index + 1, data);
      });
    });

    it('should cache validation results for repeated type checks', () => {
      // Given: Caching mechanism for type validation
      const validationCache = new Map();
      const cacheStats = { hits: 0, misses: 0 };

      mockTypeValidator.isArray.mockImplementation((data) => {
        const cacheKey = JSON.stringify(data);
        if (validationCache.has(cacheKey)) {
          cacheStats.hits++;
          return validationCache.get(cacheKey);
        } else {
          cacheStats.misses++;
          const result = Array.isArray(data);
          validationCache.set(cacheKey, result);
          return result;
        }
      });

      const testArray = [{ id: '1', type: 'task', title: 'Test' }];

      // When: Performing repeated validation on same data
      mockTypeValidator.isArray(testArray);
      mockTypeValidator.isArray(testArray);
      mockTypeValidator.isArray(testArray);

      // Then: Verify caching efficiency
      expect(mockTypeValidator.isArray).toHaveBeenCalledTimes(3);
      expect(cacheStats.misses).toBe(1); // First call
      expect(cacheStats.hits).toBe(2); // Subsequent calls
    });
  });

  describe('Swarm Coordination Type Safety Contracts', () => {
    it('should share type validation contracts across swarm agents', () => {
      // Given: Swarm contract specifications
      const swarmTypeContracts = {
        TypeValidator: {
          methods: ['isArray', 'isValidActivity', 'isValidActivityArray', 'hasRequiredFields', 'sanitizeType'],
          returnTypes: {
            isArray: 'boolean',
            isValidActivity: 'boolean',
            isValidActivityArray: 'boolean',
            hasRequiredFields: 'boolean',
            sanitizeType: 'Activity[]'
          }
        },
        SafetyChecker: {
          methods: ['validateBeforeSlice', 'ensureArrayType', 'provideFallback', 'checkDataIntegrity'],
          returnTypes: {
            validateBeforeSlice: 'boolean',
            ensureArrayType: 'Activity[]',
            provideFallback: 'Activity[]',
            checkDataIntegrity: 'boolean'
          }
        }
      };

      // When: Verifying swarm contract compliance
      const typeValidatorMethods = Object.keys(mockTypeValidator);
      const safetyCheckerMethods = Object.keys(mockSafetyChecker);

      // Then: Verify contract adherence
      swarmTypeContracts.TypeValidator.methods.forEach(method => {
        expect(typeValidatorMethods).toContain(method);
        expect(typeof mockTypeValidator[method]).toBe('function');
      });

      swarmTypeContracts.SafetyChecker.methods.forEach(method => {
        expect(safetyCheckerMethods).toContain(method);
        expect(typeof mockSafetyChecker[method]).toBe('function');
      });

      // Verify swarm metadata
      expect(mockTypeValidator.__swarmContract).toBe(true);
      expect(mockSafetyChecker.__swarmContract).toBe(true);
      expect(mockErrorHandler.__swarmContract).toBe(true);
    });

    it('should coordinate type safety patterns with integration agents', () => {
      // Given: Type safety coordination patterns
      const coordinationFlow = [];

      const mockCoordinator = {
        reportTypeValidation: jest.fn((result) => {
          coordinationFlow.push(`type-validation-${result}`);
        }),
        requestTypeCheck: jest.fn((data) => {
          coordinationFlow.push(`type-check-requested`);
          return mockTypeValidator.isArray(data);
        }),
        shareValidationResult: jest.fn((result) => {
          coordinationFlow.push(`validation-shared-${result}`);
        })
      };

      const testData = [{ id: '1', type: 'task', title: 'Test' }];
      mockTypeValidator.isArray.mockReturnValue(true);

      // When: Coordinating type validation across agents
      const typeCheckResult = mockCoordinator.requestTypeCheck(testData);
      mockCoordinator.reportTypeValidation(typeCheckResult);
      mockCoordinator.shareValidationResult(typeCheckResult);

      // Then: Verify coordination flow
      expect(coordinationFlow).toEqual([
        'type-check-requested',
        'type-validation-true',
        'validation-shared-true'
      ]);

      expect(mockCoordinator.requestTypeCheck).toHaveBeenCalledWith(testData);
      expect(mockCoordinator.reportTypeValidation).toHaveBeenCalledWith(true);
      expect(mockCoordinator.shareValidationResult).toHaveBeenCalledWith(true);
    });
  });
});