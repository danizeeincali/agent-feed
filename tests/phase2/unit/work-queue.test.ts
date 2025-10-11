/**
 * Work Queue Unit Tests
 * London School TDD: Behavior-focused with mocks
 * Phase 2: Work Queue System
 */

import { WorkQueue } from '../../../src/queue/work-queue';
import { WorkTicket, WorkTicketInput, WorkTicketStatus } from '../../../src/types/work-ticket';

describe('WorkQueue', () => {
  let workQueue: WorkQueue;

  beforeEach(() => {
    workQueue = new WorkQueue();
  });

  describe('enqueue', () => {
    it('should create work ticket with unique ID', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 1,
        agentName: 'TestAgent',
        userId: 'user-123',
        payload: { message: 'test' }
      };

      const ticket = workQueue.enqueue(input);

      expect(ticket.id).toBeDefined();
      expect(ticket.id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });

    it('should set initial status to pending', () => {
      const input: WorkTicketInput = {
        type: 'memory_update',
        priority: 2,
        agentName: 'MemoryAgent',
        userId: 'user-456',
        payload: { data: 'update' }
      };

      const ticket = workQueue.enqueue(input);

      expect(ticket.status).toBe('pending');
    });

    it('should set createdAt timestamp', () => {
      const beforeTime = new Date();

      const input: WorkTicketInput = {
        type: 'health_check',
        priority: 0,
        agentName: 'HealthAgent',
        userId: 'system',
        payload: {}
      };

      const ticket = workQueue.enqueue(input);
      const afterTime = new Date();

      expect(ticket.createdAt).toBeInstanceOf(Date);
      expect(ticket.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(ticket.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should preserve all input properties', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'ResponseAgent',
        userId: 'user-789',
        payload: {
          postId: 'post-123',
          content: 'Test response'
        }
      };

      const ticket = workQueue.enqueue(input);

      expect(ticket.type).toBe(input.type);
      expect(ticket.priority).toBe(input.priority);
      expect(ticket.agentName).toBe(input.agentName);
      expect(ticket.userId).toBe(input.userId);
      expect(ticket.payload).toEqual(input.payload);
    });

    it('should enqueue multiple tickets with unique IDs', () => {
      const input1: WorkTicketInput = {
        type: 'post_response',
        priority: 1,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const input2: WorkTicketInput = {
        type: 'memory_update',
        priority: 2,
        agentName: 'Agent2',
        userId: 'user-2',
        payload: {}
      };

      const ticket1 = workQueue.enqueue(input1);
      const ticket2 = workQueue.enqueue(input2);

      expect(ticket1.id).not.toBe(ticket2.id);
      expect(workQueue.length()).toBe(2);
    });

    it('should maintain priority order when enqueuing', () => {
      const lowPriority: WorkTicketInput = {
        type: 'health_check',
        priority: 1,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const highPriority: WorkTicketInput = {
        type: 'post_response',
        priority: 10,
        agentName: 'Agent2',
        userId: 'user-2',
        payload: {}
      };

      workQueue.enqueue(lowPriority);
      workQueue.enqueue(highPriority);

      const nextTicket = workQueue.peek();
      expect(nextTicket?.priority).toBe(10);
    });
  });

  describe('dequeue', () => {
    it('should return null when queue is empty', () => {
      const ticket = workQueue.dequeue();

      expect(ticket).toBeNull();
    });

    it('should dequeue highest priority ticket first', () => {
      const low: WorkTicketInput = {
        type: 'health_check',
        priority: 1,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const high: WorkTicketInput = {
        type: 'post_response',
        priority: 10,
        agentName: 'Agent2',
        userId: 'user-2',
        payload: {}
      };

      const medium: WorkTicketInput = {
        type: 'memory_update',
        priority: 5,
        agentName: 'Agent3',
        userId: 'user-3',
        payload: {}
      };

      workQueue.enqueue(low);
      workQueue.enqueue(high);
      workQueue.enqueue(medium);

      const firstTicket = workQueue.dequeue();
      expect(firstTicket?.priority).toBe(10);
      expect(firstTicket?.agentName).toBe('Agent2');
    });

    it('should remove ticket from queue', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      expect(workQueue.length()).toBe(1);

      workQueue.dequeue();
      expect(workQueue.length()).toBe(0);
    });

    it('should handle FIFO when priorities are equal', () => {
      const first: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: { order: 1 }
      };

      const second: WorkTicketInput = {
        type: 'memory_update',
        priority: 5,
        agentName: 'Agent2',
        userId: 'user-2',
        payload: { order: 2 }
      };

      workQueue.enqueue(first);
      workQueue.enqueue(second);

      const firstDequeued = workQueue.dequeue();
      expect(firstDequeued?.payload.order).toBe(1);

      const secondDequeued = workQueue.dequeue();
      expect(secondDequeued?.payload.order).toBe(2);
    });

    it('should update status to processing when dequeued', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      const ticket = workQueue.dequeue();

      expect(ticket?.status).toBe('processing');
    });

    it('should set processingStartedAt timestamp when dequeued', () => {
      const beforeTime = new Date();

      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      const ticket = workQueue.dequeue();
      const afterTime = new Date();

      expect(ticket?.processingStartedAt).toBeInstanceOf(Date);
      expect(ticket?.processingStartedAt?.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(ticket?.processingStartedAt?.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('peek', () => {
    it('should return null when queue is empty', () => {
      const ticket = workQueue.peek();

      expect(ticket).toBeNull();
    });

    it('should return highest priority ticket without removing it', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 10,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const enqueuedTicket = workQueue.enqueue(input);
      const peekedTicket = workQueue.peek();

      expect(peekedTicket?.id).toBe(enqueuedTicket.id);
      expect(workQueue.length()).toBe(1);
    });

    it('should not modify ticket status', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      const peekedTicket = workQueue.peek();

      expect(peekedTicket?.status).toBe('pending');
    });

    it('should return same ticket on multiple peeks', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      const peek1 = workQueue.peek();
      const peek2 = workQueue.peek();

      expect(peek1?.id).toBe(peek2?.id);
    });
  });

  describe('updateStatus', () => {
    it('should update ticket status to processing', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const ticket = workQueue.enqueue(input);
      workQueue.updateStatus(ticket.id, 'processing');

      const foundTicket = workQueue.getById(ticket.id);
      expect(foundTicket?.status).toBe('processing');
    });

    it('should update ticket status to completed', () => {
      const input: WorkTicketInput = {
        type: 'memory_update',
        priority: 3,
        agentName: 'Agent2',
        userId: 'user-2',
        payload: {}
      };

      const ticket = workQueue.enqueue(input);
      workQueue.updateStatus(ticket.id, 'completed');

      const foundTicket = workQueue.getById(ticket.id);
      expect(foundTicket?.status).toBe('completed');
    });

    it('should update ticket status to failed', () => {
      const input: WorkTicketInput = {
        type: 'health_check',
        priority: 1,
        agentName: 'Agent3',
        userId: 'user-3',
        payload: {}
      };

      const ticket = workQueue.enqueue(input);
      workQueue.updateStatus(ticket.id, 'failed', 'Connection timeout');

      const foundTicket = workQueue.getById(ticket.id);
      expect(foundTicket?.status).toBe('failed');
      expect(foundTicket?.error).toBe('Connection timeout');
    });

    it('should set completedAt timestamp when status is completed', () => {
      const beforeTime = new Date();

      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const ticket = workQueue.enqueue(input);
      workQueue.updateStatus(ticket.id, 'completed');
      const afterTime = new Date();

      const foundTicket = workQueue.getById(ticket.id);
      expect(foundTicket?.completedAt).toBeInstanceOf(Date);
      expect(foundTicket?.completedAt?.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(foundTicket?.completedAt?.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should set completedAt timestamp when status is failed', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const ticket = workQueue.enqueue(input);
      workQueue.updateStatus(ticket.id, 'failed');

      const foundTicket = workQueue.getById(ticket.id);
      expect(foundTicket?.completedAt).toBeInstanceOf(Date);
    });

    it('should throw error when ticket ID not found', () => {
      expect(() => {
        workQueue.updateStatus('non-existent-id', 'completed');
      }).toThrow('Ticket not found: non-existent-id');
    });
  });

  describe('length', () => {
    it('should return 0 for empty queue', () => {
      expect(workQueue.length()).toBe(0);
    });

    it('should return correct count after enqueue', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      expect(workQueue.length()).toBe(1);

      workQueue.enqueue(input);
      expect(workQueue.length()).toBe(2);
    });

    it('should return correct count after dequeue', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      workQueue.enqueue(input);
      expect(workQueue.length()).toBe(2);

      workQueue.dequeue();
      expect(workQueue.length()).toBe(1);
    });

    it('should count only pending tickets in queue', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      workQueue.enqueue(input);

      const ticket = workQueue.dequeue(); // This changes status to processing

      // Length should only count pending tickets
      expect(workQueue.length()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all tickets from queue', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      workQueue.enqueue(input);
      workQueue.enqueue(input);

      expect(workQueue.length()).toBe(3);

      workQueue.clear();

      expect(workQueue.length()).toBe(0);
    });

    it('should allow enqueue after clear', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      workQueue.clear();

      const newTicket = workQueue.enqueue(input);
      expect(newTicket).toBeDefined();
      expect(workQueue.length()).toBe(1);
    });

    it('should handle clearing empty queue', () => {
      expect(() => {
        workQueue.clear();
      }).not.toThrow();

      expect(workQueue.length()).toBe(0);
    });
  });

  describe('clearCompleted', () => {
    it('should remove only completed tickets', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const ticket1 = workQueue.enqueue(input);
      const ticket2 = workQueue.enqueue(input);
      const ticket3 = workQueue.enqueue(input);

      workQueue.updateStatus(ticket1.id, 'completed');
      workQueue.updateStatus(ticket2.id, 'processing');

      workQueue.clearCompleted();

      expect(workQueue.getById(ticket1.id)).toBeNull();
      expect(workQueue.getById(ticket2.id)).toBeDefined();
      expect(workQueue.getById(ticket3.id)).toBeDefined();
    });

    it('should handle clearing when no completed tickets exist', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      workQueue.enqueue(input);
      workQueue.enqueue(input);

      expect(() => {
        workQueue.clearCompleted();
      }).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const ticket1 = workQueue.enqueue(input);
      const ticket2 = workQueue.enqueue(input);
      const ticket3 = workQueue.enqueue(input);
      const ticket4 = workQueue.enqueue(input);

      workQueue.updateStatus(ticket1.id, 'completed');
      workQueue.updateStatus(ticket2.id, 'processing');
      workQueue.updateStatus(ticket3.id, 'failed');
      // ticket4 remains pending

      const stats = workQueue.getStats();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should return zeros for empty queue', () => {
      const stats = workQueue.getStats();

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return ticket by ID', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: { data: 'test' }
      };

      const ticket = workQueue.enqueue(input);
      const foundTicket = workQueue.getById(ticket.id);

      expect(foundTicket?.id).toBe(ticket.id);
      expect(foundTicket?.payload).toEqual(input.payload);
    });

    it('should return null for non-existent ID', () => {
      const foundTicket = workQueue.getById('non-existent-id');

      expect(foundTicket).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle negative priorities', () => {
      const negative: WorkTicketInput = {
        type: 'health_check',
        priority: -5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const positive: WorkTicketInput = {
        type: 'post_response',
        priority: 1,
        agentName: 'Agent2',
        userId: 'user-2',
        payload: {}
      };

      workQueue.enqueue(negative);
      workQueue.enqueue(positive);

      const first = workQueue.dequeue();
      expect(first?.priority).toBe(1);
    });

    it('should handle very large priorities', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: Number.MAX_SAFE_INTEGER,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const ticket = workQueue.enqueue(input);
      expect(ticket.priority).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle empty payload', () => {
      const input: WorkTicketInput = {
        type: 'health_check',
        priority: 1,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: null
      };

      const ticket = workQueue.enqueue(input);
      expect(ticket.payload).toBeNull();
    });

    it('should handle complex nested payload', () => {
      const complexPayload = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, 3],
              date: new Date(),
              map: new Map([['key', 'value']])
            }
          }
        }
      };

      const input: WorkTicketInput = {
        type: 'memory_update',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: complexPayload
      };

      const ticket = workQueue.enqueue(input);
      expect(ticket.payload).toEqual(complexPayload);
    });

    it('should maintain queue integrity with rapid enqueue/dequeue', () => {
      const inputs: WorkTicketInput[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'post_response',
        priority: Math.floor(Math.random() * 10),
        agentName: `Agent${i}`,
        userId: `user-${i}`,
        payload: { index: i }
      }));

      // Rapid enqueue
      inputs.forEach(input => workQueue.enqueue(input));
      expect(workQueue.length()).toBe(100);

      // Rapid dequeue
      const dequeued: WorkTicket[] = [];
      for (let i = 0; i < 50; i++) {
        const ticket = workQueue.dequeue();
        if (ticket) dequeued.push(ticket);
      }

      expect(dequeued.length).toBe(50);
      expect(workQueue.length()).toBe(50);

      // Verify priorities are in descending order
      for (let i = 0; i < dequeued.length - 1; i++) {
        expect(dequeued[i].priority).toBeGreaterThanOrEqual(dequeued[i + 1].priority);
      }
    });
  });

  describe('getAllTickets', () => {
    it('should return all tickets regardless of status', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const ticket1 = workQueue.enqueue(input);
      const ticket2 = workQueue.enqueue(input);

      workQueue.updateStatus(ticket1.id, 'completed');

      const allTickets = workQueue.getAllTickets();
      expect(allTickets.length).toBe(2);
      expect(allTickets.some(t => t.id === ticket1.id)).toBe(true);
      expect(allTickets.some(t => t.id === ticket2.id)).toBe(true);
    });

    it('should return empty array when queue is empty', () => {
      const allTickets = workQueue.getAllTickets();
      expect(allTickets).toEqual([]);
    });
  });

  describe('getTicketsByStatus', () => {
    it('should return tickets filtered by status', () => {
      const input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const ticket1 = workQueue.enqueue(input);
      const ticket2 = workQueue.enqueue(input);
      const ticket3 = workQueue.enqueue(input);

      workQueue.updateStatus(ticket1.id, 'completed');
      workQueue.updateStatus(ticket2.id, 'failed');

      const completedTickets = workQueue.getTicketsByStatus('completed');
      expect(completedTickets.length).toBe(1);
      expect(completedTickets[0].id).toBe(ticket1.id);

      const failedTickets = workQueue.getTicketsByStatus('failed');
      expect(failedTickets.length).toBe(1);
      expect(failedTickets[0].id).toBe(ticket2.id);

      const pendingTickets = workQueue.getTicketsByStatus('pending');
      expect(pendingTickets.length).toBe(1);
      expect(pendingTickets[0].id).toBe(ticket3.id);
    });

    it('should return empty array when no tickets match status', () => {
      const tickets = workQueue.getTicketsByStatus('processing');
      expect(tickets).toEqual([]);
    });
  });

  describe('getTicketsByAgent', () => {
    it('should return tickets filtered by agent name', () => {
      const agent1Input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const agent2Input: WorkTicketInput = {
        type: 'memory_update',
        priority: 3,
        agentName: 'Agent2',
        userId: 'user-2',
        payload: {}
      };

      workQueue.enqueue(agent1Input);
      workQueue.enqueue(agent1Input);
      workQueue.enqueue(agent2Input);

      const agent1Tickets = workQueue.getTicketsByAgent('Agent1');
      expect(agent1Tickets.length).toBe(2);
      expect(agent1Tickets.every(t => t.agentName === 'Agent1')).toBe(true);

      const agent2Tickets = workQueue.getTicketsByAgent('Agent2');
      expect(agent2Tickets.length).toBe(1);
      expect(agent2Tickets[0].agentName).toBe('Agent2');
    });

    it('should return empty array when no tickets match agent', () => {
      const tickets = workQueue.getTicketsByAgent('NonExistentAgent');
      expect(tickets).toEqual([]);
    });
  });

  describe('getTicketsByUser', () => {
    it('should return tickets filtered by user ID', () => {
      const user1Input: WorkTicketInput = {
        type: 'post_response',
        priority: 5,
        agentName: 'Agent1',
        userId: 'user-1',
        payload: {}
      };

      const user2Input: WorkTicketInput = {
        type: 'memory_update',
        priority: 3,
        agentName: 'Agent2',
        userId: 'user-2',
        payload: {}
      };

      workQueue.enqueue(user1Input);
      workQueue.enqueue(user1Input);
      workQueue.enqueue(user2Input);

      const user1Tickets = workQueue.getTicketsByUser('user-1');
      expect(user1Tickets.length).toBe(2);
      expect(user1Tickets.every(t => t.userId === 'user-1')).toBe(true);

      const user2Tickets = workQueue.getTicketsByUser('user-2');
      expect(user2Tickets.length).toBe(1);
      expect(user2Tickets[0].userId).toBe('user-2');
    });

    it('should return empty array when no tickets match user', () => {
      const tickets = workQueue.getTicketsByUser('non-existent-user');
      expect(tickets).toEqual([]);
    });
  });
});
