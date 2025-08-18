/**
 * Contract Verifier - London School TDD Contract Validation
 * Validates contracts between Claude Code and AgentLink systems
 */

export class ContractVerifier {
  constructor() {
    this.contractRegistry = new Map();
    this.violationHistory = [];
  }

  /**
   * Register a contract definition
   */
  registerContract(name, definition) {
    this.contractRegistry.set(name, {
      ...definition,
      registeredAt: Date.now()
    });
  }

  /**
   * Verify a contract chain (sequence of related contracts)
   */
  verifyContractChain(chain) {
    const violations = [];
    
    for (let i = 0; i < chain.length; i++) {
      const step = chain[i];
      const violation = this.verifySingleContract(step);
      
      if (violation) {
        violations.push({
          step: i,
          contract: step,
          violation
        });
      }
      
      // Verify data flow between steps
      if (i > 0) {
        const flowViolation = this.verifyDataFlow(chain[i - 1], step);
        if (flowViolation) {
          violations.push({
            step: i,
            type: 'data_flow',
            violation: flowViolation
          });
        }
      }
    }
    
    if (violations.length > 0) {
      this.violationHistory.push({
        chain,
        violations,
        timestamp: Date.now()
      });
      
      throw new Error(`Contract chain violations: ${JSON.stringify(violations)}`);
    }
    
    return true;
  }

  /**
   * Verify a single contract
   */
  verifySingleContract(contractStep) {
    const { input, output, contract } = contractStep;
    
    if (!contract) {
      return null; // No contract to verify
    }
    
    // Verify input contract
    if (contract.input) {
      const inputViolation = this.verifySchema(input, contract.input, 'input');
      if (inputViolation) {
        return inputViolation;
      }
    }
    
    // Verify output contract
    if (contract.output && output) {
      const outputViolation = this.verifySchema(output, contract.output, 'output');
      if (outputViolation) {
        return outputViolation;
      }
    }
    
    // Verify behavioral contract
    if (contract.behavior) {
      const behaviorViolation = this.verifyBehavior(contractStep, contract.behavior);
      if (behaviorViolation) {
        return behaviorViolation;
      }
    }
    
    return null;
  }

  /**
   * Verify schema compliance
   */
  verifySchema(data, schema, type = 'data') {
    if (typeof schema === 'string') {
      return this.verifyType(data, schema, type);
    }
    
    if (Array.isArray(schema)) {
      if (!Array.isArray(data)) {
        return `${type} should be array, got ${typeof data}`;
      }
      
      // Verify array elements
      for (let i = 0; i < data.length; i++) {
        const elementViolation = this.verifySchema(data[i], schema[0], `${type}[${i}]`);
        if (elementViolation) {
          return elementViolation;
        }
      }
      
      return null;
    }
    
    if (typeof schema === 'object' && schema !== null) {
      if (typeof data !== 'object' || data === null) {
        return `${type} should be object, got ${typeof data}`;
      }
      
      // Verify object properties
      for (const [key, valueSchema] of Object.entries(schema)) {
        const isOptional = key.endsWith('?');
        const actualKey = isOptional ? key.slice(0, -1) : key;
        
        if (!isOptional && !(actualKey in data)) {
          return `${type} missing required property: ${actualKey}`;
        }
        
        if (actualKey in data) {
          const propertyViolation = this.verifySchema(
            data[actualKey], 
            valueSchema, 
            `${type}.${actualKey}`
          );
          if (propertyViolation) {
            return propertyViolation;
          }
        }
      }
      
      return null;
    }
    
    return `Invalid schema definition: ${schema}`;
  }

  /**
   * Verify type compliance
   */
  verifyType(value, expectedType, context = 'value') {
    const actualType = this.getValueType(value);
    
    if (expectedType.endsWith('?')) {
      // Optional type
      const baseType = expectedType.slice(0, -1);
      if (value === null || value === undefined) {
        return null; // Optional value is null/undefined
      }
      return this.verifyType(value, baseType, context);
    }
    
    if (expectedType.includes('|')) {
      // Union type
      const types = expectedType.split('|').map(t => t.trim());
      const matches = types.some(type => this.getValueType(value) === type);
      if (!matches) {
        return `${context} should be one of [${types.join(', ')}], got ${actualType}`;
      }
      return null;
    }
    
    if (actualType !== expectedType) {
      return `${context} should be ${expectedType}, got ${actualType}`;
    }
    
    return null;
  }

