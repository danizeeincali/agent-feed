/**
 * Mock for xterm.js Terminal
 * 
 * Provides comprehensive mocking for terminal double typing tests
 * with event tracking and behavior verification capabilities.
 */

export class Terminal {
  constructor(options = {}) {
    this.options = options;
    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    
    // Track method calls for behavior verification
    this.writeCalls = [];
    this.writeLinesCalls = [];
    this.onDataCalls = [];
    this.focusCalls = [];
    
    // Mock event handlers
    this._eventHandlers = new Map();
    this._disposables = [];
    
    // Mock terminal state
    this.isOpen = false;
    this.element = null;
  }
  
  // Core terminal methods with call tracking
  write(data) {
    this.writeCalls.push({
      data,
      timestamp: Date.now()
    });
    
    // Simulate potential double writing bug for RED phase
    if (process.env.SIMULATE_DOUBLE_TYPING === 'true') {
      this.writeCalls.push({
        data,
        timestamp: Date.now(),
        isDuplicate: true
      });
    }
  }
  
  writeln(data) {
    this.writeLinesCalls.push({
      data,
      timestamp: Date.now()
    });
  }
  
  onData(handler) {
    this.onDataCalls.push({
      handler,
      timestamp: Date.now()
    });
    
    // Store handler for potential cleanup tracking
    if (!this._eventHandlers.has('data')) {
      this._eventHandlers.set('data', []);
    }
    this._eventHandlers.get('data').push(handler);
    
    // Return disposable for cleanup testing
    const disposable = {
      dispose: jest.fn(() => {
        const handlers = this._eventHandlers.get('data') || [];
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      })
    };
    
    this._disposables.push(disposable);
    return disposable;
  }
  
  focus() {
    this.focusCalls.push({
      timestamp: Date.now()
    });
  }
  
  open(element) {
    this.element = element;
    this.isOpen = true;
  }
  
  dispose() {
    this.isOpen = false;
    this.element = null;
    this._eventHandlers.clear();
    this._disposables.forEach(disposable => {
      if (typeof disposable.dispose === 'function') {
        disposable.dispose();
      }
    });
    this._disposables = [];
  }
  
  clear() {
    this.writeCalls = [];
    this.writeLinesCalls = [];
  }
  
  loadAddon(addon) {
    // Mock addon loading
    if (addon && typeof addon.activate === 'function') {
      addon.activate(this);
    }
  }
  
  // Test utility methods
  getWriteCallCount() {
    return this.writeCalls.length;
  }
  
  getOnDataHandlerCount() {
    return this._eventHandlers.get('data')?.length || 0;
  }
  
  simulateInput(data) {
    const handlers = this._eventHandlers.get('data') || [];
    handlers.forEach(handler => {
      if (typeof handler === 'function') {
        handler(data);
      }
    });
  }
  
  // Check for duplicate writes (for testing double typing)
  hasDuplicateWrites() {
    const writeData = this.writeCalls.map(call => call.data);
    const uniqueData = [...new Set(writeData)];
    return writeData.length > uniqueData.length;
  }
  
  getDuplicateWrites() {
    const duplicates = [];
    const seen = new Map();
    
    this.writeCalls.forEach(call => {
      const key = call.data;
      if (seen.has(key)) {
        duplicates.push(call);
      } else {
        seen.set(key, call);
      }
    });
    
    return duplicates;
  }
}

// Mock terminal creation function
export const createTerminal = (options) => new Terminal(options);