# Claude Code SDK Integration - Implementation Guide

## Phase 4 & 5: REFINEMENT & COMPLETION

### 1. Implementation Roadmap

#### 1.1 Development Phases

```typescript
interface ImplementationPhases {
  phase1_foundation: {
    duration: "2-3 weeks";
    deliverables: [
      "Core SDK integration setup",
      "Basic agent management",
      "Authentication and authorization",
      "Database schema implementation"
    ];
    acceptance_criteria: [
      "Claude Code agents can be created and configured",
      "User authentication works end-to-end",
      "Basic API endpoints are functional",
      "Database migrations are complete"
    ];
  };

  phase2_core_features: {
    duration: "3-4 weeks";
    deliverables: [
      "Tool framework implementation",
      "Context management system",
      "Session management",
      "Basic streaming support"
    ];
    acceptance_criteria: [
      "Tools can be registered and executed safely",
      "Context is maintained across conversations",
      "Sessions persist and can be resumed",
      "Real-time streaming works"
    ];
  };

  phase3_advanced_features: {
    duration: "3-4 weeks";
    deliverables: [
      "Advanced permissions system",
      "Performance optimizations",
      "Monitoring and observability",
      "Error handling and recovery"
    ];
    acceptance_criteria: [
      "Granular permissions work correctly",
      "System performs under load",
      "Comprehensive monitoring is in place",
      "Error recovery is automatic"
    ];
  };

  phase4_production_ready: {
    duration: "2-3 weeks";
    deliverables: [
      "Security hardening",
      "Load testing and optimization",
      "Documentation and training",
      "Deployment automation"
    ];
    acceptance_criteria: [
      "Security audit passes",
      "Performance targets are met",
      "Documentation is complete",
      "CI/CD pipeline is functional"
    ];
  };
}
```

### 2. Technical Implementation Details

#### 2.1 Claude Code SDK Integration

```typescript
// /src/services/claude-code/ClaudeCodeSDK.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { ClaudeCodeConfig, AgentInstance, ToolRegistry } from './types';
import { SecurityManager } from './security/SecurityManager';
import { ContextManager } from './context/ContextManager';

export class ClaudeCodeSDK {
  private anthropic: Anthropic;
  private securityManager: SecurityManager;
  private contextManager: ContextManager;
  private toolRegistry: ToolRegistry;
  private activeAgents: Map<string, AgentInstance> = new Map();

  constructor(config: ClaudeCodeConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    this.securityManager = new SecurityManager(config.security);
    this.contextManager = new ContextManager(config.context);
    this.toolRegistry = new ToolRegistry(config.tools);
  }

  async createAgent(config: AgentConfig): Promise<AgentInstance> {
    // Validate configuration
    const validationResult = await this.validateAgentConfig(config);
    if (!validationResult.isValid) {
      throw new Error(`Invalid agent configuration: ${validationResult.errors.join(', ')}`);
    }

    // Create agent instance
    const agentId = this.generateAgentId();
    const agent: AgentInstance = {
      id: agentId,
      config: config,
      status: 'initializing',
      createdAt: new Date(),
      context: await this.contextManager.createContext(config.contextConfig),
      tools: await this.toolRegistry.getToolsForAgent(config.permissions),
      metrics: {
        requestCount: 0,
        successCount: 0,
        averageResponseTime: 0,
        errorCount: 0
      }
    };

    // Initialize agent
    try {
      await this.initializeAgent(agent);
      agent.status = 'active';
      this.activeAgents.set(agentId, agent);

      return agent;
    } catch (error) {
      agent.status = 'error';
      throw new Error(`Failed to initialize agent: ${error.message}`);
    }
  }

  async sendMessage(
    agentId: string,
    message: string,
    options: MessageOptions = {}
  ): Promise<ClaudeResponse> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Security check
    await this.securityManager.validateRequest(agent, message, options);

    // Prepare context
    const context = await this.contextManager.prepareContext(agent, message);

    // Execute with Claude Code
    const startTime = Date.now();
    try {
      const response = await this.anthropic.messages.create({
        model: agent.config.modelId,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        messages: context.messages,
        tools: agent.tools.map(tool => tool.schema),
        tool_choice: options.toolChoice || 'auto'
      });

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateAgentMetrics(agent, responseTime, true);

      // Update context
      await this.contextManager.updateContext(agent, message, response);

      return this.processResponse(response, agent);
    } catch (error) {
      this.updateAgentMetrics(agent, Date.now() - startTime, false);
      throw error;
    }
  }

  async streamMessage(
    agentId: string,
    message: string,
    callback: (chunk: StreamChunk) => void,
    options: StreamOptions = {}
  ): Promise<void> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const context = await this.contextManager.prepareContext(agent, message);

    const stream = await this.anthropic.messages.create({
      model: agent.config.modelId,
      max_tokens: options.maxTokens || 4000,
      messages: context.messages,
      tools: agent.tools.map(tool => tool.schema),
      stream: true
    });

    for await (const chunk of stream) {
      const processedChunk = this.processStreamChunk(chunk, agent);
      callback(processedChunk);
    }
  }

  private async validateAgentConfig(config: AgentConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate required fields
    if (!config.modelId) errors.push('Model ID is required');
    if (!config.name) errors.push('Agent name is required');

    // Validate model availability
    try {
      await this.anthropic.models.retrieve(config.modelId);
    } catch {
      errors.push(`Model ${config.modelId} is not available`);
    }

    // Validate permissions
    if (config.permissions) {
      const permissionValidation = await this.securityManager.validatePermissions(config.permissions);
      if (!permissionValidation.isValid) {
        errors.push(...permissionValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

#### 2.2 Tool Framework Implementation

```typescript
// /src/services/claude-code/tools/ToolFramework.ts
import { Tool, ToolSchema, ToolResult, ExecutionContext } from './types';
import { PermissionEngine } from '../security/PermissionEngine';
import { ExecutionSandbox } from './ExecutionSandbox';

