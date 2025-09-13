/**
 * NLD Component Error Detector
 * 
 * Real-time component error detection and prevention system
 */

import { componentConfigurationErrors } from './component-configuration-errors.js';

export class ComponentErrorDetector {
  constructor() {
    this.errorLog = [];
    this.preventionRules = new Map();
    this.isActive = true;
    this.setupGlobalErrorHandling();
  }

  /**
   * Setup global error handling for React components
   */
  setupGlobalErrorHandling() {
    // Capture console errors
    const originalError = console.error;
    console.error = (...args) => {
      this.detectError(args.join(' '));
      originalError.apply(console, args);
    };

    // Capture console warnings
    const originalWarn = console.warn;
    console.warn = (...args) => {
      this.detectWarning(args.join(' '));
      originalWarn.apply(console, args);
    };

    // Setup error boundary integration
    window.addEventListener('error', (event) => {
      this.detectError(event.message, event);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.detectError(event.reason?.message || 'Promise rejection', event);
    });
  }

  /**
   * Detect component configuration errors
   * @param {string} message - Error message
   * @param {object} context - Additional context
   */
  detectError(message, context = {}) {
    if (!this.isActive) return;

    const detectionPatterns = componentConfigurationErrors.detection;
    let matchedPattern = null;
    let errorType = null;

    // Check against known patterns
    for (const [pattern, regex] of Object.entries(detectionPatterns)) {
      if (regex.test(message)) {
        matchedPattern = pattern;
        break;
      }
    }

    // Check root causes
    for (const [cause, config] of Object.entries(componentConfigurationErrors.rootCauses)) {
      if (config.pattern.test(message)) {
        errorType = cause;
        break;
      }
    }

    if (matchedPattern || errorType) {
      this.logError({
        timestamp: new Date().toISOString(),
        message,
        pattern: matchedPattern,
        errorType,
        context,
        severity: componentConfigurationErrors.rootCauses[errorType]?.severity || 'medium',
        autoFixable: componentConfigurationErrors.rootCauses[errorType]?.autoFixable || false
      });

      // Attempt auto-fix if enabled
      if (errorType && componentConfigurationErrors.rootCauses[errorType]?.autoFixable) {
        this.attemptAutoFix(message, errorType, context);
      }
    }
  }

  /**
   * Detect component warnings
   * @param {string} message - Warning message
   */
  detectWarning(message) {
    if (!this.isActive) return;

    // Log warnings as potential issues
    if (message.includes('prop') || message.includes('component')) {
      this.logError({
        timestamp: new Date().toISOString(),
        message,
        type: 'warning',
        severity: 'low'
      });
    }
  }

  /**
   * Log detected error
   * @param {object} errorData - Error information
   */
  logError(errorData) {
    this.errorLog.push(errorData);

    // Keep only last 500 errors
    if (this.errorLog.length > 500) {
      this.errorLog.shift();
    }

    // Report to monitoring system
    if (componentConfigurationErrors.monitoring.reportToSystem) {
      this.reportToSystem(errorData);
    }
  }

  /**
   * Attempt to auto-fix detected error
   * @param {string} message - Error message
   * @param {string} errorType - Type of error
   * @param {object} context - Error context
   */
  attemptAutoFix(message, errorType, context) {
    try {
      // Extract component information from error message
      const componentMatch = message.match(/component\s+`?(\w+)`?/i);
      const propMatch = message.match(/prop\s+`?(\w+)`?/i);

      if (componentMatch && propMatch) {
        const componentType = componentMatch[1];
        const propName = propMatch[1];

        // Create fix recommendation
        const fixRecommendation = {
          componentType,
          propName,
          errorType,
          suggestedFix: this.generateFix(componentType, propName, errorType),
          timestamp: new Date().toISOString()
        };

        this.logFix(fixRecommendation);
      }
    } catch (error) {
      console.warn('Auto-fix attempt failed:', error.message);
    }
  }