  /**
   * Get the type of a value
   */
  getValueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value instanceof RegExp) return 'regex';
    return typeof value;
  }

  /**
   * Verify behavioral contract
   */
  verifyBehavior(contractStep, behaviorContract) {
    const { mockCalls, timing, sideEffects } = contractStep;
    
    // Verify timing constraints
    if (behaviorContract.timing) {
      const timingViolation = this.verifyTiming(timing, behaviorContract.timing);
      if (timingViolation) {
        return timingViolation;
      }
    }
    
    // Verify side effects
    if (behaviorContract.sideEffects) {
      const sideEffectViolation = this.verifySideEffects(
        sideEffects, 
        behaviorContract.sideEffects
      );
      if (sideEffectViolation) {
        return sideEffectViolation;
      }
    }
    
    // Verify idempotency
    if (behaviorContract.idempotent) {
      const idempotencyViolation = this.verifyIdempotency(mockCalls);
      if (idempotencyViolation) {
        return idempotencyViolation;
      }
    }
    
    return null;
  }

  /**
   * Verify timing constraints
   */
  verifyTiming(actualTiming, expectedTiming) {
    if (expectedTiming.maxDuration && actualTiming.duration > expectedTiming.maxDuration) {
      return `Operation took ${actualTiming.duration}ms, expected max ${expectedTiming.maxDuration}ms`;
    }
    
    if (expectedTiming.minDuration && actualTiming.duration < expectedTiming.minDuration) {
      return `Operation took ${actualTiming.duration}ms, expected min ${expectedTiming.minDuration}ms`;
    }
    
    return null;
  }

  /**
   * Verify side effects
   */
  verifySideEffects(actualSideEffects, expectedSideEffects) {
    if (!actualSideEffects || actualSideEffects.length === 0) {
      if (expectedSideEffects.length > 0) {
        return `Expected ${expectedSideEffects.length} side effects, got 0`;
      }
      return null;
    }
    
    for (const expected of expectedSideEffects) {
      const matching = actualSideEffects.find(actual => 
        actual.system === expected.system && 
        actual.action === expected.action
      );
      
      if (!matching) {
        return `Missing expected side effect: ${expected.system}.${expected.action}`;
      }
      
      if (expected.data) {
        const dataViolation = this.verifySchema(
          matching.data, 
          expected.data, 
          `side effect ${expected.system}.${expected.action} data`
        );
        if (dataViolation) {
          return dataViolation;
        }
      }
    }
    
    return null;
  }

  /**
   * Verify idempotency
   */
  verifyIdempotency(mockCalls) {
    if (!mockCalls || mockCalls.length < 2) {
      return null; // Need at least 2 calls to verify idempotency
    }
    
    const groupedCalls = this.groupCallsBySignature(mockCalls);
    
    for (const [signature, calls] of groupedCalls) {
      if (calls.length > 1) {
        const firstResult = calls[0].result;
        const allSame = calls.every(call => 
          this.deepEqual(call.result, firstResult)
        );
        
        if (!allSame) {
          return `Idempotency violation for ${signature}: different results for same input`;
        }
      }
    }
    
    return null;
  }

  /**
   * Group mock calls by their signature (method + args)
   */
  groupCallsBySignature(mockCalls) {
    const groups = new Map();
    
    for (const call of mockCalls) {
      const signature = `${call.method}(${JSON.stringify(call.args)})`;
      if (!groups.has(signature)) {
        groups.set(signature, []);
      }
      groups.get(signature).push(call);
    }
    
    return groups;
  }

  /**
   * Verify data flow between contract steps
   */
  verifyDataFlow(previousStep, currentStep) {
    if (!previousStep.output || !currentStep.input) {
      return null; // No data flow to verify
    }
    
    // Check if output data is used as input
    const outputData = this.extractDataValues(previousStep.output);
    const inputData = this.extractDataValues(currentStep.input);
    
    // Look for matching values that indicate data flow
    const sharedValues = outputData.filter(value => 
      inputData.some(inputValue => this.deepEqual(value, inputValue))
    );
    
    if (sharedValues.length === 0) {
      return 'No data flow detected between contract steps';
    }
    
    return null;
  }

  /**
   * Extract data values from an object for flow analysis
   */
  extractDataValues(obj, visited = new Set()) {
    if (visited.has(obj)) {
      return []; // Avoid circular references
    }
    
    if (obj === null || typeof obj !== 'object') {
      return [obj];
    }
    
    visited.add(obj);
    const values = [];
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        values.push(...this.extractDataValues(item, visited));
      }
    } else {
      for (const value of Object.values(obj)) {
        values.push(...this.extractDataValues(value, visited));
      }
    }
    
    visited.delete(obj);
    return values;
  }

  /**
   * Deep equality check
   */
  deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && this.deepEqual(a[key], b[key])
    );
  }

  /**
   * Get contract violation history
   */
  getViolationHistory() {
    return [...this.violationHistory];
  }

  /**
   * Generate contract compliance report
   */
  generateComplianceReport() {
    const totalContracts = this.contractRegistry.size;
    const totalViolations = this.violationHistory.length;
    const complianceRate = totalContracts > 0 ? 
      ((totalContracts - totalViolations) / totalContracts) * 100 : 100;
    
    return {
      totalContracts,
      totalViolations,
      complianceRate: Math.round(complianceRate * 100) / 100,
      registeredContracts: Array.from(this.contractRegistry.keys()),
      recentViolations: this.violationHistory.slice(-10),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate recommendations based on violation history
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.violationHistory.length > 0) {
      const violationTypes = this.violationHistory
        .flatMap(v => v.violations)
        .reduce((acc, v) => {
          const type = v.violation ? 'schema' : v.type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
      
      const mostCommon = Object.entries(violationTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      mostCommon.forEach(([type, count]) => {
        recommendations.push({
          type: 'fix_violations',
          message: `Address ${count} ${type} violations`,
          priority: count > 5 ? 'high' : 'medium'
        });
      });
    }
    
    if (this.contractRegistry.size < 10) {
      recommendations.push({
        type: 'add_contracts',
        message: 'Consider adding more contract definitions for better coverage',
        priority: 'low'
      });
    }
    
    return recommendations;
  }
}

export default ContractVerifier;