export class ToolFramework {
  private registeredTools: Map<string, Tool> = new Map();
  private permissionEngine: PermissionEngine;
  private executionSandbox: ExecutionSandbox;

  constructor(permissionEngine: PermissionEngine) {
    this.permissionEngine = permissionEngine;
    this.executionSandbox = new ExecutionSandbox();
    this.registerDefaultTools();
  }

  async registerTool(tool: Tool): Promise<void> {
    // Validate tool schema
    const validation = this.validateToolSchema(tool.schema);
    if (!validation.isValid) {
      throw new Error(`Invalid tool schema: ${validation.errors.join(', ')}`);
    }

    // Security validation
    await this.permissionEngine.validateToolRegistration(tool);

    this.registeredTools.set(tool.id, tool);
  }

  async executeTool(
    toolId: string,
    parameters: Record<string, any>,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const tool = this.registeredTools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    // Permission check
    const hasPermission = await this.permissionEngine.checkToolPermission(
      context.userId,
      toolId,
      'execute'
    );
    if (!hasPermission) {
      throw new Error(`User ${context.userId} does not have permission to execute tool ${toolId}`);
    }

    // Parameter validation
    const paramValidation = this.validateParameters(tool.schema, parameters);
    if (!paramValidation.isValid) {
      throw new Error(`Invalid parameters: ${paramValidation.errors.join(', ')}`);
    }

    // Execute in sandbox
    return await this.executionSandbox.execute(tool, parameters, context);
  }

  private registerDefaultTools(): void {
    // File operations
    this.registerTool({
      id: 'file_read',
      name: 'Read File',
      description: 'Read contents of a file',
      schema: {
        type: 'function',
        function: {
          name: 'file_read',
          description: 'Read contents of a file',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'File path to read'
              }
            },
            required: ['path']
          }
        }
      },
      handler: async (params: { path: string }, context: ExecutionContext) => {
        // Implementation for file reading with security checks
        return await this.secureFileRead(params.path, context);
      }
    });

    // Code execution
    this.registerTool({
      id: 'code_execute',
      name: 'Execute Code',
      description: 'Execute code in a sandboxed environment',
      schema: {
        type: 'function',
        function: {
          name: 'code_execute',
          description: 'Execute code safely',
          parameters: {
            type: 'object',
            properties: {
              language: {
                type: 'string',
                enum: ['javascript', 'python', 'bash']
              },
              code: {
                type: 'string',
                description: 'Code to execute'
              },
              timeout: {
                type: 'number',
                default: 30000,
                description: 'Execution timeout in milliseconds'
              }
            },
            required: ['language', 'code']
          }
        }
      },
      handler: async (params: any, context: ExecutionContext) => {
        return await this.executeCodeSafely(params, context);
      }
    });
  }
}
```

#### 2.3 Context Management Implementation

```typescript
// /src/services/claude-code/context/ContextManager.ts
import { AgentContext, Message, ContextSnapshot } from './types';
import { ContextAnalyzer } from './ContextAnalyzer';
import { ContextPersistence } from './ContextPersistence';

