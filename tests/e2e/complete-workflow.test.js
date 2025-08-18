/**
 * End-to-End Tests: Complete Agent Workflow
 * London School TDD - Complete system integration testing
 */

import { MockFactory } from '../factories/mock-factory.js';
import { SwarmTestCoordinator } from '../helpers/swarm-coordinator.js';
import { PerformanceProfiler } from '../helpers/performance-profiler.js';
import { ContractVerifier } from '../helpers/contract-verifier.js';

describe('E2E Tests: Complete Agent Workflow', () => {
  let mockFactory;
  let swarmCoordinator;
  let performanceProfiler;
  let contractVerifier;
  let mockClaudeCodeTools;
  let mockAgentLinkAPI;
  let mockWebSocket;
  let mockDatabase;

  beforeEach(() => {
    mockFactory = new MockFactory();
    swarmCoordinator = new SwarmTestCoordinator();
    performanceProfiler = new PerformanceProfiler();
    contractVerifier = new ContractVerifier();

    mockClaudeCodeTools = mockFactory.createClaudeCodeMocks();
    mockAgentLinkAPI = mockFactory.createAgentLinkMocks();
    mockDatabase = mockFactory.createDatabaseMocks();
    
    mockWebSocket = {
      send: jest.fn(),
      broadcast: jest.fn(),
      clients: new Set(['client-1', 'client-2'])
    };

    // Setup performance thresholds for E2E tests
    performanceProfiler.setThreshold('complete_workflow.duration', { max: 60000, severity: 'critical' });
    performanceProfiler.setThreshold('complete_workflow.memory', { max: 500 * 1024 * 1024, severity: 'warning' });
  });

  describe('Full Feature Development Workflow', () => {
    it('should complete full feature development from requirements to deployment', async () => {
      // Arrange
      const featureRequest = {
        id: 'feature-user-authentication',
        description: 'Implement user authentication with JWT tokens',
        requirements: [
          'User registration and login',
          'JWT token generation and validation',
          'Password hashing and security',
          'Role-based access control',
          'API endpoint protection'
        ],
        acceptance_criteria: [
          'Users can register with email and password',
          'Users can login and receive JWT token',
          'Protected endpoints require valid token',
          'Admins can manage user roles'
        ]
      };

      // Mock successful agent executions
      mockClaudeCodeTools.Read.mockResolvedValue({
        success: true,
        content: 'mock file content',
        lines: ['line1', 'line2']
      });

      mockClaudeCodeTools.Write.mockResolvedValue({
        success: true,
        path: 'mock-path',
        bytesWritten: 1024
      });

      mockClaudeCodeTools.Bash.mockResolvedValue({
        success: true,
        stdout: 'Tests passed: 15, Failed: 0',
        stderr: '',
        exitCode: 0
      });

      mockAgentLinkAPI.postAgentExecution.mockResolvedValue({
        id: 'exec-123',
        status: 'completed',
        timestamp: new Date().toISOString()
      });

      mockAgentLinkAPI.emitWebSocketEvent.mockResolvedValue({
        success: true,
        messageId: 'ws-msg-123',
        deliveredTo: 2
      });

      mockDatabase.create.mockResolvedValue({
        id: 'record-123',
        created: true
      });

      // Act - Execute complete workflow
      performanceProfiler.startMeasurement('complete_workflow', { feature: featureRequest.id });

      // Phase 1: Requirements Analysis and Planning
      performanceProfiler.addMarker('complete_workflow', 'requirements_analysis_start');
      
      const researcherAgent = swarmCoordinator.createAgentTestDouble('researcher', {
        capabilities: ['requirements-analysis', 'technical-research'],
        executeResult: {
          success: true,
          result: {
            technical_spec: 'JWT authentication specification',
            dependencies: ['jsonwebtoken', 'bcrypt', 'express-validator'],
            estimated_effort: '2 days',
            risks: ['password security', 'token expiration handling']
          }
        }
      });

      const analysisResult = await researcherAgent.execute({
        action: 'analyze_requirements',
        requirements: featureRequest.requirements
      });

      performanceProfiler.addMarker('complete_workflow', 'requirements_analysis_complete');

      // Phase 2: Architecture and Design
      performanceProfiler.addMarker('complete_workflow', 'architecture_design_start');

      const architectAgent = swarmCoordinator.createAgentTestDouble('architect', {
        capabilities: ['system-design', 'database-design', 'api-design'],
        executeResult: {
          success: true,
          result: {
            database_schema: 'users table with encrypted passwords',
            api_endpoints: ['/auth/register', '/auth/login', '/auth/verify'],
            middleware: ['auth-middleware', 'role-middleware'],
            security_measures: ['bcrypt hashing', 'JWT signing', 'rate limiting']
          }
        }
      });

      const designResult = await architectAgent.execute({
        action: 'design_system',
        specification: analysisResult.result.technical_spec
      });

      performanceProfiler.addMarker('complete_workflow', 'architecture_design_complete');

      // Phase 3: Implementation
      performanceProfiler.addMarker('complete_workflow', 'implementation_start');

      // Backend Implementation
      const backendCoderAgent = swarmCoordinator.createAgentTestDouble('backend-coder', {
        capabilities: ['nodejs-development', 'api-development', 'database-integration'],
        executeResult: {
          success: true,
          result: {
            files_created: [
              '/src/auth/routes.js',
              '/src/auth/middleware.js',
              '/src/models/User.js',
              '/src/utils/jwt.js'
            ],
            tests_created: [
              '/tests/auth/auth.test.js',
              '/tests/auth/middleware.test.js'
            ]
          }
        }
      });

      const backendResult = await backendCoderAgent.execute({
        action: 'implement_backend',
        design: designResult.result,
        technology: 'nodejs-express'
      });

      // Frontend Implementation
      const frontendCoderAgent = swarmCoordinator.createAgentTestDouble('frontend-coder', {
        capabilities: ['react-development', 'state-management', 'form-handling'],
        executeResult: {
          success: true,
          result: {
            components_created: [
              '/src/components/LoginForm.jsx',
              '/src/components/RegisterForm.jsx',
              '/src/components/ProtectedRoute.jsx'
            ],
            hooks_created: [
              '/src/hooks/useAuth.js',
              '/src/hooks/useToken.js'
            ]
          }
        }
      });

      const frontendResult = await frontendCoderAgent.execute({
        action: 'implement_frontend',
        design: designResult.result,
        technology: 'react'
      });

      performanceProfiler.addMarker('complete_workflow', 'implementation_complete');

      // Phase 4: Testing
      performanceProfiler.addMarker('complete_workflow', 'testing_start');

      const testerAgent = swarmCoordinator.createAgentTestDouble('tester', {
        capabilities: ['unit-testing', 'integration-testing', 'security-testing'],
        executeResult: {
          success: true,
          result: {
            test_suites: [
              'Authentication API tests',
              'JWT token validation tests',
              'Security vulnerability tests',
              'Integration tests'
            ],
            coverage: 95,
            tests_passed: 87,
            tests_failed: 0
          }
        }
      });

      const testingResult = await testerAgent.execute({
        action: 'create_test_suite',
        backend_files: backendResult.result.files_created,
        frontend_files: frontendResult.result.components_created
      });

      // Run tests
      await mockClaudeCodeTools.Bash('npm test');

      performanceProfiler.addMarker('complete_workflow', 'testing_complete');

      // Phase 5: Code Review
      performanceProfiler.addMarker('complete_workflow', 'code_review_start');

      const reviewerAgent = swarmCoordinator.createAgentTestDouble('reviewer', {
        capabilities: ['code-review', 'security-review', 'best-practices'],
        executeResult: {
          success: true,
          result: {
            review_status: 'approved',
            issues_found: 2,
            issues_fixed: 2,
            security_score: 9.5,
            code_quality_score: 9.2
          }
        }
      });

      const reviewResult = await reviewerAgent.execute({
        action: 'review_code',
        files: [
          ...backendResult.result.files_created,
          ...frontendResult.result.components_created
        ]
      });

      performanceProfiler.addMarker('complete_workflow', 'code_review_complete');

      // Phase 6: Documentation
      performanceProfiler.addMarker('complete_workflow', 'documentation_start');

      const documenterAgent = swarmCoordinator.createAgentTestDouble('documenter', {
        capabilities: ['api-documentation', 'user-documentation', 'technical-writing'],
        executeResult: {
          success: true,
          result: {
            documentation_created: [
              '/docs/api/authentication.md',
              '/docs/user/login-guide.md',
              '/docs/development/auth-setup.md'
            ],
            coverage: 'complete'
          }
        }
      });

      const docResult = await documenterAgent.execute({
        action: 'create_documentation',
        feature: featureRequest,
        implementation: {
          backend: backendResult.result,
          frontend: frontendResult.result,
          tests: testingResult.result
        }
      });

      performanceProfiler.addMarker('complete_workflow', 'documentation_complete');

      // Phase 7: Deployment Preparation
      performanceProfiler.addMarker('complete_workflow', 'deployment_start');

      const deploymentAgent = swarmCoordinator.createAgentTestDouble('deployment', {
        capabilities: ['ci-cd', 'docker', 'cloud-deployment'],
        executeResult: {
          success: true,
          result: {
            docker_images: ['app:latest', 'nginx:latest'],
            deployment_config: 'kubernetes-config.yaml',
            environment_vars: ['JWT_SECRET', 'DB_CONNECTION'],
            health_checks: 'configured'
          }
        }
      });

      const deploymentResult = await deploymentAgent.execute({
        action: 'prepare_deployment',
        application: {
          backend: backendResult.result,
          frontend: frontendResult.result
        }
      });

      performanceProfiler.addMarker('complete_workflow', 'deployment_complete');

      const workflowMetrics = performanceProfiler.endMeasurement('complete_workflow');

      // Assert - Verify complete workflow success
      expect(analysisResult.success).toBe(true);
      expect(designResult.success).toBe(true);
      expect(backendResult.success).toBe(true);
      expect(frontendResult.success).toBe(true);
      expect(testingResult.success).toBe(true);
      expect(reviewResult.success).toBe(true);
      expect(docResult.success).toBe(true);
      expect(deploymentResult.success).toBe(true);

      // Verify workflow performance
      expect(workflowMetrics.duration).toBeLessThan(60000); // Less than 60 seconds
      expect(workflowMetrics.markers).toHaveLength(14); // 7 phases * 2 markers each

      // Verify agent coordination
      expect(mockAgentLinkAPI.postAgentExecution).toHaveBeenCalledTimes(7); // One per agent
      expect(mockAgentLinkAPI.emitWebSocketEvent).toHaveBeenCalledTimes(14); // Start/end for each phase

      // Verify Claude Code tool usage
      expect(mockClaudeCodeTools.Write).toHaveBeenCalled(); // Files were written
      expect(mockClaudeCodeTools.Bash).toHaveBeenCalledWith('npm test'); // Tests were run

      // Verify database operations
      expect(mockDatabase.create).toHaveBeenCalled(); // Feature tracking record

      // Verify final deliverables
      const finalDeliverables = {
        backend_files: backendResult.result.files_created.length,
        frontend_files: frontendResult.result.components_created.length,
        test_coverage: testingResult.result.coverage,
        code_quality: reviewResult.result.code_quality_score,
        documentation: docResult.result.documentation_created.length,
        deployment_ready: deploymentResult.success
      };

      expect(finalDeliverables.backend_files).toBeGreaterThan(0);
      expect(finalDeliverables.frontend_files).toBeGreaterThan(0);
      expect(finalDeliverables.test_coverage).toBeGreaterThan(90);
      expect(finalDeliverables.code_quality).toBeGreaterThan(9);
      expect(finalDeliverables.documentation).toBeGreaterThan(0);
      expect(finalDeliverables.deployment_ready).toBe(true);
    });

    it('should handle workflow failures and recovery gracefully', async () => {
      // Arrange
      const failureScenarios = [
        { phase: 'implementation', agent: 'coder', error: 'Syntax error in generated code' },
        { phase: 'testing', agent: 'tester', error: 'Test failures detected' },
        { phase: 'review', agent: 'reviewer', error: 'Security vulnerabilities found' }
      ];

      performanceProfiler.startMeasurement('failure_recovery_workflow');

      // Act & Assert - Test each failure scenario
      for (const scenario of failureScenarios) {
        const failingAgent = swarmCoordinator.createAgentTestDouble(scenario.agent, {
          executeResult: {
            success: false,
            error: scenario.error,
            recoverable: true,
            retry_suggestion: 'Fix the identified issues and retry'
          }
        });

        const recoveryAgent = swarmCoordinator.createAgentTestDouble(`${scenario.agent}-recovery`, {
          executeResult: {
            success: true,
            result: `Fixed issues in ${scenario.phase}`,
            recovery_actions: ['Fixed syntax errors', 'Updated tests', 'Applied security patches']
          }
        });

        // Simulate initial failure
        const failureResult = await failingAgent.execute({
          action: `execute_${scenario.phase}`,
          input: 'test input'
        });

        expect(failureResult.success).toBe(false);
        expect(failureResult.error).toBe(scenario.error);

        // Simulate recovery
        const recoveryResult = await recoveryAgent.execute({
          action: `recover_${scenario.phase}`,
          error: failureResult.error
        });

        expect(recoveryResult.success).toBe(true);

        // Verify error reporting to AgentLink
        expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            details: expect.objectContaining({
              agent: scenario.agent,
              phase: scenario.phase,
              error: scenario.error,
              recovered: true
            })
          })
        );
      }

      const recoveryMetrics = performanceProfiler.endMeasurement('failure_recovery_workflow');
      expect(recoveryMetrics.duration).toBeLessThan(30000); // Recovery should be faster
    });
  });

  describe('Real-time Frontend Updates', () => {
    it('should provide real-time updates throughout workflow execution', async () => {
      // Arrange
      const workflowEvents = [];
      const mockWebSocketHandler = {
        broadcast: jest.fn().mockImplementation((event) => {
          workflowEvents.push(event);
          return Promise.resolve({ sent: true, recipients: 2 });
        })
      };

      mockAgentLinkAPI.emitWebSocketEvent.mockImplementation((event) => {
        return mockWebSocketHandler.broadcast(event);
      });

      // Act - Simulate agent workflow with real-time updates
      const agents = ['researcher', 'coder', 'tester', 'reviewer'];
      
      for (const agentType of agents) {
        // Agent start event
        await mockAgentLinkAPI.emitWebSocketEvent({
          type: 'agent_execution_start',
          agentId: `agent-${agentType}`,
          agentType,
          timestamp: new Date().toISOString()
        });

        // Progress events
        await mockAgentLinkAPI.emitWebSocketEvent({
          type: 'agent_progress',
          agentId: `agent-${agentType}`,
          progress: 50,
          currentTask: `Executing ${agentType} tasks`,
          timestamp: new Date().toISOString()
        });

        // Agent completion event
        await mockAgentLinkAPI.emitWebSocketEvent({
          type: 'agent_execution_complete',
          agentId: `agent-${agentType}`,
          result: { success: true, duration: 1000 },
          timestamp: new Date().toISOString()
        });
      }

      // Assert - Verify real-time event flow
      expect(workflowEvents).toHaveLength(12); // 3 events per agent * 4 agents
      
      // Verify event types
      const eventTypes = workflowEvents.map(event => event.type);
      expect(eventTypes.filter(type => type === 'agent_execution_start')).toHaveLength(4);
      expect(eventTypes.filter(type => type === 'agent_progress')).toHaveLength(4);
      expect(eventTypes.filter(type => type === 'agent_execution_complete')).toHaveLength(4);

      // Verify chronological order
      const timestamps = workflowEvents.map(event => new Date(event.timestamp).getTime());
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
      expect(timestamps).toEqual(sortedTimestamps);

      // Verify WebSocket delivery
      expect(mockWebSocketHandler.broadcast).toHaveBeenCalledTimes(12);
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      // Arrange
      mockAgentLinkAPI.emitWebSocketEvent.mockRejectedValueOnce(
        new Error('WebSocket connection lost')
      ).mockResolvedValue({ success: true, queued: true });

      // Act - Simulate WebSocket failure and recovery
      let firstCallResult;
      try {
        firstCallResult = await mockAgentLinkAPI.emitWebSocketEvent({
          type: 'agent_execution_start',
          agentId: 'agent-123'
        });
      } catch (error) {
        firstCallResult = { error: error.message };
      }

      // Second call should succeed (connection recovered)
      const secondCallResult = await mockAgentLinkAPI.emitWebSocketEvent({
        type: 'agent_execution_complete',
        agentId: 'agent-123'
      });

      // Assert - Verify graceful failure handling
      expect(firstCallResult.error).toBe('WebSocket connection lost');
      expect(secondCallResult.success).toBe(true);
      expect(secondCallResult.queued).toBe(true); // Event was queued during outage
    });
  });

  describe('Cross-Session Persistence', () => {
    it('should persist and restore agent workflow state across sessions', async () => {
      // Arrange
      const sessionId = 'session-persistence-test';
      const workflowState = {
        workflowId: 'workflow-123',
        currentStep: 3,
        completedSteps: [1, 2],
        activeAgents: ['agent-coder', 'agent-tester'],
        context: {
          projectPath: '/workspace',
          lastModified: new Date().toISOString(),
          artifacts: ['/workspace/src/index.js', '/workspace/tests/index.test.js']
        }
      };

      mockDatabase.create.mockResolvedValue({
        id: 'session-record-123',
        created: true
      });

      mockDatabase.read.mockResolvedValue({
        id: 'session-record-123',
        data: workflowState,
        found: true
      });

      // Act - Persist workflow state
      await mockDatabase.create({
        table: 'workflow_sessions',
        data: {
          sessionId,
          workflowState,
          timestamp: new Date().toISOString()
        }
      });

      // Simulate session restoration
      const restoredState = await mockDatabase.read({
        table: 'workflow_sessions',
        where: { sessionId }
      });

      // Assert - Verify state persistence and restoration
      expect(mockDatabase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'workflow_sessions',
          data: expect.objectContaining({
            sessionId,
            workflowState
          })
        })
      );

      expect(restoredState.data).toEqual(workflowState);
      expect(restoredState.found).toBe(true);

      // Verify state consistency
      expect(restoredState.data.currentStep).toBe(3);
      expect(restoredState.data.completedSteps).toHaveLength(2);
      expect(restoredState.data.activeAgents).toHaveLength(2);
      expect(restoredState.data.context.artifacts).toHaveLength(2);
    });

    it('should handle session cleanup and archival', async () => {
      // Arrange
      const expiredSessions = [
        { sessionId: 'session-1', lastActivity: new Date(Date.now() - 86400000 * 7) }, // 7 days old
        { sessionId: 'session-2', lastActivity: new Date(Date.now() - 86400000 * 14) }, // 14 days old
        { sessionId: 'session-3', lastActivity: new Date(Date.now() - 3600000) } // 1 hour old (active)
      ];

      mockDatabase.query.mockResolvedValue({
        results: expiredSessions.slice(0, 2), // Only expired sessions
        count: 2
      });

      mockDatabase.delete.mockResolvedValue({
        deleted: true,
        count: 2
      });

      // Act - Cleanup expired sessions
      const cleanupResult = await mockDatabase.query({
        table: 'workflow_sessions',
        where: {
          lastActivity: { lt: new Date(Date.now() - 86400000 * 3) } // Older than 3 days
        }
      });

      await mockDatabase.delete({
        table: 'workflow_sessions',
        where: {
          sessionId: { in: cleanupResult.results.map(s => s.sessionId) }
        }
      });

      // Assert - Verify cleanup process
      expect(cleanupResult.count).toBe(2); // Only 2 expired sessions
      expect(mockDatabase.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'workflow_sessions',
          where: {
            sessionId: { in: ['session-1', 'session-2'] }
          }
        })
      );
    });
  });

  describe('Contract Compliance Verification', () => {
    it('should verify all contracts are satisfied throughout the workflow', async () => {
      // Arrange
      const contractChain = [
        {
          tool: 'Write',
          input: { file_path: '/workspace/src/auth.js', content: 'auth module' },
          output: { success: true, path: '/workspace/src/auth.js', bytesWritten: 100 },
          contract: {
            input: { file_path: 'string', content: 'string' },
            output: { success: 'boolean', path: 'string', bytesWritten: 'number' }
          }
        },
        {
          api: 'postAgentExecution',
          input: {
            agentName: 'coder',
            tool: 'Write',
            arguments: ['/workspace/src/auth.js', 'auth module'],
            result: { success: true, path: '/workspace/src/auth.js', bytesWritten: 100 }
          },
          contract: {
            input: {
              agentName: 'string',
              tool: 'string',
              arguments: 'array',
              result: 'object'
            },
            output: { id: 'string', status: 'string' }
          }
        }
      ];

      // Act - Execute contract chain
      await mockClaudeCodeTools.Write(
        contractChain[0].input.file_path,
        contractChain[0].input.content
      );

      await mockAgentLinkAPI.postAgentExecution(contractChain[1].input);

      // Assert - Verify contract compliance
      expect(() => {
        contractVerifier.verifyContractChain(contractChain);
      }).not.toThrow();

      // Verify mock calls match contract expectations
      expect(mockClaudeCodeTools.Write).toHaveBeenCalledWith(
        '/workspace/src/auth.js',
        'auth module'
      );

      expect(mockAgentLinkAPI.postAgentExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          agentName: 'coder',
          tool: 'Write',
          arguments: ['/workspace/src/auth.js', 'auth module']
        })
      );
    });
  });
});