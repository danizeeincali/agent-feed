"use strict";
/**
 * TDD Prevention Strategies for NLD System
 *
 * Generates specific TDD patterns and test strategies to prevent
 * the types of failures captured by NLD pattern detection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tddPreventionStrategies = exports.TDDPreventionStrategies = void 0;
class TDDPreventionStrategies {
    strategies = new Map();
    constructor() {
        this.initializeStrategies();
    }
    /**
     * Initialize TDD prevention strategies
     */
    initializeStrategies() {
        // CRITICAL: Instance ID Validation Strategy
        this.addStrategy({
            id: 'INSTANCE_ID_VALIDATION',
            name: 'Async State Access Validation',
            description: 'Test that async operations validate required parameters before use',
            category: 'UNIT',
            priority: 'CRITICAL',
            testPattern: {
                framework: 'Jest + React Testing Library',
                setup: `
        const mockConnectionState = { current: { instanceId: null } };
        const mockEmit = jest.fn();
        `,
                testCase: `
        test('should throw error when instanceId is undefined', () => {
          const emitMessage = createEmitMessage(mockConnectionState, mockEmit);
          
          expect(() => {
            emitMessage('terminal:input', { input: 'test', instanceId: undefined });
          }).toThrow('Instance ID required for terminal input');
        });
        `,
                assertion: `expect().toThrow('Instance ID required')`
            },
            preventedFailures: [
                'INSTANCE_ID_UNDEFINED',
                'UNDEFINED_PARAM_PROPAGATION'
            ],
            codeExample: `
      // TDD Test First
      test('emit should validate instanceId before API call', () => {
        const { result } = renderHook(() => useHTTPSSE());
        
        act(() => {
          expect(() => {
            result.current.emit('terminal:input', { 
              input: 'test', 
              instanceId: undefined 
            });
          }).toThrow('Instance ID is required');
        });
      });
      
      // Implementation that passes the test
      const emitMessage = useCallback(async (event: string, data?: any) => {
        if (event === 'terminal:input' && !data?.instanceId) {
          throw new Error('Instance ID is required for terminal input');
        }
        
        const endpoint = \`/api/claude/instances/\${data.instanceId}/terminal/input\`;
        // ... rest of implementation
      }, []);
      `,
            realWorldScenario: `
      Scenario: User creates Claude instance, gets ID 'claude-2643', clicks to connect terminal
      Without TDD: connectSSE() called, emit() uses undefined instanceId, 404 error
      With TDD: emit() validates instanceId, throws clear error, bug caught immediately
      `
        });
        // Integration Test Strategy  
        this.addStrategy({
            id: 'INSTANCE_CREATION_FLOW',
            name: 'Full Instance Creation Flow Test',
            description: 'Integration test covering creation -> selection -> terminal connection',
            category: 'INTEGRATION',
            priority: 'HIGH',
            testPattern: {
                framework: 'Jest + React Testing Library',
                setup: `
        const mockApiResponse = { success: true, instanceId: 'claude-test-123' };
        fetchMock.mockResponse(JSON.stringify(mockApiResponse));
        `,
                testCase: `
        test('full instance creation and terminal connection flow', async () => {
          render(<ClaudeInstanceManager />);
          
          // 1. Create instance
          fireEvent.click(screen.getByText('🚀 prod/claude'));
          await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/claude/instances'));
          
          // 2. Verify instance appears in list
          await waitFor(() => expect(screen.getByText('claude-test-123')).toBeInTheDocument());
          
          // 3. Select instance for terminal connection
          fireEvent.click(screen.getByText('claude-test-123'));
          
          // 4. Send terminal input
          const input = screen.getByPlaceholderText('Type command and press Enter...');
          fireEvent.change(input, { target: { value: 'ls -la' } });
          fireEvent.click(screen.getByText('Send'));
          
          // 5. Verify correct API call with valid instanceId
          await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
              '/api/claude/instances/claude-test-123/terminal/input',
              expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ input: 'ls -la\\n' })
              })
            );
          });
        });
        `,
                assertion: `expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('claude-test-123'))`
            },
            preventedFailures: [
                'INSTANCE_ID_UNDEFINED',
                'STATE_MANAGEMENT_RACE_CONDITIONS',
                'UI_BACKEND_INTEGRATION_FAILURES'
            ],
            codeExample: `
      // This integration test would have caught the instanceId undefined bug
      // because it tests the full user journey from creation to terminal input
      
      test('user can create instance and send terminal commands', async () => {
        // Mock successful instance creation
        mockApi.post('/api/claude/instances').reply(200, { 
          success: true, 
          instanceId: 'claude-123' 
        });
        
        // Mock terminal input endpoint  
        mockApi.post('/api/claude/instances/claude-123/terminal/input').reply(200, {
          success: true
        });
        
        const { getByText, getByRole } = render(<ClaudeInstanceManager />);
        
        // Create instance
        fireEvent.click(getByText('🚀 prod/claude'));
        
        // Wait for instance to appear and be selectable
        await waitFor(() => getByText('claude-123'));
        
        // Select instance
        fireEvent.click(getByText('claude-123'));
        
        // Send command
        const input = getByRole('textbox');
        fireEvent.change(input, { target: { value: 'pwd' } });
        fireEvent.submit(input);
        
        // Verify API was called with correct instanceId
        await waitFor(() => {
          expect(mockApi.history.post).toContainEqual(
            expect.objectContaining({
              url: '/api/claude/instances/claude-123/terminal/input'
            })
          );
        });
      });
      `,
            realWorldScenario: `
      Real Bug: Backend creates instance 'claude-2643', frontend receives it, but terminal 
      connection sends request to '/api/claude/instances/undefined/terminal/input'
      
      This integration test catches the bug by testing the complete user workflow
      and verifying the actual API calls made.
      `
        });
        // Property-Based Testing Strategy
        this.addStrategy({
            id: 'INSTANCE_ID_PROPERTY_TEST',
            name: 'Instance ID Properties Validation',
            description: 'Property-based tests to ensure instanceId is always valid',
            category: 'PROPERTY',
            priority: 'MEDIUM',
            testPattern: {
                framework: 'fast-check + Jest',
                setup: `
        import fc from 'fast-check';
        const validInstanceIdArbitrary = fc.stringOf(fc.char(), { minLength: 1 });
        const invalidInstanceIdArbitrary = fc.constantFrom(null, undefined, '', 0, false);
        `,
                testCase: `
        test('emit should work with any valid instanceId', () => {
          fc.assert(fc.property(validInstanceIdArbitrary, (instanceId) => {
            const result = emitMessage('terminal:input', { 
              input: 'test', 
              instanceId 
            });
            
            expect(result).not.toThrow();
            expect(mockFetch).toHaveBeenCalledWith(
              expect.stringContaining(instanceId)
            );
          }));
        });
        
        test('emit should reject any invalid instanceId', () => {
          fc.assert(fc.property(invalidInstanceIdArbitrary, (instanceId) => {
            expect(() => {
              emitMessage('terminal:input', { 
                input: 'test', 
                instanceId 
              });
            }).toThrow();
          }));
        });
        `,
                assertion: `fc.assert(fc.property(arbitrary, (value) => expectation))`
            },
            preventedFailures: [
                'UNDEFINED_PARAM_PROPAGATION',
                'EDGE_CASE_INPUT_FAILURES'
            ],
            codeExample: `
      // Property-based testing catches edge cases
      import fc from 'fast-check';
      
      describe('instanceId validation properties', () => {
        test('any truthy string should be accepted as instanceId', () => {
          fc.assert(fc.property(
            fc.string({ minLength: 1 }),
            (instanceId) => {
              expect(() => {
                validateInstanceId(instanceId);
              }).not.toThrow();
            }
          ));
        });
        
        test('any falsy value should be rejected as instanceId', () => {
          fc.assert(fc.property(
            fc.constantFrom(null, undefined, '', 0, false, NaN),
            (instanceId) => {
              expect(() => {
                validateInstanceId(instanceId);
              }).toThrow('Invalid instance ID');
            }
          ));
        });
      });
      `,
            realWorldScenario: `
      Property-based testing would generate hundreds of test cases with different
      instanceId values, including edge cases like empty strings, null, undefined,
      numbers, booleans - catching the undefined case automatically.
      `
        });
        // Contract Testing Strategy
        this.addStrategy({
            id: 'API_CONTRACT_VALIDATION',
            name: 'Frontend-Backend Contract Tests',
            description: 'Contract tests to ensure API endpoints expect required parameters',
            category: 'CONTRACT',
            priority: 'HIGH',
            testPattern: {
                framework: 'Pact.js',
                setup: `
        const { Pact } = require('@pact-foundation/pact');
        const provider = new Pact({
          consumer: 'claude-frontend',
          provider: 'claude-backend'
        });
        `,
                testCase: `
        test('terminal input endpoint requires instanceId', async () => {
          await provider
            .given('instance claude-123 exists')
            .uponReceiving('terminal input request')
            .withRequest({
              method: 'POST',
              path: '/api/claude/instances/claude-123/terminal/input',
              headers: { 'Content-Type': 'application/json' },
              body: { input: 'ls -la' }
            })
            .willRespondWith({
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: { success: true }
            });
            
          // This would fail if frontend sends undefined instanceId
          const response = await apiClient.sendTerminalInput('claude-123', 'ls -la');
          expect(response.success).toBe(true);
        });
        `,
                assertion: `expect(mockProvider).toHaveBeenCalledWithValidContract()`
            },
            preventedFailures: [
                'API_INTEGRATION_FAILURES',
                'BACKEND_FRONTEND_MISMATCH'
            ],
            codeExample: `
      // Pact contract testing catches API integration issues
      describe('Claude API Contract', () => {
        test('backend expects valid instanceId in terminal input', async () => {
          await provider
            .given('claude instance exists')
            .uponReceiving('valid terminal input request')  
            .withRequest({
              method: 'POST',
              path: matchers.regex('/api/claude/instances/[a-z0-9-]+/terminal/input'),
              body: {
                input: matchers.string('command')
              }
            })
            .willRespondWith({
              status: 200,
              body: { success: true }
            });
            
          // Contract fails if instanceId is undefined
          const client = new ClaudeApiClient(mockProvider.mockService.baseUrl);
          const result = await client.sendInput('claude-test', 'pwd');
          expect(result.success).toBe(true);
        });
      });
      `,
            realWorldScenario: `
      Contract tests run against both frontend and backend, ensuring they agree
      on API contracts. A contract test would fail if frontend sends requests
      to /undefined/ endpoints, catching integration issues early.
      `
        });
    }
    /**
     * Add a new TDD strategy
     */
    addStrategy(strategy) {
        this.strategies.set(strategy.id, strategy);
    }
    /**
     * Get prevention strategies for specific failure patterns
     */
    getStrategiesForFailure(failureType) {
        return Array.from(this.strategies.values())
            .filter(strategy => strategy.preventedFailures.includes(failureType));
    }
    /**
     * Generate comprehensive TDD prevention plan
     */
    generatePreventionPlan(detectedPatterns) {
        const relevantStrategies = new Set();
        // Find all strategies that prevent the detected patterns
        detectedPatterns.forEach(pattern => {
            const strategies = this.getStrategiesForFailure(pattern);
            strategies.forEach(strategy => relevantStrategies.add(strategy));
        });
        const strategiesByPriority = Array.from(relevantStrategies)
            .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));
        return {
            detectedPatterns,
            recommendedStrategies: strategiesByPriority.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                priority: s.priority,
                testPattern: s.testPattern,
                codeExample: s.codeExample
            })),
            implementationOrder: this.getImplementationOrder(strategiesByPriority),
            estimatedEffort: this.estimateEffort(strategiesByPriority),
            preventionCoverage: this.calculatePreventionCoverage(strategiesByPriority, detectedPatterns)
        };
    }
    /**
     * Get priority value for sorting
     */
    getPriorityValue(priority) {
        switch (priority) {
            case 'CRITICAL': return 4;
            case 'HIGH': return 3;
            case 'MEDIUM': return 2;
            case 'LOW': return 1;
            default: return 0;
        }
    }
    /**
     * Get recommended implementation order
     */
    getImplementationOrder(strategies) {
        return {
            phase1_immediate: strategies.filter(s => s.priority === 'CRITICAL'),
            phase2_short_term: strategies.filter(s => s.priority === 'HIGH'),
            phase3_medium_term: strategies.filter(s => s.priority === 'MEDIUM'),
            phase4_long_term: strategies.filter(s => s.priority === 'LOW')
        };
    }
    /**
     * Estimate implementation effort
     */
    estimateEffort(strategies) {
        const effortByCategory = {
            UNIT: 1, // 1 day per test
            INTEGRATION: 3, // 3 days per test
            E2E: 5, // 5 days per test
            CONTRACT: 2, // 2 days per test
            PROPERTY: 2 // 2 days per test
        };
        const totalDays = strategies.reduce((sum, strategy) => {
            return sum + (effortByCategory[strategy.category] || 1);
        }, 0);
        return {
            totalStrategies: strategies.length,
            estimatedDays: totalDays,
            byCategory: strategies.reduce((acc, strategy) => {
                acc[strategy.category] = (acc[strategy.category] || 0) + 1;
                return acc;
            }, {}),
            criticalPath: strategies.filter(s => s.priority === 'CRITICAL').length * 1 // Rush critical items
        };
    }
    /**
     * Calculate what percentage of failures would be prevented
     */
    calculatePreventionCoverage(strategies, patterns) {
        const allPreventedFailures = new Set();
        strategies.forEach(strategy => {
            strategy.preventedFailures.forEach(failure => allPreventedFailures.add(failure));
        });
        const coveredPatterns = patterns.filter(pattern => allPreventedFailures.has(pattern));
        return {
            totalPatterns: patterns.length,
            coveredPatterns: coveredPatterns.length,
            coveragePercentage: patterns.length > 0 ? (coveredPatterns.length / patterns.length) * 100 : 0,
            uncoveredPatterns: patterns.filter(pattern => !allPreventedFailures.has(pattern))
        };
    }
    /**
     * Export strategies for training data
     */
    exportStrategies() {
        return {
            strategies: Array.from(this.strategies.values()),
            statistics: {
                totalStrategies: this.strategies.size,
                byCategory: this.getStrategiesByCategory(),
                byPriority: this.getStrategiesByPriority()
            }
        };
    }
    getStrategiesByCategory() {
        const categories = Array.from(this.strategies.values())
            .reduce((acc, strategy) => {
            acc[strategy.category] = (acc[strategy.category] || 0) + 1;
            return acc;
        }, {});
        return categories;
    }
    getStrategiesByPriority() {
        const priorities = Array.from(this.strategies.values())
            .reduce((acc, strategy) => {
            acc[strategy.priority] = (acc[strategy.priority] || 0) + 1;
            return acc;
        }, {});
        return priorities;
    }
}
exports.TDDPreventionStrategies = TDDPreventionStrategies;
// Global instance
exports.tddPreventionStrategies = new TDDPreventionStrategies();
//# sourceMappingURL=tdd-prevention-strategies.js.map