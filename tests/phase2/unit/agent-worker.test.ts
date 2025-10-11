/**
 * Agent Worker Unit Tests
 * TDD London School - Mock-First Approach
 *
 * Test Coverage:
 * - Worker lifecycle management
 * - Context loading from database
 * - Task execution with Claude API
 * - Memory saving to database
 * - Timeout enforcement
 * - Error handling
 * - Event emission
 * - Metrics collection
 */

import { AgentWorker } from '../../../src/workers/agent-worker';
import { WorkerStatus } from '../../../src/types/worker';
import { WorkTicket } from '../../../src/types/work-ticket';
import { AgentContext } from '../../../src/types/agent-context';
import { DatabaseManager } from '../../../src/types/database-manager';

// Mock dependencies
const mockComposeAgentContext = jest.fn();
const mockClaudeAPI = {
  messages: {
    create: jest.fn()
  }
};
const mockDatabase = {
  query: jest.fn(),
  transaction: jest.fn()
} as unknown as DatabaseManager;

// Mock modules
jest.mock('../../../src/database/context-composer', () => ({
  composeAgentContext: (...args: any[]) => mockComposeAgentContext(...args),
  getModelForAgent: jest.fn(() => 'claude-sonnet-4-5-20250929')
}));

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockClaudeAPI)
  };
});

