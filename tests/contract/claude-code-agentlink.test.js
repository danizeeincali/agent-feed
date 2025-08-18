/**
 * Contract Tests: Claude Code ↔ AgentLink API
 * London School TDD - Contract verification between systems
 */

import { MockFactory } from '../factories/mock-factory.js';
import { ContractVerifier } from '../helpers/contract-verifier.js';

describe('Contract Tests: Claude Code ↔ AgentLink API', () => {
  let mockFactory;
  let contractVerifier;
  let mockClaudeCodeTools;
  let mockAgentLinkAPI;

  beforeEach(() => {
    mockFactory = new MockFactory();
    mockClaudeCodeTools = mockFactory.createClaudeCodeMocks();
    mockAgentLinkAPI = mockFactory.createAgentLinkMocks();
    contractVerifier = new ContractVerifier();
  });

  describe('Agent Execution Contracts', () => {
    it('should verify Claude Code Write → AgentLink postActivity contract', async () => {
      // Arrange
      const writeContract = {
        input: {
          file_path: 'string',
          content: 'string'
        },
        output: {
          success: 'boolean',
          path: 'string',
          bytesWritten: 'number'
        },
        sideEffects: [
          {
            system: 'AgentLink',
            action: 'postActivity',
            data: {
              type: 'file_operation',
              details: {
                action: 'write',
                file: 'string',
                size: 'number'
              }
            }
          }
        ]
      };

      const claudeInput = {
        file_path: '/workspace/src/component.js',
        content: 'export default function Component() { return <div>Hello</div>; }'
      };

      const expectedClaudeOutput = {
        success: true,
        path: '/workspace/src/component.js',
        bytesWritten: 65
      };

      const expectedAgentLinkCall = {
        type: 'file_operation',
        details: {
          action: 'write',
          file: '/workspace/src/component.js',
          size: 65
        },
        timestamp: expect.any(String)
      };

      // Mock responses
      mockClaudeCodeTools.Write.mockResolvedValue(expectedClaudeOutput);
      mockAgentLinkAPI.postActivity.mockResolvedValue({
        id: 'activity-123',
        type: 'file_operation'
      });

      // Act
      const claudeResult = await mockClaudeCodeTools.Write(
        claudeInput.file_path,
        claudeInput.content
      );

      await mockAgentLinkAPI.postActivity(expectedAgentLinkCall);

      // Assert - Verify contract compliance
      expect(claudeResult).toSatisfyContract(writeContract);
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith(
        expect.objectContaining(expectedAgentLinkCall)
      );

      // Verify contract chain
      contractVerifier.verifyContractChain([
        { tool: 'Write', input: claudeInput, output: claudeResult },
        { api: 'postActivity', input: expectedAgentLinkCall }
      ]);
    });

    it('should verify Claude Code Edit → AgentLink execution tracking contract', async () => {
      // Arrange
      const editContract = {
        input: {
          file_path: 'string',
          old_string: 'string',
          new_string: 'string'
        },
        output: {
          success: 'boolean',
          path: 'string',
          changes: 'number'
        },
        sideEffects: [
          {
            system: 'AgentLink',
            action: 'postAgentExecution',
            data: {
              agentName: 'string',
              tool: 'Edit',
              arguments: 'array',
              result: 'object'
            }
          }
        ]
      };

      const editInput = {
        file_path: '/workspace/src/utils.js',
        old_string: 'function oldName() {',
        new_string: 'function newName() {'
      };

      const expectedEditOutput = {
        success: true,
        path: '/workspace/src/utils.js',
        changes: 1
      };

      const expectedExecutionLog = {
        agentName: 'coder',
        tool: 'Edit',
        arguments: [
          '/workspace/src/utils.js',
          'function oldName() {',
          'function newName() {'
        ],
        result: expectedEditOutput,
        timestamp: expect.any(String)
      };

      // Mock responses
      mockClaudeCodeTools.Edit.mockResolvedValue(expectedEditOutput);
      mockAgentLinkAPI.postAgentExecution.mockResolvedValue({
        id: 'exec-456',
        status: 'completed'
      });

      // Act
      const editResult = await mockClaudeCodeTools.Edit(
        editInput.file_path,
        editInput.old_string,
        editInput.new_string
      );

      await mockAgentLinkAPI.postAgentExecution(expectedExecutionLog);

      // Assert - Verify contract compliance
      expect(editResult).toSatisfyContract(editContract);
      expect(mockAgentLinkAPI.postAgentExecution).toHaveBeenCalledWith(
        expect.objectContaining(expectedExecutionLog)
      );
    });

    it('should verify Claude Code Bash → AgentLink command logging contract', async () => {
      // Arrange
      const bashContract = {
        input: {
          command: 'string'
        },
        output: {
          success: 'boolean',
          stdout: 'string',
          stderr: 'string',
          exitCode: 'number'
        },
        sideEffects: [
          {
            system: 'AgentLink',
            action: 'postActivity',
            data: {
              type: 'command_execution',
              details: {
                command: 'string',
                exitCode: 'number',
                duration: 'number'
              }
            }
          }
        ]
      };

      const bashInput = { command: 'npm test' };
      const expectedBashOutput = {
        success: true,
        stdout: 'Test Suites: 5 passed, 5 total',
        stderr: '',
        exitCode: 0
      };

      const expectedCommandLog = {
        type: 'command_execution',
        details: {
          command: 'npm test',
          exitCode: 0,
          duration: 15000
        },
        timestamp: expect.any(String)
      };

      // Mock responses
      mockClaudeCodeTools.Bash.mockResolvedValue(expectedBashOutput);
      mockAgentLinkAPI.postActivity.mockResolvedValue({
        id: 'activity-789',
        type: 'command_execution'
      });

      // Act
      const bashResult = await mockClaudeCodeTools.Bash(bashInput.command);
      await mockAgentLinkAPI.postActivity(expectedCommandLog);

      // Assert - Verify contract compliance
      expect(bashResult).toSatisfyContract(bashContract);
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith(
        expect.objectContaining(expectedCommandLog)
      );
    });
  });

  describe('Agent Lifecycle Contracts', () => {
    it('should verify agent initialization contract', async () => {
      // Arrange
      const initContract = {
        input: {
          agentName: 'string',
          capabilities: 'array',
          workingDirectory: 'string'
        },
        output: {
          agentId: 'string',
          status: 'string',
          tools: 'array'
        },
        sideEffects: [
          {
            system: 'AgentLink',
            action: 'postAgentExecution',
            data: {
              agentName: 'string',
              status: 'initialized',
              capabilities: 'array'
            }
          }
        ]
      };

      const initInput = {
        agentName: 'coder',
        capabilities: ['file-editing', 'syntax-checking'],
        workingDirectory: '/workspace'
      };

      const expectedInitOutput = {
        agentId: 'agent-123',
        status: 'initialized',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep']
      };

      const expectedAgentLog = {
        agentName: 'coder',
        status: 'initialized',
        capabilities: ['file-editing', 'syntax-checking'],
        timestamp: expect.any(String)
      };

      // Mock agent initialization
      const mockAgentFramework = {
        initialize: jest.fn().mockResolvedValue(expectedInitOutput)
      };

      mockAgentLinkAPI.postAgentExecution.mockResolvedValue({
        id: 'exec-init',
        status: 'logged'
      });

      // Act
      const initResult = await mockAgentFramework.initialize(initInput);
      await mockAgentLinkAPI.postAgentExecution(expectedAgentLog);

      // Assert - Verify contract compliance
      expect(initResult).toSatisfyContract(initContract);
      expect(mockAgentLinkAPI.postAgentExecution).toHaveBeenCalledWith(
        expect.objectContaining(expectedAgentLog)
      );
    });

    it('should verify agent handoff contract', async () => {
      // Arrange
      const handoffContract = {
        input: {
          sourceAgentId: 'string',
          targetAgentId: 'string',
          context: 'object'
        },
        output: {
          handoffId: 'string',
          success: 'boolean',
          timestamp: 'string'
        },
        sideEffects: [
          {
            system: 'AgentLink',
            action: 'postActivity',
            data: {
              type: 'agent_handoff',
              details: {
                from: 'string',
                to: 'string',
                context: 'object'
              }
            }
          }
        ]
      };

      const handoffInput = {
        sourceAgentId: 'agent-123',
        targetAgentId: 'agent-456',
        context: {
          completedTasks: ['file_creation'],
          artifacts: ['/workspace/src/component.js'],
          nextAction: 'write_tests'
        }
      };

      const expectedHandoffOutput = {
        handoffId: 'handoff-789',
        success: true,
        timestamp: expect.any(String)
      };

      const expectedHandoffLog = {
        type: 'agent_handoff',
        details: {
          from: 'agent-123',
          to: 'agent-456',
          context: handoffInput.context
        },
        timestamp: expect.any(String)
      };

      // Mock handoff coordination
      const mockSwarmCoordinator = {
        handoff: jest.fn().mockResolvedValue(expectedHandoffOutput)
      };

      mockAgentLinkAPI.postActivity.mockResolvedValue({
        id: 'activity-handoff',
        type: 'agent_handoff'
      });

      // Act
      const handoffResult = await mockSwarmCoordinator.handoff(handoffInput);
      await mockAgentLinkAPI.postActivity(expectedHandoffLog);

      // Assert - Verify contract compliance
      expect(handoffResult).toSatisfyContract(handoffContract);
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith(
        expect.objectContaining(expectedHandoffLog)
      );
    });
  });

  describe('WebSocket Event Contracts', () => {
    it('should verify real-time update contract', async () => {
      // Arrange
      const webSocketContract = {
        input: {
          eventType: 'string',
          data: 'object',
          recipients: 'array?'
        },
        output: {
          success: 'boolean',
          messageId: 'string',
          deliveredTo: 'number'
        },
        sideEffects: [
          {
            system: 'WebSocket',
            action: 'broadcast',
            data: {
              type: 'string',
              payload: 'object'
            }
          }
        ]
      };

      const wsInput = {
        eventType: 'agent_execution_complete',
        data: {
          agentId: 'agent-123',
          result: { success: true, duration: 5000 }
        },
        recipients: ['client-1', 'client-2']
      };

      const expectedWsOutput = {
        success: true,
        messageId: 'msg-123',
        deliveredTo: 2
      };

      mockAgentLinkAPI.emitWebSocketEvent.mockResolvedValue(expectedWsOutput);

      // Act
      const wsResult = await mockAgentLinkAPI.emitWebSocketEvent(wsInput);

      // Assert - Verify contract compliance
      expect(wsResult).toSatisfyContract(webSocketContract);
      expect(mockAgentLinkAPI.emitWebSocketEvent).toHaveBeenCalledWith(
        expect.objectContaining(wsInput)
      );
    });
  });

  describe('Error Handling Contracts', () => {
    it('should verify error propagation contract', async () => {
      // Arrange
      const errorContract = {
        input: {
          operation: 'string',
          error: 'object'
        },
        output: {
          success: false,
          error: 'string',
          recoverable: 'boolean',
          retryAfter: 'number?'
        },
        sideEffects: [
          {
            system: 'AgentLink',
            action: 'postActivity',
            data: {
              type: 'error',
              details: 'object'
            }
          }
        ]
      };

      const errorInput = {
        operation: 'file_write',
        error: new Error('Permission denied')
      };

      const expectedErrorOutput = {
        success: false,
        error: 'Permission denied',
        recoverable: true,
        retryAfter: 1000
      };

      const expectedErrorLog = {
        type: 'error',
        details: {
          operation: 'file_write',
          error: 'Permission denied',
          recoverable: true
        },
        timestamp: expect.any(String)
      };

      // Mock error handling
      mockClaudeCodeTools.Write.mockRejectedValue(errorInput.error);
      mockAgentLinkAPI.postActivity.mockResolvedValue({
        id: 'activity-error',
        type: 'error'
      });

      // Act
      let errorResult;
      try {
        await mockClaudeCodeTools.Write('/readonly/file.js', 'content');
      } catch (error) {
        errorResult = {
          success: false,
          error: error.message,
          recoverable: true,
          retryAfter: 1000
        };
      }

      await mockAgentLinkAPI.postActivity(expectedErrorLog);

      // Assert - Verify contract compliance
      expect(errorResult).toSatisfyContract(errorContract);
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith(
        expect.objectContaining(expectedErrorLog)
      );
    });
  });

  describe('Contract Evolution and Versioning', () => {
    it('should handle backward compatibility for contract changes', async () => {
      // Arrange - Simulate old version of AgentLink API
      const oldContractVersion = {
        version: '1.0',
        input: {
          agent_name: 'string', // Old field name
          task_data: 'object'
        },
        output: {
          execution_id: 'string',
          status: 'string'
        }
      };

      const newContractVersion = {
        version: '2.0',
        input: {
          agentName: 'string', // New field name (camelCase)
          taskData: 'object',
          metadata: 'object?' // New optional field
        },
        output: {
          executionId: 'string',
          status: 'string',
          timestamp: 'string' // New required field
        }
      };

      // Mock contract adapter
      const contractAdapter = {
        adaptInput: jest.fn().mockImplementation((input, fromVersion, toVersion) => {
          if (fromVersion === '1.0' && toVersion === '2.0') {
            return {
              agentName: input.agent_name,
              taskData: input.task_data,
              metadata: {}
            };
          }
          return input;
        }),
        adaptOutput: jest.fn().mockImplementation((output, fromVersion, toVersion) => {
          if (fromVersion === '2.0' && toVersion === '1.0') {
            return {
              execution_id: output.executionId,
              status: output.status
            };
          }
          return output;
        })
      };

      // Act - Test backward compatibility
      const oldInput = { agent_name: 'coder', task_data: { action: 'write' } };
      const adaptedInput = contractAdapter.adaptInput(oldInput, '1.0', '2.0');
      const newOutput = { executionId: 'exec-123', status: 'completed', timestamp: '2024-01-01T00:00:00Z' };
      const adaptedOutput = contractAdapter.adaptOutput(newOutput, '2.0', '1.0');

      // Assert - Verify contract adaptation
      expect(adaptedInput).toEqual({
        agentName: 'coder',
        taskData: { action: 'write' },
        metadata: {}
      });

      expect(adaptedOutput).toEqual({
        execution_id: 'exec-123',
        status: 'completed'
      });

      expect(contractAdapter.adaptInput).toHaveBeenCalledWith(oldInput, '1.0', '2.0');
      expect(contractAdapter.adaptOutput).toHaveBeenCalledWith(newOutput, '2.0', '1.0');
    });
  });
});