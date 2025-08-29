/**
 * TDD LONDON SCHOOL: Integration test scenarios for Claude tripling issue
 * 
 * Tests complete workflows that integrate multiple components to isolate
 * where the tripling occurs in the full message flow pipeline.
 */

import { jest } from '@jest/globals';

// Mock the full message flow pipeline
interface MessageFlowStep {
  name: string;
  processor: (input: any) => any;
  validator?: (input: any, output: any) => boolean;
}

// Mock WebSocket -> Parser -> Component -> Renderer pipeline
class MockMessageFlowPipeline {
  private steps: MessageFlowStep[] = [];
  private flowHistory: Array<{ step: string; input: any; output: any; timestamp: number }> = [];
  
  addStep(step: MessageFlowStep): void {
    this.steps.push(step);
  }
  
  process(initialInput: any): any {
    let currentData = initialInput;
    
    for (const step of this.steps) {
      const previousData = currentData;
      currentData = step.processor(currentData);
      
      // Log the flow for analysis
      this.flowHistory.push({
        step: step.name,
        input: previousData,
        output: currentData,
        timestamp: Date.now()
      });
      
      // Validate if validator is provided
      if (step.validator && !step.validator(previousData, currentData)) {
        throw new Error(`Validation failed at step: ${step.name}`);
      }
    }
    
    return currentData;
  }
  
  getFlowHistory(): Array<{ step: string; input: any; output: any; timestamp: number }> {
    return this.flowHistory;
  }
  
  reset(): void {
    this.flowHistory = [];
  }
  
  // Analysis helpers for detecting duplication
  detectDuplication(): { 
    found: boolean; 
    details: Array<{ step: string; duplicatedContent: string }> 
  } {
    const duplications: Array<{ step: string; duplicatedContent: string }> = [];
    
    for (const entry of this.flowHistory) {
      if (typeof entry.output === 'string') {
        // Look for repeated patterns in output
        const lines = entry.output.split('\n');
        const uniqueLines = [...new Set(lines)];
        
        if (lines.length !== uniqueLines.length) {
          const duplicatedLines = lines.filter(line => 
            lines.filter(l => l === line).length > 1
          );
          
          if (duplicatedLines.length > 0) {
            duplications.push({
              step: entry.step,
              duplicatedContent: duplicatedLines[0]
            });
          }
        }
      }
    }
    
    return {
      found: duplications.length > 0,
      details: duplications
    };
  }
}

// Mock components for integration testing
const mockWebSocketReceiver = {
  name: 'WebSocket Receiver',
  processor: (rawMessage: { type: string; data: any }) => {
    // Simulate WebSocket message reception
    console.log(`📡 WebSocket received: ${rawMessage.type}`);
    return {
      type: rawMessage.type,
      terminalId: rawMessage.data.terminalId,
      output: rawMessage.data.output,
      timestamp: rawMessage.data.timestamp || Date.now()
    };
  }
};

const mockMessageRouter = {
  name: 'Message Router',
  processor: (wsMessage: any) => {
    // Simulate message routing logic (lines 286-292 in ClaudeInstanceManagerModern)
    console.log(`🔀 Routing message type: ${wsMessage.type}`);
    
    if (wsMessage.type === 'output' || wsMessage.type === 'terminal_output') {
      return {
        event: 'terminal:output',
        data: {
          output: wsMessage.output,
          terminalId: wsMessage.terminalId,
          timestamp: wsMessage.timestamp
        }
      };
    } else if (wsMessage.type === 'echo') {
      // This should be skipped to prevent duplication (line 293-295)
      return null; // Null means skip processing
    }
    
    return wsMessage;
  },
  validator: (input: any, output: any) => {
    // Validate that echo messages are filtered out
    if (input.type === 'echo') {
      return output === null;
    }
    return true;
  }
};

const mockDeduplicator = {
  name: 'Message Deduplicator',
  processor: (routedMessage: any) => {
    if (!routedMessage) return null; // Skip null messages
    
    // Simulate deduplication logic (lines 95-123 in ClaudeInstanceManagerModern)
    const messageId = `${routedMessage.data.terminalId}-${routedMessage.data.timestamp}-${routedMessage.data.output.slice(0, 50)}`;
    
    // Use a static Set to persist across calls (simulating the ref)
    if (!mockDeduplicator.processedMessages) {
      mockDeduplicator.processedMessages = new Set<string>();
    }
    
    if (mockDeduplicator.processedMessages.has(messageId)) {
      console.log(`🔄 Duplicate blocked: ${messageId}`);
      return null; // Blocked as duplicate
    }
    
    mockDeduplicator.processedMessages.add(messageId);
    return routedMessage;
  },
  processedMessages: null as Set<string> | null
};

