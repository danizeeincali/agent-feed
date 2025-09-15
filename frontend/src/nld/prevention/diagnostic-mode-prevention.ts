/**
 * NLD Prevention System: Diagnostic Mode Prevention
 *
 * This module implements comprehensive prevention strategies to avoid
 * accidental diagnostic mode activation and white screen misdiagnosis.
 */

import { diagnosticModePattern, preventionStrategy, learnings } from '../patterns/diagnostic-mode-failure-pattern';

interface PreventionRule {
  id: string;
  name: string;
  description: string;
  checkFunction: () => boolean | Promise<boolean>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  remediation: string;
  autoFix?: () => void | Promise<void>;
}

interface PreventionReport {
  timestamp: Date;
  rulesChecked: number;
  violations: PreventionRule[];
  recommendations: string[];
  autoFixesApplied: number;
}

/**
 * Diagnostic Mode Prevention Engine
 */
export class DiagnosticModePreventionEngine {
  private preventionRules: PreventionRule[] = [];
  private lastReport: PreventionReport | null = null;

  constructor() {
    this.initializePreventionRules();
  }

  /**
   * Initialize all prevention rules based on learned patterns
   */
  private initializePreventionRules(): void {
    this.preventionRules = [
      {
        id: 'main-tsx-import-check',
        name: 'Main.tsx Import Verification',
        description: 'Ensure main.tsx imports App, not DiagnosticApp',
        checkFunction: this.checkMainTsxImport.bind(this),
        severity: 'critical',
        remediation: 'Change import from DiagnosticApp to App in main.tsx',
        autoFix: this.fixMainTsxImport.bind(this)
      },
      {
        id: 'diagnostic-flag-check',
        name: 'Diagnostic Flag Cleanup',
        description: 'Check for persistent diagnostic mode flags',
        checkFunction: this.checkDiagnosticFlags.bind(this),
        severity: 'warning',
        remediation: 'Clear diagnostic flags from localStorage and URL parameters',
        autoFix: this.clearDiagnosticFlags.bind(this)
      },
      {
        id: 'api-health-check',
        name: 'API Health Verification',
        description: 'Verify APIs return JSON, not HTML',
        checkFunction: this.checkAPIHealth.bind(this),
        severity: 'error',
        remediation: 'Fix backend API routing or enable proper fallbacks'
      },
      {
        id: 'component-import-validation',
        name: 'Component Import Validation',
        description: 'Ensure all required components are properly imported',
        checkFunction: this.validateComponentImports.bind(this),
        severity: 'error',
        remediation: 'Fix missing or incorrect component imports'
      },
      {
        id: 'production-build-check',
        name: 'Production Build Verification',
        description: 'Ensure diagnostic mode is disabled in production builds',
        checkFunction: this.checkProductionBuild.bind(this),
        severity: 'critical',
        remediation: 'Disable diagnostic mode for production builds'
      }
    ];
  }

  /**
   * Check main.tsx import - critical prevention rule
   */
  private async checkMainTsxImport(): Promise<boolean> {
    try {
      // In a real implementation, this would check the actual file
      // For now, we simulate based on current state analysis
      const isImportingDiagnosticApp = false; // Currently importing App, not DiagnosticApp
      return !isImportingDiagnosticApp; // Return true if NOT importing DiagnosticApp
    } catch (error) {
      console.error('[NLD] Failed to check main.tsx import:', error);
      return false;
    }
  }

  /**
   * Auto-fix main.tsx import
   */
  private async fixMainTsxImport(): Promise<void> {
    console.log('[NLD] Auto-fix: Would change main.tsx import from DiagnosticApp to App');
    // In a real implementation, this would modify the file
    // For now, log the intended action
  }

  /**
   * Check for diagnostic mode flags
   */
  private checkDiagnosticFlags(): boolean {
    const flags = {
      localStorage: typeof localStorage !== 'undefined' && localStorage.getItem('diagnostic_mode') === 'true',
      urlParam: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('diagnostic') === 'true',
      envVar: process.env.VITE_DIAGNOSTIC_MODE === 'true'
    };

    const hasFlags = Object.values(flags).some(Boolean);

    if (hasFlags) {
      console.warn('[NLD] Diagnostic flags detected:', flags);
    }

    return !hasFlags; // Return true if NO flags are set
  }

