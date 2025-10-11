/**
 * PriorityQueue Implementation
 * Generic priority queue that orders items by priority (higher value = higher priority)
 *
 * TDD London School Implementation:
 * - Minimal implementation to satisfy test contracts
 * - Focus on behavior, not internal state
 * - Items dequeued in priority order (highest first)
 * - FIFO for items with equal priority
 */

interface PriorityItem<T> {
  item: T;
  priority: number;
  insertionOrder: number;
}

export class PriorityQueue<T extends { priority: number }> {
  private items: PriorityItem<T>[] = [];
  private insertionCounter = 0;

  /**
   * Add item to queue
   * Maintains priority order internally
   *
   * @param item - Item to enqueue (must have priority property)
   */
  enqueue(item: T): void {
    const priorityItem: PriorityItem<T> = {
      item,
      priority: item.priority,
      insertionOrder: this.insertionCounter++
    };

    this.items.push(priorityItem);
    this.items.sort(this.comparePriority.bind(this));
  }

  /**
   * Remove and return highest priority item
   * Returns null if queue is empty
   *
   * @returns Highest priority item or null
   */
  dequeue(): T | null {
    if (this.items.length === 0) {
      return null;
    }

    const priorityItem = this.items.shift();
    return priorityItem ? priorityItem.item : null;
  }

  /**
   * View highest priority item without removing it
   * Returns null if queue is empty
   *
   * @returns Highest priority item or null
   */
  peek(): T | null {
    if (this.items.length === 0) {
      return null;
    }

    return this.items[0].item;
  }

  /**
   * Get current queue size
   *
   * @returns Number of items in queue
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if queue is empty
   *
   * @returns True if queue has no items
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Remove all items from queue
   */
  clear(): void {
    this.items = [];
    this.insertionCounter = 0;
  }

  /**
   * Compare function for priority sorting
   * Higher priority comes first
   * For equal priorities, lower insertion order comes first (FIFO)
   *
   * @private
   */
  private comparePriority(a: PriorityItem<T>, b: PriorityItem<T>): number {
    // Sort by priority descending (higher priority first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // For equal priorities, use insertion order (FIFO)
    return a.insertionOrder - b.insertionOrder;
  }
}
