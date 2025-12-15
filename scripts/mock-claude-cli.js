#!/usr/bin/env node

/**
 * Mock Claude CLI for Testing
 * 
 * This script simulates Claude CLI responses for testing purposes,
 * avoiding external dependencies while maintaining realistic behavior.
 */

const fs = require('fs');
const path = require('path');

// Mock responses database
const mockResponses = {
  'what is the weather': {
    response: 'I\'m a mock Claude CLI for testing. I don\'t have access to real weather data, but I can simulate a response: "The weather is sunny and 72°F in your location."',
    latency: 800,
    tokens: 45
  },
  'hello': {
    response: 'Hello! I\'m the mock Claude CLI running in test mode. How can I help you today?',
    latency: 300,
    tokens: 20
  },
  'test response': {
    response: 'This is a test response from the mock Claude CLI. All systems are functioning normally.',
    latency: 500,
    tokens: 25
  },
  'error test': {
    error: 'Simulated error for testing error handling',
    latency: 200
  },
  'long response': {
    response: `This is a longer mock response to test how the system handles extended Claude AI responses. 
    
The mock system can simulate various response patterns including:
- Multi-paragraph responses
- Code examples
- Lists and structured content
- Different response lengths

This helps ensure the frontend can properly handle and display various types of Claude AI responses during testing.`,
    latency: 1200,
    tokens: 85
  }
};

// Performance simulation patterns
const performancePatterns = {
  normal: { minLatency: 300, maxLatency: 1000, errorRate: 0.02 },
  slow: { minLatency: 2000, maxLatency: 5000, errorRate: 0.05 },
  fast: { minLatency: 100, maxLatency: 300, errorRate: 0.01 },
  unstable: { minLatency: 200, maxLatency: 8000, errorRate: 0.15 }
};

class MockClaudeCLI {
  constructor() {
    this.pattern = process.env.MOCK_PATTERN || 'normal';
    this.sessionId = this.generateSessionId();
    this.requestCount = 0;
    this.startTime = Date.now();
    
    // Load configuration
    this.config = this.loadConfig();
    
    // Initialize logging
    this.logFile = path.join(process.cwd(), 'logs', 'mock-claude-cli.log');
    this.ensureLogDirectory();
    
    this.log('Mock Claude CLI initialized', { pattern: this.pattern, sessionId: this.sessionId });
  }

  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'test-config.json');
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (error) {
      this.log('Failed to load config, using defaults', { error: error.message });
    }
    
    return {
      enableMetrics: true,
      simulateNetworkIssues: false,
      responseDelay: 0,
      maxResponseLength: 10000
    };
  }

  generateSessionId() {
    return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      session: this.sessionId,
      message,
      ...data
    };
    
    console.log(`[MockClaude] ${message}`, data);
    
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async processRequest(input) {
    this.requestCount++;
    const requestId = `req-${this.requestCount}`;
    
    this.log('Processing request', { requestId, input: input.substring(0, 100) });
    
    // Simulate network latency
    const pattern = performancePatterns[this.pattern];
    const baseLatency = Math.random() * (pattern.maxLatency - pattern.minLatency) + pattern.minLatency;
    const actualLatency = baseLatency + (this.config.responseDelay || 0);
    
    // Simulate errors based on pattern
    if (Math.random() < pattern.errorRate) {
      await this.delay(actualLatency * 0.3);
      throw new Error('Mock network error for testing');
    }
    
    // Find matching response
    const normalizedInput = input.toLowerCase().trim();
    let mockData = mockResponses[normalizedInput];
    
    // If no exact match, use a default response
    if (!mockData) {
      mockData = {
        response: `I'm the mock Claude CLI. You asked: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}". This is a simulated response for testing purposes.`,
        latency: actualLatency,
        tokens: Math.floor(Math.random() * 100) + 20
      };
    }
    
    // Handle error simulation
    if (mockData.error) {
      await this.delay(actualLatency);
      throw new Error(mockData.error);
    }
    
    // Simulate processing time
    await this.delay(actualLatency);
    
    const response = {
      id: requestId,
      response: mockData.response,
      metadata: {
        sessionId: this.sessionId,
        requestCount: this.requestCount,
        processingTime: Math.floor(actualLatency),
        tokens: mockData.tokens,
        model: 'mock-claude-3.5',
        timestamp: new Date().toISOString()
      }
    };
    
    this.log('Request completed', { 
      requestId, 
      processingTime: actualLatency, 
      tokens: mockData.tokens 
    });
    
    return response;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    return {
      sessionId: this.sessionId,
      uptime,
      requestCount: this.requestCount,
      pattern: this.pattern,
      averageResponseTime: uptime / Math.max(this.requestCount, 1),
      startTime: this.startTime
    };
  }

  simulateStreamingResponse(input, callback) {
    const response = mockResponses[input.toLowerCase().trim()] || {
      response: `Streaming mock response for: ${input}`,
      latency: 1000
    };
    
    const words = response.response.split(' ');
    let wordIndex = 0;
    
    const streamInterval = setInterval(() => {
      if (wordIndex < words.length) {
        callback(null, { chunk: words[wordIndex] + ' ' });
        wordIndex++;
      } else {
        clearInterval(streamInterval);
        callback(null, { done: true });
      }
    }, 100);
    
    return () => clearInterval(streamInterval);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const mockCLI = new MockClaudeCLI();
  
  switch (command) {
    case 'ask':
    case 'query':
      const question = args.slice(1).join(' ');
      if (!question) {
        console.error('Please provide a question');
        process.exit(1);
      }
      
      mockCLI.processRequest(question)
        .then(response => {
          console.log(JSON.stringify(response, null, 2));
        })
        .catch(error => {
          console.error('Error:', error.message);
          process.exit(1);
        });
      break;
      
    case 'metrics':
      console.log(JSON.stringify(mockCLI.getMetrics(), null, 2));
      break;
      
    case 'stream':
      const streamQuestion = args.slice(1).join(' ');
      mockCLI.simulateStreamingResponse(streamQuestion, (error, data) => {
        if (error) {
          console.error('Stream error:', error);
        } else if (data.done) {
          console.log('\n[Stream complete]');
        } else {
          process.stdout.write(data.chunk);
        }
      });
      break;
      
    case 'health':
      console.log(JSON.stringify({
        status: 'healthy',
        version: '1.0.0-mock',
        timestamp: new Date().toISOString()
      }, null, 2));
      break;
      
    default:
      console.log(`Mock Claude CLI v1.0.0

Usage:
  node mock-claude-cli.js ask "your question"
  node mock-claude-cli.js stream "your question"
  node mock-claude-cli.js metrics
  node mock-claude-cli.js health

Environment Variables:
  MOCK_PATTERN: normal, slow, fast, unstable (default: normal)
  
Available for testing Claude AI integration without external dependencies.`);
  }
} else {
  // Module export for programmatic use
  module.exports = MockClaudeCLI;
}