/**
 * TDD London School: Single Command Sending Tests
 * Focus: Verify WebSocket.send() called exactly once, no triple sending
 */

describe('Single Command Sending', () => {
  let mockWebSocket;
  let mockCommandBuffer;
  let commandSender;
  let mockSwarmCoordinator;

  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      readyState: 1, // WebSocket.OPEN
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    mockCommandBuffer = {
      add: jest.fn(),
      hasRecent: jest.fn().mockReturnValue(false),
      clear: jest.fn()
    };

    mockSwarmCoordinator = {
      beforeCommandSend: jest.fn().mockResolvedValue(true),
      afterCommandSend: jest.fn()
    };

    global.WebSocket = jest.fn().mockReturnValue(mockWebSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Send Guarantee', () => {
    it('should send command exactly once', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer);
      
      const command = 'test command';
      await commandSender.send(command);
      
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ command, timestamp: expect.any(Number) })
      );
    });

    it('should prevent duplicate sends within debounce window', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer);
      mockCommandBuffer.hasRecent.mockReturnValue(true);
      
      const command = 'duplicate command';
      const result = await commandSender.send(command);
      
      expect(result).toBe(false);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should verify command buffer interaction before sending', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer);
      
      const command = 'buffered command';
      await commandSender.send(command);
      
      // Verify interaction sequence
      expect(mockCommandBuffer.hasRecent).toHaveBeenCalledWith(command);
      expect(mockCommandBuffer.add).toHaveBeenCalledWith(command);
      expect(mockWebSocket.send).toHaveBeenCalledAfter(mockCommandBuffer.hasRecent);
    });
  });

  describe('Rate Limiting Behavior', () => {
    it('should respect rate limiting configuration', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      const rateLimiter = {
        canSend: jest.fn().mockReturnValue(false),
        recordSend: jest.fn()
      };
      
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer, rateLimiter);
      
      const command = 'rate limited command';
      const result = await commandSender.send(command);
      
      expect(result).toBe(false);
      expect(rateLimiter.canSend).toHaveBeenCalledWith(command);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should record successful sends in rate limiter', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      const rateLimiter = {
        canSend: jest.fn().mockReturnValue(true),
        recordSend: jest.fn()
      };
      
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer, rateLimiter);
      
      const command = 'allowed command';
      await commandSender.send(command);
      
      expect(rateLimiter.recordSend).toHaveBeenCalledWith(command);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling in Send Process', () => {
    it('should handle WebSocket send failures gracefully', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer);
      
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await commandSender.send('failing command');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send command')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not retry failed sends automatically', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer);
      
      mockWebSocket.send
        .mockImplementationOnce(() => { throw new Error('First failure'); })
        .mockImplementationOnce(() => { throw new Error('Second failure'); });
      
      const result = await commandSender.send('retry test');
      
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });
  });

  describe('Swarm Coordination for Command Sending', () => {
    it('should coordinate with swarm before sending command', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer);
      commandSender.setSwarmCoordinator(mockSwarmCoordinator);
      
      const command = 'swarm coordinated command';
      await commandSender.send(command);
      
      expect(mockSwarmCoordinator.beforeCommandSend).toHaveBeenCalledWith({
        command,
        timestamp: expect.any(Number)
      });
    });

    it('should not send if swarm coordination fails', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer);
      commandSender.setSwarmCoordinator(mockSwarmCoordinator);
      
      mockSwarmCoordinator.beforeCommandSend.mockResolvedValue(false);
      
      const result = await commandSender.send('blocked command');
      
      expect(result).toBe(false);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should notify swarm after successful send', async () => {
      const CommandSender = require('../../../../src/input/CommandSender');
      commandSender = new CommandSender(mockWebSocket, mockCommandBuffer);
      commandSender.setSwarmCoordinator(mockSwarmCoordinator);
      
      const command = 'successful command';
      await commandSender.send(command);
      
      expect(mockSwarmCoordinator.afterCommandSend).toHaveBeenCalledWith({
        command,
        success: true,
        timestamp: expect.any(Number)
      });
    });
  });
});