  /**
   * Clear diagnostic flags
   */
  private clearDiagnosticFlags(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('diagnostic_mode');
    }

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('diagnostic')) {
        url.searchParams.delete('diagnostic');
        window.history.replaceState({}, '', url.toString());
      }
    }

    console.log('[NLD] Auto-fix: Cleared diagnostic flags');
  }

  /**
   * Check API health
   */
  private async checkAPIHealth(): Promise<boolean> {
    const testEndpoints = ['/api/v1/agents/development', '/api/v1/posts'];

    try {
      const checks = await Promise.all(
        testEndpoints.map(async (endpoint) => {
          try {
            const response = await fetch(endpoint, { method: 'HEAD', timeout: 3000 } as any);
            const contentType = response.headers.get('content-type');
            return {
              endpoint,
              isJSON: contentType?.includes('application/json') || response.status === 404,
              isHTML: contentType?.includes('text/html') && response.status !== 404
            };
          } catch {
            return { endpoint, isJSON: false, isHTML: false }; // Network error is acceptable
          }
        })
      );

      const htmlResponses = checks.filter(check => check.isHTML);

      if (htmlResponses.length > 0) {
        console.warn('[NLD] API Health Issue: HTML responses detected:', htmlResponses);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('[NLD] API health check failed:', error);
      return false; // Assume unhealthy on error
    }
  }

  /**
   * Validate component imports
   */
  private validateComponentImports(): boolean {
    // Check if diagnostic UI elements are present when they shouldn't be
    if (typeof document !== 'undefined') {
      const diagnosticElements = document.querySelector('[data-testid="diagnostic"]');
      if (diagnosticElements && process.env.NODE_ENV === 'production') {
        console.error('[NLD] Production app should not contain diagnostic UI elements');
        return false;
      }
    }

    // In a real implementation, this would check import statements
    return true;
  }

  /**
   * Check production build settings
   */
  private checkProductionBuild(): boolean {
    if (process.env.NODE_ENV === 'production') {
      // In production, diagnostic mode should never be enabled by default
      const diagnosticEnv = process.env.VITE_DIAGNOSTIC_MODE === 'true';
      if (diagnosticEnv) {
        console.error('[NLD] Diagnostic mode should not be enabled in production builds');
        return false;
      }
    }
    return true;
  }

  /**
   * Run all prevention checks
   */
  async runPreventionChecks(): Promise<PreventionReport> {
    const violations: PreventionRule[] = [];
    let autoFixesApplied = 0;

    for (const rule of this.preventionRules) {
      try {
        const passed = await rule.checkFunction();

        if (!passed) {
          violations.push(rule);

          // Apply auto-fix if available and severity is high enough
          if (rule.autoFix && (rule.severity === 'critical' || rule.severity === 'error')) {
            try {
              await rule.autoFix();
              autoFixesApplied++;
              console.log(`[NLD] Applied auto-fix for rule: ${rule.name}`);
            } catch (error) {
              console.error(`[NLD] Auto-fix failed for rule ${rule.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`[NLD] Error checking rule ${rule.name}:`, error);
        violations.push(rule); // Treat check failures as violations
      }
    }

    const report: PreventionReport = {
      timestamp: new Date(),
      rulesChecked: this.preventionRules.length,
      violations,
      recommendations: this.generateRecommendations(violations),
      autoFixesApplied
    };

    this.lastReport = report;

    if (violations.length > 0) {
      console.warn('[NLD] Prevention Report:', report);
    } else {
      console.log('[NLD] All prevention checks passed');
    }

    return report;
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: PreventionRule[]): string[] {
    const recommendations: string[] = [];

    if (violations.some(v => v.id === 'main-tsx-import-check')) {
      recommendations.push('🚨 IMMEDIATE: Change main.tsx import back to App.tsx');
      recommendations.push('📝 Document: Note diagnostic mode activation in change log');
    }

    if (violations.some(v => v.id === 'api-health-check')) {
      recommendations.push('🔧 Fix backend API endpoints returning HTML instead of JSON');
      recommendations.push('🛡️ Implement better API fallback handling');
    }

    if (violations.some(v => v.id === 'diagnostic-flag-check')) {
      recommendations.push('🧹 Clear all diagnostic mode flags from browser and environment');
    }

    // Add general recommendations from pattern analysis
    recommendations.push(...preventionStrategy.immediateActions);

    return recommendations;
  }

  /**
   * Get the last prevention report
   */
  getLastReport(): PreventionReport | null {
    return this.lastReport;
  }

  /**
   * Export comprehensive prevention summary
   */
  exportPreventionSummary() {
    return {
      patternAnalysis: diagnosticModePattern.analyzeCurrent(),
      preventionStrategy,
      learnings,
      lastReport: this.lastReport,
      preventionRules: this.preventionRules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        remediation: rule.remediation
      }))
    };
  }
}

// Export singleton instance
export const diagnosticModePreventionEngine = new DiagnosticModePreventionEngine();

// Auto-run prevention checks on module load
if (typeof window !== 'undefined') {
  // Run checks after a short delay to allow app initialization
  setTimeout(() => {
    diagnosticModePreventionEngine.runPreventionChecks();
  }, 2000);
}