export class ContextManager {
  private analyzer: ContextAnalyzer;
  private persistence: ContextPersistence;
  private activeContexts: Map<string, AgentContext> = new Map();

  constructor(config: ContextConfig) {
    this.analyzer = new ContextAnalyzer(config.analysis);
    this.persistence = new ContextPersistence(config.persistence);
  }

  async createContext(config: ContextConfig): Promise<AgentContext> {
    const context: AgentContext = {
      id: this.generateContextId(),
      maxTokens: config.maxTokens || 100000,
      messages: [],
      metadata: {},
      createdAt: new Date(),
      lastUpdated: new Date(),
      tokenUsage: 0,
      compressionEnabled: config.compressionEnabled || true
    };

    this.activeContexts.set(context.id, context);
    return context;
  }

  async prepareContext(agent: AgentInstance, newMessage: string): Promise<PreparedContext> {
    const context = this.activeContexts.get(agent.context.id);
    if (!context) {
      throw new Error(`Context ${agent.context.id} not found`);
    }

    // Add new message
    const message: Message = {
      id: this.generateMessageId(),
      role: 'user',
      content: newMessage,
      timestamp: new Date(),
      tokenCount: await this.analyzer.countTokens(newMessage)
    };

    context.messages.push(message);

    // Optimize context if needed
    if (this.shouldOptimizeContext(context)) {
      await this.optimizeContext(context);
    }

    // Prepare for Claude API
    return {
      messages: this.formatMessagesForAPI(context.messages),
      tokenCount: context.tokenUsage,
      contextId: context.id
    };
  }

  async updateContext(
    agent: AgentInstance,
    userMessage: string,
    claudeResponse: any
  ): Promise<void> {
    const context = this.activeContexts.get(agent.context.id);
    if (!context) {
      throw new Error(`Context ${agent.context.id} not found`);
    }

    // Add Claude's response
    const responseMessage: Message = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: claudeResponse.content,
      timestamp: new Date(),
      tokenCount: await this.analyzer.countTokens(claudeResponse.content),
      toolCalls: claudeResponse.tool_calls
    };

    context.messages.push(responseMessage);
    context.lastUpdated = new Date();
    context.tokenUsage = await this.analyzer.calculateTotalTokens(context.messages);

    // Persist if configured
    if (this.persistence.isEnabled()) {
      await this.persistence.saveContext(context);
    }
  }

  private async optimizeContext(context: AgentContext): Promise<void> {
    // Analyze message importance
    const messageScores = await this.analyzer.scoreMessages(context.messages);

    // Determine which messages to keep
    const keepMessages = this.selectMessagesToKeep(context.messages, messageScores, context.maxTokens);

    // Create summary of removed messages if compression is enabled
    if (context.compressionEnabled && keepMessages.length < context.messages.length) {
      const removedMessages = context.messages.filter(m => !keepMessages.includes(m));
      const summary = await this.analyzer.summarizeMessages(removedMessages);

      // Insert summary at the beginning
      const summaryMessage: Message = {
        id: this.generateMessageId(),
        role: 'system',
        content: `Context Summary: ${summary}`,
        timestamp: new Date(),
        tokenCount: await this.analyzer.countTokens(summary),
        isCompressed: true
      };

      context.messages = [summaryMessage, ...keepMessages];
    } else {
      context.messages = keepMessages;
    }

    // Update token usage
    context.tokenUsage = await this.analyzer.calculateTotalTokens(context.messages);
  }

  private shouldOptimizeContext(context: AgentContext): boolean {
    // Optimize if we're using more than 90% of token budget
    return context.tokenUsage > context.maxTokens * 0.9;
  }

  private selectMessagesToKeep(
    messages: Message[],
    scores: Map<string, number>,
    tokenBudget: number
  ): Message[] {
    // Always keep system messages and recent critical messages
    const mustKeep = messages.filter(m =>
      m.role === 'system' ||
      m.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );

    // Sort remaining by score
    const sortable = messages
      .filter(m => !mustKeep.includes(m))
      .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));

    const result = [...mustKeep];
    let currentTokens = mustKeep.reduce((sum, m) => sum + m.tokenCount, 0);

    // Add messages in order of importance until budget is reached
    for (const message of sortable) {
      if (currentTokens + message.tokenCount <= tokenBudget * 0.8) {
        result.push(message);
        currentTokens += message.tokenCount;
      }
    }

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
```

### 3. Frontend Integration

#### 3.1 React Hooks for Claude Code

```typescript
// /src/hooks/useClaudeCode.ts
import { useState, useEffect, useCallback } from 'react';
import { ClaudeCodeSDK } from '../services/claude-code/ClaudeCodeSDK';
import { AgentInstance, MessageOptions, StreamChunk } from '../types/claude-code';