  /**
   * Generate fix suggestion
   * @param {string} componentType - Component name
   * @param {string} propName - Prop name
   * @param {string} errorType - Error type
   * @returns {object} Fix suggestion
   */
  generateFix(componentType, propName, errorType) {
    const schema = componentConfigurationErrors.schemas[componentType];
    
    switch (errorType) {
      case 'MISSING_REQUIRED_PROPS':
        return {
          action: 'ADD_PROP',
          propName,
          defaultValue: schema?.defaults?.[propName] || null,
          code: `${propName}={${JSON.stringify(schema?.defaults?.[propName] || '')}}`
        };

      case 'INVALID_PROP_TYPES':
        const expectedType = schema?.properties?.[propName]?.type;
        return {
          action: 'CONVERT_TYPE',
          propName,
          expectedType,
          converter: componentConfigurationErrors.typeConverters[expectedType]
        };

      case 'PROPS_SCHEMA_MISMATCH':
        return {
          action: 'UPDATE_SCHEMA',
          componentType,
          propName,
          suggestion: 'Consider updating component schema or prop usage'
        };

      default:
        return {
          action: 'MANUAL_REVIEW',
          message: 'Manual review required for this error type'
        };
    }
  }

  /**
   * Log fix attempt
   * @param {object} fixData - Fix information
   */
  logFix(fixData) {
    if (!this.fixLog) {
      this.fixLog = [];
    }

    this.fixLog.push(fixData);

    // Keep only last 200 fixes
    if (this.fixLog.length > 200) {
      this.fixLog.shift();
    }
  }

  /**
   * Report error to monitoring system
   * @param {object} errorData - Error data
   */
  reportToSystem(errorData) {
    // In a real implementation, this would send to external monitoring
    if (typeof window !== 'undefined' && window.nldMonitoring) {
      window.nldMonitoring.reportError('COMPONENT_CONFIG_ERROR', errorData);
    }
  }

  /**
   * Get error statistics
   * @returns {object} Error statistics
   */
  getStats() {
    const totalErrors = this.errorLog.length;
    const errorTypes = this.errorLog.reduce((acc, error) => {
      acc[error.errorType || 'UNKNOWN'] = (acc[error.errorType || 'UNKNOWN'] || 0) + 1;
      return acc;
    }, {});

    const severityDistribution = this.errorLog.reduce((acc, error) => {
      acc[error.severity || 'unknown'] = (acc[error.severity || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    const recentErrors = this.errorLog
      .filter(error => {
        const errorTime = new Date(error.timestamp).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return errorTime > oneDayAgo;
      }).length;

    return {
      totalErrors,
      errorTypes,
      severityDistribution,
      recentErrors,
      autoFixableErrors: this.errorLog.filter(e => e.autoFixable).length,
      fixAttempts: this.fixLog?.length || 0
    };
  }

  /**
   * Get error trends
   * @param {number} days - Number of days to analyze
   * @returns {object} Trend analysis
   */
  getErrorTrends(days = 7) {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentErrors = this.errorLog.filter(error => {
      return new Date(error.timestamp).getTime() > cutoffTime;
    });

    // Group by day
    const dailyErrors = recentErrors.reduce((acc, error) => {
      const day = error.timestamp.split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    return {
      period: `${days} days`,
      dailyErrors,
      totalRecentErrors: recentErrors.length,
      averagePerDay: recentErrors.length / days,
      trend: this.calculateTrend(Object.values(dailyErrors))
    };
  }

  /**
   * Calculate trend direction
   * @param {Array} values - Daily error counts
   * @returns {string} Trend direction
   */
  calculateTrend(values) {
    if (values.length < 2) return 'insufficient_data';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.1) return 'increasing';
    if (secondAvg < firstAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  /**
   * Enable/disable error detection
   * @param {boolean} active - Whether to activate detection
   */
  setActive(active) {
    this.isActive = active;
  }

  /**
   * Clear error log
   */
  clearLog() {
    this.errorLog = [];
    this.fixLog = [];
  }

  /**
   * Export error data for analysis
   * @returns {object} Exportable error data
   */
  exportData() {
    return {
      errors: this.errorLog,
      fixes: this.fixLog || [],
      stats: this.getStats(),
      trends: this.getErrorTrends(),
      exportedAt: new Date().toISOString()
    };
  }
}

// Create global detector instance
export const globalComponentErrorDetector = new ComponentErrorDetector();

// Export for manual instantiation
export default ComponentErrorDetector;