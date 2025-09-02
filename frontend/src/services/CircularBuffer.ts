/**
 * CircularBuffer - Fixed-size circular buffer implementation
 * 
 * Provides efficient FIFO buffer with automatic size management.
 * Used for message history and output buffering.
 */

export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('Buffer size must be positive');
    }
    
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }

  /**
   * Add item to buffer
   */
  push(item: T): void {
    this.buffer[this.tail] = item;
    
    if (this.count < this.maxSize) {
      this.count++;
    } else {
      // Buffer is full, overwrite oldest item
      this.head = (this.head + 1) % this.maxSize;
    }
    
    this.tail = (this.tail + 1) % this.maxSize;
  }

  /**
   * Get all items in insertion order
   */
  getAll(): T[] {
    if (this.count === 0) {
      return [];
    }

    const result: T[] = [];
    let index = this.head;
    
    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[index]);
      index = (index + 1) % this.maxSize;
    }
    
    return result;
  }

  /**
   * Get last N items
   */
  getLast(count: number): T[] {
    if (count <= 0 || this.count === 0) {
      return [];
    }

    const actualCount = Math.min(count, this.count);
    const result: T[] = [];
    
    // Start from the position that's 'actualCount' items before tail
    let startIndex = (this.tail - actualCount + this.maxSize) % this.maxSize;
    
    for (let i = 0; i < actualCount; i++) {
      result.push(this.buffer[startIndex]);
      startIndex = (startIndex + 1) % this.maxSize;
    }
    
    return result;
  }

  /**
   * Get first N items
   */
  getFirst(count: number): T[] {
    if (count <= 0 || this.count === 0) {
      return [];
    }

    const actualCount = Math.min(count, this.count);
    const result: T[] = [];
    let index = this.head;
    
    for (let i = 0; i < actualCount; i++) {
      result.push(this.buffer[index]);
      index = (index + 1) % this.maxSize;
    }
    
    return result;
  }

  /**
   * Get item at specific index (0-based from head)
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    
    const actualIndex = (this.head + index) % this.maxSize;
    return this.buffer[actualIndex];
  }

  /**
   * Find items matching predicate
   */
  find(predicate: (item: T, index: number) => boolean): T | undefined {
    let index = this.head;
    
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[index];
      if (predicate(item, i)) {
        return item;
      }
      index = (index + 1) % this.maxSize;
    }
    
    return undefined;
  }

  /**
   * Filter items matching predicate
   */
  filter(predicate: (item: T, index: number) => boolean): T[] {
    const result: T[] = [];
    let index = this.head;
    
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[index];
      if (predicate(item, i)) {
        result.push(item);
      }
      index = (index + 1) % this.maxSize;
    }
    
    return result;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    // Don't need to clear the array, just reset pointers
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.count === this.maxSize;
  }

  /**
   * Get current size
   */
  size(): number {
    return this.count;
  }

  /**
   * Get maximum capacity
   */
  capacity(): number {
    return this.maxSize;
  }

  /**
   * Get utilization percentage
   */
  utilization(): number {
    return (this.count / this.maxSize) * 100;
  }

  /**
   * Convert to array (for debugging/serialization)
   */
  toArray(): T[] {
    return this.getAll();
  }

  /**
   * Create iterator for for...of loops
   */
  [Symbol.iterator](): Iterator<T> {
    let currentIndex = 0;
    const items = this.getAll();
    
    return {
      next(): IteratorResult<T> {
        if (currentIndex < items.length) {
          return { value: items[currentIndex++], done: false };
        } else {
          return { value: undefined, done: true };
        }
      }
    };
  }

  /**
   * Get statistics about buffer usage
   */
  getStats(): {
    size: number;
    capacity: number;
    utilization: number;
    isEmpty: boolean;
    isFull: boolean;
  } {
    return {
      size: this.count,
      capacity: this.maxSize,
      utilization: this.utilization(),
      isEmpty: this.isEmpty(),
      isFull: this.isFull()
    };
  }
}