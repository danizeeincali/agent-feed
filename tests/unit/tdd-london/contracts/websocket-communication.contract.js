/**
 * WebSocket Communication Contract - London School TDD
 * Defines behavioral contracts for WebSocket interactions
 */

const WebSocketCommunicationContract = {
  // Connection lifecycle contract
  connection: {
    establish: {
      input: { url: 'string', options: 'object' },
      output: { success: 'boolean', connectionId: 'string' },
      collaborators: ['ConnectionManager', 'ErrorHandler', 'StateTracker'],
      interactions: [
        'ConnectionManager.createConnection(url, options)',
        'StateTracker.updateState(CONNECTING)',
        'ErrorHandler.handleConnectionErrors(error)'
      ]
    },
    
    teardown: {
      input: { connectionId: 'string', reason: 'string' },
      output: { cleaned: 'boolean' },
      collaborators: ['ConnectionManager', 'StateTracker', 'MessageQueue'],
      interactions: [
        'MessageQueue.flushPending()',
        'ConnectionManager.closeConnection(connectionId)',
        'StateTracker.updateState(DISCONNECTED)'
      ]
    }
  },

  // Message handling contract
  messaging: {
    send: {
      input: { message: 'object', priority: 'string' },
      output: { queued: 'boolean', messageId: 'string' },
      collaborators: ['MessageQueue', 'MessageValidator', 'ConnectionManager'],
      interactions: [
        'MessageValidator.validate(message)',
        'MessageQueue.enqueue(message, priority)',
        'ConnectionManager.transmit(serializedMessage)'
      ]
    },

    receive: {
      input: { rawMessage: 'string' },
      output: { processed: 'boolean', parsedMessage: 'object' },
      collaborators: ['MessageParser', 'MessageHandler', 'StateManager'],
      interactions: [
        'MessageParser.parse(rawMessage)',
        'MessageHandler.route(parsedMessage)',
        'StateManager.updateFromMessage(parsedMessage)'
      ]
    }
  },

  // Tool call communication contract
  toolCalls: {
    initiate: {
      input: { toolName: 'string', parameters: 'object' },
      output: { callId: 'string', status: 'string' },
      collaborators: ['ToolCallManager', 'ParameterValidator', 'ProgressTracker'],
      interactions: [
        'ParameterValidator.validate(parameters)',
        'ToolCallManager.createCall(toolName, parameters)',
        'ProgressTracker.startTracking(callId)'
      ]
    },

    progress: {
      input: { callId: 'string', progressData: 'object' },
      output: { updated: 'boolean' },
      collaborators: ['ProgressTracker', 'UIUpdater', 'VisualizationRenderer'],
      interactions: [
        'ProgressTracker.updateProgress(callId, progressData)',
        'UIUpdater.renderProgress(progressData)',
        'VisualizationRenderer.updateVisualization(progressData)'
      ]
    },

    complete: {
      input: { callId: 'string', result: 'object' },
      output: { finalized: 'boolean' },
      collaborators: ['ToolCallManager', 'ResultProcessor', 'ProgressTracker'],
      interactions: [
        'ResultProcessor.process(result)',
        'ToolCallManager.finalizeCall(callId, result)',
        'ProgressTracker.complete(callId)'
      ]
    }
  }
};

// Contract validation helpers
const ContractValidator = {
  validateInteraction(actualCalls, expectedContract) {
    const expectedInteractions = expectedContract.interactions || [];
    
    return expectedInteractions.every(expectedCall => {
      const [collaborator, method] = expectedCall.split('.');
      const methodName = method.split('(')[0];
      
      return actualCalls.some(call => 
        call.collaborator === collaborator && 
        call.method === methodName
      );
    });
  },

  validateInputOutput(input, output, contract) {
    const inputValid = this.validateSchema(input, contract.input);
    const outputValid = this.validateSchema(output, contract.output);
    
    return { inputValid, outputValid };
  },

  validateSchema(data, schema) {
    return Object.entries(schema).every(([key, type]) => {
      return typeof data[key] === type;
    });
  }
};

module.exports = {
  WebSocketCommunicationContract,
  ContractValidator
};