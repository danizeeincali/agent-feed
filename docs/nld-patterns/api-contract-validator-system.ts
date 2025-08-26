/**
 * NLD API Contract Validator
 * Validates frontend-backend API contracts to prevent runtime failures
 */

interface APIEndpoint {
  path: string;
  method: string;
  expectedRequest?: any;
  expectedResponse?: any;
  description: string;
}

interface ContractValidationResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  actualResponse?: any;
  expectedResponse?: any;
}

class NLDAPIContractValidator {
  private baseUrl: string;
  private validationResults: ContractValidationResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // Define expected API contracts based on ClaudeInstanceManager.tsx analysis
  private getExpectedContracts(): APIEndpoint[] {
    return [
      {
        path: '/api/claude/instances',
        method: 'GET',
        expectedResponse: {
          success: true,
          instances: [{
            id: 'string',
            name: 'string', 
            status: 'starting | running | stopped | error',
            pid: 'number',
            startTime: 'string'
          }]
        },
        description: 'Fetch all Claude instances for ClaudeInstanceManager'
      },
      {
        path: '/api/claude/instances',
        method: 'POST',
        expectedRequest: {
          command: ['string'],
          workingDirectory: 'string'
        },
        expectedResponse: {
          success: true,
          instanceId: 'string',
          message: 'string'
        },
        description: 'Create new Claude instance from ClaudeInstanceManager buttons'
      },
      {
        path: '/api/claude/instances/{id}',
        method: 'DELETE',
        expectedResponse: {
          success: true,
          message: 'string'
        },
        description: 'Terminate Claude instance'
      },
      {
        path: '/health',
        method: 'GET',
        expectedResponse: {
          status: 'string',
          timestamp: 'string'
        },
        description: 'Health check endpoint'
      }
    ];
  }

  public async validateContracts(): Promise<ContractValidationResult[]> {
    const contracts = this.getExpectedContracts();
    const results: ContractValidationResult[] = [];

    console.info('🔍 NLD API Contract Validation starting...');

    for (const contract of contracts) {
      const result = await this.validateSingleContract(contract);
      results.push(result);
      this.validationResults.push(result);
    }

    this.generateValidationReport(results);
    return results;
  }

  private async validateSingleContract(contract: APIEndpoint): Promise<ContractValidationResult> {
    const url = `${this.baseUrl}${contract.path.replace('{id}', 'test-instance-id')}`;
    
    try {
      const response = await fetch(url, {
        method: contract.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: contract.expectedRequest ? JSON.stringify(contract.expectedRequest) : undefined
      });

      if (!response.ok) {
        return {
          endpoint: contract.path,
          method: contract.method,
          status: 'FAIL',
          message: `HTTP ${response.status}: ${response.statusText}`,
          expectedResponse: contract.expectedResponse
        };
      }

      const actualResponse = await response.json();
      const validationResult = this.validateResponseStructure(actualResponse, contract.expectedResponse);

      return {
        endpoint: contract.path,
        method: contract.method,
        status: validationResult.valid ? 'PASS' : 'WARNING',
        message: validationResult.valid ? 'Contract validated successfully' : validationResult.message,
        actualResponse,
        expectedResponse: contract.expectedResponse
      };

    } catch (error) {
      return {
        endpoint: contract.path,
        method: contract.method,
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Network error',
        expectedResponse: contract.expectedResponse
      };
    }
  }

  private validateResponseStructure(actual: any, expected: any): {valid: boolean, message: string} {
    if (!expected) {
      return { valid: true, message: 'No response structure validation required' };
    }

    const missingFields = this.findMissingFields(actual, expected);
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    return { valid: true, message: 'Response structure matches expected contract' };
  }

  private findMissingFields(actual: any, expected: any, path: string = ''): string[] {
    const missing: string[] = [];

    if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
      for (const key in expected) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in actual)) {
          missing.push(currentPath);
        } else if (typeof expected[key] === 'object' && expected[key] !== null) {
          missing.push(...this.findMissingFields(actual[key], expected[key], currentPath));
        }
      }
    }

    return missing;
  }

  private generateValidationReport(results: ContractValidationResult[]): void {
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;

    console.info('📊 NLD API Contract Validation Report:');
    console.info(`✅ Passed: ${passed}`);
    console.info(`❌ Failed: ${failed}`);
    console.info(`⚠️ Warnings: ${warnings}`);

    // Log critical failures
    const criticalFailures = results.filter(r => r.status === 'FAIL');
    if (criticalFailures.length > 0) {
      console.error('🚨 Critical API Contract Failures:');
      criticalFailures.forEach(failure => {
        console.error(`  ${failure.method} ${failure.endpoint}: ${failure.message}`);
      });
    }

    // Generate NLD training data
    this.emitNLDTrainingData({
      timestamp: new Date(),
      type: 'API_CONTRACT_VALIDATION',
      summary: { passed, failed, warnings, total: results.length },
      failures: criticalFailures,
      successRate: passed / results.length,
      recommendations: this.generateRecommendations(results)
    });
  }

  private generateRecommendations(results: ContractValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    const instanceEndpointFailure = results.find(r => 
      r.endpoint === '/api/claude/instances' && r.status === 'FAIL'
    );
    
    if (instanceEndpointFailure) {
      recommendations.push('CRITICAL: Add endpoint alias from /api/claude/instances to /api/v1/claude/instances in backend');
      recommendations.push('HIGH: Implement GET /api/claude/instances endpoint for instance listing');
    }

    const contractWarnings = results.filter(r => r.status === 'WARNING');
    if (contractWarnings.length > 0) {
      recommendations.push('MEDIUM: Review response structure mismatches and update API documentation');
    }

    return recommendations;
  }

  private emitNLDTrainingData(data: any): void {
    // Send to NLD training system for pattern recognition
    console.info('🧠 NLD Contract Validation Training Data:', data);
  }

  public async runContinuousValidation(intervalMs: number = 30000): Promise<void> {
    console.info(`🔄 Starting continuous API contract validation (every ${intervalMs}ms)`);
    
    const validate = async () => {
      const results = await this.validateContracts();
      const failures = results.filter(r => r.status === 'FAIL');
      
      if (failures.length > 0) {
        console.warn(`🚨 ${failures.length} API contract failures detected`);
      }
    };

    // Initial validation
    await validate();
    
    // Set up interval for continuous monitoring
    setInterval(validate, intervalMs);
  }
}

export const nldAPIValidator = new NLDAPIContractValidator();