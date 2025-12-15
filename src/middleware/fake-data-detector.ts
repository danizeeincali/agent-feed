/**
 * Fake Data Detection Middleware - NLD Integration
 *
 * SPARC Implementation for detecting and preventing fake data patterns
 * in token analytics and cost tracking systems.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

interface FakeDataPattern {
  pattern: RegExp | string;
  type: 'cost' | 'token' | 'text' | 'id';
  severity: 'error' | 'warning' | 'info';
  description: string;
}

// Comprehensive fake data patterns to detect
const FAKE_DATA_PATTERNS: FakeDataPattern[] = [
  // Fake cost patterns
  { pattern: /\$12\.45/, type: 'cost', severity: 'error', description: 'Hardcoded fake cost $12.45' },
  { pattern: /\$0\.123/, type: 'cost', severity: 'error', description: 'Fake cost pattern $0.123' },
  { pattern: /\$999\.99/, type: 'cost', severity: 'error', description: 'Placeholder cost $999.99' },
  { pattern: /\$1\.00/, type: 'cost', severity: 'warning', description: 'Suspicious round cost $1.00' },
  { pattern: /\$0\.000/, type: 'cost', severity: 'warning', description: 'Zero cost pattern' },

  // Fake token patterns
  { pattern: /12345/, type: 'token', severity: 'warning', description: 'Sequential number pattern' },
  { pattern: /99999/, type: 'token', severity: 'error', description: 'Fake high token count' },
  { pattern: /11111/, type: 'token', severity: 'warning', description: 'Repeated digit pattern' },

  // Fake text patterns
  { pattern: /lorem ipsum/i, type: 'text', severity: 'error', description: 'Lorem ipsum placeholder text' },
  { pattern: /fake.*data/i, type: 'text', severity: 'error', description: 'Explicit fake data reference' },
  { pattern: /dummy.*data/i, type: 'text', severity: 'error', description: 'Dummy data reference' },
  { pattern: /placeholder/i, type: 'text', severity: 'warning', description: 'Placeholder text' },
  { pattern: /test.*data/i, type: 'text', severity: 'warning', description: 'Test data reference' },
  { pattern: /sample.*data/i, type: 'text', severity: 'warning', description: 'Sample data reference' },
  { pattern: /mock.*data/i, type: 'text', severity: 'warning', description: 'Mock data reference' },

  // Fake ID patterns
  { pattern: /test-session-\d+/, type: 'id', severity: 'warning', description: 'Test session ID pattern' },
  { pattern: /fake-user-\d+/, type: 'id', severity: 'error', description: 'Fake user ID pattern' },
  { pattern: /dummy-\w+/, type: 'id', severity: 'error', description: 'Dummy ID pattern' },
  { pattern: /example-\w+/, type: 'id', severity: 'warning', description: 'Example ID pattern' }
];

interface FakeDataDetection {
  detected: boolean;
  patterns: {
    pattern: string;
    type: string;
    severity: string;
    description: string;
    matches: string[];
  }[];
  riskScore: number;
}

export class FakeDataDetector {
  private detectionHistory: Map<string, FakeDataDetection[]> = new Map();
  private maxHistorySize = 1000;

  /**
   * Detect fake data patterns in any object or string
   */
  public detectFakeData(data: any, context?: string): FakeDataDetection {
    const dataString = this.objectToString(data);
    const detection: FakeDataDetection = {
      detected: false,
      patterns: [],
      riskScore: 0
    };

    for (const fakePattern of FAKE_DATA_PATTERNS) {
      const matches = this.findMatches(dataString, fakePattern.pattern);

      if (matches.length > 0) {
        detection.detected = true;
        detection.patterns.push({
          pattern: fakePattern.pattern.toString(),
          type: fakePattern.type,
          severity: fakePattern.severity,
          description: fakePattern.description,
          matches
        });

        // Calculate risk score
        const severityWeight = fakePattern.severity === 'error' ? 10 :
                              fakePattern.severity === 'warning' ? 5 : 1;
        detection.riskScore += severityWeight * matches.length;
      }
    }

    // Store detection history
    if (context) {
      this.storeDetectionHistory(context, detection);
    }

    return detection;
  }

  /**
   * Middleware function for Express routes
   */
  public middleware(options: {
    blockOnError?: boolean;
    logWarnings?: boolean;
    includeResponse?: boolean;
  } = {}) {
    const { blockOnError = true, logWarnings = true, includeResponse = false } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      const context = `${req.method} ${req.path}`;

      // Check request data
      const requestDetection = this.detectFakeData({
        body: req.body,
        query: req.query,
        params: req.params
      }, `${context}:request`);

      if (requestDetection.detected) {
        const errorPatterns = requestDetection.patterns.filter(p => p.severity === 'error');
        const warningPatterns = requestDetection.patterns.filter(p => p.severity === 'warning');

        if (errorPatterns.length > 0 && blockOnError) {
          logger.error('Fake data detected in request', {
            context,
            patterns: errorPatterns,
            riskScore: requestDetection.riskScore
          });

          return res.status(400).json({
            error: 'Fake data patterns detected in request',
            code: 'FAKE_DATA_DETECTED',
            patterns: errorPatterns.map(p => ({
              type: p.type,
              description: p.description,
              matches: p.matches
            })),
            riskScore: requestDetection.riskScore
          });
        }

        if (warningPatterns.length > 0 && logWarnings) {
          logger.warn('Potential fake data patterns in request', {
            context,
            patterns: warningPatterns,
            riskScore: requestDetection.riskScore
          });
        }
      }

      // Intercept response if needed
      if (includeResponse) {
        const originalJson = res.json;
        res.json = function(body: any) {
          const responseDetection = detector.detectFakeData(body, `${context}:response`);

          if (responseDetection.detected) {
            const errorPatterns = responseDetection.patterns.filter(p => p.severity === 'error');

            if (errorPatterns.length > 0) {
              logger.error('Fake data detected in response', {
                context,
                patterns: errorPatterns,
                riskScore: responseDetection.riskScore
              });

              // Replace response with error
              return originalJson.call(this, {
                error: 'Response contains fake data patterns',
                code: 'FAKE_DATA_IN_RESPONSE',
                patterns: errorPatterns.map(p => ({
                  type: p.type,
                  description: p.description
                }))
              });
            }
          }

          return originalJson.call(this, body);
        };
      }

      next();
    };
  }

  /**
   * Validate token analytics data specifically
   */
  public validateTokenAnalytics(data: {
    cost?: number;
    tokens?: number;
    messages?: any[];
    [key: string]: any;
  }): { valid: boolean; errors: string[]; warnings: string[] } {
    const result = { valid: true, errors: [], warnings: [] };

    // Check for suspicious cost patterns
    if (typeof data.cost === 'number') {
      if (data.cost === 12.45) {
        result.valid = false;
        result.errors.push('Detected hardcoded fake cost $12.45');
      }

      if (data.cost === 0.123) {
        result.valid = false;
        result.errors.push('Detected fake cost pattern $0.123');
      }

      if (data.cost > 1000) {
        result.warnings.push('Unusually high cost detected, verify authenticity');
      }
    }

    // Check for suspicious token patterns
    if (typeof data.tokens === 'number') {
      const tokenStr = data.tokens.toString();
      if (/^(\d)\1{4,}$/.test(tokenStr)) {
        result.warnings.push('Repeated digit pattern in token count');
      }

      if (data.tokens === 99999 || data.tokens === 12345) {
        result.valid = false;
        result.errors.push('Detected fake token count pattern');
      }
    }

    // Check messages for fake patterns
    if (Array.isArray(data.messages)) {
      for (const [index, message] of data.messages.entries()) {
        const messageDetection = this.detectFakeData(message, `message-${index}`);

        if (messageDetection.detected) {
          const errors = messageDetection.patterns.filter(p => p.severity === 'error');
          const warnings = messageDetection.patterns.filter(p => p.severity === 'warning');

          if (errors.length > 0) {
            result.valid = false;
            result.errors.push(`Message ${index}: ${errors.map(e => e.description).join(', ')}`);
          }

          if (warnings.length > 0) {
            result.warnings.push(`Message ${index}: ${warnings.map(w => w.description).join(', ')}`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Get detection statistics
   */
  public getDetectionStats(): {
    totalDetections: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    riskScoreDistribution: { low: number; medium: number; high: number };
  } {
    let totalDetections = 0;
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const riskScores: number[] = [];

    for (const detections of this.detectionHistory.values()) {
      for (const detection of detections) {
        if (detection.detected) {
          totalDetections++;
          riskScores.push(detection.riskScore);

          for (const pattern of detection.patterns) {
            byType[pattern.type] = (byType[pattern.type] || 0) + 1;
            bySeverity[pattern.severity] = (bySeverity[pattern.severity] || 0) + 1;
          }
        }
      }
    }

    const riskScoreDistribution = {
      low: riskScores.filter(s => s <= 5).length,
      medium: riskScores.filter(s => s > 5 && s <= 20).length,
      high: riskScores.filter(s => s > 20).length
    };

    return {
      totalDetections,
      byType,
      bySeverity,
      riskScoreDistribution
    };
  }

  /**
   * Clear detection history
   */
  public clearHistory(): void {
    this.detectionHistory.clear();
  }

  // Private helper methods

  private objectToString(obj: any): string {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number') return obj.toString();
    if (typeof obj === 'boolean') return obj.toString();

    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return obj.toString();
    }
  }

  private findMatches(text: string, pattern: RegExp | string): string[] {
    if (!text) return [];

    if (pattern instanceof RegExp) {
      const matches = text.match(new RegExp(pattern.source, pattern.flags + 'g'));
      return matches || [];
    } else {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(regex);
      return matches || [];
    }
  }

  private storeDetectionHistory(context: string, detection: FakeDataDetection): void {
    if (!this.detectionHistory.has(context)) {
      this.detectionHistory.set(context, []);
    }

    const history = this.detectionHistory.get(context)!;
    history.push({
      ...detection,
      // Add timestamp to the stored detection
      timestamp: new Date().toISOString()
    } as any);

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }
}

// Export singleton instance
export const detector = new FakeDataDetector();

// Express middleware function
export const fakeDataDetectionMiddleware = (options?: {
  blockOnError?: boolean;
  logWarnings?: boolean;
  includeResponse?: boolean;
}) => detector.middleware(options);