/**
 * TDD London School - Swarm Contract Monitor
 * Monitors and validates contracts between test agents
 */

interface InteractionRecord {
  method: string;
  args: any[];
  timestamp: Date;
  callCount: number;
}

interface ContractExpectation {
  method: string;
  expectedCalls: number;
  expectedArgs?: any[];
  callOrder?: number;
}

interface ContractValidationResult {
  valid: boolean;
  violations: ContractViolation[];
  summary: ContractSummary;
}

interface ContractViolation {
  type: 'missing_call' | 'unexpected_call' | 'wrong_args' | 'wrong_order';
  method: string;
  expected: any;
  actual: any;
  severity: 'error' | 'warning';
}

interface ContractSummary {
  totalExpectations: number;
  validatedExpectations: number;
  violations: number;
  warnings: number;
}

export class SwarmContractMonitor {
  private contracts: Map<string, ContractExpectation[]> = new Map();
  private interactions: Map<string, InteractionRecord[]> = new Map();
  private violations: ContractViolation[] = [];

  /**
   * Register a contract for a mock object
   */
  registerContract(mockId: string, expectations: ContractExpectation[]): void {
    this.contracts.set(mockId, expectations);
    if (!this.interactions.has(mockId)) {
      this.interactions.set(mockId, []);
    }
  }

  /**
   * Record an interaction with a mock
   */
  recordInteraction(mockId: string, interaction: InteractionRecord): void {
    if (!this.interactions.has(mockId)) {
      this.interactions.set(mockId, []);
    }
    this.interactions.get(mockId)!.push(interaction);
  }

  /**
   * Verify all registered contracts
   */
  verifyContracts(): ContractValidationResult {
    this.violations = [];
    let totalExpectations = 0;
    let validatedExpectations = 0;

    this.contracts.forEach((expectations, mockId) => {
      const interactions = this.interactions.get(mockId) || [];
      totalExpectations += expectations.length;

      expectations.forEach(expectation => {
        const matchingInteractions = interactions.filter(
          interaction => interaction.method === expectation.method
        );

        // Check call count
        if (matchingInteractions.length !== expectation.expectedCalls) {
          this.violations.push({
            type: 'missing_call',
            method: `${mockId}.${expectation.method}`,
            expected: expectation.expectedCalls,
            actual: matchingInteractions.length,
            severity: 'error'
          });
        } else {
          validatedExpectations++;
        }

        // Check arguments if specified
        if (expectation.expectedArgs) {
          matchingInteractions.forEach(interaction => {
            if (!this.areArgsEqual(interaction.args, expectation.expectedArgs!)) {
              this.violations.push({
                type: 'wrong_args',
                method: `${mockId}.${expectation.method}`,
                expected: expectation.expectedArgs,
                actual: interaction.args,
                severity: 'warning'
              });
            }
          });
        }
      });

      // Check call order if specified
      this.verifyCallOrder(mockId, expectations, interactions);
    });

    const warnings = this.violations.filter(v => v.severity === 'warning').length;

    return {
      valid: this.violations.filter(v => v.severity === 'error').length === 0,
      violations: this.violations,
      summary: {
        totalExpectations,
        validatedExpectations,
        violations: this.violations.length,
        warnings
      }
    };
  }

  /**
   * Generate a human-readable contract report
   */
  generateReport(): string {
    const result = this.verifyContracts();
    
    let report = `\n=== Swarm Contract Validation Report ===\n`;
    report += `Total Expectations: ${result.summary.totalExpectations}\n`;
    report += `Validated: ${result.summary.validatedExpectations}\n`;
    report += `Violations: ${result.summary.violations}\n`;
    report += `Warnings: ${result.summary.warnings}\n`;
    report += `Status: ${result.valid ? 'PASSED' : 'FAILED'}\n\n`;

    if (result.violations.length > 0) {
      report += `=== Violations ===\n`;
      result.violations.forEach(violation => {
        report += `${violation.severity.toUpperCase()}: ${violation.type}\n`;
        report += `  Method: ${violation.method}\n`;
        report += `  Expected: ${JSON.stringify(violation.expected)}\n`;
        report += `  Actual: ${JSON.stringify(violation.actual)}\n\n`;
      });
    }

    // Add interaction summary
    report += `=== Interaction Summary ===\n`;
    this.interactions.forEach((interactions, mockId) => {
      report += `${mockId}:\n`;
      interactions.forEach(interaction => {
        report += `  ${interaction.method}(${interaction.args.map(arg => JSON.stringify(arg)).join(', ')}) - ${interaction.timestamp.toISOString()}\n`;
      });
      report += '\n';
    });

    return report;
  }

  /**
   * Clear all recorded interactions and violations
   */
  reset(): void {
    this.interactions.clear();
    this.violations = [];
  }

  /**
   * Get violation count by severity
   */
  getViolationCount(severity?: 'error' | 'warning'): number {
    if (!severity) return this.violations.length;
    return this.violations.filter(v => v.severity === severity).length;
  }

  private verifyCallOrder(mockId: string, expectations: ContractExpectation[], interactions: InteractionRecord[]): void {
    const orderedExpectations = expectations
      .filter(e => e.callOrder !== undefined)
      .sort((a, b) => a.callOrder! - b.callOrder!);

    if (orderedExpectations.length === 0) return;

    const orderedInteractions = interactions
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let expectationIndex = 0;
    for (const interaction of orderedInteractions) {
      if (expectationIndex >= orderedExpectations.length) break;
      
      const currentExpectation = orderedExpectations[expectationIndex];
      if (interaction.method === currentExpectation.method) {
        expectationIndex++;
      }
    }

    if (expectationIndex < orderedExpectations.length) {
      const missingMethod = orderedExpectations[expectationIndex];
      this.violations.push({
        type: 'wrong_order',
        method: `${mockId}.${missingMethod.method}`,
        expected: `Call order ${missingMethod.callOrder}`,
        actual: `Missing or out of order`,
        severity: 'error'
      });
    }
  }

  private areArgsEqual(actual: any[], expected: any[]): boolean {
    if (actual.length !== expected.length) return false;
    
    return actual.every((arg, index) => {
      const expectedArg = expected[index];
      if (typeof expectedArg === 'object' && expectedArg !== null) {
        return JSON.stringify(arg) === JSON.stringify(expectedArg);
      }
      return arg === expectedArg;
    });
  }
}

// Global contract monitor instance
export const swarmContractMonitor = new SwarmContractMonitor();

// Jest matcher for contract validation
expect.extend({
  toSatisfyContract(mockObject: any, expectations: ContractExpectation[]) {
    const mockId = mockObject._swarmType || 'unknown';
    swarmContractMonitor.registerContract(mockId, expectations);
    
    // Record all interactions from mock history
    if (mockObject._interactions) {
      mockObject._interactions.forEach((interaction: InteractionRecord) => {
        swarmContractMonitor.recordInteraction(mockId, interaction);
      });
    }
    
    const result = swarmContractMonitor.verifyContracts();
    const pass = result.valid;

    return {
      message: () => pass 
        ? `Expected contract to fail validation`
        : `Contract validation failed:\n${swarmContractMonitor.generateReport()}`,
      pass
    };
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toSatisfyContract(expectations: ContractExpectation[]): R;
    }
  }
}