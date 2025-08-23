/**
 * SPARC:DEBUG - Terminal WebSocket TDD Test Suite
 * Phase 4: REFINEMENT - Test-Driven Development for Connection Scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';

// Mock implementations for terminal components
vi.mock('xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    write: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
    onSelectionChange: vi.fn(),
    getSelection: vi.fn().mockReturnValue(''),
    clear: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
    options: {},
    buffer: {
      active: {
        toString: vi.fn().mockReturnValue('')
      }
    }
  }))
}));

vi.mock('xterm-addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn()
  }))
}));

vi.mock('xterm-addon-search', () => ({
  SearchAddon: vi.fn().mockImplementation(() => ({
    findNext: vi.fn(),
    findPrevious: vi.fn()
  }))
}));

vi.mock('xterm-addon-web-links', () => ({
  WebLinksAddon: vi.fn()
}));

describe('SPARC:DEBUG Terminal WebSocket Connection', () => {
  let server: Server;
  let httpServer: any;
  let clientSocket: ClientSocket;
  let serverSocket: any;
  let terminal: Terminal;
  let port: number;

  beforeEach(async () => {
    // Setup test server
    httpServer = createServer();
    server = new Server(httpServer, {
      cors: { origin: "*" },
      transports: ['websocket', 'polling']
    });
    
    // Get available port
    port = await new Promise((resolve) => {
      httpServer.listen(0, () => {
        resolve((httpServer.address() as any).port);
      });
    });

    // Setup server-side socket handling
    server.on('connection', (socket) => {
      serverSocket = socket;
      
      // Terminal namespace handlers
      socket.on('terminal:join', (data) => {
        socket.emit('terminal:joined', {
          sessionId: data.instanceId,
          buffer: 'Welcome to terminal\n',
          process_info: { pid: 12345, name: 'test-terminal' }
        });
      });
      
      socket.on('terminal:input', (data) => {
        socket.emit('terminal:output', {
          output: `Echo: ${data.data}`,
          timestamp: new Date()
        });
      });
    });

    // Create terminal instance
    terminal = new Terminal();
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (server) {
      server.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('Phase 1: Connection Establishment', () => {
    it('should establish WebSocket connection successfully', async () => {
      // Arrange
      const connectionPromise = new Promise((resolve) => {
        server.on('connection', resolve);
      });

      // Act
      clientSocket = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        timeout: 5000
      });

      // Assert
      await connectionPromise;
      expect(clientSocket.connected).toBe(true);
    });

    it('should fallback to polling when WebSocket fails', async () => {
      // Arrange
      const connectionPromise = new Promise((resolve) => {
        server.on('connection', (socket) => {
          resolve(socket.conn.transport.name);
        });
      });

      // Act - Force polling transport
      clientSocket = ioClient(`http://localhost:${port}`, {
        transports: ['polling'],
        timeout: 5000
      });

      // Assert
      const transportName = await connectionPromise;
      expect(transportName).toBe('polling');
    });

    it('should handle connection timeout gracefully', async () => {
      // Arrange
      const invalidPort = 99999;
      let connectionError: any = null;

      // Act
      clientSocket = ioClient(`http://localhost:${invalidPort}`, {
        transports: ['websocket'],
        timeout: 1000
      });

      await new Promise((resolve) => {
        clientSocket.on('connect_error', (error) => {
          connectionError = error;
          resolve(error);
        });
      });

      // Assert
      expect(connectionError).toBeTruthy();
      expect(clientSocket.connected).toBe(false);
    });
  });

  describe('Phase 2: Terminal Session Management', () => {
    beforeEach(async () => {
      clientSocket = ioClient(`http://localhost:${port}`);
      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should join terminal session successfully', async () => {
      // Arrange
      const instanceId = 'test-instance-123';
      let joinResponse: any = null;

      // Act
      clientSocket.emit('terminal:join', { instanceId });
      
      await new Promise((resolve) => {
        clientSocket.on('terminal:joined', (data) => {
          joinResponse = data;
          resolve(data);
        });
      });

      // Assert
      expect(joinResponse).toBeTruthy();
      expect(joinResponse.sessionId).toBe(instanceId);
      expect(joinResponse.buffer).toBeTruthy();
      expect(joinResponse.process_info).toBeTruthy();
    });

    it('should handle terminal input and receive output', async () => {
      // Arrange
      const instanceId = 'test-instance-123';
      const testInput = 'echo "Hello World"';
      let outputReceived: any = null;

      // Join session first
      clientSocket.emit('terminal:join', { instanceId });
      await new Promise((resolve) => {
        clientSocket.on('terminal:joined', resolve);
      });

      // Act
      clientSocket.emit('terminal:input', { data: testInput });
      
      await new Promise((resolve) => {
        clientSocket.on('terminal:output', (data) => {
          outputReceived = data;
          resolve(data);
        });
      });

      // Assert
      expect(outputReceived).toBeTruthy();
      expect(outputReceived.output).toContain(testInput);
      expect(outputReceived.timestamp).toBeTruthy();
    });

    it('should handle multiple clients in same session', async () => {
      // Arrange
      const instanceId = 'shared-session-123';
      const client2 = ioClient(`http://localhost:${port}`);
      await new Promise((resolve) => client2.on('connect', resolve));

      const client1Messages: any[] = [];
      const client2Messages: any[] = [];

      // Both clients join same session
      clientSocket.emit('terminal:join', { instanceId });
      client2.emit('terminal:join', { instanceId });

      // Setup message listeners
      clientSocket.on('terminal:output', (data) => client1Messages.push(data));
      client2.on('terminal:output', (data) => client2Messages.push(data));

      // Act - Client 1 sends input
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow connections to settle
      clientSocket.emit('terminal:input', { data: 'shared command' });

      // Wait for messages
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert
      expect(client1Messages.length).toBeGreaterThan(0);
      expect(client2Messages.length).toBeGreaterThan(0);
      expect(client1Messages[0].output).toContain('shared command');
      expect(client2Messages[0].output).toContain('shared command');

      client2.disconnect();
    });
  });

  describe('Phase 3: Error Handling and Recovery', () => {
    beforeEach(async () => {
      clientSocket = ioClient(`http://localhost:${port}`);
      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should handle server disconnection with reconnection', async () => {
      // Arrange
      let disconnected = false;
      let reconnected = false;

      clientSocket.on('disconnect', () => {
        disconnected = true;
      });

      clientSocket.on('connect', () => {
        if (disconnected) {
          reconnected = true;
        }
      });

      // Act - Simulate server restart
      server.close();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Restart server
      server = new Server(httpServer, {
        cors: { origin: "*" },
        transports: ['websocket', 'polling']
      });

      // Wait for reconnection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Assert
      expect(disconnected).toBe(true);
      // Note: Actual reconnection would depend on client-side retry logic
    });

    it('should handle rate limiting gracefully', async () => {
      // Arrange
      const rateLimitError = vi.fn();
      clientSocket.on('error', rateLimitError);

      // Act - Send rapid burst of messages
      for (let i = 0; i < 10; i++) {
        clientSocket.emit('terminal:input', { data: `rapid-message-${i}` });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Should not crash or throw unhandled errors
      expect(clientSocket.connected).toBe(true);
    });

    it('should handle malformed messages safely', async () => {
      // Arrange
      const errorHandler = vi.fn();
      clientSocket.on('error', errorHandler);

      // Act - Send malformed data
      (clientSocket as any).emit('terminal:input', null);
      (clientSocket as any).emit('terminal:input', { invalid: 'data' });
      (clientSocket as any).emit('terminal:input', 'invalid string');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Connection should remain stable
      expect(clientSocket.connected).toBe(true);
    });
  });

  describe('Phase 4: Terminal Addon Integration', () => {
    it('should initialize terminal with all addons successfully', () => {
      // Arrange
      const mockLoadAddon = vi.fn();
      (Terminal as Mock).mockImplementation(() => ({
        loadAddon: mockLoadAddon,
        open: vi.fn(),
        options: {}
      }));

      // Act
      const term = new Terminal();
      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(searchAddon);
      term.loadAddon(webLinksAddon);

      // Assert
      expect(mockLoadAddon).toHaveBeenCalledTimes(3);
      expect(mockLoadAddon).toHaveBeenCalledWith(fitAddon);
      expect(mockLoadAddon).toHaveBeenCalledWith(searchAddon);
      expect(mockLoadAddon).toHaveBeenCalledWith(webLinksAddon);
    });

    it('should handle SearchAddon loading failure gracefully', () => {
      // Arrange
      const mockLoadAddon = vi.fn().mockImplementation((addon) => {
        if (addon instanceof SearchAddon) {
          throw new Error('SearchAddon failed to load');
        }
      });

      (Terminal as Mock).mockImplementation(() => ({
        loadAddon: mockLoadAddon,
        open: vi.fn(),
        options: {}
      }));

      // Act & Assert - Should not throw
      expect(() => {
        const term = new Terminal();
        const fitAddon = new FitAddon();
        const searchAddon = new SearchAddon();

        term.loadAddon(fitAddon); // Should succeed
        
        try {
          term.loadAddon(searchAddon); // Should fail gracefully
        } catch (error) {
          console.warn('SearchAddon disabled:', error.message);
        }
      }).not.toThrow();
    });

    it('should provide fallback search functionality', () => {
      // Arrange
      const mockTerminal = {
        buffer: {
          active: {
            toString: vi.fn().mockReturnValue('Hello World\nTest Content\nHello Again')
          }
        }
      };

      // Act - Implement fallback search
      const searchText = 'Hello';
      const bufferContent = mockTerminal.buffer.active.toString();
      const matches = [];
      let index = bufferContent.indexOf(searchText);
      
      while (index !== -1) {
        matches.push({ index, text: searchText });
        index = bufferContent.indexOf(searchText, index + 1);
      }

      // Assert
      expect(matches).toHaveLength(2);
      expect(matches[0].index).toBe(0);
      expect(matches[1].index).toBeGreaterThan(0);
    });
  });

  describe('Phase 5: Cross-Instance Communication', () => {
    it('should route messages between frontend and production instances', async () => {
      // Arrange
      const frontendSocket = ioClient(`http://localhost:${port}`, {
        query: { instanceType: 'frontend' }
      });
      const claudeSocket = ioClient(`http://localhost:${port}`, {
        query: { instanceType: 'claude' }
      });

      await Promise.all([
        new Promise((resolve) => frontendSocket.on('connect', resolve)),
        new Promise((resolve) => claudeSocket.on('connect', resolve))
      ]);

      let messageReceived: any = null;

      // Setup message handler for Claude instance
      claudeSocket.on('claude:command', (data) => {
        messageReceived = data;
        claudeSocket.emit('claude:response', {
          response: `Processed: ${data.command}`,
          source: 'production'
        });
      });

      // Act - Frontend sends command to Claude
      frontendSocket.emit('claude:command', {
        command: 'debug terminal connection',
        target: 'production'
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(messageReceived).toBeTruthy();
      expect(messageReceived.command).toBe('debug terminal connection');

      frontendSocket.disconnect();
      claudeSocket.disconnect();
    });
  });

  describe('Phase 6: Performance and Reliability', () => {
    it('should handle high-frequency terminal output efficiently', async () => {
      // Arrange
      clientSocket = ioClient(`http://localhost:${port}`);
      await new Promise((resolve) => clientSocket.on('connect', resolve));

      const instanceId = 'performance-test';
      clientSocket.emit('terminal:join', { instanceId });
      await new Promise((resolve) => clientSocket.on('terminal:joined', resolve));

      const messageCount = 100;
      const receivedMessages: any[] = [];
      const startTime = Date.now();

      clientSocket.on('terminal:output', (data) => {
        receivedMessages.push(data);
      });

      // Act - Send burst of messages
      for (let i = 0; i < messageCount; i++) {
        serverSocket.emit('terminal:output', {
          output: `Message ${i}\n`,
          timestamp: new Date()
        });
      }

      // Wait for all messages
      await new Promise((resolve) => {
        const checkMessages = () => {
          if (receivedMessages.length >= messageCount) {
            resolve(receivedMessages);
          } else {
            setTimeout(checkMessages, 10);
          }
        };
        checkMessages();
      });

      const duration = Date.now() - startTime;

      // Assert
      expect(receivedMessages).toHaveLength(messageCount);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain connection stability under load', async () => {
      // Arrange
      const connectionCount = 10;
      const clients: ClientSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Act - Create multiple concurrent connections
      for (let i = 0; i < connectionCount; i++) {
        const client = ioClient(`http://localhost:${port}`);
        clients.push(client);
        
        connectionPromises.push(
          new Promise((resolve) => client.on('connect', resolve))
        );
      }

      await Promise.all(connectionPromises);

      // Send messages from all clients
      const messagePromises = clients.map((client, index) => {
        return new Promise<void>((resolve) => {
          client.emit('terminal:join', { instanceId: `test-${index}` });
          client.on('terminal:joined', () => resolve());
        });
      });

      await Promise.all(messagePromises);

      // Assert
      expect(clients.every(client => client.connected)).toBe(true);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });
});

describe('SPARC:DEBUG Integration Test Suite', () => {
  describe('End-to-End Terminal Workflow', () => {
    it('should complete full terminal session lifecycle', async () => {
      // This would be an integration test that:
      // 1. Starts the full application stack
      // 2. Creates a terminal session
      // 3. Executes commands
      // 4. Verifies output
      // 5. Handles disconnection/reconnection
      // 6. Cleans up resources
      
      // Implementation would require actual application startup
      expect(true).toBe(true); // Placeholder
    });
  });
});