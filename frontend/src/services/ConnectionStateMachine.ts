/**
 * ConnectionStateMachine - Manages SSE connection states and transitions
 * 
 * Implements a finite state machine for reliable connection state management
 * with proper transition guards and side effects.
 */

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

export interface ConnectionTransition {
  from: ConnectionState;
  to: ConnectionState;
  trigger: string;
  guard?: () => boolean;
  action?: () => void | Promise<void>;
}

export interface StateChangeEvent {
  from: ConnectionState;
  to: ConnectionState;
  trigger: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export type StateChangeListener = (event: StateChangeEvent) => void;

/**
 * Finite State Machine for connection management
 */
export class ConnectionStateMachine {
  private currentState: ConnectionState;
  private transitions: Map<string, ConnectionTransition[]>;
  private listeners: Set<StateChangeListener> = new Set();
  private history: StateChangeEvent[] = [];
  private maxHistorySize = 100;

  constructor(initialState: ConnectionState = ConnectionState.DISCONNECTED) {
    this.currentState = initialState;
    this.transitions = new Map();
    this.setupTransitions();
  }

  /**
   * Get current state
   */
  getCurrentState(): ConnectionState {
    return this.currentState;
  }

  /**
   * Check if transition is possible
   */
  canTransition(trigger: string, context?: Record<string, any>): boolean {
    const possibleTransitions = this.getValidTransitions(trigger);
    return possibleTransitions.some(t => !t.guard || t.guard());
  }

  /**
   * Execute state transition
   */
  async transition(trigger: string, context?: Record<string, any>): Promise<boolean> {
    const possibleTransitions = this.getValidTransitions(trigger);
    
    // Find first valid transition
    const validTransition = possibleTransitions.find(t => !t.guard || t.guard());
    
    if (!validTransition) {
      console.warn(`No valid transition for trigger '${trigger}' from state '${this.currentState}'`);
      return false;
    }

    const oldState = this.currentState;
    const newState = validTransition.to;

    // Execute transition action if present
    if (validTransition.action) {
      try {
        await validTransition.action();
      } catch (error) {
        console.error('Transition action failed:', error);
        return false;
      }
    }

    // Update state
    this.currentState = newState;

    // Create state change event
    const event: StateChangeEvent = {
      from: oldState,
      to: newState,
      trigger,
      timestamp: new Date(),
      context
    };

    // Add to history
    this.addToHistory(event);

    // Notify listeners
    this.notifyListeners(event);

    return true;
  }

  /**
   * Add state change listener
   */
  addListener(listener: StateChangeListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove state change listener
   */
  removeListener(listener: StateChangeListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get state transition history
   */
  getHistory(): StateChangeEvent[] {
    return [...this.history];
  }

  /**
   * Clear state history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentState = ConnectionState.DISCONNECTED;
    this.clearHistory();
  }

  /**
   * Get all possible transitions from current state
   */
  getPossibleTransitions(): ConnectionTransition[] {
    const allTransitions: ConnectionTransition[] = [];
    
    for (const transitions of this.transitions.values()) {
      allTransitions.push(...transitions.filter(t => t.from === this.currentState));
    }
    
    return allTransitions;
  }

  // Private Methods

  /**
   * Setup state machine transitions
   */
  private setupTransitions(): void {
    // Connect transitions
    this.addTransition({
      from: ConnectionState.DISCONNECTED,
      to: ConnectionState.CONNECTING,
      trigger: 'connect'
    });

    this.addTransition({
      from: ConnectionState.ERROR,
      to: ConnectionState.CONNECTING,
      trigger: 'connect'
    });

    // Connection success
    this.addTransition({
      from: ConnectionState.CONNECTING,
      to: ConnectionState.CONNECTED,
      trigger: 'connected'
    });

    this.addTransition({
      from: ConnectionState.RECONNECTING,
      to: ConnectionState.CONNECTED,
      trigger: 'connected'
    });

    // Disconnect transitions
    this.addTransition({
      from: ConnectionState.CONNECTED,
      to: ConnectionState.DISCONNECTED,
      trigger: 'disconnect'
    });

    this.addTransition({
      from: ConnectionState.CONNECTING,
      to: ConnectionState.DISCONNECTED,
      trigger: 'disconnect'
    });

    this.addTransition({
      from: ConnectionState.RECONNECTING,
      to: ConnectionState.DISCONNECTED,
      trigger: 'disconnect'
    });

    this.addTransition({
      from: ConnectionState.ERROR,
      to: ConnectionState.DISCONNECTED,
      trigger: 'disconnect'
    });

    // Error transitions
    this.addTransition({
      from: ConnectionState.CONNECTING,
      to: ConnectionState.ERROR,
      trigger: 'error'
    });

    this.addTransition({
      from: ConnectionState.CONNECTED,
      to: ConnectionState.ERROR,
      trigger: 'error'
    });

    this.addTransition({
      from: ConnectionState.RECONNECTING,
      to: ConnectionState.ERROR,
      trigger: 'error'
    });

    // Reconnection transitions
    this.addTransition({
      from: ConnectionState.CONNECTED,
      to: ConnectionState.RECONNECTING,
      trigger: 'connection_lost'
    });

    this.addTransition({
      from: ConnectionState.ERROR,
      to: ConnectionState.RECONNECTING,
      trigger: 'retry',
      guard: () => this.canRetry()
    });

    // Termination (final state)
    this.addTransition({
      from: ConnectionState.DISCONNECTED,
      to: ConnectionState.TERMINATED,
      trigger: 'terminate'
    });

    this.addTransition({
      from: ConnectionState.ERROR,
      to: ConnectionState.TERMINATED,
      trigger: 'terminate'
    });
  }

  /**
   * Add transition to state machine
   */
  private addTransition(transition: ConnectionTransition): void {
    const key = transition.trigger;
    
    if (!this.transitions.has(key)) {
      this.transitions.set(key, []);
    }
    
    this.transitions.get(key)!.push(transition);
  }

  /**
   * Get valid transitions for trigger
   */
  private getValidTransitions(trigger: string): ConnectionTransition[] {
    const transitions = this.transitions.get(trigger) || [];
    return transitions.filter(t => t.from === this.currentState);
  }

  /**
   * Add event to history
   */
  private addToHistory(event: StateChangeEvent): void {
    this.history.push(event);
    
    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history.splice(0, this.history.length - this.maxHistorySize);
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(event: StateChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('State change listener error:', error);
      }
    });
  }

  /**
   * Check if retry is allowed (example guard condition)
   */
  private canRetry(): boolean {
    // Count recent retry attempts
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const recentRetries = this.history.filter(event => 
      event.trigger === 'retry' && 
      event.timestamp >= fiveMinutesAgo
    );
    
    // Limit to 5 retries in 5 minutes
    return recentRetries.length < 5;
  }
}