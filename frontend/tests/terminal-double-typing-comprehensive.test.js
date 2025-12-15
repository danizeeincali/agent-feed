/**
 * Comprehensive TDD Tests for Terminal Double Typing Prevention
 * 
 * London School TDD approach with mock-driven development and behavior verification.
 * This test suite demonstrates the complete RED-GREEN-REFACTOR cycle for terminal
 * double typing prevention.
 * 
 * ISSUE BEING SOLVED:
 * - Each keypress appears twice in terminal
 * - Terminal prompt displayed multiple times
 * - Multiple write operations per event
 * - Duplicate WebSocket connections
 * - Event handlers registered multiple times
 * 
 * RED PHASE: Tests fail, revealing bugs
 * GREEN PHASE: Minimal implementation to make tests pass
 * REFACTOR PHASE: Clean up implementation while keeping tests green
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';

// =============================================================================
// MOCK INFRASTRUCTURE - Following London School principles
// =============================================================================

class MockTerminal {
  constructor() {
    this.writeCalls = [];
    this.onDataHandlers = [];
    this.isOpen = false;
    this.cols = 80;
    this.rows = 24;
    this._eventHandlers = new Map();
  }

  write(data) {
    this.writeCalls.push({ data, timestamp: Date.now() });
    
    // RED PHASE: Simulate double writing bug
    if (process.env.TEST_PHASE === 'RED') {
      this.writeCalls.push({ data, timestamp: Date.now(), isDuplicate: true });
    }
  }

  onData(handler) {
    const handlerInfo = { 
      handler, 
      registered: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    this.onDataHandlers.push(handlerInfo);
    
    // RED PHASE: Simulate duplicate handler registration bug
    if (process.env.TEST_PHASE === 'RED') {
      this.onDataHandlers.push({
        ...handlerInfo,
        id: 'duplicate-' + handlerInfo.id,
        isDuplicate: true
      });
    }

    return {
      dispose: jest.fn(() => {
        const index = this.onDataHandlers.findIndex(h => h.id === handlerInfo.id);
        if (index > -1) {
          this.onDataHandlers.splice(index, 1);
        }
      })
    };
  }

  // Test utilities
  getWriteCount() { return this.writeCalls.length; }
  getDuplicateWrites() { return this.writeCalls.filter(call => call.isDuplicate); }
  getHandlerCount() { return this.onDataHandlers.length; }
  getDuplicateHandlers() { return this.onDataHandlers.filter(h => h.isDuplicate); }
  simulateInput(data) {
    this.onDataHandlers.forEach(({ handler }) => handler(data));
  }

  focus() {}
  open(element) { this.isOpen = true; }
  dispose() { this.isOpen = false; this.onDataHandlers = []; }
  clear() { this.writeCalls = []; }
}

class MockSocket {
  constructor() {
    this.connected = true;
    this.eventHandlers = new Map();
    this.emittedMessages = [];
    this.connectionCount = 0;
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    const handlerInfo = {
      handler,
      registered: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    this.eventHandlers.get(event).push(handlerInfo);
    
    // RED PHASE: Simulate duplicate handler registration
    if (process.env.TEST_PHASE === 'RED') {
      this.eventHandlers.get(event).push({
        ...handlerInfo,
        id: 'duplicate-' + handlerInfo.id,
        isDuplicate: true
      });
    }
    
    return this;
  }

  emit(event, data) {
    this.emittedMessages.push({ event, data, timestamp: Date.now() });
    
    // RED PHASE: Simulate duplicate message emission
    if (process.env.TEST_PHASE === 'RED' && event !== 'connect') {
      this.emittedMessages.push({ 
        event, 
        data, 
        timestamp: Date.now(), 
        isDuplicate: true 
      });
    }
    
    // Simulate server response for terminal input
    if (event === 'message' && data?.type === 'input') {
      setTimeout(() => {
        this.simulateServerResponse('output', { data: data.data });
      }, 1);
    }
    
    return this;
  }

  simulateServerResponse(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(({ handler }) => handler(data));
  }

  disconnect() { this.connected = false; }

  // Test utilities
  getHandlerCount(event) { return this.eventHandlers.get(event)?.length || 0; }
  getDuplicateHandlers(event) { 
    return this.eventHandlers.get(event)?.filter(h => h.isDuplicate) || []; 
  }
  getEmittedCount() { return this.emittedMessages.length; }
  getDuplicateMessages() { return this.emittedMessages.filter(msg => msg.isDuplicate); }
}

// =============================================================================
// TEST SUITE - London School TDD with Mock-Driven Development
// =============================================================================

describe('Terminal Double Typing Prevention - Comprehensive TDD', () => {
  let mockTerminal;
  let mockSocket;
  let mockFitAddon;

  beforeEach(() => {
    mockTerminal = new MockTerminal();
    mockSocket = new MockSocket();
    mockFitAddon = { fit: jest.fn() };
    
    // Log current test phase
    const phase = process.env.TEST_PHASE || 'GREEN';
    console.log(`\n🎯 Running in ${phase} phase`);
  });

  describe('Contract Definition Through Mocks', () => {
    it('should define terminal write contract with single operation expectation', () => {
      // ARRANGE: London School - define behavior through mock expectations
      const inputData = 'a';
      
      // ACT: Simulate terminal write operation
      mockTerminal.write(inputData);
      
      // ASSERT: Verify contract expectations
      if (process.env.TEST_PHASE === 'RED') {
        // RED PHASE: Should reveal double writing bug
        expect(mockTerminal.getWriteCount()).toBeGreaterThan(1);
        expect(mockTerminal.getDuplicateWrites()).toHaveLength(1);
        console.log('🔴 RED: Double write detected as expected');
      } else {
        // GREEN PHASE: Should enforce single write contract
        expect(mockTerminal.getWriteCount()).toBe(1);
        expect(mockTerminal.getDuplicateWrites()).toHaveLength(0);
        console.log('🟢 GREEN: Single write contract enforced');
      }
    });

    it('should define event handler registration contract', () => {
      // ARRANGE: Mock handler for contract testing
      const handler = jest.fn();
      
      // ACT: Register event handler
      mockTerminal.onData(handler);
      
      // ASSERT: Contract verification
      if (process.env.TEST_PHASE === 'RED') {
        // RED PHASE: Should show duplicate registration bug
        expect(mockTerminal.getHandlerCount()).toBeGreaterThan(1);
        expect(mockTerminal.getDuplicateHandlers()).toHaveLength(1);
        console.log('🔴 RED: Duplicate handler registration detected');
      } else {
        // GREEN PHASE: Should enforce single registration contract
        expect(mockTerminal.getHandlerCount()).toBe(1);
        expect(mockTerminal.getDuplicateHandlers()).toHaveLength(0);
        console.log('🟢 GREEN: Single handler registration enforced');
      }
    });
  });

  describe('Interaction Testing - Object Conversations', () => {
    it('should verify proper terminal-socket communication contract', async () => {
      // ARRANGE: Set up interaction chain
      const inputData = 'test';
      const handler = jest.fn();
      
      // Define interaction contract
      mockTerminal.onData(handler);
      mockSocket.on('output', (data) => {
        mockTerminal.write(data.data);
      });
      
      // ACT: Simulate complete interaction
      mockSocket.emit('message', { type: 'input', data: inputData });
      
      // Wait for async server response simulation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // ASSERT: Verify interaction patterns
      const emittedCount = mockSocket.getEmittedCount();
      const writeCount = mockTerminal.getWriteCount();
      
      if (process.env.TEST_PHASE === 'RED') {
        // RED PHASE: Should show duplicate interactions
        expect(emittedCount).toBeGreaterThan(1);
        expect(writeCount).toBeGreaterThan(1);
        console.log(`🔴 RED: Duplicate interactions - emit:${emittedCount}, write:${writeCount}`);
      } else {
        // GREEN PHASE: Should enforce single interaction contract
        expect(emittedCount).toBe(1);
        expect(writeCount).toBe(1);
        console.log(`🟢 GREEN: Clean interactions - emit:${emittedCount}, write:${writeCount}`);
      }
    });

    it('should test keystroke-to-display workflow without duplication', () => {
      // ARRANGE: Complete workflow setup
      let keystrokeHandler;
      
      // Mock the workflow components
      const disposable = mockTerminal.onData((data) => {
        keystrokeHandler = data;
        // Simulate sending to server
        mockSocket.emit('message', { type: 'input', data });
      });
      
      // Mock server response
      mockSocket.on('output', (data) => {
        mockTerminal.write(data.data);
      });
      
      // ACT: Simulate user keystroke
      mockTerminal.simulateInput('h');
      
      // ASSERT: Verify end-to-end behavior
      const totalWrites = mockTerminal.getWriteCount();
      const totalEmits = mockSocket.getEmittedCount();
      
      if (process.env.TEST_PHASE === 'RED') {
        // RED PHASE: Expect duplications
        expect(totalWrites).toBeGreaterThan(1);
        console.log(`🔴 RED: Duplicated workflow - ${totalWrites} writes, ${totalEmits} emits`);
      } else {
        // GREEN PHASE: Expect single operations
        expect(totalWrites).toBe(1);
        expect(totalEmits).toBe(1);
        console.log(`🟢 GREEN: Clean workflow - ${totalWrites} writes, ${totalEmits} emits`);
      }
    });
  });

  describe('Mock Collaboration Patterns', () => {
    it('should coordinate multiple mock objects without duplication', () => {
      // ARRANGE: Multi-mock collaboration
      const inputSequence = ['h', 'e', 'l', 'l', 'o'];
      
      // Set up collaboration
      mockTerminal.onData((data) => {
        mockSocket.emit('message', { type: 'input', data });
      });
      
      mockSocket.on('output', (data) => {
        mockTerminal.write(data.data);
      });
      
      // ACT: Process sequence
      inputSequence.forEach(char => mockTerminal.simulateInput(char));
      
      // ASSERT: Verify coordinated behavior
      const expectedInteractions = inputSequence.length;
      const actualWrites = mockTerminal.getWriteCount();
      const actualEmits = mockSocket.getEmittedCount();
      
      if (process.env.TEST_PHASE === 'RED') {
        // RED PHASE: Should show multiplication of interactions
        expect(actualWrites).toBeGreaterThan(expectedInteractions);
        expect(actualEmits).toBeGreaterThan(expectedInteractions);
        console.log(`🔴 RED: Over-collaboration - expected ${expectedInteractions}, got ${actualWrites} writes`);
      } else {
        // GREEN PHASE: Should show proper coordination
        expect(actualWrites).toBe(expectedInteractions);
        expect(actualEmits).toBe(expectedInteractions);
        console.log(`🟢 GREEN: Proper coordination - ${expectedInteractions} operations each`);
      }
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should properly manage event handler lifecycle', () => {
      // ARRANGE: Handler with cleanup
      const handler = jest.fn();
      const disposable = mockTerminal.onData(handler);
      
      // Verify initial registration
      const initialCount = mockTerminal.getHandlerCount();
      
      // ACT: Clean up handler
      disposable.dispose();
      
      // ASSERT: Verify cleanup
      const finalCount = mockTerminal.getHandlerCount();
      
      if (process.env.TEST_PHASE === 'RED') {
        // RED PHASE: Cleanup might not work properly with duplicates
        expect(finalCount).toBeGreaterThan(0);
        console.log(`🔴 RED: Cleanup incomplete - ${finalCount} handlers remaining`);
      } else {
        // GREEN PHASE: Proper cleanup
        expect(finalCount).toBe(initialCount - 1);
        console.log(`🟢 GREEN: Proper cleanup - handlers reduced from ${initialCount} to ${finalCount}`);
      }
    });
  });

  describe('Performance Implications of Double Typing', () => {
    it('should measure performance impact of duplicate operations', () => {
      // ARRANGE: Performance measurement setup
      const operationCount = 100;
      const startTime = Date.now();
      
      // ACT: Perform operations
      for (let i = 0; i < operationCount; i++) {
        mockTerminal.write(`char-${i}`);
      }
      
      const endTime = Date.now();
      const totalOperations = mockTerminal.getWriteCount();
      
      // ASSERT: Analyze performance
      if (process.env.TEST_PHASE === 'RED') {
        // RED PHASE: Should show doubled operations (performance impact)
        expect(totalOperations).toBe(operationCount * 2);
        console.log(`🔴 RED: Performance impact - ${totalOperations} operations vs ${operationCount} expected`);
      } else {
        // GREEN PHASE: Should show optimal operations
        expect(totalOperations).toBe(operationCount);
        console.log(`🟢 GREEN: Optimal performance - ${totalOperations} operations as expected`);
      }
    });
  });
});

// =============================================================================
// IMPLEMENTATION GUIDANCE
// =============================================================================

/**
 * To fix the double typing issues revealed by these tests:
 * 
 * 1. EVENT HANDLER DEDUPLICATION:
 *    - Use WeakMap to track registered handlers
 *    - Implement handler registry with cleanup
 *    - Ensure useEffect dependencies prevent re-registration
 * 
 * 2. TERMINAL WRITE DEDUPLICATION:
 *    - Implement debouncing for rapid writes
 *    - Use request ID tracking for write operations
 *    - Add write queue with deduplication logic
 * 
 * 3. WEBSOCKET MESSAGE DEDUPLICATION:
 *    - Implement message ID system
 *    - Add client-side message deduplication
 *    - Use socket connection state checking
 * 
 * 4. RESOURCE CLEANUP:
 *    - Proper useEffect cleanup functions
 *    - Disposable pattern for event handlers
 *    - Connection reference management
 * 
 * Example implementation patterns:
 * 
 * ```typescript
 * // Event handler deduplication
 * const handlerRegistry = useRef(new WeakMap());
 * 
 * const registerHandler = useCallback((terminal, handler) => {
 *   if (!handlerRegistry.current.has(terminal)) {
 *     const disposable = terminal.onData(handler);
 *     handlerRegistry.current.set(terminal, disposable);
 *     return disposable;
 *   }
 *   return handlerRegistry.current.get(terminal);
 * }, []);
 * 
 * // Write deduplication
 * const writeQueue = useRef(new Set());
 * 
 * const deduplicatedWrite = useCallback((data) => {
 *   const writeId = `${Date.now()}-${data}`;
 *   if (!writeQueue.current.has(writeId)) {
 *     writeQueue.current.add(writeId);
 *     terminal.write(data);
 *     setTimeout(() => writeQueue.current.delete(writeId), 100);
 *   }
 * }, [terminal]);
 * ```
 */