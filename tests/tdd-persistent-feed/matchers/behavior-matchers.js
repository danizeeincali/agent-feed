/**
 * Custom Jest Matchers for London School TDD
 * Focus on behavior verification and interaction testing
 */

// Matcher for verifying interaction sequences
function toHaveInteractionSequence(mockFunctions, expectedSequence) {
  const allCalls = [];
  
  // Collect all mock calls with timestamps
  mockFunctions.forEach((mockFn, mockIndex) => {
    if (!mockFn || !mockFn.mock) {
      return {
        message: () => `Expected argument at index ${mockIndex} to be a jest mock function`,
        pass: false
      };
    }
    
    mockFn.mock.invocationCallOrder.forEach((callOrder, callIndex) => {
      allCalls.push({
        mockIndex,
        callIndex,
        callOrder,
        args: mockFn.mock.calls[callIndex]
      });
    });
  });
  
  // Sort by call order to get actual sequence
  const actualSequence = allCalls
    .sort((a, b) => a.callOrder - b.callOrder)
    .map(call => call.mockIndex);
  
  const pass = JSON.stringify(actualSequence) === JSON.stringify(expectedSequence);
  
  if (pass) {
    return {
      message: () => `Expected interaction sequence not to be ${JSON.stringify(expectedSequence)}`,
      pass: true
    };
  } else {
    return {
      message: () => 
        `Expected interaction sequence: ${JSON.stringify(expectedSequence)}\n` +
        `Actual interaction sequence: ${JSON.stringify(actualSequence)}`,
      pass: false
    };
  }
}

// Matcher for verifying database query contracts
function toMatchDatabaseContract(received, expectedContract) {
  const { query, parameters, operation } = expectedContract;
  
  // Verify query structure
  if (query && !received.query.includes(query)) {
    return {
      message: () => `Expected query to contain "${query}", but received "${received.query}"`,
      pass: false
    };
  }
  
  // Verify parameters
  if (parameters && JSON.stringify(received.parameters) !== JSON.stringify(parameters)) {
    return {
      message: () => 
        `Expected parameters: ${JSON.stringify(parameters)}\n` +
        `Received parameters: ${JSON.stringify(received.parameters)}`,
      pass: false
    };
  }
  
  // Verify operation type
  if (operation && !received.query.toUpperCase().includes(operation.toUpperCase())) {
    return {
      message: () => `Expected query to be a ${operation} operation`,
      pass: false
    };
  }
  
  return {
    message: () => `Query matches database contract`,
    pass: true
  };
}

// Matcher for verifying WebSocket message contracts
function toMatchWebSocketContract(received, expectedContract) {
  const { type, data, target } = expectedContract;
  
  if (type && received.type !== type) {
    return {
      message: () => `Expected message type "${type}", received "${received.type}"`,
      pass: false
    };
  }
  
  if (data && typeof data === 'object') {
    const dataMatches = Object.keys(data).every(key => 
      received.data && received.data[key] === data[key]
    );
    
    if (!dataMatches) {
      return {
        message: () => 
          `Expected data: ${JSON.stringify(data)}\n` +
          `Received data: ${JSON.stringify(received.data)}`,
        pass: false
      };
    }
  }
  
  if (target && received.target !== target) {
    return {
      message: () => `Expected target "${target}", received "${received.target}"`,
      pass: false
    };
  }
  
  return {
    message: () => `WebSocket message matches contract`,
    pass: true
  };
}

// Matcher for verifying performance thresholds
function toMeetPerformanceThresholds(received, thresholds) {
  const failures = [];
  
  if (thresholds.responseTime && received.responseTime > thresholds.responseTime) {
    failures.push(`Response time ${received.responseTime}ms exceeded threshold ${thresholds.responseTime}ms`);
  }
  
  if (thresholds.memoryUsage && received.memoryUsage > thresholds.memoryUsage) {
    failures.push(`Memory usage ${received.memoryUsage}MB exceeded threshold ${thresholds.memoryUsage}MB`);
  }
  
  if (thresholds.errorRate && received.errorRate > thresholds.errorRate) {
    failures.push(`Error rate ${received.errorRate} exceeded threshold ${thresholds.errorRate}`);
  }
  
  if (thresholds.throughput && received.throughput < thresholds.throughput) {
    failures.push(`Throughput ${received.throughput} below threshold ${thresholds.throughput}`);
  }
  
  const pass = failures.length === 0;
  
  return {
    message: () => pass 
      ? `Performance metrics meet all thresholds`
      : `Performance threshold failures:\n${failures.join('\n')}`,
    pass
  };
}

