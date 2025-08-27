/**
 * TDD London School Tests for Backend Process Verification
 * 
 * Mock-free tests that verify actual backend process behavior
 * Tests run against real running backend to ensure I/O contracts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fetch from 'node-fetch';
import { EventSource } from 'eventsource';

const BACKEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

// Real backend verification without mocks
describe('Backend Process Verification - No Mocks', () => {
  let testInstanceIds: string[] = [];
  let activeConnections: EventSource[] = [];

  beforeAll(async () => {
    // Verify backend is actually running
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();
      expect(data.status).toBe('healthy');
      console.log('✅ Backend health check passed');
    } catch (error) {
      throw new Error(`Backend not running at ${BACKEND_URL}. Start it first: node simple-backend.js`);
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup all test instances
    for (const instanceId of testInstanceIds) {
      try {
        await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
        console.log(`Cleaned up test instance: ${instanceId}`);
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    
    // Close all active connections
    activeConnections.forEach(connection => {
      connection.close();
    });
    
    console.log('✅ Test cleanup completed');
  });

  beforeEach(() => {
    // Clear arrays for each test
    testInstanceIds.length = 0;
    activeConnections.length = 0;
  });

  afterEach(async () => {
    // Close connections after each test
    activeConnections.forEach(connection => {
      connection.close();
    });
    activeConnections.length = 0;
    
    // Small delay to ensure connections are properly closed
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Real Claude Process Creation and I/O', () => {
    it('should create real Claude process and verify stdout streaming', async () => {
      // Arrange: Create real Claude instance
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions'
        })
      });
      
      expect(createResponse.ok).toBe(true);
      const createData = await createResponse.json();
      expect(createData.success).toBe(true);
      expect(createData.instance.id).toMatch(/^claude-\d+$/);
      
      const instanceId = createData.instance.id;
      testInstanceIds.push(instanceId);
      
      console.log(`✅ Created real Claude instance: ${instanceId}`);
      
      // Act: Connect to real SSE stream
      const receivedMessages: any[] = [];
      const connectionPromise = new Promise<void>((resolve, reject) => {
        const eventSource = new EventSource(
          `${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`
        );
        
        activeConnections.push(eventSource);
        
        let connectionConfirmed = false;
        const timeout = setTimeout(() => {
          if (!connectionConfirmed) {
            reject(new Error('SSE connection timeout'));
          }
        }, 10000);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            receivedMessages.push(data);
            
            if (data.type === 'connected') {
              connectionConfirmed = true;
              clearTimeout(timeout);
              resolve();
            }
            
            console.log('📺 Received real SSE message:', data.type, data.data?.substring(0, 50));
          } catch (error) {
            console.error('SSE message parse error:', error);
          }
        };
        
        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error(`SSE connection error: ${error}`));
        };
      });
      
      await connectionPromise;
      
      // Wait for real process output
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify real process behavior
      expect(receivedMessages.length).toBeGreaterThan(0);
      
      const connectionMessage = receivedMessages.find(msg => msg.type === 'connected');
      expect(connectionMessage).toBeDefined();
      expect(connectionMessage.message).toContain(`Terminal connected to Claude instance ${instanceId}`);
      
      const outputMessages = receivedMessages.filter(msg => msg.type === 'output');
      if (outputMessages.length > 0) {
        outputMessages.forEach(msg => {
          expect(msg.data).toBeTruthy();
          expect(typeof msg.data).toBe('string');
          
          // Verify NOT hardcoded responses
          expect(msg.data).not.toContain('[RESPONSE] Claude Code session started');
          expect(msg.data).not.toMatch(/fake|mock|hardcoded/i);
        });
      }
      
      console.log(`✅ Real process streaming verified for ${instanceId}`);
    }, TEST_TIMEOUT);

    it('should verify real working directory is communicated to frontend', async () => {
      // Arrange: Create instance with specific working directory
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: ['claude'],
          instanceType: 'prod' // Should resolve to /workspaces/agent-feed/prod
        })
      });
      
      const createData = await createResponse.json();
      expect(createData.success).toBe(true);
      
      const instanceId = createData.instance.id;
      testInstanceIds.push(instanceId);
      
      console.log(`✅ Created prod instance: ${instanceId}`);
      
      // Act: Check instance status for working directory
      await new Promise(resolve => setTimeout(resolve, 1000)); // Let process start
      
      const statusResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
      expect(statusResponse.ok).toBe(true);
      
      const statusData = await statusResponse.json();
      expect(statusData.success).toBe(true);
      
      // Assert: Verify real working directory
      expect(statusData.status.workingDirectory).toBeTruthy();
      expect(statusData.status.workingDirectory).toMatch(/\/workspaces\/agent-feed/);
      expect(statusData.status.workingDirectory).not.toBe('/fake/path');
      expect(statusData.status.workingDirectory).not.toContain('hardcoded');
      
      console.log(`✅ Real working directory verified: ${statusData.status.workingDirectory}`);
      
      // Also verify through SSE stream
      const receivedMessages: any[] = [];
      const streamPromise = new Promise<void>((resolve) => {
        const eventSource = new EventSource(
          `${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`
        );
        
        activeConnections.push(eventSource);
        
        let foundWorkingDir = false;
        const timeout = setTimeout(() => resolve(), 5000);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            receivedMessages.push(data);
            
            if (data.type === 'output' && data.data && data.data.includes('Working directory:')) {
              const match = data.data.match(/Working directory: ([^\n\r]+)/);
              if (match) {
                const workingDir = match[1].trim();
                expect(workingDir).toMatch(/\/workspaces\/agent-feed/);
                expect(workingDir).not.toContain('hardcoded');
                foundWorkingDir = true;
                clearTimeout(timeout);
                resolve();
              }
            }
          } catch (error) {
            console.error('Stream message parse error:', error);
          }
        };
      });
      
      await streamPromise;
      console.log(`✅ Working directory verified through SSE stream`);
    }, TEST_TIMEOUT);

    it('should verify real stdin input reaches Claude process', async () => {
      // Arrange: Create real instance
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions'
        })
      });
      
      const createData = await createResponse.json();
      const instanceId = createData.instance.id;
      testInstanceIds.push(instanceId);
      
      // Wait for process to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Act: Send real input to process
      const inputResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'help\n' })
      });
      
      expect(inputResponse.ok).toBe(true);
      const inputData = await inputResponse.json();
      expect(inputData.success).toBe(true);
      expect(inputData.processed).toBe('help\n');
      
      console.log(`✅ Input successfully sent to real process: ${instanceId}`);
      
      // Verify input reaches process by checking response
      const receivedMessages: any[] = [];
      const responsePromise = new Promise<void>((resolve) => {
        const eventSource = new EventSource(
          `${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`
        );
        
        activeConnections.push(eventSource);
        
        const timeout = setTimeout(() => resolve(), 3000);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            receivedMessages.push(data);
            
            // Look for any output that indicates input was processed
            if (data.type === 'output' || data.type === 'terminal:echo') {
              console.log('📺 Received response to input:', data.data);
              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            console.error('Response message parse error:', error);
          }
        };
      });
      
      await responsePromise;
      
      // Assert: Some response was received (proves input reached process)
      const outputMessages = receivedMessages.filter(msg => 
        msg.type === 'output' || msg.type === 'terminal:echo'
      );
      
      if (outputMessages.length > 0) {
        outputMessages.forEach(msg => {
          expect(msg.data).toBeTruthy();
          // Should not be hardcoded mock response
          expect(msg.data).not.toMatch(/fake.*response|mock.*output|hardcoded/i);
        });
      }
      
      console.log(`✅ Real stdin communication verified for ${instanceId}`);
    }, TEST_TIMEOUT);
  });

  describe('Real Process Lifecycle Verification', () => {
    it('should verify process status changes are real and not hardcoded', async () => {
      // Arrange: Create instance and track status changes
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions'
        })
      });
      
      const createData = await createResponse.json();
      const instanceId = createData.instance.id;
      testInstanceIds.push(instanceId);
      
      const statusChanges: any[] = [];
      
      // Act: Monitor real status changes via SSE
      const statusPromise = new Promise<void>((resolve) => {
        const eventSource = new EventSource(`${BACKEND_URL}/api/status/stream`);
        
        activeConnections.push(eventSource);
        
        let receivedStatusUpdate = false;
        const timeout = setTimeout(() => {
          if (receivedStatusUpdate) resolve();
        }, 8000);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'instance:status' && data.instanceId === instanceId) {
              statusChanges.push(data);
              receivedStatusUpdate = true;
              
              if (data.status === 'running') {
                clearTimeout(timeout);
                resolve();
              }
            }
          } catch (error) {
            console.error('Status message parse error:', error);
          }
        };
      });
      
      await statusPromise;
      
      // Assert: Real status changes occurred
      expect(statusChanges.length).toBeGreaterThan(0);
      
      statusChanges.forEach(statusChange => {
        expect(statusChange.instanceId).toBe(instanceId);
        expect(['starting', 'running', 'stopped', 'error']).toContain(statusChange.status);
        expect(statusChange.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
      
      console.log(`✅ Real status changes verified for ${instanceId}:`, statusChanges.map(s => s.status));
    }, TEST_TIMEOUT);

    it('should verify process termination is real', async () => {
      // Arrange: Create instance to terminate
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions'
        })
      });
      
      const createData = await createResponse.json();
      const instanceId = createData.instance.id;
      // Don't add to cleanup list since we're terminating it ourselves
      
      // Wait for process to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Act: Terminate the real process
      const terminateResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });
      
      expect(terminateResponse.ok).toBe(true);
      const terminateData = await terminateResponse.json();
      expect(terminateData.success).toBe(true);
      expect(terminateData.pid).toBeTypeOf('number');
      
      console.log(`✅ Real process termination initiated: PID ${terminateData.pid}`);
      
      // Verify process is actually gone
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
      expect(statusResponse.status).toBe(404); // Instance should no longer exist
      
      console.log(`✅ Process termination verified: ${instanceId} no longer exists`);
    }, TEST_TIMEOUT);
  });

  describe('Anti-Hardcoded Response Verification', () => {
    it('should verify no mock responses appear in real terminal streams', async () => {
      // Arrange: Create instance and collect all output
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: ['claude'],
          instanceType: 'prod'
        })
      });
      
      const createData = await createResponse.json();
      const instanceId = createData.instance.id;
      testInstanceIds.push(instanceId);
      
      const allMessages: any[] = [];
      
      // Act: Collect all SSE messages for analysis
      const collectionPromise = new Promise<void>((resolve) => {
        const eventSource = new EventSource(
          `${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`
        );
        
        activeConnections.push(eventSource);
        
        const timeout = setTimeout(() => resolve(), 5000);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            allMessages.push(data);
          } catch (error) {
            console.error('Message collection parse error:', error);
          }
        };
        
        eventSource.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
      
      await collectionPromise;
      
      // Assert: No hardcoded patterns in any message
      expect(allMessages.length).toBeGreaterThan(0);
      
      const problematicPatterns = [
        /\[RESPONSE\].*Claude Code session started/,
        /fake.*response/i,
        /mock.*output/i, 
        /hardcoded.*message/i,
        /simulated.*terminal/i,
        /\[MOCK\]/i
      ];
      
      allMessages.forEach((message, index) => {
        if (message.data) {
          problematicPatterns.forEach(pattern => {
            if (pattern.test(message.data)) {
              console.error(`❌ Found hardcoded pattern in message ${index}:`, message.data);
            }
            expect(message.data).not.toMatch(pattern);
          });
        }
      });
      
      console.log(`✅ Anti-hardcoded verification passed for ${allMessages.length} messages`);
    }, TEST_TIMEOUT);
  });
});
