/**
 * Claude Process Manager Mock Implementation
 * London School TDD - Comprehensive mock with behavior verification
 */

import { jest } from '@jest/globals';
import {
  ClaudeProcessManagerContract,
  ClaudeInstanceConfig,
  ClaudeInstanceInfo,
  MessageResponse,
  OutputChunk,
  Message,
  FileCreationRequest,
  FileOperationResponse,
  PermissionResponse,
  HealthStatus,
  ProcessMetrics,
  EventCallback,
  ClaudeEvent,
  InstanceStatus
} from '../contracts/ClaudeProcessManagerContract';

export class ClaudeProcessManagerMock implements ClaudeProcessManagerContract {
  // Mock tracking for London School behavior verification
  private mockInteractions: Map<string, any[]> = new Map();
  private eventSubscribers: Map<string, EventCallback> = new Map();
  private instances: Map<string, ClaudeInstanceInfo> = new Map();
  private messageHistories: Map<string, Message[]> = new Map();

  // Jest mock functions for interaction verification
  createInstance = jest.fn<(workspaceDir: string, config?: ClaudeInstanceConfig) => Promise<ClaudeInstanceInfo>>();
  destroyInstance = jest.fn<(instanceId: string) => Promise<void>>();
  getInstanceStatus = jest.fn<(instanceId: string) => Promise<InstanceStatus>>();
  listInstances = jest.fn<() => Promise<ClaudeInstanceInfo[]>>();

  sendInput = jest.fn<(instanceId: string, input: string) => Promise<MessageResponse>>();
  streamOutput = jest.fn<(instanceId: string) => AsyncIterable<OutputChunk>>();
  getMessageHistory = jest.fn<(instanceId: string) => Promise<Message[]>>();

  requestFileCreation = jest.fn<(instanceId: string, request: FileCreationRequest) => Promise<FileOperationResponse>>();
  handlePermissionPrompt = jest.fn<(instanceId: string, response: PermissionResponse) => Promise<void>>();

  subscribeToEvents = jest.fn<(instanceId: string, callback: EventCallback) => void>();
  unsubscribeFromEvents = jest.fn<(instanceId: string) => void>();

  healthCheck = jest.fn<() => Promise<HealthStatus>>();
  getMetrics = jest.fn<() => Promise<ProcessMetrics>>();

  constructor() {
    this.setupDefaultBehaviors();
  }

  private setupDefaultBehaviors(): void {
    // Create Instance - Default happy path
    this.createInstance.mockImplementation(async (workspaceDir: string, config?: ClaudeInstanceConfig) => {
      this.trackInteraction('createInstance', { workspaceDir, config });

      const instance: ClaudeInstanceInfo = {
        id: `claude-instance-${Date.now()}`,
        pid: Math.floor(Math.random() * 10000) + 1000,
        workspaceDir,
        status: 'running' as InstanceStatus,
        createdAt: new Date(),
        config: config || { workspaceDir }
      };

      this.instances.set(instance.id, instance);
      this.messageHistories.set(instance.id, []);

      return instance;
    });

    // Send Input - Default success response
    this.sendInput.mockImplementation(async (instanceId: string, input: string) => {
      this.trackInteraction('sendInput', { instanceId, input });

      const response: MessageResponse = {
        success: true,
        messageId: `msg-${Date.now()}`,
        timestamp: new Date()
      };

      // Add to message history
      const history = this.messageHistories.get(instanceId) || [];
      history.push({
        id: response.messageId,
        instanceId,
        type: 'input',
        content: input,
        timestamp: response.timestamp
      });
      this.messageHistories.set(instanceId, history);

      return response;
    });

    // Stream Output - Default async generator
    this.streamOutput.mockImplementation(async function* (instanceId: string) {
      yield {
        instanceId,
        type: 'stdout' as const,
        content: 'Mock Claude response',
        timestamp: new Date()
      };
    });

    // File Creation - Default success
    this.requestFileCreation.mockImplementation(async (instanceId: string, request: FileCreationRequest) => {
      this.trackInteraction('requestFileCreation', { instanceId, request });

      return {
        success: true,
        path: request.path,
        operation: 'create' as const
      };
    });

    // Health Check - Default healthy
    this.healthCheck.mockResolvedValue({
      healthy: true,
      instances: this.instances.size,
      averageResponseTime: 150,
      errors: []
    });

    // Event Subscription
    this.subscribeToEvents.mockImplementation((instanceId: string, callback: EventCallback) => {
      this.trackInteraction('subscribeToEvents', { instanceId, callback: callback.name });
      this.eventSubscribers.set(instanceId, callback);
    });
  }

  // London School - Behavior Verification Methods
  verifyCreateInstanceCalledWith(workspaceDir: string, config?: ClaudeInstanceConfig): void {
    expect(this.createInstance).toHaveBeenCalledWith(workspaceDir, config);
  }