const mockOutputParser = {
  name: 'Claude Output Parser',
  processor: (deduplicatedMessage: any) => {
    if (!deduplicatedMessage) return null;
    
    // Simulate ClaudeOutputParser.parseOutput logic
    const rawOutput = deduplicatedMessage.data.output;
    
    // Simple parsing - split by Claude box patterns
    const sections = rawOutput.split(/(?=┌)|(?<=┘)/).filter((s: string) => s.trim());
    
    const messages = sections.map((section: string, index: number) => ({
      id: `${deduplicatedMessage.data.terminalId}-parsed-${index}-${Date.now()}`,
      content: section.replace(/[┌┐└┘─│]/g, '').trim(), // Remove box chars
      role: section.includes('┌') ? 'assistant' : 'system',
      timestamp: new Date()
    }));
    
    return messages.filter(msg => msg.content.length > 0);
  }
};

const mockStateUpdater = {
  name: 'React State Updater',
  processor: (parsedMessages: any) => {
    if (!parsedMessages) return null;
    
    // Simulate React state update (lines 118-121)
    const terminalId = 'claude-test123';
    
    // Get current output state (simulated)
    if (!mockStateUpdater.outputState) {
      mockStateUpdater.outputState = {};
    }
    
    // Append new content
    for (const message of parsedMessages) {
      mockStateUpdater.outputState[terminalId] = 
        (mockStateUpdater.outputState[terminalId] || '') + message.content + '\n';
    }
    
    return {
      outputState: mockStateUpdater.outputState,
      newMessages: parsedMessages
    };
  },
  outputState: null as any
};

const mockRenderer = {
  name: 'React Renderer',
  processor: (stateUpdate: any) => {
    if (!stateUpdate) return null;
    
    // Simulate final rendering step
    const terminalId = 'claude-test123';
    const output = stateUpdate.outputState[terminalId] || '';
    
    // Convert output to renderable format
    return {
      renderedContent: output,
      messageCount: stateUpdate.newMessages.length,
      totalCharacters: output.length
    };
  }
};

