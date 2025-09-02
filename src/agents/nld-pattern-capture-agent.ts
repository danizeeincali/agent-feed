/**
 * NLD Pattern Capture Agent  
 * SPARC Implementation - Natural Language Documentation of failure patterns
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import path from 'path';

interface FailurePattern {
  id: string;
  timestamp: Date;
  category: 'websocket' | 'message_sequencing' | 'tool_usage' | 'ui' | 'integration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  context: {
    instanceId?: string;
    messageId?: string;
    toolId?: string;
    userAction?: string;
    systemState?: Record<string, any>;
  };
  symptoms: string[];
  rootCause?: string;
  resolution?: string;
  preventionSteps?: string[];
  relatedPatterns?: string[];
  frequency: number;
  impact: {
    userExperience: 'minor' | 'moderate' | 'major' | 'severe';
    systemStability: 'stable' | 'degraded' | 'unstable' | 'critical';
    dataIntegrity: 'intact' | 'minor_loss' | 'major_loss' | 'corrupted';
  };
}

interface FailureContext {
  timestamp: Date;
  environment: string;
  version: string;
  userAgent?: string;
  instanceId?: string;
  messageCount?: number;
  connectionDuration?: number;
  recentActions?: string[];
  systemMetrics?: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
  };
}

export class NLDPatternCaptureAgent extends EventEmitter {
  private failurePatterns: Map<string, FailurePattern> = new Map();
  private patternFrequency: Map<string, number> = new Map();
  private contextBuffer: FailureContext[] = [];
  private readonly maxContextBuffer = 100;
  private readonly patternsFilePath: string;

  constructor() {
    super();
    this.patternsFilePath = path.join(process.cwd(), 'docs', 'failure-patterns.md');
    this.initializePatternTracking();
    logger.info('NLDPatternCaptureAgent initialized');
  }

  /**
   * Initialize pattern tracking and load existing patterns
   */
  private async initializePatternTracking(): Promise<void> {
    try {
      // Ensure docs directory exists
      await fs.mkdir(path.dirname(this.patternsFilePath), { recursive: true });
      
      // Try to load existing patterns
      await this.loadExistingPatterns();
      
      // Setup automatic documentation
      this.startPeriodicDocumentation();
      
    } catch (error) {
      logger.error('Failed to initialize pattern tracking:', error);
    }
  }

  /**
   * Capture a new failure pattern
   */
  public captureFailurePattern(
    category: FailurePattern['category'],
    severity: FailurePattern['severity'],
    title: string,
    description: string,
    context: FailurePattern['context'] = {},
    symptoms: string[] = []
  ): string {
    const patternId = this.generatePatternId(category, title);
    const existingPattern = this.failurePatterns.get(patternId);

    if (existingPattern) {
      // Update frequency and context for existing pattern
      existingPattern.frequency += 1;
      existingPattern.context = { ...existingPattern.context, ...context };
      
      // Update severity if current is higher
      if (this.getSeverityLevel(severity) > this.getSeverityLevel(existingPattern.severity)) {
        existingPattern.severity = severity;
      }

      // Merge symptoms
      const newSymptoms = symptoms.filter(s => !existingPattern.symptoms.includes(s));
      existingPattern.symptoms.push(...newSymptoms);

      logger.debug(`Updated existing failure pattern: ${patternId} (frequency: ${existingPattern.frequency})`);
    } else {
      // Create new pattern
      const pattern: FailurePattern = {
        id: patternId,
        timestamp: new Date(),
        category,
        severity,
        title,
        description,
        context,
        symptoms,
        frequency: 1,
        impact: this.assessImpact(category, severity, symptoms)
      };

      this.failurePatterns.set(patternId, pattern);
      logger.info(`Captured new failure pattern: ${patternId}`);
    }

    this.emit('patternCaptured', this.failurePatterns.get(patternId));
    return patternId;
  }

  /**
   * Add solution information to an existing pattern
   */
  public addPatternResolution(
    patternId: string,
    rootCause: string,
    resolution: string,
    preventionSteps: string[] = []
  ): boolean {
    const pattern = this.failurePatterns.get(patternId);
    
    if (!pattern) {
      logger.warn(`Pattern not found: ${patternId}`);
      return false;
    }

    pattern.rootCause = rootCause;
    pattern.resolution = resolution;
    pattern.preventionSteps = preventionSteps;
    
    this.emit('patternResolved', pattern);
    logger.info(`Added resolution to pattern: ${patternId}`);
    return true;
  }

  /**
   * Link related patterns
   */
  public linkRelatedPatterns(patternId: string, relatedPatternIds: string[]): boolean {
    const pattern = this.failurePatterns.get(patternId);
    
    if (!pattern) {
      logger.warn(`Pattern not found: ${patternId}`);
      return false;
    }

    pattern.relatedPatterns = [...(pattern.relatedPatterns || []), ...relatedPatternIds];
    
    // Remove duplicates
    pattern.relatedPatterns = [...new Set(pattern.relatedPatterns)];
    
    logger.debug(`Linked related patterns to ${patternId}: ${relatedPatternIds.join(', ')}`);
    return true;
  }

  /**
   * Capture current system context for failure analysis
   */
  public captureSystemContext(
    instanceId?: string,
    additionalContext: Record<string, any> = {}
  ): void {
    const context: FailureContext = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
      instanceId,
      ...additionalContext
    };

    this.contextBuffer.push(context);

    // Maintain buffer size
    if (this.contextBuffer.length > this.maxContextBuffer) {
      this.contextBuffer.shift();
    }
  }

  /**
   * Generate comprehensive failure documentation
   */
  public async generateFailureDocumentation(): Promise<string> {
    const patterns = Array.from(this.failurePatterns.values());
    const sortedPatterns = patterns.sort((a, b) => {
      // Sort by severity first, then by frequency
      const severityDiff = this.getSeverityLevel(b.severity) - this.getSeverityLevel(a.severity);
      return severityDiff !== 0 ? severityDiff : b.frequency - a.frequency;
    });

    const documentation = this.generateNaturalLanguageDocumentation(sortedPatterns);
    
    try {
      await fs.writeFile(this.patternsFilePath, documentation, 'utf-8');
      logger.info(`Failure patterns documentation updated: ${this.patternsFilePath}`);
    } catch (error) {
      logger.error('Failed to write failure patterns documentation:', error);
    }

    return documentation;
  }

  /**
   * Generate natural language documentation of failure patterns
   */
  private generateNaturalLanguageDocumentation(patterns: FailurePattern[]): string {
    const timestamp = new Date().toISOString();
    const totalPatterns = patterns.length;
    const criticalPatterns = patterns.filter(p => p.severity === 'critical').length;
    const highPatterns = patterns.filter(p => p.severity === 'high').length;

    let documentation = `# Claude Code Integration - Failure Pattern Analysis\n\n`;
    documentation += `**Generated:** ${timestamp}\n`;
    documentation += `**Total Patterns:** ${totalPatterns}\n`;
    documentation += `**Critical Issues:** ${criticalPatterns}\n`;
    documentation += `**High Priority Issues:** ${highPatterns}\n\n`;

    if (totalPatterns === 0) {
      documentation += `## No Failure Patterns Detected\n\n`;
      documentation += `The system is operating normally with no captured failure patterns.\n\n`;
      return documentation;
    }

    // Executive Summary
    documentation += `## Executive Summary\n\n`;
    documentation += this.generateExecutiveSummary(patterns);

    // Critical Issues Section
    const criticalIssues = patterns.filter(p => p.severity === 'critical');
    if (criticalIssues.length > 0) {
      documentation += `## 🚨 Critical Issues Requiring Immediate Attention\n\n`;
      criticalIssues.forEach(pattern => {
        documentation += this.formatPatternDocumentation(pattern, 'critical');
      });
    }

    // High Priority Issues
    const highIssues = patterns.filter(p => p.severity === 'high');
    if (highIssues.length > 0) {
      documentation += `## ⚠️ High Priority Issues\n\n`;
      highIssues.forEach(pattern => {
        documentation += this.formatPatternDocumentation(pattern, 'high');
      });
    }

    // Medium Priority Issues
    const mediumIssues = patterns.filter(p => p.severity === 'medium');
    if (mediumIssues.length > 0) {
      documentation += `## 🔶 Medium Priority Issues\n\n`;
      mediumIssues.forEach(pattern => {
        documentation += this.formatPatternDocumentation(pattern, 'medium');
      });
    }

    // Pattern Categories Analysis
    documentation += `## 📊 Pattern Analysis by Category\n\n`;
    documentation += this.generateCategoryAnalysis(patterns);

    // Trends and Recommendations
    documentation += `## 📈 Trends and Recommendations\n\n`;
    documentation += this.generateTrendsAndRecommendations(patterns);

    // Prevention Strategies
    documentation += `## 🛡️ Prevention Strategies\n\n`;
    documentation += this.generatePreventionStrategies(patterns);

    return documentation;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(patterns: FailurePattern[]): string {
    const categories = new Map<string, number>();
    let totalOccurrences = 0;
    
    patterns.forEach(pattern => {
      categories.set(pattern.category, (categories.get(pattern.category) || 0) + 1);
      totalOccurrences += pattern.frequency;
    });

    const topCategory = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])[0];

    let summary = `The system has experienced ${totalOccurrences} total failure occurrences `;
    summary += `across ${patterns.length} distinct patterns. `;

    if (topCategory) {
      summary += `The most problematic area is **${topCategory[0].replace('_', ' ')}** `;
      summary += `with ${topCategory[1]} different failure patterns. `;
    }

    const criticalCount = patterns.filter(p => p.severity === 'critical').length;
    if (criticalCount > 0) {
      summary += `\n\n**⚠️ URGENT:** ${criticalCount} critical issues require immediate attention. `;
    }

    const unresolvedCount = patterns.filter(p => !p.resolution).length;
    if (unresolvedCount > 0) {
      summary += `${unresolvedCount} patterns remain unresolved and need investigation. `;
    }

    summary += `\n\n`;
    return summary;
  }

  /**
   * Format individual pattern documentation
   */
  private formatPatternDocumentation(pattern: FailurePattern, priority: string): string {
    const icon = this.getSeverityIcon(pattern.severity);
    let doc = `### ${icon} ${pattern.title}\n\n`;
    
    doc += `**Pattern ID:** \`${pattern.id}\`\n`;
    doc += `**Category:** ${pattern.category.replace('_', ' ')}\n`;
    doc += `**Frequency:** ${pattern.frequency} occurrence${pattern.frequency > 1 ? 's' : ''}\n`;
    doc += `**First Detected:** ${pattern.timestamp.toDateString()}\n\n`;

    // Impact Assessment
    doc += `**Impact Assessment:**\n`;
    doc += `- User Experience: ${pattern.impact.userExperience.replace('_', ' ')}\n`;
    doc += `- System Stability: ${pattern.impact.systemStability}\n`;
    doc += `- Data Integrity: ${pattern.impact.dataIntegrity.replace('_', ' ')}\n\n`;

    // Description
    doc += `**Description:**\n${pattern.description}\n\n`;

    // Symptoms
    if (pattern.symptoms.length > 0) {
      doc += `**Symptoms:**\n`;
      pattern.symptoms.forEach(symptom => {
        doc += `- ${symptom}\n`;
      });
      doc += `\n`;
    }

    // Context
    if (Object.keys(pattern.context).length > 0) {
      doc += `**Context:**\n`;
      Object.entries(pattern.context).forEach(([key, value]) => {
        doc += `- ${key}: ${JSON.stringify(value)}\n`;
      });
      doc += `\n`;
    }

    // Root Cause and Resolution
    if (pattern.rootCause) {
      doc += `**Root Cause:**\n${pattern.rootCause}\n\n`;
    }

    if (pattern.resolution) {
      doc += `**Resolution:**\n${pattern.resolution}\n\n`;
    }

    // Prevention Steps
    if (pattern.preventionSteps && pattern.preventionSteps.length > 0) {
      doc += `**Prevention Steps:**\n`;
      pattern.preventionSteps.forEach((step, index) => {
        doc += `${index + 1}. ${step}\n`;
      });
      doc += `\n`;
    }

    // Related Patterns
    if (pattern.relatedPatterns && pattern.relatedPatterns.length > 0) {
      doc += `**Related Patterns:** ${pattern.relatedPatterns.map(id => `\`${id}\``).join(', ')}\n\n`;
    }

    doc += `---\n\n`;
    return doc;
  }

  /**
   * Generate category analysis
   */
  private generateCategoryAnalysis(patterns: FailurePattern[]): string {
    const categoryStats = new Map<string, {
      count: number;
      totalOccurrences: number;
      severityBreakdown: Record<string, number>;
    }>();

    patterns.forEach(pattern => {
      const category = pattern.category;
      if (!categoryStats.has(category)) {
        categoryStats.set(category, {
          count: 0,
          totalOccurrences: 0,
          severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 }
        });
      }

      const stats = categoryStats.get(category)!;
      stats.count += 1;
      stats.totalOccurrences += pattern.frequency;
      stats.severityBreakdown[pattern.severity] += 1;
    });

    let analysis = '';
    Array.from(categoryStats.entries())
      .sort((a, b) => b[1].totalOccurrences - a[1].totalOccurrences)
      .forEach(([category, stats]) => {
        analysis += `#### ${category.replace('_', ' ').toUpperCase()}\n`;
        analysis += `- **Patterns:** ${stats.count}\n`;
        analysis += `- **Total Occurrences:** ${stats.totalOccurrences}\n`;
        analysis += `- **Severity Breakdown:** `;
        analysis += `Critical: ${stats.severityBreakdown.critical}, `;
        analysis += `High: ${stats.severityBreakdown.high}, `;
        analysis += `Medium: ${stats.severityBreakdown.medium}, `;
        analysis += `Low: ${stats.severityBreakdown.low}\n\n`;
      });

    return analysis;
  }

  /**
   * Generate trends and recommendations
   */
  private generateTrendsAndRecommendations(patterns: FailurePattern[]): string {
    let recommendations = '';

    // Frequency-based recommendations
    const highFrequencyPatterns = patterns.filter(p => p.frequency >= 5);
    if (highFrequencyPatterns.length > 0) {
      recommendations += `**High-Frequency Issues:** ${highFrequencyPatterns.length} patterns occur frequently. `;
      recommendations += `Focus on resolving these to reduce overall system instability.\n\n`;
    }

    // Category-based recommendations
    const categoryCount = new Map<string, number>();
    patterns.forEach(p => categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1));
    
    const topCategory = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory && topCategory[1] > 1) {
      recommendations += `**Primary Focus Area:** ${topCategory[0].replace('_', ' ')} `;
      recommendations += `shows the highest concentration of issues. Consider dedicated sprint for this area.\n\n`;
    }

    // Unresolved issues
    const unresolvedCount = patterns.filter(p => !p.resolution).length;
    if (unresolvedCount > 0) {
      recommendations += `**Investigation Needed:** ${unresolvedCount} patterns lack resolution information. `;
      recommendations += `Prioritize root cause analysis for these issues.\n\n`;
    }

    return recommendations;
  }

  /**
   * Generate prevention strategies
   */
  private generatePreventionStrategies(patterns: FailurePattern[]): string {
    const allPreventionSteps = patterns
      .filter(p => p.preventionSteps && p.preventionSteps.length > 0)
      .flatMap(p => p.preventionSteps!);

    if (allPreventionSteps.length === 0) {
      return 'No prevention strategies have been documented yet. Consider adding prevention steps to resolved patterns.\n\n';
    }

    // Group similar prevention steps
    const stepFrequency = new Map<string, number>();
    allPreventionSteps.forEach(step => {
      stepFrequency.set(step, (stepFrequency.get(step) || 0) + 1);
    });

    let strategies = 'Based on resolved patterns, implement these prevention strategies:\n\n';
    
    Array.from(stepFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([step, frequency], index) => {
        strategies += `${index + 1}. ${step}`;
        if (frequency > 1) {
          strategies += ` *(recommended by ${frequency} patterns)*`;
        }
        strategies += '\n';
      });

    strategies += '\n';
    return strategies;
  }

  /**
   * Utility methods
   */
  private generatePatternId(category: string, title: string): string {
    const hash = title.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${category}-${hash}`;
  }

  private getSeverityLevel(severity: string): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity as keyof typeof levels] || 0;
  }

  private getSeverityIcon(severity: string): string {
    const icons = {
      low: '🔵',
      medium: '🟡',
      high: '🟠', 
      critical: '🔴'
    };
    return icons[severity as keyof typeof icons] || '⚪';
  }

  private assessImpact(
    category: string,
    severity: string,
    symptoms: string[]
  ): FailurePattern['impact'] {
    // Simple heuristic-based impact assessment
    // In production, this would be more sophisticated
    
    const severityLevel = this.getSeverityLevel(severity);
    const hasDataLoss = symptoms.some(s => 
      s.toLowerCase().includes('data') || 
      s.toLowerCase().includes('message') ||
      s.toLowerCase().includes('lost')
    );
    
    return {
      userExperience: severityLevel >= 3 ? 'major' : severityLevel >= 2 ? 'moderate' : 'minor',
      systemStability: severityLevel >= 4 ? 'critical' : severityLevel >= 3 ? 'unstable' : 'degraded',
      dataIntegrity: hasDataLoss ? 'major_loss' : 'intact'
    };
  }

  private async loadExistingPatterns(): Promise<void> {
    try {
      const content = await fs.readFile(this.patternsFilePath, 'utf-8');
      // Simple pattern parsing - in production, use more robust method
      logger.info('Loaded existing failure patterns documentation');
    } catch (error) {
      // File doesn't exist yet, which is fine
      logger.debug('No existing patterns file found, starting fresh');
    }
  }

  private startPeriodicDocumentation(): void {
    // Update documentation every 30 minutes
    setInterval(() => {
      this.generateFailureDocumentation().catch(error => {
        logger.error('Failed to generate periodic documentation:', error);
      });
    }, 30 * 60 * 1000);
  }

  /**
   * Get failure pattern statistics
   */
  public getPatternStats(): Record<string, any> {
    const patterns = Array.from(this.failurePatterns.values());
    
    const stats = {
      totalPatterns: patterns.length,
      totalOccurrences: patterns.reduce((sum, p) => sum + p.frequency, 0),
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      resolved: patterns.filter(p => p.resolution).length,
      unresolved: patterns.filter(p => !p.resolution).length,
      averageFrequency: patterns.length > 0 ? 
        patterns.reduce((sum, p) => sum + p.frequency, 0) / patterns.length : 0
    };

    patterns.forEach(pattern => {
      stats.byCategory[pattern.category] = (stats.byCategory[pattern.category] || 0) + 1;
      stats.bySeverity[pattern.severity] = (stats.bySeverity[pattern.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Shutdown agent
   */
  public shutdown(): void {
    this.failurePatterns.clear();
    this.patternFrequency.clear();
    this.contextBuffer = [];
    this.removeAllListeners();
    
    logger.info('NLDPatternCaptureAgent shutdown complete');
  }
}

export default NLDPatternCaptureAgent;