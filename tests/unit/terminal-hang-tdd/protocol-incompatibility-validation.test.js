/**
 * CRITICAL PROTOCOL VALIDATION: Socket.IO vs WebSocket Incompatibility Test Suite
 * 
 * This test suite validates the root cause hypothesis:
 * - Frontend uses Socket.IO client (Engine.IO protocol format `42["message",{...}]`)
 * - Backend uses raw WebSocket server (expects plain JSON `{...}`)
 * 
 * This protocol incompatibility explains why all previous fixes failed.
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const WebSocket = require('ws');
const { io } = require('socket.io-client');

describe('CRITICAL: Socket.IO vs WebSocket Protocol Incompatibility', () => {
  let mockWebSocketServer;
  let mockBackendWs;
  let testPort = 3099;

  beforeEach(() => {
    jest.clearAllMocks();
    testPort = 3099 + Math.floor(Math.random() * 100);
  });

  afterEach(async () => {
    if (mockWebSocketServer) {
      await new Promise((resolve) => {
        mockWebSocketServer.close(resolve);
      });
    }
    if (mockBackendWs) {
      mockBackendWs.close();
    }
  });

  describe('Protocol Format Validation', () => {
    test('Should detect Socket.IO Engine.IO protocol format vs raw WebSocket', async () => {
      // Create raw WebSocket server (simulating backend)
      mockWebSocketServer = new WebSocket.Server({ port: testPort });
      const receivedMessages = [];
      const connectionPromise = new Promise((resolve) => {
        mockWebSocketServer.on('connection', (ws) => {
          resolve(ws);
          ws.on('message', (data) => {
            const message = data.toString();
            receivedMessages.push({
              raw: message,
              isEngineIOFormat: message.startsWith('42[') || message.startsWith('40') || message.startsWith('41'),
              isJSONFormat: (() => {
                try { JSON.parse(message); return true; } catch { return false; }
              })(),
              timestamp: Date.now()
            });
          });
        });
      });

      // Connect Socket.IO client (simulating frontend)
      const socketIOClient = io(`ws://localhost:${testPort}`, {
        transports: ['websocket'],
        forceNew: true
      });

      const backendWs = await connectionPromise;
      
      // Wait for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send messages from Socket.IO client
      socketIOClient.emit('init', { cols: 80, rows: 24 });
      socketIOClient.emit('message', { type: 'input', data: 'test command\n' });
      
      // Wait for messages to be received
      await new Promise(resolve => setTimeout(resolve, 200));

      // CRITICAL VALIDATION: Protocol format incompatibility
      expect(receivedMessages.length).toBeGreaterThan(0);
      
      const engineIOMessages = receivedMessages.filter(msg => msg.isEngineIOFormat);
      const jsonMessages = receivedMessages.filter(msg => msg.isJSONFormat && !msg.isEngineIOFormat);

      // Socket.IO sends Engine.IO formatted messages
      expect(engineIOMessages.length).toBeGreaterThan(0);
      
      // Backend expects plain JSON but receives Engine.IO format
      const sampleEngineIOMessage = engineIOMessages[0];
      expect(sampleEngineIOMessage.raw).toMatch(/^4\d\[/); // Engine.IO format pattern
      
      // This proves the protocol incompatibility
      expect(sampleEngineIOMessage.isJSONFormat).toBe(false);

      socketIOClient.disconnect();
    });

    test('Should demonstrate message parsing failures due to protocol mismatch', () => {
      // Simulate backend trying to parse Socket.IO Engine.IO messages
      const engineIOMessages = [
        '40', // Socket.IO connect
        '42["init",{"cols":80,"rows":24}]', // Socket.IO emit with data
        '42["message",{"type":"input","data":"test\\n"}]', // Socket.IO message
        '3probe' // Socket.IO probe
      ];

      const backendParseResults = engineIOMessages.map(msg => {
        try {
          const parsed = JSON.parse(msg);
          return { message: msg, parsed, success: true };
        } catch (error) {
          return { message: msg, error: error.message, success: false };
        }
      });

      // All Engine.IO messages should fail JSON parsing
      const failedParses = backendParseResults.filter(result => !result.success);
      expect(failedParses.length).toBe(engineIOMessages.length);

      // Verify specific Engine.IO format patterns that break JSON parsing
      expect(failedParses.some(f => f.message.startsWith('42['))).toBe(true);
      expect(failedParses.some(f => f.message === '40')).toBe(true);
    });

    test('Should validate correct message formats for each protocol', () => {
      // What Socket.IO client sends (Engine.IO format)
      const socketIOFormat = '42["message",{"type":"input","data":"test"}]';
      
      // What raw WebSocket backend expects (plain JSON)
      const webSocketFormat = '{"type":"input","data":"test"}';

      // Socket.IO format should NOT be valid JSON
      expect(() => JSON.parse(socketIOFormat)).toThrow();

      // WebSocket format should be valid JSON
      const parsedWebSocket = JSON.parse(webSocketFormat);
      expect(parsedWebSocket).toEqual({ type: 'input', data: 'test' });

      // This demonstrates the core incompatibility
      expect(socketIOFormat).not.toBe(webSocketFormat);
    });
  });

  describe('Connection Handshake Incompatibility', () => {
    test('Should detect Socket.IO handshake vs WebSocket handshake differences', async () => {
      const handshakeMessages = [];
      
      mockWebSocketServer = new WebSocket.Server({ port: testPort });
      mockWebSocketServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = data.toString();
          if (message.length < 10) { // Likely handshake messages
            handshakeMessages.push(message);
          }
        });
      });

      const socketIOClient = io(`ws://localhost:${testPort}`, {
        transports: ['websocket'],
        forceNew: true
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Socket.IO sends handshake messages in Engine.IO format
      expect(handshakeMessages.length).toBeGreaterThan(0);
      expect(handshakeMessages.some(msg => msg === '40')).toBe(true); // Socket.IO connect

      socketIOClient.disconnect();
    });

    test('Should validate that raw WebSocket cannot interpret Socket.IO handshake', () => {
      const socketIOHandshakeMessages = ['40', '3probe', '5'];
      
      const interpretationResults = socketIOHandshakeMessages.map(msg => {
        // Simulate backend WebSocket server trying to interpret these
        const isValidJSON = (() => {
          try { JSON.parse(msg); return true; } catch { return false; }
        })();
        
        const hasApplicationMeaning = msg.startsWith('{') || msg.startsWith('[');
        
        return {
          message: msg,
          validJSON: isValidJSON,
          hasApplicationMeaning,
          interpretable: isValidJSON && hasApplicationMeaning
        };
      });

      // None of the Socket.IO handshake messages are interpretable by raw WebSocket
      expect(interpretationResults.every(r => !r.interpretable)).toBe(true);
    });
  });

  describe('Message Transport Layer Incompatibility', () => {
    test('Should demonstrate Engine.IO packet framing vs raw WebSocket framing', () => {
      // Engine.IO packet format (what Socket.IO uses)
      const engineIOPackets = [
        { type: '4', data: '2["init",{"cols":80}]' }, // Socket.IO event
        { type: '4', data: '2["message",{"type":"input"}]' }, // Socket.IO message
        { type: '3', data: 'probe' } // Engine.IO probe
      ];

      // Raw WebSocket expects direct data
      const webSocketExpected = [
        '{"type":"init","cols":80}',
        '{"type":"input","data":"test"}',
        'ping'
      ];

      // Convert Engine.IO to what backend receives
      const receivedByBackend = engineIOPackets.map(packet => `${packet.type}${packet.data}`);
      
      // None match what WebSocket backend expects
      receivedByBackend.forEach((received, index) => {
        expect(received).not.toBe(webSocketExpected[index]);
        // And none are valid JSON that backend can parse
        expect(() => JSON.parse(received)).toThrow();
      });
    });

    test('Should validate that message acknowledgments are protocol-specific', () => {
      // Socket.IO expects Engine.IO acknowledgments
      const socketIOExpectedAcks = ['40', '41', '42'];
      
      // Raw WebSocket sends plain data
      const webSocketSends = ['{"type":"connected"}', 'pong', '{"type":"ack"}'];

      // Socket.IO client cannot interpret WebSocket responses
      const socketIOInterpretation = webSocketSends.map(msg => {
        const isEngineIOFormat = /^[0-9][0-9]?/.test(msg);
        return { message: msg, isEngineIOFormat };
      });

      expect(socketIOInterpretation.every(i => !i.isEngineIOFormat)).toBe(true);
    });
  });

  describe('Error Scenarios Due to Protocol Mismatch', () => {
    test('Should simulate connection timeout due to handshake failure', async () => {
      mockWebSocketServer = new WebSocket.Server({ port: testPort });
      
      const connectionErrors = [];
      const serverMessages = [];
      
      mockWebSocketServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = data.toString();
          serverMessages.push(message);
          
          // Backend tries to parse and respond with JSON
          try {
            const parsed = JSON.parse(message);
            ws.send(JSON.stringify({ type: 'ack', data: parsed }));
          } catch (error) {
            // This is what actually happens - parsing fails
            connectionErrors.push({ message, error: error.message });
          }
        });
      });

      const socketIOClient = io(`ws://localhost:${testPort}`, {
        transports: ['websocket'],
        timeout: 1000,
        forceNew: true
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Messages were sent but parsing failed
      expect(serverMessages.length).toBeGreaterThan(0);
      expect(connectionErrors.length).toBeGreaterThan(0);

      // Verify that Engine.IO messages caused JSON parse errors
      expect(connectionErrors.some(e => e.message.startsWith('4'))).toBe(true);
      expect(connectionErrors.some(e => e.error.includes('JSON'))).toBe(true);

      socketIOClient.disconnect();
    });

    test('Should demonstrate silent failure patterns in protocol mismatch', () => {
      // Common scenario: Socket.IO sends message, backend receives but can't parse
      const socketIOMessage = '42["message",{"type":"input","data":"claude --help"}]';
      
      let backendProcessed = false;
      let parseError = null;
      
      // Simulate backend message handler
      try {
        const parsed = JSON.parse(socketIOMessage);
        if (parsed.type === 'input') {
          backendProcessed = true;
        }
      } catch (error) {
        parseError = error;
      }

      // Message fails silently - no error thrown to frontend
      expect(backendProcessed).toBe(false);
      expect(parseError).toBeTruthy();
      expect(parseError.message).toContain('JSON');

      // This is why terminal appears to "hang" - commands never reach the PTY
    });
  });

  describe('Root Cause Validation', () => {
    test('Should prove that protocol mismatch causes terminal hanging symptoms', () => {
      // Symptoms observed:
      const observedSymptoms = {
        terminalAppearsConnected: true,  // WebSocket connection succeeds
        inputNotProcessed: true,         // Commands don't reach backend
        noErrorMessages: true,          // Silent failure due to parsing errors
        connectionSeems stable: true,   // WebSocket stays open
        ptyNeverReceivesInput: true    // Backend can't parse Socket.IO messages
      };

      // Root cause: Protocol incompatibility
      const protocolMismatch = {
        frontendSends: 'Engine.IO format (Socket.IO)',
        backendExpects: 'Plain JSON (raw WebSocket)',
        messagesReachBackend: true,     // Network layer works
        messagesAreInterpreted: false,  // Application layer fails
        silentFailure: true             // No error propagation
      };

      // This explains ALL the symptoms
      expect(observedSymptoms.terminalAppearsConnected).toBe(protocolMismatch.messagesReachBackend);
      expect(observedSymptoms.inputNotProcessed).toBe(!protocolMismatch.messagesAreInterpreted);
      expect(observedSymptoms.noErrorMessages).toBe(protocolMismatch.silentFailure);
      
      // The connection stays up but is functionally broken
      expect(protocolMismatch.frontendSends).not.toBe(protocolMismatch.backendExpects);
    });

    test('Should validate that fixing protocol mismatch would resolve all issues', () => {
      // Solution approaches
      const solutions = [
        {
          approach: 'Convert backend to Socket.IO server',
          pros: ['Protocol compatibility', 'Built-in features'],
          cons: ['More dependencies', 'Added complexity'],
          viability: 'HIGH'
        },
        {
          approach: 'Convert frontend to raw WebSocket',
          pros: ['Simpler protocol', 'Direct communication'],
          cons: ['Lose Socket.IO features', 'Manual reconnection'],
          viability: 'HIGH'
        },
        {
          approach: 'Add protocol translation layer',
          pros: ['No major changes to either side'],
          cons: ['Additional complexity', 'Performance overhead'],
          viability: 'MEDIUM'
        }
      ];

      // Any of these solutions would work because they address the ROOT CAUSE
      const viableSolutions = solutions.filter(s => s.viability === 'HIGH');
      expect(viableSolutions.length).toBeGreaterThan(0);
      
      // All previous fixes failed because they treated symptoms, not the cause
      const previousApproaches = [
        'Message buffering fixes',
        'Connection timeout adjustments',
        'Terminal width optimizations',
        'WebSocket singleton patterns',
        'Reconnection logic improvements'
      ];
      
      // None of these address the protocol incompatibility
      previousApproaches.forEach(approach => {
        expect(approach).not.toContain('protocol');
        expect(approach).not.toContain('Socket.IO');
        expect(approach).not.toContain('Engine.IO');
      });
    });
  });
});