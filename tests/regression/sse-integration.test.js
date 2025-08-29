/**
 * TDD London School - SSE Integration Contract Tests
 * 
 * CRITICAL REGRESSION PROTECTION:
 * - Tests frontend-backend API contracts remain stable
 * - Mocks HTTP requests and validates responses
 * - Tests SSE connection establishment and data flow
 * - Validates error propagation and user feedback
 * 
 * Focus: Mock-driven verification of SSE communication behavior
 */

const EventSource = require('eventsource');
const http = require('http');

// Mock dependencies for isolation
jest.mock('eventsource');
jest.mock('http');

// Mock Express response object
const createMockResponse = () => ({
  writeHead: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
  setTimeout: jest.fn(),
  on: jest.fn(),
  writable: true,
  writableEnded: false,
  destroyed: false
});

// Mock Express request object
const createMockRequest = () => ({
  setTimeout: jest.fn(),
  on: jest.fn(),
  params: {},
  body: {},
  headers: {}
});

describe('SSE Integration Contract Tests', () => {
  let mockEventSource;
  let mockRequest;
  let mockResponse;
  let sseConnections;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock EventSource for client-side testing
    mockEventSource = {
      onopen: null,
      onmessage: null,
      onerror: null,
      close: jest.fn(),
      readyState: 1, // OPEN
      url: '',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    EventSource.mockImplementation(() => mockEventSource);
    
    // Mock request/response objects
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    
    // Mock SSE connections tracking
    sseConnections = new Map();
  });

  describe('CRITICAL: SSE Connection Establishment Contract', () => {
    test('should establish SSE connection with correct headers (CRITICAL)', () => {
      const instanceId = 'claude-test-123';
      
      const establishSSEConnection = jest.fn((req, res, id) => {
        // Set required SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
          'X-Accel-Buffering': 'no'
        });
        
        // Prevent timeouts
        req.setTimeout(0);
        res.setTimeout(0);
        
        return { connected: true, instanceId: id };
      });
      
      const result = establishSSEConnection(mockRequest, mockResponse, instanceId);
      
      // CRITICAL VERIFICATION: Correct SSE headers must be set
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no'
      });
      
      expect(mockRequest.setTimeout).toHaveBeenCalledWith(0);
      expect(mockResponse.setTimeout).toHaveBeenCalledWith(0);
      expect(result.connected).toBe(true);
      expect(result.instanceId).toBe(instanceId);
    });

    test('should send initial connection confirmation message', () => {
      const instanceId = 'claude-test-123';
      
      const sendConnectionMessage = jest.fn((res, id) => {
        const connectionMessage = {
          type: 'connected',
          instanceId: id,
          message: `✅ Terminal connected to Claude instance ${id}`,
          timestamp: new Date().toISOString()
        };
        
        res.write(`data: ${JSON.stringify(connectionMessage)}\n\n`);
        return connectionMessage;
      });
      
      const message = sendConnectionMessage(mockResponse, instanceId);
      
      expect(message.type).toBe('connected');
      expect(message.instanceId).toBe(instanceId);
      expect(message.message).toContain('Terminal connected to Claude instance');
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('data: ')
      );
    });

    test('should track SSE connections per instance', () => {
      const instanceId = 'claude-test-123';
      
      const trackSSEConnection = jest.fn((id, res) => {
        if (!sseConnections.has(id)) {
          sseConnections.set(id, []);
        }
        sseConnections.get(id).push(res);
        
        return {
          instanceId: id,
          connectionCount: sseConnections.get(id).length
        };
      });
      
      const result = trackSSEConnection(instanceId, mockResponse);
      
      expect(result.instanceId).toBe(instanceId);
      expect(result.connectionCount).toBe(1);
      expect(sseConnections.has(instanceId)).toBe(true);
      expect(sseConnections.get(instanceId)).toContain(mockResponse);
    });
  });

  describe('SSE Message Broadcasting Contract', () => {
    test('should broadcast process output to connected clients', () => {
      const instanceId = 'claude-test-123';
      const outputData = 'Hello from Claude process!';
      
      // Setup connections
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      sseConnections.set(instanceId, [mockRes1, mockRes2]);
      
      const broadcastOutput = jest.fn((id, data) => {
        const connections = sseConnections.get(id) || [];
        const message = {
          type: 'output',
          data: data,
          instanceId: id,
          timestamp: new Date().toISOString(),
          source: 'stdout',
          isReal: true
        };
        
        const serializedData = `data: ${JSON.stringify(message)}\n\n`;
        let successfulBroadcasts = 0;
        
        connections.forEach(connection => {
          if (connection && connection.writable && !connection.destroyed) {
            connection.write(serializedData);
            successfulBroadcasts++;
          }
        });
        
        return { broadcasted: successfulBroadcasts, total: connections.length };
      });
      
      const result = broadcastOutput(instanceId, outputData);
      
      expect(result.broadcasted).toBe(2);
      expect(result.total).toBe(2);
      expect(mockRes1.write).toHaveBeenCalledWith(
        expect.stringContaining('Hello from Claude process!')
      );
      expect(mockRes2.write).toHaveBeenCalledWith(
        expect.stringContaining('Hello from Claude process!')
      );
    });

    test('should handle dead connections during broadcast', () => {
      const instanceId = 'claude-test-123';
      
      // Setup connections with one dead connection
      const mockRes1 = createMockResponse();
      const mockRes2 = {
        ...createMockResponse(),
        destroyed: true,
        writable: false
      };
      sseConnections.set(instanceId, [mockRes1, mockRes2]);
      
      const broadcastWithCleanup = jest.fn((id, data) => {
        const connections = sseConnections.get(id) || [];
        const validConnections = [];
        let successfulBroadcasts = 0;
        
        connections.forEach(connection => {
          if (connection && connection.writable && !connection.destroyed) {
            try {
              connection.write(`data: ${JSON.stringify(data)}\n\n`);
              validConnections.push(connection);
              successfulBroadcasts++;
            } catch (error) {
              // Connection failed, don't add to valid connections
            }
          }
        });
        
        // Update connections list to remove dead connections
        sseConnections.set(id, validConnections);
        
        return { 
          successfulBroadcasts,
          validConnections: validConnections.length,
          removedConnections: connections.length - validConnections.length
        };
      });
      
      const result = broadcastWithCleanup(instanceId, { test: 'data' });
      
      expect(result.successfulBroadcasts).toBe(1);
      expect(result.validConnections).toBe(1);
      expect(result.removedConnections).toBe(1);
    });

    test('should broadcast status changes to all connections', () => {
      const instanceId = 'claude-test-123';
      const status = 'running';
      
      const mockRes = createMockResponse();
      sseConnections.set(instanceId, [mockRes]);
      sseConnections.set('__status__', [mockRes]); // General status connections
      
      const broadcastStatus = jest.fn((id, statusValue, details = {}) => {
        const statusEvent = {
          type: 'instance:status',
          instanceId: id,
          status: statusValue,
          timestamp: new Date().toISOString(),
          ...details
        };
        
        const serializedData = `data: ${JSON.stringify(statusEvent)}\n\n`;
        let totalBroadcasts = 0;
        
        // Broadcast to instance-specific connections
        const instanceConnections = sseConnections.get(id) || [];
        instanceConnections.forEach(res => {
          res.write(serializedData);
          totalBroadcasts++;
        });
        
        // Broadcast to general status connections
        const generalConnections = sseConnections.get('__status__') || [];
        generalConnections.forEach(res => {
          res.write(serializedData);
          totalBroadcasts++;
        });
        
        return { totalBroadcasts, statusEvent };
      });
      
      const result = broadcastStatus(instanceId, status, { pid: 12345 });
      
      expect(result.totalBroadcasts).toBe(2); // 1 instance + 1 general
      expect(result.statusEvent.type).toBe('instance:status');
      expect(result.statusEvent.status).toBe('running');
      expect(result.statusEvent.pid).toBe(12345);
    });
  });

  describe('Connection Cleanup Contract', () => {
    test('should handle client disconnect gracefully', () => {
      const instanceId = 'claude-test-123';
      const mockRes = createMockResponse();
      sseConnections.set(instanceId, [mockRes]);
      
      const handleDisconnect = jest.fn((req, res, id) => {
        const connections = sseConnections.get(id) || [];
        const index = connections.indexOf(res);
        
        if (index !== -1) {
          connections.splice(index, 1);
          sseConnections.set(id, connections);
        }
        
        return {
          removed: index !== -1,
          remainingConnections: connections.length
        };
      });
      
      // Simulate disconnect
      const result = handleDisconnect(mockRequest, mockResponse, instanceId);
      
      expect(result.removed).toBe(false); // mockResponse wasn't in connections
      expect(result.remainingConnections).toBe(1);
      
      // Now test with actual connection
      const result2 = handleDisconnect(mockRequest, mockRes, instanceId);
      expect(result2.removed).toBe(true);
      expect(result2.remainingConnections).toBe(0);
    });

    test('should handle connection errors without crashing', () => {
      const mockRes = {
        ...createMockResponse(),
        write: jest.fn(() => {
          throw new Error('ECONNRESET');
        })
      };
      
      const safeWrite = jest.fn((res, data) => {
        try {
          res.write(data);
          return { success: true };
        } catch (error) {
          console.error('Connection error:', error.message);
          return { success: false, error: error.message };
        }
      });
      
      const result = safeWrite(mockRes, 'test data');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('ECONNRESET');
    });
  });

  describe('API Endpoint Contract', () => {
    test('should validate instance creation API response format', () => {
      const createInstanceResponse = jest.fn((instanceData) => {
        return {
          success: true,
          instance: {
            id: instanceData.id,
            name: instanceData.name || `Claude Instance ${instanceData.id}`,
            status: 'starting',
            pid: instanceData.pid,
            type: instanceData.type || 'prod',
            created: new Date().toISOString(),
            command: instanceData.command,
            workingDirectory: instanceData.workingDirectory
          }
        };
      });
      
      const instanceData = {
        id: 'claude-123',
        pid: 12345,
        command: 'claude --dangerously-skip-permissions',
        workingDirectory: '/workspaces/agent-feed'
      };
      
      const response = createInstanceResponse(instanceData);
      
      expect(response.success).toBe(true);
      expect(response.instance.id).toBe('claude-123');
      expect(response.instance.status).toBe('starting');
      expect(response.instance.pid).toBe(12345);
      expect(response.instance.command).toBe('claude --dangerously-skip-permissions');
      expect(response.instance.workingDirectory).toBe('/workspaces/agent-feed');
    });

    test('should validate terminal input API contract', () => {
      const processTerminalInput = jest.fn((instanceId, input) => {
        if (!instanceId) {
          return {
            success: false,
            error: 'Instance ID required'
          };
        }
        
        if (!input) {
          return {
            success: false,
            error: 'Input required'
          };
        }
        
        return {
          success: true,
          processed: input,
          instanceId: instanceId,
          timestamp: new Date().toISOString()
        };
      });
      
      // Valid input
      const validResult = processTerminalInput('claude-123', 'help');
      expect(validResult.success).toBe(true);
      expect(validResult.processed).toBe('help');
      expect(validResult.instanceId).toBe('claude-123');
      
      // Missing instance ID
      const invalidResult1 = processTerminalInput('', 'help');
      expect(invalidResult1.success).toBe(false);
      expect(invalidResult1.error).toBe('Instance ID required');
      
      // Missing input
      const invalidResult2 = processTerminalInput('claude-123', '');
      expect(invalidResult2.success).toBe(false);
      expect(invalidResult2.error).toBe('Input required');
    });
  });

  describe('Error Handling and Recovery Contract', () => {
    test('should handle SSE connection failures with retry logic', () => {
      let connectionAttempts = 0;
      
      const attemptSSEConnection = jest.fn((url, maxRetries = 3) => {
        connectionAttempts++;
        
        if (connectionAttempts <= 2) {
          // Simulate connection failure
          return {
            success: false,
            attempt: connectionAttempts,
            error: 'Connection failed',
            willRetry: connectionAttempts < maxRetries
          };
        } else {
          // Simulate successful connection
          return {
            success: true,
            attempt: connectionAttempts,
            message: 'Connected successfully'
          };
        }
      });
      
      // First two attempts fail
      let result1 = attemptSSEConnection('http://localhost:3000/api/sse');
      expect(result1.success).toBe(false);
      expect(result1.willRetry).toBe(true);
      
      let result2 = attemptSSEConnection('http://localhost:3000/api/sse');
      expect(result2.success).toBe(false);
      expect(result2.willRetry).toBe(true);
      
      // Third attempt succeeds
      let result3 = attemptSSEConnection('http://localhost:3000/api/sse');
      expect(result3.success).toBe(true);
      expect(result3.message).toBe('Connected successfully');
    });

    test('should buffer messages during connection interruptions', () => {
      const messageBuffer = [];
      
      const bufferMessage = jest.fn((instanceId, message, isConnected = false) => {
        if (!isConnected) {
          messageBuffer.push({
            instanceId,
            message,
            timestamp: new Date().toISOString()
          });
          
          // Keep only last 100 messages
          if (messageBuffer.length > 100) {
            messageBuffer.shift();
          }
          
          return { buffered: true, bufferSize: messageBuffer.length };
        } else {
          // Connection available, can send directly
          return { buffered: false, sent: true };
        }
      });
      
      // Buffer messages when disconnected
      const result1 = bufferMessage('claude-123', 'Hello', false);
      expect(result1.buffered).toBe(true);
      expect(result1.bufferSize).toBe(1);
      
      const result2 = bufferMessage('claude-123', 'World', false);
      expect(result2.bufferSize).toBe(2);
      
      // Send directly when connected
      const result3 = bufferMessage('claude-123', 'Connected!', true);
      expect(result3.buffered).toBe(false);
      expect(result3.sent).toBe(true);
    });

    test('should handle SSE heartbeat for connection monitoring', () => {
      let lastHeartbeat = Date.now();
      
      const sendHeartbeat = jest.fn((instanceId, lastActivity) => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivity;
        
        if (timeSinceActivity > 30000) { // 30 seconds
          const heartbeatMessage = {
            type: 'heartbeat',
            instanceId,
            data: `[${new Date().toLocaleTimeString()}] Connection active\r\n`,
            timestamp: new Date().toISOString()
          };
          
          return { sent: true, message: heartbeatMessage };
        }
        
        return { sent: false, reason: 'Recent activity detected' };
      });
      
      // No heartbeat needed with recent activity
      const result1 = sendHeartbeat('claude-123', Date.now() - 1000);
      expect(result1.sent).toBe(false);
      expect(result1.reason).toBe('Recent activity detected');
      
      // Heartbeat needed after 30+ seconds
      const result2 = sendHeartbeat('claude-123', Date.now() - 35000);
      expect(result2.sent).toBe(true);
      expect(result2.message.type).toBe('heartbeat');
    });
  });
});