export function useClaudeCode(config: ClaudeCodeConfig) {
  const [sdk, setSdk] = useState<ClaudeCodeSDK | null>(null);
  const [agents, setAgents] = useState<Map<string, AgentInstance>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSdk = async () => {
      try {
        const claudeSDK = new ClaudeCodeSDK(config);
        setSdk(claudeSDK);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Claude Code SDK');
      }
    };

    initializeSdk();
  }, [config]);

  const createAgent = useCallback(async (agentConfig: AgentConfig): Promise<string | null> => {
    if (!sdk) {
      setError('SDK not initialized');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const agent = await sdk.createAgent(agentConfig);
      setAgents(prev => new Map(prev).set(agent.id, agent));
      return agent.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  const sendMessage = useCallback(async (
    agentId: string,
    message: string,
    options?: MessageOptions
  ): Promise<ClaudeResponse | null> => {
    if (!sdk) {
      setError('SDK not initialized');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sdk.sendMessage(agentId, message, options);

      // Update agent in state
      const agent = agents.get(agentId);
      if (agent) {
        const updatedAgent = { ...agent, lastResponse: response };
        setAgents(prev => new Map(prev).set(agentId, updatedAgent));
      }

      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sdk, agents]);

  const streamMessage = useCallback(async (
    agentId: string,
    message: string,
    onChunk: (chunk: StreamChunk) => void,
    options?: StreamOptions
  ): Promise<void> => {
    if (!sdk) {
      setError('SDK not initialized');
      return;
    }

    setError(null);

    try {
      await sdk.streamMessage(agentId, message, onChunk, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stream message');
    }
  }, [sdk]);

  return {
    sdk,
    agents: Array.from(agents.values()),
    createAgent,
    sendMessage,
    streamMessage,
    loading,
    error
  };
}
```

#### 3.2 Claude Code Chat Component

```typescript
// /src/components/claude-code/ClaudeCodeChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useClaudeCode } from '../../hooks/useClaudeCode';
import { StreamChunk, MessageOptions } from '../../types/claude-code';

interface ClaudeCodeChatProps {
  agentId: string;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
}

export const ClaudeCodeChat: React.FC<ClaudeCodeChatProps> = ({
  agentId,
  onMessageSent,
  onResponseReceived
}) => {
  const { sendMessage, streamMessage, loading, error } = useClaudeCode();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    onMessageSent?.(inputValue);

    // Create placeholder for assistant response
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsStreaming(true);

    try {
      await streamMessage(
        agentId,
        inputValue,
        (chunk: StreamChunk) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + chunk.content }
              : msg
          ));
        }
      );

      // Mark streaming as complete
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, isStreaming: false }
          : msg
      ));

      const finalResponse = messages.find(m => m.id === assistantMessageId)?.content || '';
      onResponseReceived?.(finalResponse);
    } catch (err) {
      // Remove the placeholder message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="claude-code-chat">
      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-content">
              {message.content}
              {message.isStreaming && <span className="streaming-indicator">▋</span>}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="input-container">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type your message..."
          disabled={loading || isStreaming}
          rows={3}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || loading || isStreaming}
        >
          {loading || isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};
```

### 4. Testing Strategy

#### 4.1 Unit Testing

```typescript
// /src/services/claude-code/__tests__/ClaudeCodeSDK.test.ts
import { ClaudeCodeSDK } from '../ClaudeCodeSDK';
import { mockAnthropicResponse } from './mocks/anthropic';

