/**
 * Custom Jest Serializers for TDD London School Tests
 * Helps with snapshot testing and mock verification output
 */

// Mock function serializer for better test output
export const mockFunctionSerializer = {
  test: (val: any) => {
    return val && typeof val === 'function' && val._isMockFunction;
  },

  serialize: (val: any) => {
    const calls = val.mock.calls;
    const results = val.mock.results;
    const instances = val.mock.instances;

    let output = 'Mock Function {\n';

    if (calls.length > 0) {
      output += '  calls: [\n';
      calls.forEach((call: any[], index: number) => {
        output += `    [${index}]: [${call.map(arg => JSON.stringify(arg)).join(', ')}],\n`;
      });
      output += '  ],\n';
    }

    if (results.length > 0) {
      output += '  results: [\n';
      results.forEach((result: any, index: number) => {
        if (result.type === 'return') {
          output += `    [${index}]: returned ${JSON.stringify(result.value)},\n`;
        } else if (result.type === 'throw') {
          output += `    [${index}]: threw ${result.value.message || result.value},\n`;
        }
      });
      output += '  ],\n';
    }

    output += `  callCount: ${calls.length}\n`;
    output += '}';

    return output;
  }
};

// Error serializer for consistent error display
export const errorSerializer = {
  test: (val: any) => {
    return val instanceof Error;
  },

  serialize: (val: Error) => {
    return `Error: ${val.message}\n  Stack: ${val.stack?.split('\n')[1]?.trim() || 'No stack trace'}`;
  }
};

// Promise serializer for async test results
export const promiseSerializer = {
  test: (val: any) => {
    return val && typeof val.then === 'function';
  },

  serialize: (val: Promise<any>) => {
    return 'Promise { <pending> }';
  }
};

// London School interaction serializer
export const interactionSerializer = {
  test: (val: any) => {
    return val && val._isInteractionRecord;
  },

  serialize: (val: any) => {
    let output = 'Interaction Record {\n';
    output += `  method: "${val.method}",\n`;
    output += `  args: [${val.args.map((arg: any) => JSON.stringify(arg)).join(', ')}],\n`;
    output += `  timestamp: ${val.timestamp},\n`;
    output += `  order: ${val.order}\n`;
    output += '}';
    return output;
  }
};

// WebSocket message serializer
export const webSocketMessageSerializer = {
  test: (val: any) => {
    return val && val.type && (val.data !== undefined);
  },

  serialize: (val: any) => {
    let output = 'WebSocket Message {\n';
    output += `  type: "${val.type}",\n`;

    if (val.instanceId) {
      output += `  instanceId: "${val.instanceId}",\n`;
    }

    if (val.data) {
      if (typeof val.data === 'object') {
        output += `  data: ${JSON.stringify(val.data, null, 4).replace(/\n/g, '\n    ')},\n`;
      } else {
        output += `  data: "${val.data}",\n`;
      }
    }

    if (val.timestamp) {
      output += `  timestamp: ${val.timestamp}\n`;
    }

    output += '}';
    return output;
  }
};

// Claude instance serializer
export const claudeInstanceSerializer = {
  test: (val: any) => {
    return val && val.id && val.workspaceDir && val.status;
  },

  serialize: (val: any) => {
    let output = 'Claude Instance {\n';
    output += `  id: "${val.id}",\n`;
    output += `  status: "${val.status}",\n`;
    output += `  workspaceDir: "${val.workspaceDir}",\n`;

    if (val.pid) {
      output += `  pid: ${val.pid},\n`;
    }

    if (val.createdAt) {
      output += `  createdAt: ${val.createdAt.toISOString()},\n`;
    }

    if (val.config) {
      output += `  config: ${JSON.stringify(val.config, null, 4).replace(/\n/g, '\n    ')}\n`;
    }

    output += '}';
    return output;
  }
};

// File operation serializer
export const fileOperationSerializer = {
  test: (val: any) => {
    return val && val.path && val.operation;
  },

  serialize: (val: any) => {
    let output = 'File Operation {\n';
    output += `  operation: "${val.operation}",\n`;
    output += `  path: "${val.path}",\n`;

    if (val.content) {
      const truncatedContent = val.content.length > 100
        ? val.content.substring(0, 100) + '...'
        : val.content;
      output += `  content: "${truncatedContent}",\n`;
    }

    if (val.success !== undefined) {
      output += `  success: ${val.success},\n`;
    }

    if (val.error) {
      output += `  error: "${val.error}",\n`;
    }

    if (val.requiresPermission) {
      output += `  requiresPermission: ${val.requiresPermission}\n`;
    }

    output += '}';
    return output;
  }
};

// Test result serializer for London School behavior verification
export const behaviorVerificationSerializer = {
  test: (val: any) => {
    return val && val._isBehaviorVerificationResult;
  },

  serialize: (val: any) => {
    let output = 'Behavior Verification {\n';
    output += `  verified: ${val.verified},\n`;
    output += `  expectedBehavior: "${val.expectedBehavior}",\n`;
    output += `  actualBehavior: "${val.actualBehavior}",\n`;

    if (val.collaborators) {
      output += '  collaborators: [\n';
      val.collaborators.forEach((collab: any) => {
        output += `    { name: "${collab.name}", called: ${collab.called} },\n`;
      });
      output += '  ],\n';
    }

    if (val.interactionSequence) {
      output += `  interactionSequence: [${val.interactionSequence.map((s: string) => `"${s}"`).join(', ')}]\n`;
    }

    output += '}';
    return output;
  }
};

// Map serializer for better output of internal state
export const mapSerializer = {
  test: (val: any) => {
    return val instanceof Map;
  },

  serialize: (val: Map<any, any>) => {
    const entries = Array.from(val.entries());
    if (entries.length === 0) {
      return 'Map {}';
    }

    let output = 'Map {\n';
    entries.forEach(([key, value]) => {
      const keyStr = typeof key === 'string' ? `"${key}"` : JSON.stringify(key);
      const valueStr = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
      output += `  ${keyStr} => ${valueStr},\n`;
    });
    output += '}';

    return output;
  }
};

// Set serializer
export const setSerializer = {
  test: (val: any) => {
    return val instanceof Set;
  },

  serialize: (val: Set<any>) => {
    const values = Array.from(val);
    if (values.length === 0) {
      return 'Set {}';
    }

    const valuesStr = values.map(v =>
      typeof v === 'string' ? `"${v}"` : JSON.stringify(v)
    ).join(', ');

    return `Set { ${valuesStr} }`;
  }
};

// Export all serializers
export default {
  mockFunctionSerializer,
  errorSerializer,
  promiseSerializer,
  interactionSerializer,
  webSocketMessageSerializer,
  claudeInstanceSerializer,
  fileOperationSerializer,
  behaviorVerificationSerializer,
  mapSerializer,
  setSerializer
};