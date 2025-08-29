/**
 * Mock Factory for SSE Status Streaming Tests
 * London School TDD approach - focus on interactions and contracts
 */
class MockFactory {
  constructor() {
    this.createdMocks = new Map();
    this.interactions = [];
  }

  reset() {
    this.createdMocks.clear();
    this.interactions = [];
  }

  createSSEConnectionMock(name = 'SSEConnection') {
    const mock = {
      connect: jest.fn().mockName(`${name}.connect`),
      disconnect: jest.fn().mockName(`${name}.disconnect`),
      onMessage: jest.fn().mockName(`${name}.onMessage`),
      onError: jest.fn().mockName(`${name}.onError`),
      onClose: jest.fn().mockName(`${name}.onClose`),
      readyState: jest.fn().mockName(`${name}.readyState`),
      url: null,
      _callbacks: {
        message: [],
        error: [],
        close: []
      }
    };

    // Setup realistic behavior
    mock.connect.mockImplementation(async (url, options = {}) => {
      mock.url = url;
      mock.readyState.mockReturnValue(1); // OPEN
      
      // Simulate connection establishment
      setTimeout(() => {
        mock._callbacks.message.forEach(cb => cb({
          data: JSON.stringify({ type: 'connected', timestamp: new Date() })
        }));
      }, 0);
    });

    mock.onMessage.mockImplementation((callback) => {
      mock._callbacks.message.push(callback);
    });

    mock.onError.mockImplementation((callback) => {
      mock._callbacks.error.push(callback);
    });

    mock.onClose.mockImplementation((callback) => {
      mock._callbacks.close.push(callback);
    });

    mock.disconnect.mockImplementation(async () => {
      mock.readyState.mockReturnValue(3); // CLOSED
      mock._callbacks.close.forEach(cb => cb());
    });

    this._trackMock(name, mock);
    return mock;
  }

  createStatusHandlerMock(name = 'StatusHandler') {
    const mock = {
      handleStatusUpdate: jest.fn().mockName(`${name}.handleStatusUpdate`),
      handleTransition: jest.fn().mockName(`${name}.handleTransition`),
      validateStatus: jest.fn().mockName(`${name}.validateStatus`),
      getCurrentStatus: jest.fn().mockName(`${name}.getCurrentStatus`),
      getStatusHistory: jest.fn().mockName(`${name}.getStatusHistory`),
      _currentStatus: 'idle',
      _statusHistory: []
    };

    // Setup realistic behavior
    mock.handleStatusUpdate.mockImplementation(async (status) => {
      const previousStatus = mock._currentStatus;
      mock._currentStatus = status.state;
      mock._statusHistory.push({ ...status, timestamp: new Date() });
      
      if (previousStatus !== status.state) {
        await mock.handleTransition(previousStatus, status.state);
      }
    });

    mock.handleTransition.mockImplementation(async (from, to) => {
      // Validate transition
      const validTransitions = {
        idle: ['starting', 'error'],
        starting: ['running', 'error'],
        running: ['stopping', 'error'],
        stopping: ['idle', 'error'],
        error: ['idle', 'starting']
      };

      return validTransitions[from]?.includes(to) || false;
    });

    mock.validateStatus.mockImplementation((status) => {
      const requiredFields = ['state', 'instanceId', 'timestamp'];
      return requiredFields.every(field => status.hasOwnProperty(field));
    });

    mock.getCurrentStatus.mockImplementation(() => mock._currentStatus);
    mock.getStatusHistory.mockImplementation(() => [...mock._statusHistory]);

    this._trackMock(name, mock);
    return mock;
  }