describe('ClaudeCodeSDK', () => {
  let sdk: ClaudeCodeSDK;
  let mockConfig: ClaudeCodeConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.anthropic.com',
      security: {
        enableSandboxing: true,
        allowedDomains: ['localhost'],
        maxExecutionTime: 30000
      },
      context: {
        maxTokens: 100000,
        compressionEnabled: true
      },
      tools: {
        enableCustomTools: false,
        defaultTools: ['file_read', 'code_execute']
      }
    };

    sdk = new ClaudeCodeSDK(mockConfig);
  });

  describe('createAgent', () => {
    it('should create an agent with valid configuration', async () => {
      const agentConfig = {
        name: 'Test Agent',
        modelId: 'claude-3-sonnet-20241022',
        permissions: {
          tools: ['file_read'],
          maxTokensPerRequest: 4000
        }
      };

      const agent = await sdk.createAgent(agentConfig);

      expect(agent).toBeDefined();
      expect(agent.id).toBeTruthy();
      expect(agent.config.name).toBe('Test Agent');
      expect(agent.status).toBe('active');
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig = {
        name: '',
        modelId: 'invalid-model'
      };

      await expect(sdk.createAgent(invalidConfig)).rejects.toThrow('Invalid agent configuration');
    });
  });

  describe('sendMessage', () => {
    let agentId: string;

    beforeEach(async () => {
      const agent = await sdk.createAgent({
        name: 'Test Agent',
        modelId: 'claude-3-sonnet-20241022'
      });
      agentId = agent.id;
    });

    it('should send message and receive response', async () => {
      const message = 'Hello, Claude!';
      const mockResponse = mockAnthropicResponse('Hello! How can I help you today?');

      jest.spyOn(sdk['anthropic'].messages, 'create').mockResolvedValue(mockResponse);

      const response = await sdk.sendMessage(agentId, message);

      expect(response).toBeDefined();
      expect(response.content).toBe('Hello! How can I help you today?');
    });

    it('should handle agent not found error', async () => {
      const invalidAgentId = 'non-existent-agent';
      const message = 'Hello';

      await expect(sdk.sendMessage(invalidAgentId, message)).rejects.toThrow('Agent non-existent-agent not found');
    });
  });
});
```

#### 4.2 Integration Testing

```typescript
// /src/tests/integration/claude-code-integration.test.ts
import { ClaudeCodeSDK } from '../../services/claude-code/ClaudeCodeSDK';
import { TestDatabase } from '../utils/TestDatabase';
import { TestRedis } from '../utils/TestRedis';

describe('Claude Code Integration Tests', () => {
  let sdk: ClaudeCodeSDK;
  let testDb: TestDatabase;
  let testRedis: TestRedis;

  beforeAll(async () => {
    testDb = new TestDatabase();
    testRedis = new TestRedis();

    await testDb.setup();
    await testRedis.setup();

    sdk = new ClaudeCodeSDK({
      apiKey: process.env.TEST_ANTHROPIC_API_KEY!,
      database: testDb.getConfig(),
      redis: testRedis.getConfig()
    });
  });

  afterAll(async () => {
    await testDb.teardown();
    await testRedis.teardown();
  });

  describe('End-to-End Agent Workflow', () => {
    it('should complete full agent lifecycle', async () => {
      // Create agent
      const agent = await sdk.createAgent({
        name: 'Integration Test Agent',
        modelId: 'claude-3-sonnet-20241022'
      });

      expect(agent.status).toBe('active');

      // Send message
      const response = await sdk.sendMessage(agent.id, 'Write a simple Hello World function in Python');

      expect(response).toBeDefined();
      expect(response.content).toContain('def');
      expect(response.content).toContain('Hello World');

      // Verify context persistence
      const contextExists = await testDb.checkContextExists(agent.context.id);
      expect(contextExists).toBe(true);

      // Clean up
      await sdk.terminateAgent(agent.id);
    });
  });

  describe('Tool Execution Integration', () => {
    it('should execute file operations safely', async () => {
      const agent = await sdk.createAgent({
        name: 'Tool Test Agent',
        modelId: 'claude-3-sonnet-20241022',
        permissions: {
          tools: ['file_read', 'file_write']
        }
      });

      // Test file operations through Claude
      const response = await sdk.sendMessage(
        agent.id,
        'Create a test file called hello.txt with the content "Hello, World!"'
      );

      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.[0]?.function.name).toBe('file_write');

      // Verify file was created (in test environment)
      const fileExists = await testDb.checkFileOperation('hello.txt', 'write');
      expect(fileExists).toBe(true);
    });
  });
});
```

### 5. Deployment and Production Setup

#### 5.1 Environment Configuration

```yaml
# /deploy/environments/production.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: claude-code-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_VERSION: "v1"
  RATE_LIMIT_REQUESTS: "1000"
  RATE_LIMIT_WINDOW: "900000"
  CONTEXT_MAX_TOKENS: "100000"
  SESSION_TIMEOUT: "3600000"
  TOOL_EXECUTION_TIMEOUT: "30000"

---
apiVersion: v1
kind: Secret
metadata:
  name: claude-code-secrets
