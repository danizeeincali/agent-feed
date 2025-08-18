/**
 * Performance Tests: Multi-Agent Workflow Performance
 * London School TDD - Mock-driven performance testing and benchmarking
 */

import { MockFactory } from '../factories/mock-factory.js';
import { PerformanceProfiler } from '../helpers/performance-profiler.js';
import { WorkflowOrchestrator } from '../../src/workflows/orchestrator.js';
import { AgentSwarm } from '../../src/swarm/manager.js';

describe('Performance Tests: Multi-Agent Workflows', () => {
  let mockFactory;
  let performanceProfiler;
  let mockClaudeCodeTools;
  let mockAgentLinkAPI;
  let mockSwarmCoordination;
  let mockMetricsCollector;

  beforeEach(() => {
    mockFactory = new MockFactory();
    performanceProfiler = new PerformanceProfiler();
    mockClaudeCodeTools = mockFactory.createClaudeCodeMocks();
    mockAgentLinkAPI = mockFactory.createAgentLinkMocks();
    mockSwarmCoordination = mockFactory.createSwarmMocks();
    
    mockMetricsCollector = {
      startTimer: jest.fn().mockReturnValue({ end: jest.fn().mockReturnValue(1000) }),
      recordMetric: jest.fn(),
      recordHistogram: jest.fn(),
      recordCounter: jest.fn()
    };

    // Configure mock response times for performance testing
    mockClaudeCodeTools.Read.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, content: 'mock' }), 50))
    );
    mockClaudeCodeTools.Write.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );
    mockClaudeCodeTools.Edit.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, changes: 1 }), 75))
    );
    mockAgentLinkAPI.postAgentExecution.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ id: 'exec-123' }), 25))
    );
  });

  describe('Agent Execution Performance', () => {
    it('should execute single agent tasks within performance thresholds', async () => {
      // Arrange
      const orchestrator = new WorkflowOrchestrator(
        mockClaudeCodeTools,
        mockAgentLinkAPI,
        mockMetricsCollector
      );
      
      const performanceThresholds = {
        maxExecutionTime: 2000, // 2 seconds
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        maxCpuUsage: 0.8, // 80%
        minThroughput: 10 // 10 operations per second
      };

      const singleAgentTask = {
        agentType: 'coder',
        task: {
          action: 'create_component',
          file: '/workspace/src/Button.jsx',
          template: 'react-component'
        }
      };

      // Act
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      
      const result = await orchestrator.executeAgentTask(singleAgentTask);
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const executionTime = endTime - startTime;
      const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

      // Assert - Verify performance thresholds
      expect(executionTime).toBeLessThan(performanceThresholds.maxExecutionTime);
      expect(memoryUsed).toBeLessThan(performanceThresholds.maxMemoryUsage);
      expect(result.success).toBe(true);

      // Verify metrics collection
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
        'agent_execution_time',
        executionTime,
        { agentType: 'coder', task: 'create_component' }
      );

      expect(mockMetricsCollector.recordHistogram).toHaveBeenCalledWith(
        'agent_memory_usage',
        memoryUsed,
        { agentType: 'coder' }
      );
    });

    it('should handle concurrent agent executions efficiently', async () => {
      // Arrange
      const orchestrator = new WorkflowOrchestrator(
        mockClaudeCodeTools,
        mockAgentLinkAPI,
        mockMetricsCollector
      );

      const concurrentTasks = [
        { agentType: 'coder', task: { action: 'write_file', file: 'component1.js' } },
        { agentType: 'tester', task: { action: 'write_test', file: 'component1.test.js' } },
        { agentType: 'reviewer', task: { action: 'review_code', files: ['component1.js'] } },
        { agentType: 'documenter', task: { action: 'write_docs', component: 'component1' } }
      ];

      const performanceTarget = {
        maxConcurrentExecutionTime: 1500, // Should be faster than sequential
        expectedSpeedup: 2.5 // 2.5x faster than sequential execution
      };

      // Act - Execute concurrently
      const concurrentStartTime = Date.now();
      const concurrentResults = await Promise.all(
        concurrentTasks.map(task => orchestrator.executeAgentTask(task))
      );
      const concurrentEndTime = Date.now();
      const concurrentExecutionTime = concurrentEndTime - concurrentStartTime;

      // Act - Execute sequentially for comparison
      const sequentialStartTime = Date.now();
      const sequentialResults = [];
      for (const task of concurrentTasks) {
        const result = await orchestrator.executeAgentTask(task);
        sequentialResults.push(result);
      }
      const sequentialEndTime = Date.now();
      const sequentialExecutionTime = sequentialEndTime - sequentialStartTime;

      // Assert - Verify concurrent performance
      expect(concurrentExecutionTime).toBeLessThan(performanceTarget.maxConcurrentExecutionTime);
      expect(concurrentResults).toHaveLength(4);
      expect(concurrentResults.every(result => result.success)).toBe(true);

      // Verify speedup from concurrency
      const actualSpeedup = sequentialExecutionTime / concurrentExecutionTime;
      expect(actualSpeedup).toBeGreaterThan(performanceTarget.expectedSpeedup);

      // Verify performance metrics
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
        'concurrent_execution_speedup',
        actualSpeedup,
        { taskCount: 4 }
      );
    });
  });

  describe('Workflow Orchestration Performance', () => {
    it('should execute complex multi-step workflows within SLA', async () => {
      // Arrange
      const orchestrator = new WorkflowOrchestrator(
        mockClaudeCodeTools,
        mockAgentLinkAPI,
        mockMetricsCollector
      );

      const complexWorkflow = {
        id: 'full-feature-development',
        steps: [
          { id: 1, agent: 'researcher', task: 'analyze_requirements', dependencies: [] },
          { id: 2, agent: 'architect', task: 'design_system', dependencies: [1] },
          { id: 3, agent: 'coder', task: 'implement_backend', dependencies: [2] },
          { id: 4, agent: 'coder', task: 'implement_frontend', dependencies: [2] },
          { id: 5, agent: 'tester', task: 'write_tests', dependencies: [3, 4] },
          { id: 6, agent: 'reviewer', task: 'code_review', dependencies: [3, 4] },
          { id: 7, agent: 'documenter', task: 'update_docs', dependencies: [5, 6] }
        ],
        sla: {
          maxDuration: 30000, // 30 seconds
          maxStepDuration: 5000, // 5 seconds per step
          parallelization: true
        }
      };

      // Act
      const workflowStartTime = Date.now();
      const workflowResult = await orchestrator.executeWorkflow(complexWorkflow);
      const workflowEndTime = Date.now();
      const totalDuration = workflowEndTime - workflowStartTime;

      // Assert - Verify SLA compliance
      expect(totalDuration).toBeLessThan(complexWorkflow.sla.maxDuration);
      expect(workflowResult.success).toBe(true);
      expect(workflowResult.completedSteps).toBe(7);

      // Verify parallel execution optimization
      expect(workflowResult.parallelSteps).toContain(3); // Steps 3 & 4 ran in parallel
      expect(workflowResult.parallelSteps).toContain(4);
      expect(workflowResult.parallelSteps).toContain(5); // Steps 5 & 6 ran in parallel
      expect(workflowResult.parallelSteps).toContain(6);

      // Verify step-level performance
      workflowResult.stepMetrics.forEach(stepMetric => {
        expect(stepMetric.duration).toBeLessThan(complexWorkflow.sla.maxStepDuration);
      });

      // Verify workflow performance metrics
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
        'workflow_duration',
        totalDuration,
        { workflowId: 'full-feature-development', steps: 7 }
      );
    });

    it('should optimize agent handoff performance', async () => {
      // Arrange
      const swarm = new AgentSwarm(mockSwarmCoordination, mockMetricsCollector);
      const handoffScenarios = [
        { from: 'researcher', to: 'architect', contextSize: 'small' },
        { from: 'architect', to: 'coder', contextSize: 'medium' },
        { from: 'coder', to: 'tester', contextSize: 'large' },
        { from: 'tester', to: 'reviewer', contextSize: 'medium' }
      ];

      const handoffPerformanceTargets = {
        small: 100, // 100ms
        medium: 250, // 250ms
        large: 500 // 500ms
      };

      // Mock handoff delays based on context size
      mockSwarmCoordination.sendMessage.mockImplementation(({ context }) => {
        const delay = handoffPerformanceTargets[context.size] || 100;
        return new Promise(resolve => 
          setTimeout(() => resolve({ messageId: 'msg-123', delivered: true }), delay)
        );
      });

      // Act & Assert - Test each handoff scenario
      for (const scenario of handoffScenarios) {
        const handoffStartTime = Date.now();
        
        const handoffResult = await swarm.handoffAgent(
          scenario.from,
          scenario.to,
          { size: scenario.contextSize, data: 'mock-context' }
        );
        
        const handoffEndTime = Date.now();
        const handoffDuration = handoffEndTime - handoffStartTime;

        // Verify handoff performance
        expect(handoffDuration).toBeLessThan(handoffPerformanceTargets[scenario.contextSize] * 1.2); // 20% tolerance
        expect(handoffResult.success).toBe(true);

        // Verify performance tracking
        expect(mockMetricsCollector.recordHistogram).toHaveBeenCalledWith(
          'agent_handoff_duration',
          handoffDuration,
          { from: scenario.from, to: scenario.to, contextSize: scenario.contextSize }
        );
      }
    });
  });

  describe('Claude Code Tool Performance', () => {
    it('should benchmark file operation performance', async () => {
      // Arrange
      const fileOperationBenchmarks = [
        { operation: 'Read', files: 10, avgSize: 1024 }, // 1KB files
        { operation: 'Write', files: 10, avgSize: 2048 }, // 2KB files
        { operation: 'Edit', files: 5, changes: 3 }, // 3 edits per file
        { operation: 'Glob', patterns: 5, expectedMatches: 50 }
      ];

      const performanceBaselines = {
        Read: { avgTime: 100, throughput: 100 }, // 100ms, 100 files/sec
        Write: { avgTime: 150, throughput: 67 }, // 150ms, 67 files/sec
        Edit: { avgTime: 200, throughput: 50 }, // 200ms, 50 files/sec
        Glob: { avgTime: 50, throughput: 200 } // 50ms, 200 patterns/sec
      };

      // Act & Assert - Benchmark each operation
      for (const benchmark of fileOperationBenchmarks) {
        const operationStartTime = Date.now();
        const results = [];

        for (let i = 0; i < benchmark.files || benchmark.patterns; i++) {
          let result;
          switch (benchmark.operation) {
            case 'Read':
              result = await mockClaudeCodeTools.Read(`/workspace/file${i}.js`);
              break;
            case 'Write':
              result = await mockClaudeCodeTools.Write(`/workspace/file${i}.js`, 'content');
              break;
            case 'Edit':
              result = await mockClaudeCodeTools.Edit(`/workspace/file${i}.js`, 'old', 'new');
              break;
            case 'Glob':
              result = await mockClaudeCodeTools.Glob(`**/*${i}.js`);
              break;
          }
          results.push(result);
        }

        const operationEndTime = Date.now();
        const totalDuration = operationEndTime - operationStartTime;
        const avgDuration = totalDuration / (benchmark.files || benchmark.patterns);
        const throughput = ((benchmark.files || benchmark.patterns) / totalDuration) * 1000;

        // Verify performance against baselines
        const baseline = performanceBaselines[benchmark.operation];
        expect(avgDuration).toBeLessThan(baseline.avgTime * 1.5); // 50% tolerance
        expect(throughput).toBeGreaterThan(baseline.throughput * 0.7); // 30% tolerance

        // Verify all operations succeeded
        expect(results.every(result => result.success)).toBe(true);

        // Record performance metrics
        expect(mockMetricsCollector.recordHistogram).toHaveBeenCalledWith(
          `claude_code_${benchmark.operation.toLowerCase()}_duration`,
          avgDuration,
          { fileCount: benchmark.files || benchmark.patterns }
        );
      }
    });

    it('should test batch operation performance optimization', async () => {
      // Arrange
      const batchOperations = {
        multipleReads: [
          '/workspace/src/index.js',
          '/workspace/src/utils.js',
          '/workspace/src/config.js',
          '/workspace/tests/index.test.js',
          '/workspace/tests/utils.test.js'
        ],
        multipleWrites: [
          { file: '/workspace/dist/bundle1.js', content: 'bundle1 content' },
          { file: '/workspace/dist/bundle2.js', content: 'bundle2 content' },
          { file: '/workspace/dist/bundle3.js', content: 'bundle3 content' }
        ],
        multipleEdits: [
          { file: '/workspace/src/index.js', old: 'old1', new: 'new1' },
          { file: '/workspace/src/utils.js', old: 'old2', new: 'new2' }
        ]
      };

      // Act - Test sequential vs batch performance
      
      // Sequential operations
      const sequentialStartTime = Date.now();
      for (const file of batchOperations.multipleReads) {
        await mockClaudeCodeTools.Read(file);
      }
      const sequentialEndTime = Date.now();
      const sequentialDuration = sequentialEndTime - sequentialStartTime;

      // Batch operations (Promise.all)
      const batchStartTime = Date.now();
      await Promise.all(
        batchOperations.multipleReads.map(file => mockClaudeCodeTools.Read(file))
      );
      const batchEndTime = Date.now();
      const batchDuration = batchEndTime - batchStartTime;

      // Assert - Verify batch performance improvement
      const performanceImprovement = (sequentialDuration - batchDuration) / sequentialDuration;
      expect(performanceImprovement).toBeGreaterThan(0.3); // At least 30% improvement
      expect(batchDuration).toBeLessThan(sequentialDuration * 0.8); // Less than 80% of sequential time

      // Verify metrics
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
        'batch_operation_improvement',
        performanceImprovement,
        { operation: 'read', batchSize: 5 }
      );
    });
  });

  describe('Memory and Resource Management', () => {
    it('should monitor memory usage during long-running workflows', async () => {
      // Arrange
      const orchestrator = new WorkflowOrchestrator(
        mockClaudeCodeTools,
        mockAgentLinkAPI,
        mockMetricsCollector
      );

      const longRunningWorkflow = {
        id: 'memory-intensive-workflow',
        iterations: 100,
        agentsPerIteration: 3,
        memoryThreshold: 200 * 1024 * 1024 // 200MB
      };

      const memorySnapshots = [];

      // Act - Execute memory-intensive workflow
      for (let i = 0; i < longRunningWorkflow.iterations; i++) {
        // Take memory snapshot
        const memoryUsage = process.memoryUsage();
        memorySnapshots.push({
          iteration: i,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external
        });

        // Execute mini-workflow
        const tasks = Array.from({ length: longRunningWorkflow.agentsPerIteration }, (_, j) => ({
          agentType: `agent-${j}`,
          task: { action: 'process_data', iteration: i, index: j }
        }));

        await Promise.all(tasks.map(task => orchestrator.executeAgentTask(task)));

        // Verify memory doesn't exceed threshold
        expect(memoryUsage.heapUsed).toBeLessThan(longRunningWorkflow.memoryThreshold);
      }

      // Assert - Analyze memory usage patterns
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].heapUsed - memorySnapshots[0].heapUsed;
      const avgMemoryPerIteration = memoryGrowth / longRunningWorkflow.iterations;

      // Verify no significant memory leaks
      expect(avgMemoryPerIteration).toBeLessThan(1024 * 1024); // Less than 1MB growth per iteration

      // Verify memory metrics collection
      expect(mockMetricsCollector.recordHistogram).toHaveBeenCalledWith(
        'workflow_memory_usage',
        expect.any(Number),
        { workflowId: 'memory-intensive-workflow' }
      );
    });

    it('should handle resource cleanup after agent failures', async () => {
      // Arrange
      const orchestrator = new WorkflowOrchestrator(
        mockClaudeCodeTools,
        mockAgentLinkAPI,
        mockMetricsCollector
      );

      // Mock some operations to fail
      mockClaudeCodeTools.Write
        .mockRejectedValueOnce(new Error('Disk full'))
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValue({ success: true });

      const failureProneWorkflow = {
        id: 'failure-test-workflow',
        steps: [
          { agent: 'coder', task: 'write_file_1' },
          { agent: 'coder', task: 'write_file_2' },
          { agent: 'coder', task: 'write_file_3' }
        ],
        resourceCleanup: true
      };

      // Act
      const startMemory = process.memoryUsage();
      const workflowResult = await orchestrator.executeWorkflow(failureProneWorkflow);
      const endMemory = process.memoryUsage();

      // Assert - Verify graceful failure handling
      expect(workflowResult.success).toBe(false);
      expect(workflowResult.failedSteps).toBe(2);
      expect(workflowResult.completedSteps).toBe(1);

      // Verify resource cleanup
      const memoryDifference = endMemory.heapUsed - startMemory.heapUsed;
      expect(memoryDifference).toBeLessThan(10 * 1024 * 1024); // Less than 10MB difference

      // Verify cleanup metrics
      expect(mockMetricsCollector.recordCounter).toHaveBeenCalledWith(
        'workflow_failures',
        { workflowId: 'failure-test-workflow', failureCount: 2 }
      );
    });
  });
});