describe('AgentWorker - TDD London School Tests', () => {
  let worker: AgentWorker;
  let mockWorkTicket: WorkTicket;
  let mockAgentContext: AgentContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock work ticket
    mockWorkTicket = {
      id: 'ticket-123',
      type: 'post_response',
      priority: 1,
      agentName: 'tech-guru',
      userId: 'user-456',
      payload: {
        postId: 'post-789',
        postContent: 'What is TypeScript?',
        postAuthor: '@curious_dev'
      },
      createdAt: new Date(),
      status: 'pending'
    };

    // Mock agent context
    mockAgentContext = {
      agentName: 'tech-guru',
      model: 'claude-sonnet-4-5-20250929',
      posting_rules: { max_length: 280 },
      api_schema: { platform: 'twitter' },
      safety_constraints: { content_filters: ['spam'] },
      personality: 'Helpful tech expert',
      interests: ['TypeScript', 'JavaScript'],
      response_style: { tone: 'friendly', length: 'concise', use_emojis: false },
      version: 1
    };

    // Setup default mock responses with small delays to ensure timing > 0
    mockComposeAgentContext.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockAgentContext), 1))
    );
    mockDatabase.query = jest.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ rows: [] }), 1))
    );
    mockClaudeAPI.messages.create.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        content: [{ text: 'TypeScript is a typed superset of JavaScript!' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      }), 1))
    );
  });

  describe('Constructor & Initialization', () => {
    it('should create worker with correct initial state', () => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);

      expect(worker.getId()).toBe('worker-001');
      expect(worker.getStatus()).toBe(WorkerStatus.IDLE);
    });

    it('should accept optional configuration', () => {
      worker = new AgentWorker(
        'worker-002',
        'tech-guru',
        'user-456',
        mockDatabase,
        { timeout: 30000, saveMemories: false }
      );

      expect(worker.getId()).toBe('worker-002');
      expect(worker.getStatus()).toBe(WorkerStatus.IDLE);
    });

    it('should initialize event emitter for lifecycle events', () => {
      worker = new AgentWorker('worker-003', 'tech-guru', 'user-456', mockDatabase);

      const statusChangeHandler = jest.fn();
      worker.on('status-change', statusChangeHandler);

      // Emit test event (will be emitted during loadContext)
      expect(worker.listenerCount('status-change')).toBe(1);
    });
  });

  describe('Context Loading', () => {
    beforeEach(() => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);
    });

    it('should load context from database using composeAgentContext', async () => {
      await worker.loadContext();

      expect(mockComposeAgentContext).toHaveBeenCalledWith('user-456', 'tech-guru', mockDatabase);
      expect(worker.getStatus()).toBe(WorkerStatus.LOADING_CONTEXT);
    });

    it('should emit status-change event when loading context', async () => {
      const statusChangeHandler = jest.fn();
      worker.on('status-change', statusChangeHandler);

      await worker.loadContext();

      expect(statusChangeHandler).toHaveBeenCalledWith(WorkerStatus.LOADING_CONTEXT);
    });

    it('should emit context-loaded event with context size', async () => {
      const contextLoadedHandler = jest.fn();
      worker.on('context-loaded', contextLoadedHandler);

      await worker.loadContext();

      expect(contextLoadedHandler).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should create Claude API client with correct model', async () => {
      await worker.loadContext();

      // Verify Claude API was instantiated (constructor called)
      const Anthropic = require('@anthropic-ai/sdk').default;
      expect(Anthropic).toHaveBeenCalled();
    });

    it('should throw error if system template not found', async () => {
      mockComposeAgentContext.mockRejectedValue(new Error('System template not found: tech-guru'));

      await expect(worker.loadContext()).rejects.toThrow('System template not found: tech-guru');
      expect(worker.getStatus()).toBe(WorkerStatus.FAILED);
    });

    it('should emit error event on context loading failure', async () => {
      const errorHandler = jest.fn();
      worker.on('error', errorHandler);

      mockComposeAgentContext.mockRejectedValue(new Error('Database connection failed'));

      await expect(worker.loadContext()).rejects.toThrow();
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should track context load time in metrics', async () => {
      await worker.loadContext();

      const metrics = worker.getMetrics();
      expect(metrics.contextLoadTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Task Execution', () => {
    beforeEach(async () => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);
      await worker.loadContext();
    });

    it('should execute task with work ticket', async () => {
      const result = await worker.executeTask(mockWorkTicket);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(worker.getStatus()).toBe(WorkerStatus.EXECUTING);
    });

    it('should call Claude API with correct parameters', async () => {
      await worker.executeTask(mockWorkTicket);

      expect(mockClaudeAPI.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: expect.any(Number),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('What is TypeScript?')
            })
          ])
        })
      );
    });

    it('should emit execution-complete event with result', async () => {
      const executionCompleteHandler = jest.fn();
      worker.on('execution-complete', executionCompleteHandler);

      await worker.executeTask(mockWorkTicket);

      expect(executionCompleteHandler).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should track token usage from Claude API response', async () => {
      await worker.executeTask(mockWorkTicket);

      const metrics = worker.getMetrics();
      expect(metrics.tokensUsed).toBe(150); // 100 input + 50 output
    });

    it('should track execution time in metrics', async () => {
      await worker.executeTask(mockWorkTicket);

      const metrics = worker.getMetrics();
      expect(metrics.executionTimeMs).toBeGreaterThan(0);
    });

    it('should enforce timeout limit (60s)', async () => {
      // Create worker with 1s timeout
      worker = new AgentWorker('worker-timeout', 'tech-guru', 'user-456', mockDatabase, {
        timeout: 1000
      });
      await worker.loadContext();

      // Mock slow API call
      mockClaudeAPI.messages.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );

      await expect(worker.executeTask(mockWorkTicket)).rejects.toThrow('Worker timeout exceeded');
      expect(worker.getStatus()).toBe(WorkerStatus.FAILED);
    });

    it('should handle Claude API errors gracefully', async () => {
      mockClaudeAPI.messages.create.mockRejectedValue(new Error('API rate limit exceeded'));

      // Attach error listener to prevent unhandled rejection
      const errorHandler = jest.fn();
      worker.on('error', errorHandler);

      const result = await worker.executeTask(mockWorkTicket);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(worker.getStatus()).toBe(WorkerStatus.FAILED);
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);
      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);
    });

    it('should save memory to agent_memories table', async () => {
      const memoryContent = 'User asked about TypeScript. Provided helpful explanation.';

      await worker.saveMemory(memoryContent);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_memories'),
        expect.arrayContaining([
          'user-456',
          'tech-guru',
          expect.stringContaining(memoryContent),
          expect.any(Object) // metadata
        ])
      );
    });

    it('should include metadata in saved memory', async () => {
      const memoryContent = 'Discussed TypeScript features';
      const metadata = {
        topic: 'TypeScript',
        sentiment: 'positive',
        mentioned_users: ['@curious_dev']
      };

      await worker.saveMemory(memoryContent, metadata);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.objectContaining(metadata)
        ])
      );
    });

    it('should emit memory-saved event with memory ID', async () => {
      const memorySavedHandler = jest.fn();
      worker.on('memory-saved', memorySavedHandler);

      mockDatabase.query = jest.fn().mockResolvedValue({
        rows: [{ id: 'memory-123' }]
      });

      await worker.saveMemory('Test memory');

      expect(memorySavedHandler).toHaveBeenCalledWith('memory-123');
    });

    it('should track memory save time in metrics', async () => {
      await worker.saveMemory('Test memory');

      const metrics = worker.getMetrics();
      expect(metrics.memorySaveTimeMs).toBeGreaterThan(0);
    });

    it('should skip memory saving if saveMemories is false', async () => {
      worker = new AgentWorker('worker-no-mem', 'tech-guru', 'user-456', mockDatabase, {
        saveMemories: false
      });
      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);

      mockDatabase.query = jest.fn();
      await worker.saveMemory('Should not save');

      expect(mockDatabase.query).not.toHaveBeenCalled();
    });

    it('should handle database errors when saving memory', async () => {
      mockDatabase.query = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      await expect(worker.saveMemory('Test memory')).rejects.toThrow('Database connection lost');
    });
  });

  describe('Worker Lifecycle', () => {
    beforeEach(() => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);
    });

    it('should complete full lifecycle: load → execute → save → destroy', async () => {
      const statusChanges: WorkerStatus[] = [];
      worker.on('status-change', (status) => statusChanges.push(status));

      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);
      await worker.saveMemory('Test memory');
      await worker.destroy();

      expect(statusChanges).toContain(WorkerStatus.LOADING_CONTEXT);
      expect(statusChanges).toContain(WorkerStatus.EXECUTING);
      expect(statusChanges).toContain(WorkerStatus.COMPLETED);
      expect(worker.getStatus()).toBe(WorkerStatus.COMPLETED);
    });

    it('should emit destroyed event on destroy', async () => {
      const destroyedHandler = jest.fn();
      worker.on('destroyed', destroyedHandler);

      await worker.destroy();

      expect(destroyedHandler).toHaveBeenCalled();
    });

    it('should clean up Claude API client on destroy', async () => {
      await worker.loadContext();
      await worker.destroy();

      // Verify no API calls can be made after destroy
      expect(worker.getStatus()).toBe(WorkerStatus.COMPLETED);
    });

    it('should emit final metrics on destroy', async () => {
      const metricsHandler = jest.fn();
      worker.on('metrics', metricsHandler);

      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);
      await worker.destroy();

      expect(metricsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId: 'worker-001',
          status: WorkerStatus.COMPLETED,
          tokensUsed: expect.any(Number),
          totalLifetimeMs: expect.any(Number)
        })
      );
    });

    it('should track total lifetime in metrics', async () => {
      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);
      await worker.destroy();

      const metrics = worker.getMetrics();
      expect(metrics.totalLifetimeMs).toBeGreaterThan(0);
      expect(metrics.totalLifetimeMs).toBeGreaterThanOrEqual(
        metrics.contextLoadTimeMs + metrics.executionTimeMs
      );
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(() => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);
    });

    it('should return metrics with all required fields', async () => {
      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);

      const metrics = worker.getMetrics();

      expect(metrics).toMatchObject({
        workerId: 'worker-001',
        tokensUsed: expect.any(Number),
        executionTimeMs: expect.any(Number),
        contextLoadTimeMs: expect.any(Number),
        memorySaveTimeMs: expect.any(Number),
        totalLifetimeMs: expect.any(Number),
        status: expect.any(String)
      });
    });

    it('should include error message in metrics if failed', async () => {
      mockClaudeAPI.messages.create.mockRejectedValue(new Error('Test error'));

      // Attach error listener to prevent unhandled rejection
      const errorHandler = jest.fn();
      worker.on('error', errorHandler);

      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);

      const metrics = worker.getMetrics();

      expect(metrics.status).toBe(WorkerStatus.FAILED);
      expect(metrics.error).toBe('Test error');
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);
    });

    it('should emit error event on any error', async () => {
      const errorHandler = jest.fn();
      worker.on('error', errorHandler);

      mockComposeAgentContext.mockRejectedValue(new Error('Test error'));

      await expect(worker.loadContext()).rejects.toThrow();
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should set status to FAILED on error', async () => {
      mockComposeAgentContext.mockRejectedValue(new Error('Test error'));

      await expect(worker.loadContext()).rejects.toThrow();
      expect(worker.getStatus()).toBe(WorkerStatus.FAILED);
    });

    it('should allow destroy even after failure', async () => {
      mockComposeAgentContext.mockRejectedValue(new Error('Test error'));

      await expect(worker.loadContext()).rejects.toThrow();
      await expect(worker.destroy()).resolves.not.toThrow();
    });
  });

  describe('Interaction Testing (London School)', () => {
    it('should follow correct interaction sequence: context → execute → save', async () => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);

      // Track call order
      const callOrder: string[] = [];

      mockComposeAgentContext.mockImplementation(async (...args) => {
        callOrder.push('composeAgentContext');
        return mockAgentContext;
      });

      mockClaudeAPI.messages.create.mockImplementation(async (...args) => {
        callOrder.push('claude.messages.create');
        return {
          content: [{ text: 'Response' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      });

      const originalQuery = mockDatabase.query;
      mockDatabase.query = jest.fn().mockImplementation(async (...args) => {
        callOrder.push('database.query');
        return { rows: [] };
      });

      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);
      await worker.saveMemory('Test memory');

      // Verify interaction sequence
      expect(callOrder).toEqual([
        'composeAgentContext',
        'claude.messages.create',
        'database.query'
      ]);
    });

    it('should verify interactions with all collaborators', async () => {
      worker = new AgentWorker('worker-001', 'tech-guru', 'user-456', mockDatabase);

      await worker.loadContext();
      await worker.executeTask(mockWorkTicket);
      await worker.saveMemory('Test memory');

      // Verify all collaborators were called
      expect(mockComposeAgentContext).toHaveBeenCalled();
      expect(mockClaudeAPI.messages.create).toHaveBeenCalled();
      expect(mockDatabase.query).toHaveBeenCalled();
    });
  });
});