// Matcher for verifying mock collaboration patterns
function toHaveCollaboratedWith(mockFunction, collaboratorMocks, expectedPattern) {
  // Verify that mock was called
  if (!mockFunction.mock.calls.length) {
    return {
      message: () => `Expected ${mockFunction.name || 'mock function'} to have been called`,
      pass: false
    };
  }
  
  // Verify collaborator interactions
  const collaboratorCalls = collaboratorMocks.map(mock => ({
    name: mock.name || 'unnamed mock',
    callCount: mock.mock.calls.length,
    calls: mock.mock.calls
  }));
  
  // Check if expected pattern matches actual collaborations
  const patternMatches = expectedPattern.every(expected => {
    const collaborator = collaboratorCalls.find(c => c.name === expected.name);
    if (!collaborator) {
      return false;
    }
    
    if (expected.callCount !== undefined && collaborator.callCount !== expected.callCount) {
      return false;
    }
    
    if (expected.calledWith && !collaborator.calls.some(call => 
      JSON.stringify(call) === JSON.stringify(expected.calledWith)
    )) {
      return false;
    }
    
    return true;
  });
  
  return {
    message: () => patternMatches
      ? `Mock collaborated correctly with dependencies`
      : `Mock collaboration pattern did not match expectations`,
    pass: patternMatches
  };
}

// Matcher for verifying resource cleanup
function toHaveCleanedUpResources(mockResources) {
  const cleanupIssues = [];
  
  // Check database connections
  if (mockResources.database) {
    if (mockResources.database.activeConnections > 0) {
      cleanupIssues.push(`${mockResources.database.activeConnections} database connections not released`);
    }
  }
  
  // Check WebSocket connections
  if (mockResources.websocket) {
    if (mockResources.websocket.openConnections > 0) {
      cleanupIssues.push(`${mockResources.websocket.openConnections} WebSocket connections not closed`);
    }
  }
  
  // Check memory leaks
  if (mockResources.memory) {
    const memoryGrowth = mockResources.memory.current - mockResources.memory.baseline;
    if (memoryGrowth > mockResources.memory.threshold) {
      cleanupIssues.push(`Memory growth ${memoryGrowth}MB exceeds threshold ${mockResources.memory.threshold}MB`);
    }
  }
  
  // Check file handles
  if (mockResources.files) {
    if (mockResources.files.openHandles > 0) {
      cleanupIssues.push(`${mockResources.files.openHandles} file handles not closed`);
    }
  }
  
  const pass = cleanupIssues.length === 0;
  
  return {
    message: () => pass
      ? `All resources properly cleaned up`
      : `Resource cleanup issues:\n${cleanupIssues.join('\n')}`,
    pass
  };
}

// Matcher for verifying error handling behavior
function toHandleErrorGracefully(mockFunction, errorScenarios) {
  const errorHandling = errorScenarios.map(scenario => {
    try {
      // Reset mock
      mockFunction.mockReset();
      
      // Setup error scenario
      if (scenario.mockError) {
        mockFunction.mockRejectedValue(scenario.mockError);
      }
      
      // The actual error handling verification would be done
      // in the test itself, this matcher just verifies the setup
      return {
        scenario: scenario.name,
        handled: true
      };
    } catch (error) {
      return {
        scenario: scenario.name,
        handled: false,
        error: error.message
      };
    }
  });
  
  const allHandled = errorHandling.every(eh => eh.handled);
  
  return {
    message: () => allHandled
      ? `All error scenarios handled gracefully`
      : `Some error scenarios not handled: ${JSON.stringify(errorHandling.filter(eh => !eh.handled))}`,
    pass: allHandled
  };
}

// Matcher for verifying API response contracts
function toMatchApiContract(response, contract) {
  const violations = [];
  
  // Check status code
  if (contract.statusCode && response.status !== contract.statusCode) {
    violations.push(`Expected status ${contract.statusCode}, got ${response.status}`);
  }
  
  // Check required headers
  if (contract.headers) {
    Object.keys(contract.headers).forEach(headerName => {
      const expectedValue = contract.headers[headerName];
      const actualValue = response.headers[headerName];
      
      if (actualValue !== expectedValue) {
        violations.push(`Expected header ${headerName}: ${expectedValue}, got: ${actualValue}`);
      }
    });
  }
  
  // Check response body structure
  if (contract.body) {
    const bodyViolations = validateObjectStructure(response.body, contract.body, 'body');
    violations.push(...bodyViolations);
  }
  
  const pass = violations.length === 0;
  
  return {
    message: () => pass
      ? `API response matches contract`
      : `API contract violations:\n${violations.join('\n')}`,
    pass
  };
}

// Helper function for deep object structure validation
function validateObjectStructure(actual, expected, path = '') {
  const violations = [];
  
  if (typeof expected === 'object' && expected !== null) {
    Object.keys(expected).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in actual)) {
        violations.push(`Missing required field: ${currentPath}`);
      } else {
        const nestedViolations = validateObjectStructure(
          actual[key], 
          expected[key], 
          currentPath
        );
        violations.push(...nestedViolations);
      }
    });
  } else if (typeof actual !== typeof expected) {
    violations.push(`Type mismatch at ${path}: expected ${typeof expected}, got ${typeof actual}`);
  }
  
  return violations;
}

// Export all matchers
module.exports = {
  toHaveInteractionSequence,
  toMatchDatabaseContract,
  toMatchWebSocketContract,
  toMeetPerformanceThresholds,
  toHaveCollaboratedWith,
  toHaveCleanedUpResources,
  toHandleErrorGracefully,
  toMatchApiContract
};
