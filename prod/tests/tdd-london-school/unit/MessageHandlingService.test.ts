/**
 * Message Handling Service Unit Tests
 * London School TDD - Testing message processing with behavior verification
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { ClaudeProcessManagerMock } from '../mocks/ClaudeProcessManagerMock';

// Mock message queue for async processing
class MessageQueueMock {
  public enqueue = jest.fn();
  public dequeue = jest.fn();
  public size = jest.fn();
  public clear = jest.fn();
}

// Mock output parser for Claude responses
class ClaudeOutputParserMock {
  public parseToolUse = jest.fn();
  public parseFileOperations = jest.fn();
  public parseErrorMessages = jest.fn();
  public extractStructuredData = jest.fn();
}

// Mock validation service
class MessageValidatorMock {
  public validateInput = jest.fn();
  public sanitizeMessage = jest.fn();
  public checkPermissions = jest.fn();
  public validateFileOperation = jest.fn();
}

// Mock metrics collector
class MetricsCollectorMock {
  public recordMessageSent = jest.fn();
  public recordMessageProcessed = jest.fn();
  public recordError = jest.fn();
  public recordProcessingTime = jest.fn();
}

// Subject under test - Message Handling Service
class MessageHandlingService {
  private claudeManager: any;
  private messageQueue: any;
  private outputParser: any;
  private validator: any;
  private metrics: any;
  private logger: any;
  private activeStreams: Map<string, any> = new Map();

  constructor(
    claudeManager: any,
    messageQueue: any,
    outputParser: any,
    validator: any,
    metrics: any,
    logger: any
  ) {
    this.claudeManager = claudeManager;
    this.messageQueue = messageQueue;
    this.outputParser = outputParser;
    this.validator = validator;
    this.metrics = metrics;
    this.logger = logger;
  }

  async processMessage(instanceId: string, message: string, options: any = {}): Promise<{
    messageId: string;
    processed: boolean;
    requiresPermission?: boolean;
    validationErrors?: string[];
  }> {
    const startTime = Date.now();

    try {
      this.logger.info(`Processing message for instance ${instanceId}`);

      // Step 1: Validate input message
      const validation = await this.validator.validateInput(message, options);
      if (!validation.valid) {
        this.metrics.recordError('validation_failed', instanceId);
        return {
          messageId: '',
          processed: false,
          validationErrors: validation.errors
        };
      }

      // Step 2: Sanitize message
      const sanitizedMessage = await this.validator.sanitizeMessage(message);

      // Step 3: Check permissions
      const permissionCheck = await this.validator.checkPermissions(
        instanceId,
        sanitizedMessage,
        options.userId
      );
      if (!permissionCheck.allowed) {
        return {
          messageId: '',
          processed: false,
          requiresPermission: true
        };
      }

      // Step 4: Send to Claude instance
      const response = await this.claudeManager.sendInput(instanceId, sanitizedMessage);

      // Step 5: Start output processing
      await this.startOutputProcessing(instanceId, response.messageId);

      // Step 6: Record metrics
      const processingTime = Date.now() - startTime;
      this.metrics.recordMessageSent(instanceId, response.messageId, processingTime);

      this.logger.info(`Message processed successfully: ${response.messageId}`);

      return {
        messageId: response.messageId,
        processed: true
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Message processing failed: ${error.message}`);
      this.metrics.recordError('processing_failed', instanceId, processingTime);
      throw error;
    }
  }

  async processFileOperationRequest(
    instanceId: string,
    operation: 'create' | 'update' | 'delete',
    path: string,
    content?: string
  ): Promise<{
    success: boolean;
    requiresPermission?: boolean;
    error?: string;
  }> {
    try {
      this.logger.info(`Processing file operation: ${operation} ${path} for instance ${instanceId}`);

      // Step 1: Validate file operation
      const validation = await this.validator.validateFileOperation(operation, path, content);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Step 2: Execute file operation through Claude
      const result = await this.claudeManager.requestFileCreation(instanceId, {
        path,
        content,
        operation
      });

      this.logger.info(`File operation ${operation} completed: ${result.success}`);

      return {
        success: result.success,
        requiresPermission: result.requiresPermission,
        error: result.error
      };

    } catch (error: any) {
      this.logger.error(`File operation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async startOutputProcessing(instanceId: string, messageId: string): Promise<void> {
    this.logger.debug(`Starting output processing for message ${messageId}`);

    try {
      // Get output stream from Claude
      const outputStream = this.claudeManager.streamOutput(instanceId);
      this.activeStreams.set(messageId, outputStream);

      // Process output chunks asynchronously
      this.processOutputStream(instanceId, messageId, outputStream);

    } catch (error: any) {
      this.logger.error(`Failed to start output processing: ${error.message}`);
      this.metrics.recordError('output_processing_failed', instanceId);
    }
  }

  private async processOutputStream(instanceId: string, messageId: string, outputStream: any): Promise<void> {
    try {
      for await (const chunk of outputStream) {
        await this.processOutputChunk(instanceId, messageId, chunk);
      }

      this.logger.debug(`Output processing completed for message ${messageId}`);
      this.metrics.recordMessageProcessed(instanceId, messageId);
      this.activeStreams.delete(messageId);

    } catch (error: any) {
      this.logger.error(`Output processing error: ${error.message}`);
      this.metrics.recordError('output_stream_error', instanceId);
    }
  }

  private async processOutputChunk(instanceId: string, messageId: string, chunk: any): Promise<void> {
    this.logger.debug(`Processing output chunk: ${chunk.type}`);

    try {
      switch (chunk.type) {
        case 'tool_use':
          const toolUse = await this.outputParser.parseToolUse(chunk.content);
          await this.handleToolUse(instanceId, messageId, toolUse);
          break;

        case 'completion':
          const completion = await this.outputParser.extractStructuredData(chunk.content);
          await this.handleCompletion(instanceId, messageId, completion);
          break;

        case 'stderr':
          const error = await this.outputParser.parseErrorMessages(chunk.content);
          await this.handleError(instanceId, messageId, error);
          break;

        default:
          this.logger.debug(`Unhandled chunk type: ${chunk.type}`);
      }

    } catch (error: any) {
      this.logger.error(`Chunk processing error: ${error.message}`);
    }
  }

  private async handleToolUse(instanceId: string, messageId: string, toolUse: any): Promise<void> {
    this.logger.info(`Tool use detected: ${toolUse.tool} for message ${messageId}`);

    if (toolUse.tool === 'file_create' || toolUse.tool === 'write') {
      const fileOps = await this.outputParser.parseFileOperations(toolUse.content);

      for (const fileOp of fileOps) {
        await this.processFileOperationRequest(
          instanceId,
          'create',
          fileOp.path,
          fileOp.content
        );
      }
    }
  }

  private async handleCompletion(instanceId: string, messageId: string, completion: any): Promise<void> {
    this.logger.info(`Message completed: ${messageId}`);
    // Add to message queue for further processing if needed
    await this.messageQueue.enqueue({
      type: 'completion',
      instanceId,
      messageId,
      data: completion,
      timestamp: new Date()
    });
  }

  private async handleError(instanceId: string, messageId: string, error: any): Promise<void> {
    this.logger.warn(`Claude error for message ${messageId}: ${error.message}`);
    this.metrics.recordError('claude_error', instanceId);
  }

  async getMessageHistory(instanceId: string, limit: number = 50): Promise<any[]> {
    try {
      this.logger.debug(`Retrieving message history for instance ${instanceId}`);
      return await this.claudeManager.getMessageHistory(instanceId, limit);
    } catch (error: any) {
      this.logger.error(`Failed to get message history: ${error.message}`);
      throw error;
    }
  }

  stopOutputProcessing(messageId: string): void {
    const stream = this.activeStreams.get(messageId);
    if (stream && stream.destroy) {
      stream.destroy();
      this.activeStreams.delete(messageId);
      this.logger.debug(`Stopped output processing for message ${messageId}`);
    }
  }

  getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }
}

describe('MessageHandlingService', () => {
  let service: MessageHandlingService;
  let mockClaudeManager: ClaudeProcessManagerMock;
  let mockMessageQueue: MessageQueueMock;
  let mockOutputParser: ClaudeOutputParserMock;
  let mockValidator: MessageValidatorMock;
  let mockMetrics: MetricsCollectorMock;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClaudeManager = new ClaudeProcessManagerMock();
    mockMessageQueue = new MessageQueueMock();
    mockOutputParser = new ClaudeOutputParserMock();
    mockValidator = new MessageValidatorMock();
    mockMetrics = new MetricsCollectorMock();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };

    service = new MessageHandlingService(
      mockClaudeManager,
      mockMessageQueue,
      mockOutputParser,
      mockValidator,
      mockMetrics,
      mockLogger
    );

    // Setup default mock behaviors
    setupDefaultMockBehaviors();
  });

  function setupDefaultMockBehaviors() {
    // Validator defaults
    mockValidator.validateInput.mockResolvedValue({ valid: true, errors: [] });
    mockValidator.sanitizeMessage.mockImplementation((msg: string) => msg);
    mockValidator.checkPermissions.mockResolvedValue({ allowed: true });
    mockValidator.validateFileOperation.mockResolvedValue({ valid: true });

    // Output parser defaults
    mockOutputParser.parseToolUse.mockResolvedValue({ tool: 'echo', content: 'test' });
    mockOutputParser.parseFileOperations.mockResolvedValue([]);
    mockOutputParser.parseErrorMessages.mockResolvedValue({ message: 'No error' });
    mockOutputParser.extractStructuredData.mockResolvedValue({ data: 'completion' });

    // Message queue defaults
    mockMessageQueue.enqueue.mockResolvedValue(true);
  }

  describe('Message Processing', () => {
    const instanceId = 'claude-123';
    const message = 'Create test.md with "hello world"';
    const options = { userId: 'user-456' };

    it('should process valid message through complete pipeline', async () => {
      // Arrange
      const expectedMessageId = 'msg-789';
      mockClaudeManager.sendInput.mockResolvedValue({
        success: true,
        messageId: expectedMessageId,
        timestamp: new Date()
      });

      // Act
      const result = await service.processMessage(instanceId, message, options);

      // Assert - London School behavior verification
      expect(mockValidator.validateInput).toHaveBeenCalledWith(message, options);
      expect(mockValidator.sanitizeMessage).toHaveBeenCalledWith(message);
      expect(mockValidator.checkPermissions).toHaveBeenCalledWith(instanceId, message, options.userId);
      expect(mockClaudeManager.sendInput).toHaveBeenCalledWith(instanceId, message);
      expect(mockMetrics.recordMessageSent).toHaveBeenCalledWith(
        instanceId,
        expectedMessageId,
        expect.any(Number)
      );

      expect(result.processed).toBe(true);
      expect(result.messageId).toBe(expectedMessageId);
    });

    it('should handle message validation failures', async () => {
      // Arrange - Mock validation failure
      mockValidator.validateInput.mockResolvedValue({
        valid: false,
        errors: ['Message too long', 'Contains prohibited content']
      });

      // Act
      const result = await service.processMessage(instanceId, message, options);

      // Assert - Should not proceed with invalid message
      expect(mockClaudeManager.sendInput).not.toHaveBeenCalled();
      expect(mockMetrics.recordError).toHaveBeenCalledWith('validation_failed', instanceId);
      expect(result.processed).toBe(false);
      expect(result.validationErrors).toEqual(['Message too long', 'Contains prohibited content']);
    });

    it('should handle permission denied scenarios', async () => {
      // Arrange - Mock permission denial
      mockValidator.checkPermissions.mockResolvedValue({
        allowed: false,
        reason: 'Dangerous operation not permitted'
      });

      // Act
      const result = await service.processMessage(instanceId, message, options);

      // Assert - Should not proceed without permission
      expect(mockClaudeManager.sendInput).not.toHaveBeenCalled();
      expect(result.processed).toBe(false);
      expect(result.requiresPermission).toBe(true);
    });

    it('should handle Claude manager failures', async () => {
      // Arrange - Mock Claude failure
      mockClaudeManager.sendInput.mockRejectedValue(new Error('Claude instance unavailable'));

      // Act & Assert
      await expect(service.processMessage(instanceId, message, options))
        .rejects.toThrow('Claude instance unavailable');

      expect(mockMetrics.recordError).toHaveBeenCalledWith(
        'processing_failed',
        instanceId,
        expect.any(Number)
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Message processing failed')
      );
    });
  });

  describe('File Operation Processing', () => {
    const instanceId = 'claude-123';

    it('should process file creation request with validation', async () => {
      // Arrange
      const operation = 'create';
      const path = 'test.md';
      const content = 'hello world';

      mockValidator.validateFileOperation.mockResolvedValue({ valid: true });
      mockClaudeManager.requestFileCreation.mockResolvedValue({
        success: true,
        path,
        requiresPermission: false
      });

      // Act
      const result = await service.processFileOperationRequest(instanceId, operation, path, content);

      // Assert - File operation behavior verification
      expect(mockValidator.validateFileOperation).toHaveBeenCalledWith(operation, path, content);
      expect(mockClaudeManager.requestFileCreation).toHaveBeenCalledWith(instanceId, {
        path,
        content,
        operation
      });
      expect(result.success).toBe(true);
    });

    it('should handle invalid file operation requests', async () => {
      // Arrange - Mock validation failure
      const operation = 'create';
      const path = '../../../etc/passwd';
      const content = 'malicious';

      mockValidator.validateFileOperation.mockResolvedValue({
        valid: false,
        error: 'Invalid file path'
      });

      // Act
      const result = await service.processFileOperationRequest(instanceId, operation, path, content);

      // Assert - Should reject invalid operations
      expect(mockClaudeManager.requestFileCreation).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file path');
    });

    it('should handle file operations requiring permissions', async () => {
      // Arrange
      const operation = 'create';
      const path = 'restricted-file.txt';
      const content = 'content';

      mockValidator.validateFileOperation.mockResolvedValue({ valid: true });
      mockClaudeManager.requestFileCreation.mockResolvedValue({
        success: false,
        path,
        requiresPermission: true,
        error: 'Permission required for this location'
      });

      // Act
      const result = await service.processFileOperationRequest(instanceId, operation, path, content);

      // Assert
      expect(result.success).toBe(false);
      expect(result.requiresPermission).toBe(true);
      expect(result.error).toBe('Permission required for this location');
    });
  });

  describe('Output Stream Processing', () => {
    const instanceId = 'claude-123';
    const messageId = 'msg-456';

    it('should start and process output stream correctly', async () => {
      // Arrange - Mock output stream
      const mockChunks = [
        { type: 'stdout', content: 'Processing...', timestamp: new Date() },
        { type: 'tool_use', content: 'file_create: test.md', timestamp: new Date() },
        { type: 'completion', content: 'Task completed successfully', timestamp: new Date() }
      ];

      const mockStream = (async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      })();

      mockClaudeManager.streamOutput.mockReturnValue(mockStream);

      // Act
      await service.startOutputProcessing(instanceId, messageId);

      // Give time for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Stream processing behavior verification
      expect(mockClaudeManager.streamOutput).toHaveBeenCalledWith(instanceId);
      expect(mockOutputParser.parseToolUse).toHaveBeenCalledWith('file_create: test.md');
      expect(mockOutputParser.extractStructuredData).toHaveBeenCalledWith('Task completed successfully');
      expect(mockMetrics.recordMessageProcessed).toHaveBeenCalledWith(instanceId, messageId);
    });

    it('should handle tool use in output stream', async () => {
      // Arrange - Mock tool use output
      const toolUseChunk = {
        type: 'tool_use',
        content: 'Write file: test.md with content: hello world',
        timestamp: new Date()
      };

      const mockStream = (async function* () {
        yield toolUseChunk;
      })();

      mockClaudeManager.streamOutput.mockReturnValue(mockStream);
      mockOutputParser.parseToolUse.mockResolvedValue({
        tool: 'file_create',
        content: 'test.md: hello world'
      });
      mockOutputParser.parseFileOperations.mockResolvedValue([
        { path: 'test.md', content: 'hello world' }
      ]);

      // Act
      await service.startOutputProcessing(instanceId, messageId);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Tool use handling verification
      expect(mockOutputParser.parseToolUse).toHaveBeenCalledWith(toolUseChunk.content);
      expect(mockOutputParser.parseFileOperations).toHaveBeenCalled();
      expect(mockClaudeManager.requestFileCreation).toHaveBeenCalledWith(instanceId, {
        path: 'test.md',
        content: 'hello world',
        operation: 'create'
      });
    });

    it('should handle errors in output stream', async () => {
      // Arrange - Mock error output
      const errorChunk = {
        type: 'stderr',
        content: 'Error: Command not found',
        timestamp: new Date()
      };

      const mockStream = (async function* () {
        yield errorChunk;
      })();

      mockClaudeManager.streamOutput.mockReturnValue(mockStream);
      mockOutputParser.parseErrorMessages.mockResolvedValue({
        message: 'Command not found',
        level: 'error'
      });

      // Act
      await service.startOutputProcessing(instanceId, messageId);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Error handling verification
      expect(mockOutputParser.parseErrorMessages).toHaveBeenCalledWith(errorChunk.content);
      expect(mockMetrics.recordError).toHaveBeenCalledWith('claude_error', instanceId);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Claude error for message')
      );
    });
  });

  describe('Message History Management', () => {
    const instanceId = 'claude-123';

    it('should retrieve message history from Claude manager', async () => {
      // Arrange
      const mockHistory = [
        { id: 'msg-1', content: 'Hello', type: 'input', timestamp: new Date() },
        { id: 'msg-2', content: 'Hi there!', type: 'output', timestamp: new Date() }
      ];

      mockClaudeManager.getMessageHistory.mockResolvedValue(mockHistory);

      // Act
      const history = await service.getMessageHistory(instanceId, 25);

      // Assert
      expect(mockClaudeManager.getMessageHistory).toHaveBeenCalledWith(instanceId, 25);
      expect(history).toEqual(mockHistory);
    });

    it('should handle message history retrieval failures', async () => {
      // Arrange
      mockClaudeManager.getMessageHistory.mockRejectedValue(new Error('History unavailable'));

      // Act & Assert
      await expect(service.getMessageHistory(instanceId))
        .rejects.toThrow('History unavailable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get message history')
      );
    });
  });

  describe('Stream Management', () => {
    it('should track active streams correctly', async () => {
      // Arrange
      const messageId = 'msg-123';
      const mockStream = (async function* () {
        yield { type: 'stdout', content: 'test', timestamp: new Date() };
      })();

      mockClaudeManager.streamOutput.mockReturnValue(mockStream);

      // Act
      await service.startOutputProcessing('instance-123', messageId);

      // Assert
      expect(service.getActiveStreamsCount()).toBe(1);

      // Stop processing
      service.stopOutputProcessing(messageId);
      expect(service.getActiveStreamsCount()).toBe(0);
    });
  });

  describe('London School Integration Tests', () => {
    it('should coordinate all collaborators in correct sequence', async () => {
      // Arrange - Full message processing workflow
      const instanceId = 'claude-123';
      const message = 'Create test.md with "hello world"';
      const messageId = 'msg-456';

      mockClaudeManager.sendInput.mockResolvedValue({
        success: true,
        messageId,
        timestamp: new Date()
      });

      const mockStream = (async function* () {
        yield { type: 'tool_use', content: 'file_create: test.md', timestamp: new Date() };
        yield { type: 'completion', content: 'File created successfully', timestamp: new Date() };
      })();

      mockClaudeManager.streamOutput.mockReturnValue(mockStream);

      // Act - Execute full workflow
      const result = await service.processMessage(instanceId, message, { userId: 'user-123' });

      // Give time for stream processing
      await new Promise(resolve => setTimeout(resolve, 150));

      // Assert - Verify complete collaboration sequence
      expect(mockValidator.validateInput).toHaveBeenCalledBefore(mockValidator.sanitizeMessage as jest.Mock);
      expect(mockValidator.sanitizeMessage).toHaveBeenCalledBefore(mockValidator.checkPermissions as jest.Mock);
      expect(mockValidator.checkPermissions).toHaveBeenCalledBefore(mockClaudeManager.sendInput as jest.Mock);
      expect(mockClaudeManager.sendInput).toHaveBeenCalledBefore(mockClaudeManager.streamOutput as jest.Mock);

      // Verify metrics coordination
      expect(mockMetrics.recordMessageSent).toHaveBeenCalledWith(instanceId, messageId, expect.any(Number));
      expect(mockMetrics.recordMessageProcessed).toHaveBeenCalledWith(instanceId, messageId);

      // Verify parser coordination
      expect(mockOutputParser.parseToolUse).toHaveBeenCalled();
      expect(mockOutputParser.extractStructuredData).toHaveBeenCalled();

      expect(result.processed).toBe(true);
    });

    it('should handle complex error scenarios with proper coordination', async () => {
      // Arrange - Multiple failure points
      const instanceId = 'claude-123';
      const message = 'dangerous command';

      mockValidator.validateInput.mockResolvedValue({ valid: true, errors: [] });
      mockValidator.checkPermissions.mockResolvedValue({
        allowed: false,
        reason: 'Command not permitted'
      });

      // Act
      const result = await service.processMessage(instanceId, message);

      // Assert - Verify proper error handling coordination
      expect(mockValidator.validateInput).toHaveBeenCalled();
      expect(mockValidator.checkPermissions).toHaveBeenCalled();
      expect(mockClaudeManager.sendInput).not.toHaveBeenCalled();
      expect(mockMetrics.recordError).not.toHaveBeenCalled(); // No error recorded for permission denial

      expect(result.processed).toBe(false);
      expect(result.requiresPermission).toBe(true);
    });
  });
});