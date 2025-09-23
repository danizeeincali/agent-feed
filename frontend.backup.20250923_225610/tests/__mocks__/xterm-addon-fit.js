/**
 * Mock for xterm FitAddon
 * 
 * Provides mocking for terminal resize functionality
 * with call tracking for behavior verification.
 */

export class FitAddon {
  constructor() {
    this.fitCalls = [];
    this.proposeDimensionsCalls = [];
    this.terminal = null;
  }
  
  activate(terminal) {
    this.terminal = terminal;
  }
  
  fit() {
    this.fitCalls.push({
      timestamp: Date.now(),
      terminalDimensions: this.terminal ? {
        cols: this.terminal.cols,
        rows: this.terminal.rows
      } : null
    });
    
    // Simulate potential duplicate fit calls for RED phase
    if (process.env.SIMULATE_DOUBLE_FIT === 'true') {
      this.fitCalls.push({
        timestamp: Date.now(),
        terminalDimensions: this.terminal ? {
          cols: this.terminal.cols,
          rows: this.terminal.rows
        } : null,
        isDuplicate: true
      });
    }
  }
  
  proposeDimensions() {
    this.proposeDimensionsCalls.push({
      timestamp: Date.now()
    });
    
    return {
      cols: 80,
      rows: 24
    };
  }
  
  // Test utility methods
  getFitCallCount() {
    return this.fitCalls.length;
  }
  
  getDuplicateFitCalls() {
    return this.fitCalls.filter(call => call.isDuplicate);
  }
  
  clearCalls() {
    this.fitCalls = [];
    this.proposeDimensionsCalls = [];
  }
}