  verifyMessageSentToInstance(instanceId: string, expectedMessage: string): void {
    expect(this.sendInput).toHaveBeenCalledWith(instanceId, expectedMessage);
  }

  verifyFileCreationRequested(instanceId: string, expectedRequest: Partial<FileCreationRequest>): void {
    expect(this.requestFileCreation).toHaveBeenCalledWith(
      instanceId,
      expect.objectContaining(expectedRequest)
    );
  }

  verifyEventSubscriptionForInstance(instanceId: string): void {
    expect(this.subscribeToEvents).toHaveBeenCalledWith(instanceId, expect.any(Function));
  }

  verifyInstanceDestroyed(instanceId: string): void {
    expect(this.destroyInstance).toHaveBeenCalledWith(instanceId);
  }

  // London School - Interaction Sequence Verification
  verifyInteractionSequence(expectedSequence: string[]): void {
    const actualSequence = Array.from(this.mockInteractions.keys());
    expect(actualSequence).toEqual(expectedSequence);
  }

  verifyNoUnexpectedInteractions(): void {
    // Verify no mock functions were called unexpectedly
    const unexpectedCalls = [];

    if (this.destroyInstance.mock.calls.length > 0) {
      unexpectedCalls.push('destroyInstance called unexpectedly');
    }

    expect(unexpectedCalls).toHaveLength(0);
  }

  // Mock State Management
  simulateInstanceError(instanceId: string, error: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = 'error';
      this.emitEvent(instanceId, {
        instanceId,
        type: 'error',
        data: { error },
        timestamp: new Date()
      });
    }
  }

  simulateFileCreationPermissionPrompt(instanceId: string, path: string): void {
    this.emitEvent(instanceId, {
      instanceId,
      type: 'permission_request',
      data: { operation: 'file_create', path },
      timestamp: new Date()
    });
  }

  simulateMessageOutput(instanceId: string, content: string): void {
    const history = this.messageHistories.get(instanceId) || [];
    history.push({
      id: `output-${Date.now()}`,
      instanceId,
      type: 'output',
      content,
      timestamp: new Date()
    });
    this.messageHistories.set(instanceId, history);

    this.emitEvent(instanceId, {
      instanceId,
      type: 'message',
      data: { content, type: 'output' },
      timestamp: new Date()
    });
  }

  // Test Utilities
  reset(): void {
    jest.clearAllMocks();
    this.mockInteractions.clear();
    this.eventSubscribers.clear();
    this.instances.clear();
    this.messageHistories.clear();
  }

  getInteractionCount(method: string): number {
    const interactions = this.mockInteractions.get(method);
    return interactions ? interactions.length : 0;
  }

  getLastInteractionArgs(method: string): any {
    const interactions = this.mockInteractions.get(method);
    return interactions && interactions.length > 0 ? interactions[interactions.length - 1] : null;
  }

  // Private helpers
  private trackInteraction(method: string, args: any): void {
    if (!this.mockInteractions.has(method)) {
      this.mockInteractions.set(method, []);
    }
    this.mockInteractions.get(method)!.push(args);
  }

  private emitEvent(instanceId: string, event: ClaudeEvent): void {
    const callback = this.eventSubscribers.get(instanceId);
    if (callback) {
      callback(event);
    }
  }
}

// Mock Factory for different scenarios
export class ClaudeProcessManagerMockFactory {
  static createHappyPathMock(): ClaudeProcessManagerMock {
    return new ClaudeProcessManagerMock();
  }

  static createFailingInstanceCreationMock(): ClaudeProcessManagerMock {
    const mock = new ClaudeProcessManagerMock();
    mock.createInstance.mockRejectedValue(new Error('Failed to create Claude instance'));
    return mock;
  }

  static createSlowResponseMock(): ClaudeProcessManagerMock {
    const mock = new ClaudeProcessManagerMock();
    mock.sendInput.mockImplementation(async (instanceId: string, input: string) => {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      return {
        success: true,
        messageId: `slow-msg-${Date.now()}`,
        timestamp: new Date()
      };
    });
    return mock;
  }

  static createPermissionDeniedMock(): ClaudeProcessManagerMock {
    const mock = new ClaudeProcessManagerMock();
    mock.requestFileCreation.mockResolvedValue({
      success: false,
      path: '',
      operation: 'create',
      error: 'Permission denied',
      requiresPermission: true
    });
    return mock;
  }

  static createUnhealthyMock(): ClaudeProcessManagerMock {
    const mock = new ClaudeProcessManagerMock();
    mock.healthCheck.mockResolvedValue({
      healthy: false,
      instances: 0,
      averageResponseTime: 0,
      errors: ['No Claude instances available', 'Memory limit exceeded']
    });
    return mock;
  }
}