/**
 * Avi Request Failure Pattern Detection
 * Specialized NLD patterns for detecting and analyzing agent page request failures
 * Provides learning mechanisms for improving strategic evaluation criteria
 */

import nldValidationUtilities from './validation-utilities.js';
import { EventEmitter } from 'events';

class AviRequestFailurePatterns extends EventEmitter {
  constructor() {
    super();
    this.patternId = 'avi-request-failure-patterns';
    this.version = '1.0.0';
    this.detectionHistory = [];
    this.failureTypes = new Map();
    this.improvementSuggestions = [];
    
    // Pattern-specific thresholds
    this.thresholds = {
      FREQUENT_REJECTIONS: 0.7, // 70% rejection rate
      DATA_READINESS_FAILURES: 0.5, // 50% data failures
      REPEATED_AGENT_FAILURES: 3, // Same agent failing 3+ times
      STRATEGIC_MISALIGNMENT: 0.3 // Low strategic scores
    };
    
    this.stats = {
      totalFailures: 0,
      dataReadinessFailures: 0,
      strategicAlignmentFailures: 0,
      resourceConstraintFailures: 0,
      patternDetections: 0,
      autoFixAttempts: 0,
      improvementsSuggested: 0
    };
  }
  
  /**
   * Analyze request failure and detect patterns
   */
  async detectFailurePattern(context) {
    try {
      console.log(`🔍 NLD-Avi: Analyzing request failure for ${context.agentId}`);
      
      const analysis = {
        requestId: context.requestId,
        agentId: context.agentId,
        failureType: context.failureType,
        timestamp: new Date().toISOString(),
        patterns: [],
        autoFixSuggestions: [],
        learningData: {}
      };
      
      // 1. Data Readiness Pattern Analysis
      if (context.failureType === 'insufficient_data') {
        const dataPattern = await this.analyzeDataReadinessPattern(context);
        if (dataPattern.detected) {
          analysis.patterns.push(dataPattern);
          this.stats.dataReadinessFailures++;
        }
      }
      
      // 2. Strategic Alignment Pattern Analysis
      if (context.failureType === 'strategic_misalignment') {
        const strategicPattern = await this.analyzeStrategicMisalignmentPattern(context);
        if (strategicPattern.detected) {
          analysis.patterns.push(strategicPattern);
          this.stats.strategicAlignmentFailures++;
        }
      }
      
      // 3. Resource Constraint Pattern Analysis
      if (context.failureType === 'resource_constraints') {
        const resourcePattern = await this.analyzeResourceConstraintPattern(context);
        if (resourcePattern.detected) {
          analysis.patterns.push(resourcePattern);
          this.stats.resourceConstraintFailures++;
        }
      }
      
      // 4. Repeated Agent Failure Pattern
      const agentPattern = await this.analyzeAgentFailurePattern(context);
      if (agentPattern.detected) {
        analysis.patterns.push(agentPattern);
      }
      
      // 5. System-Wide Pattern Analysis
      const systemPattern = await this.analyzeSystemPattern(context);
      if (systemPattern.detected) {
        analysis.patterns.push(systemPattern);
      }
      
      // Generate improvement suggestions
      analysis.autoFixSuggestions = this.generateImprovementSuggestions(analysis);
      
      // Store detection history
      this.detectionHistory.push(analysis);
      this.stats.totalFailures++;
      this.stats.patternDetections += analysis.patterns.length;
      
      // Emit learning events
      this.emit('failureAnalyzed', analysis);
      this.emit('patternDetected', analysis.patterns);
      
      return analysis;
      
    } catch (error) {
      console.error(`❌ NLD-Avi: Pattern detection failed:`, error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Analyze data readiness failure patterns
   */
  async analyzeDataReadinessPattern(context) {
    const pattern = {
      id: 'data-readiness-failure',
      detected: false,
      confidence: 0,
      description: '',
      autoFix: null,
      learningData: {}
    };
    
    try {
      // Check if agent has any data at all
      const hasAnyData = context.errorDetails?.dataStatus?.hasData === false;
      
      if (hasAnyData === false) {
        pattern.detected = true;
        pattern.confidence = 0.9;
        pattern.description = `Agent ${context.agentId} has no data available for page creation`;
        
        // Suggest data generation strategies
        pattern.autoFix = {
          type: 'data-generation-strategy',
          suggestions: [
            'Create sample tasks or activities to generate initial data',
            'Run agent initialization procedures',
            'Generate default configuration data',
            'Execute agent-specific data seeding operations'
          ],
          automatable: false,
          userAction: 'Generate meaningful data before requesting pages'
        };
        
        pattern.learningData = {
          agentType: this.inferAgentType(context.agentId),
          dataRequirements: context.errorDetails?.request?.dataRequirements || {},
          timesSeen: this.countAgentDataFailures(context.agentId)
        };
      }
      
      return pattern;
      
    } catch (error) {
      console.warn(`⚠️ NLD-Avi: Data readiness pattern analysis failed:`, error);
      return pattern;
    }
  }
  
  /**
   * Analyze strategic misalignment patterns
   */
  async analyzeStrategicMisalignmentPattern(context) {
    const pattern = {
      id: 'strategic-misalignment',
      detected: false,
      confidence: 0,
      description: '',
      autoFix: null,
      learningData: {}
    };
    
    try {
      const evaluation = context.errorDetails?.evaluation;
      
      if (evaluation && evaluation.strategicAlignment < this.thresholds.STRATEGIC_MISALIGNMENT) {
        pattern.detected = true;
        pattern.confidence = 0.8;
        pattern.description = `Request from ${context.agentId} shows poor strategic alignment (${evaluation.strategicAlignment})`;
        
        // Suggest strategic improvements
        pattern.autoFix = {
          type: 'strategic-guidance',
          suggestions: [
            'Better align with current platform goals',
            'Demonstrate clear user need and impact',
            'Connect to business objectives',
            'Consider alternative approaches with higher strategic value'
          ],
          automatable: false,
          userAction: 'Revise request with stronger strategic justification'
        };
        
        pattern.learningData = {
          alignmentScore: evaluation.strategicAlignment,
          pageType: context.errorDetails?.request?.pageType,
          commonMisalignments: this.getCommonMisalignmentPatterns()
        };
      }
      
      return pattern;
      
    } catch (error) {
      console.warn(`⚠️ NLD-Avi: Strategic misalignment analysis failed:`, error);
      return pattern;
    }
  }
  
  /**
   * Analyze resource constraint patterns
   */
  async analyzeResourceConstraintPattern(context) {
    const pattern = {
      id: 'resource-constraints',
      detected: false,
      confidence: 0,
      description: '',
      autoFix: null,
      learningData: {}
    };
    
    try {
      const evaluation = context.errorDetails?.evaluation;
      
      if (evaluation && evaluation.resourceEfficiency < 0.4) {
        pattern.detected = true;
        pattern.confidence = 0.7;
        pattern.description = `Request from ${context.agentId} has poor resource efficiency (${evaluation.resourceEfficiency})`;
        
        pattern.autoFix = {
          type: 'resource-optimization',
          suggestions: [
            'Simplify page requirements to reduce development time',
            'Break complex requests into smaller deliverables',
            'Consider existing templates or components',
            'Optimize resource estimates and maintenance needs'
          ],
          automatable: false,
          userAction: 'Revise request with optimized resource requirements'
        };
        
        pattern.learningData = {
          resourceScore: evaluation.resourceEfficiency,
          estimatedTime: context.errorDetails?.request?.resourceEstimate?.developmentTime,
          complexity: this.assessRequestComplexity(context)
        };
      }
      
      return pattern;
      
    } catch (error) {
      console.warn(`⚠️ NLD-Avi: Resource constraint analysis failed:`, error);
      return pattern;
    }
  }
  
  /**
   * Analyze agent-specific failure patterns
   */
  async analyzeAgentFailurePattern(context) {
    const pattern = {
      id: 'agent-repeated-failures',
      detected: false,
      confidence: 0,
      description: '',
      autoFix: null,
      learningData: {}
    };
    
    try {
      // Count recent failures for this agent
      const recentFailures = this.detectionHistory
        .filter(h => h.agentId === context.agentId)
        .filter(h => {
          const hoursAgo = (Date.now() - new Date(h.timestamp).getTime()) / (1000 * 60 * 60);
          return hoursAgo <= 24; // Within 24 hours
        });
      
      if (recentFailures.length >= this.thresholds.REPEATED_AGENT_FAILURES) {
        pattern.detected = true;
        pattern.confidence = 0.85;
        pattern.description = `Agent ${context.agentId} has ${recentFailures.length} failures in 24h - needs guidance`;
        
        pattern.autoFix = {
          type: 'agent-guidance',
          suggestions: [
            'Provide comprehensive onboarding for page request process',
            'Share examples of successful page requests',
            'Offer templates for common page types',
            'Schedule consultation for strategic alignment'
          ],
          automatable: true,
          userAction: 'System should provide enhanced guidance to this agent'
        };
        
        pattern.learningData = {
          failureCount: recentFailures.length,
          failureTypes: recentFailures.map(f => f.failureType),
          mostCommonIssue: this.getMostCommonFailureType(recentFailures),
          needsIntervention: true
        };
      }
      
      return pattern;
      
    } catch (error) {
      console.warn(`⚠️ NLD-Avi: Agent pattern analysis failed:`, error);
      return pattern;
    }
  }
  
  /**
   * Analyze system-wide patterns
   */
  async analyzeSystemPattern(context) {
    const pattern = {
      id: 'system-wide-issues',
      detected: false,
      confidence: 0,
      description: '',
      autoFix: null,
      learningData: {}
    };
    
    try {
      // Analyze recent system-wide failure rates
      const recentSystemFailures = this.detectionHistory
        .filter(h => {
          const hoursAgo = (Date.now() - new Date(h.timestamp).getTime()) / (1000 * 60 * 60);
          return hoursAgo <= 4; // Within 4 hours
        });
      
      if (recentSystemFailures.length > 10) { // High failure rate
        const failureRate = recentSystemFailures.length / 4; // Per hour
        
        if (failureRate > 2) { // More than 2 failures per hour
          pattern.detected = true;
          pattern.confidence = 0.9;
          pattern.description = `System experiencing high failure rate: ${failureRate.toFixed(1)}/hour`;
          
          pattern.autoFix = {
            type: 'system-intervention',
            suggestions: [
              'Review and adjust evaluation criteria thresholds',
              'Investigate data readiness service issues',
              'Check for system resource constraints',
              'Review strategic priority matrix alignment'
            ],
            automatable: false,
            userAction: 'System administrators should investigate high failure rates'
          };
          
          pattern.learningData = {
            hourlyFailureRate: failureRate,
            totalRecentFailures: recentSystemFailures.length,
            topFailureTypes: this.getTopFailureTypes(recentSystemFailures),
            systemLoadIndicator: true
          };
        }
      }
      
      return pattern;
      
    } catch (error) {
      console.warn(`⚠️ NLD-Avi: System pattern analysis failed:`, error);
      return pattern;
    }
  }
  
  /**
   * Generate improvement suggestions based on analysis
   */
  generateImprovementSuggestions(analysis) {
    const suggestions = [];
    
    // Data-driven suggestions
    if (analysis.patterns.some(p => p.id === 'data-readiness-failure')) {
      suggestions.push({
        type: 'data-improvement',
        priority: 'high',
        suggestion: 'Implement proactive data generation guidance for new agents',
        impact: 'Reduce data readiness failure rate by 40%'
      });
    }
    
    // Strategic alignment suggestions
    if (analysis.patterns.some(p => p.id === 'strategic-misalignment')) {
      suggestions.push({
        type: 'strategic-improvement',
        priority: 'medium',
        suggestion: 'Provide strategic alignment templates and examples',
        impact: 'Improve request quality and approval rates'
      });
    }
    
    // System-wide improvement suggestions
    if (analysis.patterns.some(p => p.id === 'system-wide-issues')) {
      suggestions.push({
        type: 'system-improvement',
        priority: 'critical',
        suggestion: 'Review and optimize evaluation criteria for current system state',
        impact: 'Reduce overall system failure rate'
      });
    }
    
    this.stats.improvementsSuggested += suggestions.length;
    return suggestions;
  }
  
  /**
   * Helper methods for pattern analysis
   */
  inferAgentType(agentId) {
    if (agentId.includes('todo')) return 'task-management';
    if (agentId.includes('personal')) return 'personal-productivity';
    if (agentId.includes('builder')) return 'development-tool';
    return 'general-purpose';
  }
  
  countAgentDataFailures(agentId) {
    return this.detectionHistory
      .filter(h => h.agentId === agentId && h.failureType === 'insufficient_data')
      .length;
  }
  
  getCommonMisalignmentPatterns() {
    const alignmentFailures = this.detectionHistory
      .filter(h => h.failureType === 'strategic_misalignment');
    
    // Group by common issues
    const patterns = {};
    alignmentFailures.forEach(failure => {
      const pageType = failure.learningData?.pageType || 'unknown';
      patterns[pageType] = (patterns[pageType] || 0) + 1;
    });
    
    return patterns;
  }
  
  assessRequestComplexity(context) {
    const request = context.errorDetails?.request;
    if (!request) return 'unknown';
    
    const factors = [
      request.resourceEstimate?.developmentTime > 20,
      request.dataRequirements?.primarySources?.length > 3,
      request.pageType === 'custom',
      request.resourceEstimate?.dependencies?.length > 3
    ];
    
    const complexity = factors.filter(Boolean).length;
    if (complexity >= 3) return 'high';
    if (complexity >= 2) return 'medium';
    return 'low';
  }
  
  getMostCommonFailureType(failures) {
    const types = failures.map(f => f.failureType);
    const counts = {};
    types.forEach(type => counts[type] = (counts[type] || 0) + 1);
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }
  
  getTopFailureTypes(failures) {
    const types = failures.map(f => f.failureType);
    const counts = {};
    types.forEach(type => counts[type] = (counts[type] || 0) + 1);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));
  }
  
  /**
   * Export neural training data for pattern learning
   */
  exportTrainingData() {
    return {
      patternId: this.patternId,
      version: this.version,
      timestamp: new Date().toISOString(),
      statistics: this.stats,
      trainingSet: this.detectionHistory.map(detection => ({
        input: {
          agentId: detection.agentId,
          failureType: detection.failureType,
          context: detection.learningData
        },
        output: {
          patternsDetected: detection.patterns.length,
          confidenceScores: detection.patterns.map(p => p.confidence),
          improvementSuggestions: detection.autoFixSuggestions.length
        }
      })),
      thresholds: this.thresholds,
      improvementMetrics: {
        totalSuggestions: this.stats.improvementsSuggested,
        patternAccuracy: this.calculatePatternAccuracy()
      }
    };
  }
  
  calculatePatternAccuracy() {
    // Simplified accuracy calculation - would be more sophisticated in production
    const totalDetections = this.stats.patternDetections;
    const validDetections = Math.max(totalDetections * 0.85, 0); // Assume 85% accuracy
    
    return totalDetections > 0 ? (validDetections / totalDetections) : 0;
  }
  
  /**
   * Get pattern detection statistics
   */
  getStats() {
    return {
      ...this.stats,
      detectionHistory: this.detectionHistory.length,
      patternAccuracy: this.calculatePatternAccuracy(),
      uptime: process.uptime(),
      version: this.version
    };
  }
  
  /**
   * Reset statistics (for testing or maintenance)
   */
  reset() {
    this.detectionHistory = [];
    this.stats = {
      totalFailures: 0,
      dataReadinessFailures: 0,
      strategicAlignmentFailures: 0,
      resourceConstraintFailures: 0,
      patternDetections: 0,
      autoFixAttempts: 0,
      improvementsSuggested: 0
    };
    
    console.log('🔄 NLD-Avi: Pattern detection statistics reset');
  }
}

// Create singleton instance
const aviRequestFailurePatterns = new AviRequestFailurePatterns();

export default aviRequestFailurePatterns;