describe('Claude Output Tripling Issue - Integration Scenarios', () => {
  let pipeline: MockMessageFlowPipeline;
  
  beforeEach(() => {
    pipeline = new MockMessageFlowPipeline();
    
    // Clear static state between tests
    if (mockDeduplicator.processedMessages) {
      mockDeduplicator.processedMessages.clear();
    }
    if (mockStateUpdater.outputState) {
      mockStateUpdater.outputState = {};
    }
  });

  describe('FAILING TEST: Complete message flow creates tripling', () => {
    it('should process single WebSocket message through complete pipeline without tripling', () => {
      // ARRANGE: Set up complete pipeline
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);
      pipeline.addStep(mockDeduplicator);
      pipeline.addStep(mockOutputParser);
      pipeline.addStep(mockStateUpdater);
      pipeline.addStep(mockRenderer);
      
      // Single Claude response message
      const rawWebSocketMessage = {
        type: 'output',
        data: {
          terminalId: 'claude-test123',
          output: `
┌────────────────────────────────────────────────────────────────┐
│ Hello! I'm Claude. How can I help you today?                  │
└────────────────────────────────────────────────────────────────┘`,
          timestamp: 1699999999999
        }
      };
      
      // ACT: Process through complete pipeline
      const result = pipeline.process(rawWebSocketMessage);
      
      // ASSERT: Should produce clean single output
      expect(result).toBeDefined();
      expect(result.renderedContent).toBeDefined();
      expect(result.messageCount).toBe(1);
      
      // Check for duplication in the rendered content
      const content = result.renderedContent;
      expect((content.match(/Hello! I'm Claude/g) || []).length).toBe(1);
      expect((content.match(/How can I help you today/g) || []).length).toBe(1);
      
      // Analyze pipeline for duplication points
      const duplicationAnalysis = pipeline.detectDuplication();
      expect(duplicationAnalysis.found).toBe(false);
    });
    
    it('FAILING: should prevent tripling when same message received 3 times', () => {
      // ARRANGE: Set up pipeline
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);
      pipeline.addStep(mockDeduplicator);
      pipeline.addStep(mockOutputParser);
      pipeline.addStep(mockStateUpdater);
      pipeline.addStep(mockRenderer);
      
      const duplicateMessage = {
        type: 'output',
        data: {
          terminalId: 'claude-test123',
          output: 'This message gets tripled in the bug',
          timestamp: 1699999999999 // Same timestamp for deduplication
        }
      };
      
      // ACT: Process same message 3 times
      const result1 = pipeline.process(duplicateMessage);
      pipeline.reset(); // Reset flow history but keep deduplication state
      
      const result2 = pipeline.process(duplicateMessage);
      pipeline.reset();
      
      const result3 = pipeline.process(duplicateMessage);
      
      // ASSERT: Only first message should be fully processed
      expect(result1).toBeDefined();
      expect(result1.renderedContent).toContain('This message gets tripled in the bug');
      
      // Second and third should be blocked by deduplicator
      expect(result2).toBeNull(); // Blocked by deduplicator
      expect(result3).toBeNull(); // Blocked by deduplicator
    });
  });

  describe('FAILING TEST: Echo message handling in pipeline', () => {
    it('should filter out echo messages to prevent duplication', () => {
      // ARRANGE: Pipeline with echo message
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);
      pipeline.addStep(mockDeduplicator);
      
      const echoMessage = {
        type: 'echo',
        data: {
          terminalId: 'claude-test123',
          output: 'Echo message that should be filtered',
          timestamp: Date.now()
        }
      };
      
      // ACT: Process echo message
      const result = pipeline.process(echoMessage);
      
      // ASSERT: Should be filtered out at router level
      expect(result).toBeNull();
      
      // Verify flow history shows echo was filtered
      const history = pipeline.getFlowHistory();
      const routerStep = history.find(h => h.step === 'Message Router');
      expect(routerStep?.output).toBeNull();
    });
    
    it('should handle mixed echo and regular messages correctly', () => {
      // ARRANGE: Process both echo and regular messages
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);
      pipeline.addStep(mockDeduplicator);
      pipeline.addStep(mockOutputParser);
      pipeline.addStep(mockStateUpdater);
      pipeline.addStep(mockRenderer);
      
      const echoMessage = {
        type: 'echo',
        data: { terminalId: 'claude-test123', output: 'Echo to be filtered', timestamp: 1000 }
      };
      
      const regularMessage = {
        type: 'output',
        data: { terminalId: 'claude-test123', output: 'Regular message to process', timestamp: 2000 }
      };
      
      // ACT: Process both messages
      const echoResult = pipeline.process(echoMessage);
      pipeline.reset();
      const regularResult = pipeline.process(regularMessage);
      
      // ASSERT: Only regular message should be processed
      expect(echoResult).toBeNull();
      expect(regularResult).toBeDefined();
      expect(regularResult.renderedContent).toContain('Regular message to process');
      expect(regularResult.renderedContent).not.toContain('Echo to be filtered');
    });
  });

  describe('FAILING TEST: Message routing causes duplication', () => {
    it('should not duplicate messages for both output and terminal_output types', () => {
      // ARRANGE: Pipeline that might duplicate based on message type
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);
      pipeline.addStep(mockDeduplicator);
      pipeline.addStep(mockOutputParser);
      pipeline.addStep(mockStateUpdater);
      pipeline.addStep(mockRenderer);
      
      // Same content with different type names
      const outputMessage = {
        type: 'output',
        data: { terminalId: 'claude-test123', output: 'Shared content', timestamp: 1000 }
      };
      
      const terminalOutputMessage = {
        type: 'terminal_output',
        data: { terminalId: 'claude-test123', output: 'Shared content', timestamp: 2000 }
      };
      
      // ACT: Process both message types
      const result1 = pipeline.process(outputMessage);
      pipeline.reset();
      const result2 = pipeline.process(terminalOutputMessage);
      
      // ASSERT: Both should be processed as they have different timestamps
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      
      // Content should appear in both results (they're legitimately different)
      expect(result1.renderedContent).toContain('Shared content');
      expect(result2.renderedContent).toContain('Shared content');
    });
  });

  describe('FAILING TEST: Parser creates duplicate messages', () => {
    it('should not split single Claude response into multiple messages incorrectly', () => {
      // ARRANGE: Complex Claude response that might be over-parsed
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);
      pipeline.addStep(mockDeduplicator);
      pipeline.addStep(mockOutputParser);
      
      const complexClaudeResponse = {
        type: 'output',
        data: {
          terminalId: 'claude-test123',
          output: `Command started...

┌────────────────────────────────────────────────────────────────┐
│ I'll help you with your request. Here's what I found:         │
│                                                                │
│ 1. The file exists                                             │
│ 2. It has the correct permissions                             │
│ 3. Content looks good                                          │
└────────────────────────────────────────────────────────────────┘

Command completed successfully.`,
          timestamp: Date.now()
        }
      };
      
      // ACT: Process complex response
      const result = pipeline.process(complexClaudeResponse);
      
      // ASSERT: Should create appropriate number of messages (not over-split)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeLessThanOrEqual(3); // Reasonable upper bound
      
      // Check that Claude response content appears only once total
      const allContent = result.map((msg: any) => msg.content).join(' ');
      expect((allContent.match(/I'll help you with your request/g) || []).length).toBe(1);
      expect((allContent.match(/The file exists/g) || []).length).toBe(1);
    });
  });

  describe('FAILING TEST: State updates cause rendering duplication', () => {
    it('should not accumulate duplicate content in React state', () => {
      // ARRANGE: Simulate rapid state updates
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);
      pipeline.addStep(mockDeduplicator);
      pipeline.addStep(mockOutputParser);
      pipeline.addStep(mockStateUpdater);
      pipeline.addStep(mockRenderer);
      
      const messages = [
        {
          type: 'output',
          data: { terminalId: 'claude-test123', output: 'First message', timestamp: 1000 }
        },
        {
          type: 'output', 
          data: { terminalId: 'claude-test123', output: 'Second message', timestamp: 2000 }
        },
        {
          type: 'output',
          data: { terminalId: 'claude-test123', output: 'Third message', timestamp: 3000 }
        }
      ];
      
      // ACT: Process messages sequentially (simulating rapid WebSocket messages)
      const results = messages.map(msg => {
        const result = pipeline.process(msg);
        pipeline.reset(); // Reset flow history but keep state
        return result;
      });
      
      // ASSERT: Each message should be added only once
      const finalResult = results[results.length - 1];
      expect(finalResult.renderedContent).toContain('First message');
      expect(finalResult.renderedContent).toContain('Second message');
      expect(finalResult.renderedContent).toContain('Third message');
      
      // No duplication in final state
      expect((finalResult.renderedContent.match(/First message/g) || []).length).toBe(1);
      expect((finalResult.renderedContent.match(/Second message/g) || []).length).toBe(1);
      expect((finalResult.renderedContent.match(/Third message/g) || []).length).toBe(1);
    });
  });

  describe('Pipeline Analysis and Debugging', () => {
    it('should provide insights into where duplication might occur', () => {
      // ARRANGE: Pipeline with potential duplication point
      const duplicatingStep = {
        name: 'Duplicating Processor',
        processor: (input: any) => {
          // Simulate a bug that duplicates content
          if (input && input.data && input.data.output) {
            return input.data.output + input.data.output; // Intentional duplication
          }
          return input;
        }
      };
      
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);
      pipeline.addStep(duplicatingStep); // This will cause duplication
      
      const testMessage = {
        type: 'output',
        data: { terminalId: 'claude-test123', output: 'Test content', timestamp: 1000 }
      };
      
      // ACT: Process through pipeline with duplication
      const result = pipeline.process(testMessage);
      
      // ASSERT: Duplication should be detected
      const duplicationAnalysis = pipeline.detectDuplication();
      expect(duplicationAnalysis.found).toBe(true);
      expect(duplicationAnalysis.details.length).toBeGreaterThan(0);
      
      // Result should show duplication
      expect(result).toBe('Test contentTest content'); // Doubled content
    });
    
    it('should track message transformations through the pipeline', () => {
      // ARRANGE: Complete pipeline
      pipeline.addStep(mockWebSocketReceiver);
      pipeline.addStep(mockMessageRouter);  
      pipeline.addStep(mockDeduplicator);
      pipeline.addStep(mockOutputParser);
      pipeline.addStep(mockStateUpdater);
      pipeline.addStep(mockRenderer);
      
      const testMessage = {
        type: 'output',
        data: {
          terminalId: 'claude-test123',
          output: 'Track this message through the pipeline',
          timestamp: 1000
        }
      };
      
      // ACT: Process and analyze flow
      pipeline.process(testMessage);
      const history = pipeline.getFlowHistory();
      
      // ASSERT: Should have entry for each step
      expect(history.length).toBe(6); // One for each step
      expect(history.map(h => h.step)).toEqual([
        'WebSocket Receiver',
        'Message Router', 
        'Message Deduplicator',
        'Claude Output Parser',
        'React State Updater',
        'React Renderer'
      ]);
      
      // Each step should show transformation
      history.forEach(entry => {
        expect(entry.input).toBeDefined();
        expect(entry.output).toBeDefined();
        expect(entry.timestamp).toBeDefined();
      });
    });
  });
});