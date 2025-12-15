/**
 * SPARC Phase 4: Browser-compatible EventEmitter replacement
 * Fixes Node.js EventEmitter import issue causing white screen
 */

export interface EventMap {
  [key: string]: (...args: any[]) => void;
}

export class BrowserEventEmitter<T extends EventMap = EventMap> {
  private events: Map<keyof T, Set<T[keyof T]>> = new Map();
  private maxListeners: number = 10;

  /**
   * Add an event listener
   */
  on<K extends keyof T>(event: K, listener: T[K]): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const listeners = this.events.get(event)!;
    listeners.add(listener);

    // Warning for potential memory leaks
    if (listeners.size > this.maxListeners) {
      console.warn(
        `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ` +
        `${listeners.size} listeners added for event "${String(event)}". ` +
        `Use setMaxListeners() to increase limit.`
      );
    }

    return this;
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof T>(event: K, listener: T[K]): this {
    const onceWrapper = ((...args: any[]) => {
      this.off(event, onceWrapper as T[K]);
      listener(...args);
    }) as T[K];

    return this.on(event, onceWrapper);
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof T>(event: K, listener: T[K]): this {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  /**
   * Remove all listeners for an event, or all events if no event specified
   */
  removeAllListeners<K extends keyof T>(event?: K): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * Emit an event
   */
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) {
      return false;
    }

    // Create a copy to prevent issues if listeners are removed during emission
    const listenersCopy = [...listeners];

    for (const listener of listenersCopy) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for "${String(event)}":`, error);
      }
    }

    return true;
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof T>(event: K): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event names
   */
  eventNames(): (keyof T)[] {
    return Array.from(this.events.keys());
  }

  /**
   * Get all listeners for an event
   */
  listeners<K extends keyof T>(event: K): T[K][] {
    const listeners = this.events.get(event);
    return listeners ? Array.from(listeners) : [];
  }

  /**
   * Set the maximum number of listeners per event
   */
  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  /**
   * Get the maximum number of listeners per event
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }
}

// Export as default for drop-in replacement
export default BrowserEventEmitter;