/**
 * API Contract Validator
 * Prevents API endpoint mismatches by validating contracts at runtime
 */

interface APIEndpoint {
  path: string;
  method: string;
  version: string;
  status: 'active' | 'deprecated' | 'removed';
  replacement?: string;
}

interface APIContract {
  endpoints: APIEndpoint[];
  lastUpdated: string;
  version: string;
}

class APIContractValidator {
  private frontendContract: APIContract;
  private backendContract: APIContract;
  private mismatches: Array<{
    frontend: string;
    backend: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    impact: string;
  }> = [];

  constructor(frontendContract: APIContract, backendContract: APIContract) {
    this.frontendContract = frontendContract;
    this.backendContract = backendContract;
    this.validateContracts();
  }

  private validateContracts(): void {
    const frontendPaths = this.frontendContract.endpoints.map(e => e.path);
    const backendPaths = this.backendContract.endpoints.map(e => e.path);

    // Find mismatches
    frontendPaths.forEach(frontendPath => {
      if (!backendPaths.includes(frontendPath)) {
        // Check for potential replacements
        const replacement = this.findReplacement(frontendPath);
        this.mismatches.push({
          frontend: frontendPath,
          backend: replacement || 'NOT_FOUND',
          severity: 'HIGH',
          impact: 'Endpoint not available - functionality broken'
        });
      }
    });
  }

  private findReplacement(frontendPath: string): string | null {
    // Pattern matching for common migrations
    const patterns = [
      {
        from: /\/api\/v1\/claude-live\/prod\/agents/,
        to: '/api/claude/instances'
      },
      {
        from: /\/api\/v1\/claude-live\/prod\/activities/,
        to: '/api/claude/instances/:id/messages'
      }
    ];

    for (const pattern of patterns) {
      if (pattern.from.test(frontendPath)) {
        return pattern.to;
      }
    }

    return null;
  }

  public getMismatches() {
    return this.mismatches;
  }

  public hasErrors(): boolean {
    return this.mismatches.some(m => m.severity === 'HIGH');
  }

  public generateReport(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      contractVersion: {
        frontend: this.frontendContract.version,
        backend: this.backendContract.version
      },
      mismatches: this.mismatches,
      summary: {
        totalMismatches: this.mismatches.length,
        highSeverity: this.mismatches.filter(m => m.severity === 'HIGH').length,
        mediumSeverity: this.mismatches.filter(m => m.severity === 'MEDIUM').length,
        lowSeverity: this.mismatches.filter(m => m.severity === 'LOW').length
      }
    }, null, 2);
  }
}

export { APIContractValidator, APIEndpoint, APIContract };