type: Opaque
data:
  ANTHROPIC_API_KEY: <base64-encoded-api-key>
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

#### 5.2 CI/CD Pipeline

```yaml
# /.github/workflows/deploy.yml
name: Deploy Claude Code SDK

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:ci
        env:
          TEST_ANTHROPIC_API_KEY: ${{ secrets.TEST_ANTHROPIC_API_KEY }}

      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          TEST_REDIS_URL: ${{ secrets.TEST_REDIS_URL }}

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run security audit
        run: npm audit

      - name: Run SAST scan
        uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t claude-code-api:${{ github.sha }} .
          docker tag claude-code-api:${{ github.sha }} claude-code-api:latest

      - name: Deploy to staging
        run: |
          kubectl apply -f deploy/staging/
          kubectl set image deployment/claude-code-api claude-code-api=claude-code-api:${{ github.sha }}

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          STAGING_URL: https://staging-api.example.com

      - name: Deploy to production
        if: success()
        run: |
          kubectl apply -f deploy/production/
          kubectl set image deployment/claude-code-api claude-code-api=claude-code-api:${{ github.sha }}
```

### 6. Monitoring and Observability

#### 6.1 Metrics and Alerting

```typescript
// /src/services/monitoring/MetricsCollector.ts
import { Counter, Histogram, Gauge, register } from 'prom-client';

export class MetricsCollector {
  private requestCounter: Counter<string>;
  private responseTimeHistogram: Histogram<string>;
  private activeAgentsGauge: Gauge<string>;
  private tokenUsageCounter: Counter<string>;

  constructor() {
    this.requestCounter = new Counter({
      name: 'claude_code_requests_total',
      help: 'Total number of requests to Claude Code API',
      labelNames: ['method', 'endpoint', 'status']
    });

    this.responseTimeHistogram = new Histogram({
      name: 'claude_code_response_time_seconds',
      help: 'Response time for Claude Code API requests',
      labelNames: ['method', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.activeAgentsGauge = new Gauge({
      name: 'claude_code_active_agents',
      help: 'Number of active Claude Code agents'
    });

    this.tokenUsageCounter = new Counter({
      name: 'claude_code_tokens_used_total',
      help: 'Total tokens used by Claude Code API',
      labelNames: ['model', 'type']
    });

    register.registerMetric(this.requestCounter);
    register.registerMetric(this.responseTimeHistogram);
    register.registerMetric(this.activeAgentsGauge);
    register.registerMetric(this.tokenUsageCounter);
  }

  recordRequest(method: string, endpoint: string, status: number): void {
    this.requestCounter.inc({ method, endpoint, status: status.toString() });
  }

  recordResponseTime(method: string, endpoint: string, duration: number): void {
    this.responseTimeHistogram.observe({ method, endpoint }, duration);
  }

  updateActiveAgents(count: number): void {
    this.activeAgentsGauge.set(count);
  }

  recordTokenUsage(model: string, type: 'input' | 'output', tokens: number): void {
    this.tokenUsageCounter.inc({ model, type }, tokens);
  }
}
```

### 7. Production Checklist

#### 7.1 Pre-Launch Verification

```typescript
interface ProductionChecklist {
  security: {
    items: [
      "API keys are properly secured and rotated",
      "All endpoints have authentication",
      "Rate limiting is configured",
      "Input validation is comprehensive",
      "Tool execution is sandboxed",
      "Security audit is complete"
    ];
    status: "pending" | "in_progress" | "complete";
  };

  performance: {
    items: [
      "Load testing completed successfully",
      "Database queries are optimized",
      "Caching is properly configured",
      "Response times meet SLA requirements",
      "Resource usage is within limits",
      "Auto-scaling is configured"
    ];
    status: "pending" | "in_progress" | "complete";
  };

  monitoring: {
    items: [
      "Metrics collection is working",
      "Dashboards are created",
      "Alerts are configured",
      "Log aggregation is set up",
      "Health checks are implemented",
      "Error tracking is enabled"
    ];
    status: "pending" | "in_progress" | "complete";
  };

  reliability: {
    items: [
      "Backup procedures are tested",
      "Disaster recovery plan exists",
      "Circuit breakers are implemented",
      "Graceful degradation is working",
      "Database migrations are tested",
      "Rollback procedures are verified"
    ];
    status: "pending" | "in_progress" | "complete";
  };
}
```

This implementation guide provides a comprehensive roadmap for building the Claude Code SDK integration, including detailed code examples, testing strategies, deployment configurations, and production readiness checklists.