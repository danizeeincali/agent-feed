/**
 * WorkTicketQueue Unit Tests
 * TDD London School - Focus on collaborations and behavior
 *
 * Testing Strategy:
 * 1. Mock all external dependencies (PriorityQueue)
 * 2. Verify interactions between WorkTicketQueue and its collaborators
 * 3. Test behavior, not implementation details
 */

import { WorkTicketQueue } from '../../../src/queue/work-ticket';
import { WorkTicketInput, WorkTicket, QueueStats } from '../../../src/types/work-ticket';
import { PriorityQueue } from '../../../src/queue/priority-queue';

// Mock PriorityQueue
jest.mock('../../../src/queue/priority-queue');

describe('WorkTicketQueue', () => {
  let queue: WorkTicketQueue;
  let mockPriorityQueue: jest.Mocked<PriorityQueue<WorkTicket>>;

  const createMockInput = (priority: number = 5): WorkTicketInput => ({
    type: 'post_response',
    priority,
    agentName: 'test-agent',
    userId: 'user-123',
    payload: { postId: 'post-456' }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh instance for each test
    queue = new WorkTicketQueue();

    // Get reference to the mocked PriorityQueue instance
    mockPriorityQueue = (queue as any).priorityQueue as jest.Mocked<PriorityQueue<WorkTicket>>;
  });

  describe('createTicket', () => {
    it('should generate unique ticket ID', async () => {
      const input = createMockInput();

      const ticket = await queue.createTicket(input);

      expect(ticket.id).toBeDefined();
      expect(ticket.id).toMatch(/^ticket-/);
    });

    it('should set status to pending', async () => {
      const input = createMockInput();

      const ticket = await queue.createTicket(input);

      expect(ticket.status).toBe('pending');
    });

    it('should set createdAt timestamp', async () => {
      const input = createMockInput();
      const beforeCreate = new Date();

      const ticket = await queue.createTicket(input);

      const afterCreate = new Date();
      expect(ticket.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(ticket.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should copy all input fields to ticket', async () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 7,
        agentName: 'creative-writer',
        userId: 'user-789',
        payload: { postId: 'post-123', content: 'test content' }
      };

      const ticket = await queue.createTicket(input);

      expect(ticket.type).toBe('post_response');
      expect(ticket.priority).toBe(7);
      expect(ticket.agentName).toBe('creative-writer');
      expect(ticket.userId).toBe('user-789');
      expect(ticket.payload).toEqual({ postId: 'post-123', content: 'test content' });
    });

    it('should enqueue ticket to priority queue', async () => {
      const input = createMockInput();

      await queue.createTicket(input);

      expect(mockPriorityQueue.enqueue).toHaveBeenCalledTimes(1);
      expect(mockPriorityQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: input.type,
          priority: input.priority,
          agentName: input.agentName,
          userId: input.userId,
          status: 'pending'
        })
      );
    });

    it('should track ticket internally', async () => {
      const input = createMockInput();

      const ticket = await queue.createTicket(input);

      // Verify we can retrieve it
      const retrieved = await queue.getTicket(ticket.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(ticket.id);
    });

    it('should return created ticket', async () => {
      const input = createMockInput();

      const ticket = await queue.createTicket(input);

      expect(ticket).toBeDefined();
      expect(ticket.id).toBeDefined();
      expect(ticket.status).toBe('pending');
    });
  });

  describe('assignToWorker', () => {
    it('should update ticket status to processing', async () => {
      const ticket = await queue.createTicket(createMockInput());

      await queue.assignToWorker(ticket.id, 'worker-1');

      const updated = await queue.getTicket(ticket.id);
      expect(updated?.status).toBe('processing');
    });

    it('should set processingStartedAt timestamp', async () => {
      const ticket = await queue.createTicket(createMockInput());
      const beforeAssign = new Date();

      await queue.assignToWorker(ticket.id, 'worker-1');

      const updated = await queue.getTicket(ticket.id);
      const afterAssign = new Date();
      expect(updated?.processingStartedAt).toBeDefined();
      expect(updated?.processingStartedAt!.getTime()).toBeGreaterThanOrEqual(beforeAssign.getTime());
      expect(updated?.processingStartedAt!.getTime()).toBeLessThanOrEqual(afterAssign.getTime());
    });

    it('should track worker assignment', async () => {
      const ticket = await queue.createTicket(createMockInput());

      await queue.assignToWorker(ticket.id, 'worker-123');

      // Verify worker is tracked (behavior verification)
      const activeWorkers = await queue.getActiveWorkers();
      expect(activeWorkers).toContain('worker-123');
    });

    it('should throw error if ticket not found', async () => {
      await expect(
        queue.assignToWorker('nonexistent-ticket', 'worker-1')
      ).rejects.toThrow('Ticket not found: nonexistent-ticket');
    });

    it('should throw error if ticket already processing', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');

      await expect(
        queue.assignToWorker(ticket.id, 'worker-2')
      ).rejects.toThrow('Ticket already being processed');
    });

    it('should throw error if ticket already completed', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');
      await queue.completeTicket(ticket.id, { success: true });

      await expect(
        queue.assignToWorker(ticket.id, 'worker-2')
      ).rejects.toThrow('Ticket already completed or failed');
    });
  });

  describe('completeTicket', () => {
    it('should update ticket status to completed', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');

      await queue.completeTicket(ticket.id, { success: true });

      const updated = await queue.getTicket(ticket.id);
      expect(updated?.status).toBe('completed');
    });

    it('should set completedAt timestamp', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');
      const beforeComplete = new Date();

      await queue.completeTicket(ticket.id, { result: 'done' });

      const updated = await queue.getTicket(ticket.id);
      const afterComplete = new Date();
      expect(updated?.completedAt).toBeDefined();
      expect(updated?.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
      expect(updated?.completedAt!.getTime()).toBeLessThanOrEqual(afterComplete.getTime());
    });

    it('should store result in payload', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');
      const result = { response: 'test response', tokensUsed: 500 };

      await queue.completeTicket(ticket.id, result);

      const updated = await queue.getTicket(ticket.id);
      expect(updated?.payload.result).toEqual(result);
    });

    it('should remove worker from active tracking', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');

      await queue.completeTicket(ticket.id, { success: true });

      const activeWorkers = await queue.getActiveWorkers();
      expect(activeWorkers).not.toContain('worker-1');
    });

    it('should throw error if ticket not found', async () => {
      await expect(
        queue.completeTicket('nonexistent-ticket', {})
      ).rejects.toThrow('Ticket not found');
    });

    it('should throw error if ticket not processing', async () => {
      const ticket = await queue.createTicket(createMockInput());

      await expect(
        queue.completeTicket(ticket.id, {})
      ).rejects.toThrow('Ticket is not being processed');
    });
  });

  describe('failTicket', () => {
    it('should update ticket status to failed', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');

      await queue.failTicket(ticket.id, new Error('Test error'));

      const updated = await queue.getTicket(ticket.id);
      expect(updated?.status).toBe('failed');
    });

    it('should set completedAt timestamp', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');
      const beforeFail = new Date();

      await queue.failTicket(ticket.id, new Error('Test error'));

      const updated = await queue.getTicket(ticket.id);
      const afterFail = new Date();
      expect(updated?.completedAt).toBeDefined();
      expect(updated?.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeFail.getTime());
      expect(updated?.completedAt!.getTime()).toBeLessThanOrEqual(afterFail.getTime());
    });

    it('should store error message', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');
      const error = new Error('Context loading failed');

      await queue.failTicket(ticket.id, error);

      const updated = await queue.getTicket(ticket.id);
      expect(updated?.error).toBe('Context loading failed');
    });

    it('should remove worker from active tracking', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');

      await queue.failTicket(ticket.id, new Error('Test error'));

      const activeWorkers = await queue.getActiveWorkers();
      expect(activeWorkers).not.toContain('worker-1');
    });

    it('should throw error if ticket not found', async () => {
      await expect(
        queue.failTicket('nonexistent-ticket', new Error('Test'))
      ).rejects.toThrow('Ticket not found');
    });

    it('should handle error object conversion to string', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');

      await queue.failTicket(ticket.id, new Error('Database connection lost'));

      const updated = await queue.getTicket(ticket.id);
      expect(updated?.error).toBe('Database connection lost');
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics for empty queue', async () => {
      const metrics = await queue.getMetrics();

      expect(metrics).toEqual({
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      });
    });

    it('should count pending tickets', async () => {
      await queue.createTicket(createMockInput());
      await queue.createTicket(createMockInput());

      const metrics = await queue.getMetrics();

      expect(metrics.pending).toBe(2);
      expect(metrics.total).toBe(2);
    });

    it('should count processing tickets', async () => {
      const ticket1 = await queue.createTicket(createMockInput());
      const ticket2 = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket1.id, 'worker-1');
      await queue.assignToWorker(ticket2.id, 'worker-2');

      const metrics = await queue.getMetrics();

      expect(metrics.processing).toBe(2);
      expect(metrics.pending).toBe(0);
      expect(metrics.total).toBe(2);
    });

    it('should count completed tickets', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');
      await queue.completeTicket(ticket.id, {});

      const metrics = await queue.getMetrics();

      expect(metrics.completed).toBe(1);
      expect(metrics.processing).toBe(0);
      expect(metrics.total).toBe(1);
    });

    it('should count failed tickets', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');
      await queue.failTicket(ticket.id, new Error('Test'));

      const metrics = await queue.getMetrics();

      expect(metrics.failed).toBe(1);
      expect(metrics.processing).toBe(0);
      expect(metrics.total).toBe(1);
    });

    it('should accurately track mixed statuses', async () => {
      // Create 5 tickets
      const tickets = await Promise.all([
        queue.createTicket(createMockInput()),
        queue.createTicket(createMockInput()),
        queue.createTicket(createMockInput()),
        queue.createTicket(createMockInput()),
        queue.createTicket(createMockInput())
      ]);

      // 1 pending (tickets[0])
      // 2 processing
      await queue.assignToWorker(tickets[1].id, 'worker-1');
      await queue.assignToWorker(tickets[2].id, 'worker-2');
      // 1 completed
      await queue.assignToWorker(tickets[3].id, 'worker-3');
      await queue.completeTicket(tickets[3].id, {});
      // 1 failed
      await queue.assignToWorker(tickets[4].id, 'worker-4');
      await queue.failTicket(tickets[4].id, new Error('Test'));

      const metrics = await queue.getMetrics();

      expect(metrics).toEqual({
        total: 5,
        pending: 1,
        processing: 2,
        completed: 1,
        failed: 1
      });
    });
  });

  describe('getTicket', () => {
    it('should return null for nonexistent ticket', async () => {
      const ticket = await queue.getTicket('nonexistent-ticket');

      expect(ticket).toBeNull();
    });

    it('should return ticket by ID', async () => {
      const created = await queue.createTicket(createMockInput());

      const retrieved = await queue.getTicket(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return ticket with current status', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');

      const retrieved = await queue.getTicket(ticket.id);

      expect(retrieved?.status).toBe('processing');
    });
  });

  describe('getActiveWorkers', () => {
    it('should return empty array when no workers active', async () => {
      const workers = await queue.getActiveWorkers();

      expect(workers).toEqual([]);
    });

    it('should return list of active worker IDs', async () => {
      const ticket1 = await queue.createTicket(createMockInput());
      const ticket2 = await queue.createTicket(createMockInput());

      await queue.assignToWorker(ticket1.id, 'worker-1');
      await queue.assignToWorker(ticket2.id, 'worker-2');

      const workers = await queue.getActiveWorkers();

      expect(workers).toHaveLength(2);
      expect(workers).toContain('worker-1');
      expect(workers).toContain('worker-2');
    });

    it('should not include completed worker IDs', async () => {
      const ticket = await queue.createTicket(createMockInput());
      await queue.assignToWorker(ticket.id, 'worker-1');
      await queue.completeTicket(ticket.id, {});

      const workers = await queue.getActiveWorkers();

      expect(workers).not.toContain('worker-1');
    });
  });

  describe('collaboration with PriorityQueue', () => {
    it('should delegate size check to PriorityQueue', () => {
      mockPriorityQueue.size.mockReturnValue(5);

      const size = queue.getQueueSize();

      expect(mockPriorityQueue.size).toHaveBeenCalled();
      expect(size).toBe(5);
    });

    it('should enqueue tickets with correct priority', async () => {
      const highPriority = createMockInput(10);

      await queue.createTicket(highPriority);

      expect(mockPriorityQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 10
        })
      );
    });
  });
});
