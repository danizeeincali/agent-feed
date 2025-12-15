/**
 * PriorityQueue Unit Tests
 * TDD London School - Mock-first approach
 *
 * Testing Priorities:
 * 1. Interaction patterns (how the queue collaborates)
 * 2. Behavior verification (not state)
 * 3. Contract definition through expectations
 */

import { PriorityQueue } from '../../../src/queue/priority-queue';
import { WorkTicket } from '../../../src/types/work-ticket';

describe('PriorityQueue', () => {
  let queue: PriorityQueue<WorkTicket>;

  // Mock ticket factory
  const createMockTicket = (priority: number, id: string = `ticket-${Date.now()}`): WorkTicket => ({
    id,
    type: 'post_response',
    priority,
    agentName: 'test-agent',
    userId: 'user-123',
    payload: { test: true },
    createdAt: new Date(),
    status: 'pending'
  });

  beforeEach(() => {
    queue = new PriorityQueue<WorkTicket>();
  });

  describe('enqueue', () => {
    it('should add item to empty queue', () => {
      const ticket = createMockTicket(5);

      queue.enqueue(ticket);

      expect(queue.size()).toBe(1);
    });

    it('should maintain priority order when adding multiple items', () => {
      const lowPriority = createMockTicket(1, 'low');
      const highPriority = createMockTicket(10, 'high');
      const mediumPriority = createMockTicket(5, 'medium');

      queue.enqueue(lowPriority);
      queue.enqueue(highPriority);
      queue.enqueue(mediumPriority);

      expect(queue.size()).toBe(3);
      // Verify highest priority is at front (peek should show high priority)
      expect(queue.peek()?.id).toBe('high');
    });

    it('should handle items with same priority (FIFO for equal priorities)', () => {
      const first = createMockTicket(5, 'first');
      const second = createMockTicket(5, 'second');

      queue.enqueue(first);
      queue.enqueue(second);

      // First item added should be first out when priorities are equal
      expect(queue.peek()?.id).toBe('first');
    });

    it('should increase size with each enqueue', () => {
      expect(queue.size()).toBe(0);

      queue.enqueue(createMockTicket(1));
      expect(queue.size()).toBe(1);

      queue.enqueue(createMockTicket(2));
      expect(queue.size()).toBe(2);

      queue.enqueue(createMockTicket(3));
      expect(queue.size()).toBe(3);
    });
  });

  describe('dequeue', () => {
    it('should return null when queue is empty', () => {
      const result = queue.dequeue();

      expect(result).toBeNull();
    });

    it('should return highest priority item', () => {
      const low = createMockTicket(1, 'low');
      const high = createMockTicket(10, 'high');

      queue.enqueue(low);
      queue.enqueue(high);

      const result = queue.dequeue();

      expect(result?.id).toBe('high');
    });

    it('should remove item from queue', () => {
      const ticket = createMockTicket(5);
      queue.enqueue(ticket);

      expect(queue.size()).toBe(1);
      queue.dequeue();
      expect(queue.size()).toBe(0);
    });

    it('should maintain priority order after multiple dequeues', () => {
      queue.enqueue(createMockTicket(1, 'low'));
      queue.enqueue(createMockTicket(10, 'high'));
      queue.enqueue(createMockTicket(5, 'medium'));

      const first = queue.dequeue();
      expect(first?.id).toBe('high'); // Priority 10

      const second = queue.dequeue();
      expect(second?.id).toBe('medium'); // Priority 5

      const third = queue.dequeue();
      expect(third?.id).toBe('low'); // Priority 1
    });

    it('should decrease size with each dequeue', () => {
      queue.enqueue(createMockTicket(1));
      queue.enqueue(createMockTicket(2));
      queue.enqueue(createMockTicket(3));

      expect(queue.size()).toBe(3);
      queue.dequeue();
      expect(queue.size()).toBe(2);
      queue.dequeue();
      expect(queue.size()).toBe(1);
      queue.dequeue();
      expect(queue.size()).toBe(0);
    });
  });

  describe('peek', () => {
    it('should return null when queue is empty', () => {
      const result = queue.peek();

      expect(result).toBeNull();
    });

    it('should return highest priority item without removing it', () => {
      const ticket = createMockTicket(5, 'test');
      queue.enqueue(ticket);

      const peeked = queue.peek();
      expect(peeked?.id).toBe('test');

      // Verify item was not removed
      expect(queue.size()).toBe(1);
    });

    it('should return same item on multiple peeks', () => {
      queue.enqueue(createMockTicket(5, 'test'));

      const first = queue.peek();
      const second = queue.peek();
      const third = queue.peek();

      expect(first?.id).toBe('test');
      expect(second?.id).toBe('test');
      expect(third?.id).toBe('test');
      expect(queue.size()).toBe(1);
    });

    it('should reflect priority changes after enqueue', () => {
      queue.enqueue(createMockTicket(5, 'medium'));
      expect(queue.peek()?.id).toBe('medium');

      queue.enqueue(createMockTicket(10, 'high'));
      expect(queue.peek()?.id).toBe('high');
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.size()).toBe(0);
    });

    it('should return correct count after operations', () => {
      expect(queue.size()).toBe(0);

      queue.enqueue(createMockTicket(1));
      expect(queue.size()).toBe(1);

      queue.enqueue(createMockTicket(2));
      expect(queue.size()).toBe(2);

      queue.dequeue();
      expect(queue.size()).toBe(1);

      queue.clear();
      expect(queue.size()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should empty the queue', () => {
      queue.enqueue(createMockTicket(1));
      queue.enqueue(createMockTicket(2));
      queue.enqueue(createMockTicket(3));

      expect(queue.size()).toBe(3);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.peek()).toBeNull();
    });

    it('should be idempotent on empty queue', () => {
      expect(queue.size()).toBe(0);

      queue.clear();

      expect(queue.size()).toBe(0);
    });

    it('should allow enqueue after clear', () => {
      queue.enqueue(createMockTicket(1));
      queue.clear();

      queue.enqueue(createMockTicket(2, 'new'));

      expect(queue.size()).toBe(1);
      expect(queue.peek()?.id).toBe('new');
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty queue', () => {
      expect(queue.isEmpty()).toBe(true);
    });

    it('should return false when queue has items', () => {
      queue.enqueue(createMockTicket(1));

      expect(queue.isEmpty()).toBe(false);
    });

    it('should return true after clearing queue', () => {
      queue.enqueue(createMockTicket(1));
      queue.clear();

      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('priority ordering edge cases', () => {
    it('should handle negative priorities', () => {
      queue.enqueue(createMockTicket(-5, 'negative'));
      queue.enqueue(createMockTicket(5, 'positive'));

      expect(queue.dequeue()?.id).toBe('positive');
      expect(queue.dequeue()?.id).toBe('negative');
    });

    it('should handle zero priority', () => {
      queue.enqueue(createMockTicket(0, 'zero'));
      queue.enqueue(createMockTicket(1, 'one'));

      expect(queue.dequeue()?.id).toBe('one');
      expect(queue.dequeue()?.id).toBe('zero');
    });

    it('should handle large priority values', () => {
      queue.enqueue(createMockTicket(1000000, 'huge'));
      queue.enqueue(createMockTicket(999999, 'large'));

      expect(queue.dequeue()?.id).toBe('huge');
    });
  });
});
