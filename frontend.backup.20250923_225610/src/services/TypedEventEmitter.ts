/**
 * TypedEventEmitter - Type-safe event emitter implementation
 * 
 * Provides type-safe event emission and listening with proper cleanup.
 */

export type EventHandler<T = any> = (data: T) => void;

export interface EventMap {
  [key: string]: any;
}

export class TypedEventEmitter<T extends EventMap = EventMap> {
  private listeners: Map<keyof T, Set<EventHandler>> = new Map();

  /**
   * Add event listener
   */
  on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Add one-time event listener
   */
  once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void {
    const onceHandler = (data: T[K]) => {
      handler(data);
      this.off(event, onceHandler);
    };
    
    this.on(event, onceHandler);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Remove all listeners for event
   */
  removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emit event to all listeners
   */
  emit<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.listeners.get(event);
    
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for '${String(event)}':`, error);
        }
      });
    }
  }

  /**
   * Get listener count for event
   */
  listenerCount<K extends keyof T>(event: K): number {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * Get all event names with listeners
   */
  eventNames(): (keyof T)[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Check if event has listeners
   */
  hasListeners<K extends keyof T>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
}