  createBroadcasterMock(name = 'Broadcaster') {
    const mock = {
      broadcast: jest.fn().mockName(`${name}.broadcast`),
      subscribe: jest.fn().mockName(`${name}.subscribe`),
      unsubscribe: jest.fn().mockName(`${name}.unsubscribe`),
      getSubscribers: jest.fn().mockName(`${name}.getSubscribers`),
      _subscribers: new Map(),
      _broadcastHistory: []
    };

    // Setup realistic behavior
    mock.broadcast.mockImplementation(async (event, data) => {
      mock._broadcastHistory.push({ event, data, timestamp: new Date() });
      
      const subscribers = mock._subscribers.get(event) || [];
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Subscriber error for event ${event}:`, error);
        }
      });
    });

    mock.subscribe.mockImplementation((event, callback) => {
      if (!mock._subscribers.has(event)) {
        mock._subscribers.set(event, []);
      }
      mock._subscribers.get(event).push(callback);
      
      // Return unsubscribe function
      return () => mock.unsubscribe(event, callback);
    });

    mock.unsubscribe.mockImplementation((event, callback) => {
      const subscribers = mock._subscribers.get(event) || [];
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    });

    mock.getSubscribers.mockImplementation((event) => {
      return mock._subscribers.get(event) || [];
    });

    this._trackMock(name, mock);
    return mock;
  }

  createReconnectionManagerMock(name = 'ReconnectionManager') {
    const mock = {
      start: jest.fn().mockName(`${name}.start`),
      stop: jest.fn().mockName(`${name}.stop`),
      retry: jest.fn().mockName(`${name}.retry`),
      onReconnect: jest.fn().mockName(`${name}.onReconnect`),
      isReconnecting: jest.fn().mockName(`${name}.isReconnecting`),
      _isReconnecting: false,
      _retryCount: 0,
      _maxRetries: 3,
      _reconnectCallbacks: []
    };

    mock.start.mockImplementation(() => {
      mock._isReconnecting = true;
      mock._retryCount = 0;
    });

    mock.stop.mockImplementation(() => {
      mock._isReconnecting = false;
      mock._retryCount = 0;
    });

    mock.retry.mockImplementation(async () => {
      if (mock._retryCount >= mock._maxRetries) {
        throw new Error('Max retries exceeded');
      }
      
      mock._retryCount++;
      
      // Simulate reconnection attempt
      const success = mock._retryCount <= 2; // Succeed on first or second retry
      if (success) {
        mock._isReconnecting = false;
        mock._reconnectCallbacks.forEach(cb => cb());
      }
      
      return success;
    });

    mock.onReconnect.mockImplementation((callback) => {
      mock._reconnectCallbacks.push(callback);
    });

    mock.isReconnecting.mockImplementation(() => mock._isReconnecting);

    this._trackMock(name, mock);
    return mock;
  }

  createInstanceTrackerMock(name = 'InstanceTracker') {
    const mock = {
      addInstance: jest.fn().mockName(`${name}.addInstance`),
      removeInstance: jest.fn().mockName(`${name}.removeInstance`),
      updateInstanceStatus: jest.fn().mockName(`${name}.updateInstanceStatus`),
      getInstanceStatus: jest.fn().mockName(`${name}.getInstanceStatus`),
      getAllInstances: jest.fn().mockName(`${name}.getAllInstances`),
      _instances: new Map()
    };

    mock.addInstance.mockImplementation((instanceId, initialStatus) => {
      mock._instances.set(instanceId, {
        id: instanceId,
        status: initialStatus || 'idle',
        lastUpdate: new Date(),
        history: []
      });
    });

    mock.removeInstance.mockImplementation((instanceId) => {
      return mock._instances.delete(instanceId);
    });

    mock.updateInstanceStatus.mockImplementation((instanceId, status) => {
      const instance = mock._instances.get(instanceId);
      if (instance) {
        instance.history.push({ status: instance.status, timestamp: instance.lastUpdate });
        instance.status = status;
        instance.lastUpdate = new Date();
      }
    });

    mock.getInstanceStatus.mockImplementation((instanceId) => {
      return mock._instances.get(instanceId);
    });

    mock.getAllInstances.mockImplementation(() => {
      return Array.from(mock._instances.values());
    });

    this._trackMock(name, mock);
    return mock;
  }

  _trackMock(name, mock) {
    this.createdMocks.set(name, mock);
    
    // Add interaction tracking to all methods
    Object.keys(mock).forEach(key => {
      if (jest.isMockFunction(mock[key])) {
        const originalMock = mock[key];
        mock[key] = jest.fn((...args) => {
          const result = originalMock.apply(mock, args);
          this.interactions.push({
            mock: name,
            method: key,
            args,
            result,
            timestamp: new Date()
          });
          return result;
        }).mockName(`${name}.${key}`);
        
        // Copy mock implementation
        Object.setPrototypeOf(mock[key], originalMock);
      }
    });
  }

  verifyAllInteractions() {
    // Verify that all tracked mocks had meaningful interactions
    const mockStats = new Map();
    
    this.interactions.forEach(interaction => {
      const key = `${interaction.mock}.${interaction.method}`;
      mockStats.set(key, (mockStats.get(key) || 0) + 1);
    });

    // Log interaction summary for swarm coordination
    if (global.swarmCoordinator) {
      mockStats.forEach((count, method) => {
        global.swarmCoordinator.logInteraction(method.split('.')[0], method.split('.')[1], [], count);
      });
    }
  }

  getMockStats() {
    return {
      totalMocks: this.createdMocks.size,
      totalInteractions: this.interactions.length,
      mocks: Array.from(this.createdMocks.keys())
    };
  }
}

module.exports = { MockFactory };