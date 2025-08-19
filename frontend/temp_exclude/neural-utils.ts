/**
 * Neural Utilities
 * Helper functions for neural pattern processing and optimization
 */

import {
  NeuralPattern,
  UserIntent,
  ComplexityAssessment,
  PerformanceMetrics,
  AgentType,
  SwarmTopology,
  TaskExecution,
  ComplexityLevel
} from '../models/neural-models';

/**
 * Pattern matching utilities
 */
export class PatternMatcher {
  /**
   * Calculate similarity between two neural patterns
   */
  static calculatePatternSimilarity(pattern1: NeuralPattern, pattern2: NeuralPattern): number {
    if (pattern1.type !== pattern2.type) {
      return 0;
    }
    
    let similarity = 0;
    let factors = 0;
    
    // Compare confidence levels
    const confidenceDiff = Math.abs(pattern1.confidence - pattern2.confidence);
    similarity += (1 - confidenceDiff);
    factors += 1;
    
    // Compare timestamps (recent patterns are more similar)
    const timeDiff = Math.abs(pattern1.timestamp.getTime() - pattern2.timestamp.getTime());
    const maxTimeDiff = 24 * 60 * 60 * 1000; // 24 hours
    const timeScore = Math.max(0, 1 - (timeDiff / maxTimeDiff));
    similarity += timeScore;
    factors += 1;
    
    // Compare metadata if available
    if (pattern1.metadata && pattern2.metadata) {
      const metadataSimilarity = this.compareMetadata(pattern1.metadata, pattern2.metadata);
      similarity += metadataSimilarity;
      factors += 1;
    }
    
    return factors > 0 ? similarity / factors : 0;
  }
  
  /**
   * Compare metadata objects
   */
  private static compareMetadata(meta1: Record<string, any>, meta2: Record<string, any>): number {
    const keys1 = Object.keys(meta1);
    const keys2 = Object.keys(meta2);
    const allKeys = new Set([...keys1, ...keys2]);
    
    if (allKeys.size === 0) return 1;
    
    let matches = 0;
    for (const key of allKeys) {
      if (meta1[key] === meta2[key]) {
        matches++;
      }
    }
    
    return matches / allKeys.size;
  }
  
  /**
   * Find similar patterns in a collection
   */
  static findSimilarPatterns(
    targetPattern: NeuralPattern,
    patterns: NeuralPattern[],
    threshold: number = 0.7
  ): Array<{ pattern: NeuralPattern; similarity: number }> {
    return patterns
      .map(pattern => ({
        pattern,
        similarity: this.calculatePatternSimilarity(targetPattern, pattern)
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }
}

/**
 * Intent analysis utilities
 */
export class IntentAnalyzer {
  /**
   * Extract keywords from user message
   */
  static extractKeywords(message: string, maxKeywords: number = 20): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'
    ]);
    
    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, maxKeywords);
  }
  
  /**
   * Analyze message complexity
   */
  static analyzeMessageComplexity(message: string): {
    score: number;
    factors: Array<{ name: string; value: number; weight: number }>;
  } {
    const factors = [
      {
        name: 'length',
        value: Math.min(message.length / 500, 1),
        weight: 0.2
      },
      {
        name: 'sentence_count',
        value: Math.min(message.split(/[.!?]+/).length / 10, 1),
        weight: 0.15
      },
      {
        name: 'technical_terms',
        value: this.countTechnicalTerms(message) / 10,
        weight: 0.25
      },
      {
        name: 'question_complexity',
        value: this.analyzeQuestionComplexity(message),
        weight: 0.2
      },
      {
        name: 'context_references',
        value: this.countContextReferences(message) / 5,
        weight: 0.2
      }
    ];
    
    const score = factors.reduce((sum, factor) => 
      sum + (factor.value * factor.weight), 0
    );
    
    return { score, factors };
  }
  
  private static countTechnicalTerms(message: string): number {
    const technicalTerms = [
      'api', 'database', 'algorithm', 'function', 'class', 'method', 'variable',
      'interface', 'component', 'service', 'module', 'framework', 'library',
      'async', 'await', 'promise', 'callback', 'event', 'handler', 'middleware',
      'authentication', 'authorization', 'encryption', 'performance', 'optimization',
      'scalability', 'architecture', 'microservice', 'container', 'deployment'
    ];
    
    const words = message.toLowerCase().split(/\W+/);
    return technicalTerms.filter(term => words.includes(term)).length;
  }
  
  private static analyzeQuestionComplexity(message: string): number {
    let complexity = 0;
    
    // Check for question words
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who'];
    const hasQuestionWords = questionWords.some(word => 
      message.toLowerCase().includes(word)
    );
    
    if (hasQuestionWords) complexity += 0.3;
    
    // Check for multiple questions
    const questionMarks = (message.match(/\?/g) || []).length;
    complexity += Math.min(questionMarks * 0.2, 0.4);
    
    // Check for conditional statements
    const conditionals = ['if', 'when', 'unless', 'provided', 'assuming'];
    const hasConditionals = conditionals.some(word => 
      message.toLowerCase().includes(word)
    );
    
    if (hasConditionals) complexity += 0.3;
    
    return Math.min(complexity, 1);
  }
  
  private static countContextReferences(message: string): number {
    const contextIndicators = [
      'previous', 'earlier', 'before', 'after', 'following', 'above', 'below',
      'mentioned', 'discussed', 'current', 'existing', 'ongoing', 'recent'
    ];
    
    const words = message.toLowerCase().split(/\W+/);
    return contextIndicators.filter(indicator => words.includes(indicator)).length;
  }
  
  /**
   * Determine intent urgency from message
   */
  static determineUrgency(message: string): 'low' | 'medium' | 'high' | 'immediate' {
    const urgencyKeywords = {
      immediate: ['urgent', 'asap', 'emergency', 'critical', 'immediately', 'now', 'broken', 'down', 'failing'],
      high: ['important', 'priority', 'soon', 'quickly', 'fast', 'deadline', 'today'],
      medium: ['when possible', 'convenient', 'sometime', 'eventually'],
      low: ['later', 'future', 'maybe', 'consider', 'explore', 'investigate']
    };
    
    const messageLower = message.toLowerCase();
    
    for (const [level, keywords] of Object.entries(urgencyKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return level as 'low' | 'medium' | 'high' | 'immediate';
      }
    }
    
    // Default based on message characteristics
    if (message.includes('?')) return 'medium';
    if (message.length > 200) return 'high';
    return 'medium';
  }
}

/**
 * Complexity assessment utilities
 */
export class ComplexityAssessor {
  /**
   * Map complexity score to level
   */
  static mapScoreToLevel(score: number): ComplexityLevel {
    if (score < 0.2) return 'trivial';
    if (score < 0.4) return 'simple';
    if (score < 0.6) return 'moderate';
    if (score < 0.8) return 'complex';
    return 'enterprise';
  }
  
  /**
   * Assess task complexity from multiple factors
   */
  static assessTaskComplexity(factors: {
    messageComplexity: number;
    technicalDepth: number;
    scope: 'single_file' | 'module' | 'project' | 'system';
    dependencies: number;
    unknowns: number;
  }): ComplexityAssessment {
    const scopeScores = {
      single_file: 0.2,
      module: 0.4,
      project: 0.7,
      system: 1.0
    };
    
    const complexityScore = (
      factors.messageComplexity * 0.2 +
      factors.technicalDepth * 0.3 +
      scopeScores[factors.scope] * 0.3 +
      Math.min(factors.dependencies / 10, 1) * 0.1 +
      Math.min(factors.unknowns / 5, 1) * 0.1
    );
    
    const level = this.mapScoreToLevel(complexityScore);
    
    return {
      level,
      score: complexityScore * 100,
      factors: [
        {
          name: 'message_complexity',
          weight: 0.2,
          value: factors.messageComplexity,
          description: 'Complexity of user message'
        },
        {
          name: 'technical_depth',
          weight: 0.3,
          value: factors.technicalDepth,
          description: 'Technical complexity required'
        },
        {
          name: 'scope',
          weight: 0.3,
          value: scopeScores[factors.scope],
          description: 'Project scope impact'
        },
        {
          name: 'dependencies',
          weight: 0.1,
          value: Math.min(factors.dependencies / 10, 1),
          description: 'Number of dependencies'
        },
        {
          name: 'unknowns',
          weight: 0.1,
          value: Math.min(factors.unknowns / 5, 1),
          description: 'Unknown factors'
        }
      ],
      confidence: 0.8,
      reasoning: [
        `Message complexity: ${(factors.messageComplexity * 100).toFixed(1)}%`,
        `Technical depth: ${(factors.technicalDepth * 100).toFixed(1)}%`,
        `Scope: ${factors.scope}`,
        `Dependencies: ${factors.dependencies}`,
        `Unknowns: ${factors.unknowns}`
      ],
      recommendedTopology: this.recommendTopologyForComplexity(level),
      recommendedAgents: this.recommendAgentsForComplexity(level)
    };
  }
  
  private static recommendTopologyForComplexity(level: ComplexityLevel): SwarmTopology {
    const topologyMap: Record<ComplexityLevel, SwarmTopology> = {
      trivial: 'star',
      simple: 'star',
      moderate: 'ring',
      complex: 'hierarchical',
      enterprise: 'mesh'
    };
    
    return topologyMap[level];
  }
  
  private static recommendAgentsForComplexity(level: ComplexityLevel): AgentType[] {
    const agentMap: Record<ComplexityLevel, AgentType[]> = {
      trivial: ['coder'],
      simple: ['coder', 'tester'],
      moderate: ['coder', 'tester', 'reviewer'],
      complex: ['coordinator', 'coder', 'tester', 'reviewer', 'architect'],
      enterprise: ['coordinator', 'architect', 'coder', 'tester', 'reviewer', 'monitor', 'specialist']
    };
    
    return agentMap[level];
  }
}

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  /**
   * Analyze performance metrics for optimization opportunities
   */
  static analyzePerformanceMetrics(metrics: PerformanceMetrics): {
    score: number;
    bottlenecks: Array<{ type: string; severity: number; description: string }>;
    recommendations: string[];
  } {
    const bottlenecks: Array<{ type: string; severity: number; description: string }> = [];
    const recommendations: string[] = [];
    
    // Analyze execution time
    if (metrics.executionTime > 30000) { // 30 seconds
      bottlenecks.push({
        type: 'execution_time',
        severity: Math.min((metrics.executionTime - 30000) / 60000, 1),
        description: 'Execution time exceeds optimal threshold'
      });
      recommendations.push('Consider parallel processing or task decomposition');
    }
    
    // Analyze token usage
    if (metrics.tokenUsage > 5000) {
      bottlenecks.push({
        type: 'token_usage',
        severity: Math.min((metrics.tokenUsage - 5000) / 10000, 1),
        description: 'High token consumption detected'
      });
      recommendations.push('Optimize prompts and reduce context size');
    }
    
    // Analyze accuracy
    if (metrics.accuracy < 0.8) {
      bottlenecks.push({
        type: 'accuracy',
        severity: (0.8 - metrics.accuracy) / 0.8,
        description: 'Accuracy below acceptable threshold'
      });
      recommendations.push('Improve training data and pattern recognition');
    }
    
    // Analyze efficiency
    if (metrics.efficiency < 0.7) {
      bottlenecks.push({
        type: 'efficiency',
        severity: (0.7 - metrics.efficiency) / 0.7,
        description: 'Efficiency below optimal level'
      });
      recommendations.push('Optimize resource allocation and workflow design');
    }
    
    // Analyze error rate
    if (metrics.errorRate > 0.1) {
      bottlenecks.push({
        type: 'error_rate',
        severity: Math.min(metrics.errorRate / 0.2, 1),
        description: 'Error rate above acceptable threshold'
      });
      recommendations.push('Implement better error handling and validation');
    }
    
    // Calculate overall performance score
    const score = (
      Math.min(metrics.accuracy, 1) * 0.3 +
      Math.min(metrics.efficiency, 1) * 0.3 +
      Math.max(0, 1 - metrics.errorRate) * 0.2 +
      Math.min(1 - (metrics.executionTime / 60000), 1) * 0.2
    );
    
    return { score, bottlenecks, recommendations };
  }
  
  /**
   * Generate optimization plan
   */
  static generateOptimizationPlan(
    currentMetrics: PerformanceMetrics,
    targetMetrics: Partial<PerformanceMetrics>
  ): {
    steps: Array<{ id: string; description: string; priority: number; expectedImprovement: number }>;
    estimatedTimeframe: number;
    expectedOverallImprovement: number;
  } {
    const steps: Array<{ id: string; description: string; priority: number; expectedImprovement: number }> = [];
    
    // Accuracy improvement
    if (targetMetrics.accuracy && currentMetrics.accuracy < targetMetrics.accuracy) {
      steps.push({
        id: 'improve_accuracy',
        description: 'Enhance pattern recognition and training data',
        priority: 1,
        expectedImprovement: targetMetrics.accuracy - currentMetrics.accuracy
      });
    }
    
    // Efficiency improvement
    if (targetMetrics.efficiency && currentMetrics.efficiency < targetMetrics.efficiency) {
      steps.push({
        id: 'improve_efficiency',
        description: 'Optimize resource allocation and workflow processes',
        priority: 2,
        expectedImprovement: targetMetrics.efficiency - currentMetrics.efficiency
      });
    }
    
    // Error rate reduction
    if (targetMetrics.errorRate && currentMetrics.errorRate > targetMetrics.errorRate) {
      steps.push({
        id: 'reduce_errors',
        description: 'Implement robust error handling and validation',
        priority: 1,
        expectedImprovement: currentMetrics.errorRate - targetMetrics.errorRate
      });
    }
    
    // Execution time optimization
    if (targetMetrics.executionTime && currentMetrics.executionTime > targetMetrics.executionTime) {
      steps.push({
        id: 'optimize_speed',
        description: 'Implement parallel processing and caching',
        priority: 3,
        expectedImprovement: (currentMetrics.executionTime - targetMetrics.executionTime) / currentMetrics.executionTime
      });
    }
    
    // Sort by priority
    steps.sort((a, b) => a.priority - b.priority);
    
    const estimatedTimeframe = steps.length * 2 * 60 * 60 * 1000; // 2 hours per step
    const expectedOverallImprovement = steps.reduce((sum, step) => sum + step.expectedImprovement, 0) / steps.length;
    
    return {
      steps,
      estimatedTimeframe,
      expectedOverallImprovement
    };
  }
}

/**
 * Agent coordination utilities
 */
export class AgentCoordinationUtils {
  /**
   * Calculate optimal agent distribution for swarm
   */
  static calculateOptimalDistribution(
    agentTypes: AgentType[],
    taskComplexity: ComplexityLevel,
    maxAgents: number
  ): Record<AgentType, number> {
    const distribution: Record<AgentType, number> = {} as Record<AgentType, number>;
    
    // Base distribution ratios by complexity
    const complexityRatios: Record<ComplexityLevel, Record<string, number>> = {
      trivial: { coder: 1 },
      simple: { coder: 0.7, tester: 0.3 },
      moderate: { coder: 0.5, tester: 0.3, reviewer: 0.2 },
      complex: { coordinator: 0.1, coder: 0.4, tester: 0.2, reviewer: 0.2, architect: 0.1 },
      enterprise: { coordinator: 0.15, architect: 0.15, coder: 0.3, tester: 0.2, reviewer: 0.15, monitor: 0.05 }
    };
    
    const ratios = complexityRatios[taskComplexity];
    let totalAllocated = 0;
    
    for (const agentType of agentTypes) {
      const ratio = ratios[agentType] || 0;
      const count = Math.max(1, Math.round(ratio * maxAgents));
      
      if (totalAllocated + count <= maxAgents) {
        distribution[agentType] = count;
        totalAllocated += count;
      } else if (totalAllocated < maxAgents) {
        distribution[agentType] = maxAgents - totalAllocated;
        totalAllocated = maxAgents;
      }
    }
    
    return distribution;
  }
  
  /**
   * Determine optimal swarm topology
   */
  static determineOptimalTopology(
    agentCount: number,
    taskComplexity: ComplexityLevel,
    communicationNeeds: 'low' | 'medium' | 'high'
  ): SwarmTopology {
    // Single agent always uses star
    if (agentCount === 1) return 'star';
    
    // Consider complexity
    if (taskComplexity === 'trivial' || taskComplexity === 'simple') {
      return 'star';
    }
    
    // Consider communication needs
    if (communicationNeeds === 'high' && agentCount <= 6) {
      return 'mesh';
    }
    
    if (communicationNeeds === 'medium') {
      return agentCount <= 4 ? 'ring' : 'hierarchical';
    }
    
    // Default based on agent count and complexity
    if (agentCount <= 3) return 'ring';
    if (agentCount <= 6) return 'hierarchical';
    return 'mesh';
  }
  
  /**
   * Calculate coordination overhead
   */
  static calculateCoordinationOverhead(
    topology: SwarmTopology,
    agentCount: number
  ): number {
    const overheadFactors: Record<SwarmTopology, (n: number) => number> = {
      star: (n) => n - 1, // Linear with central coordinator
      ring: (n) => n, // Each agent communicates with neighbors
      hierarchical: (n) => n + Math.floor(n / 3), // Additional management overhead
      mesh: (n) => n * (n - 1) / 2 // Full connectivity
    };
    
    const baseOverhead = overheadFactors[topology](agentCount);
    const normalizedOverhead = baseOverhead / (agentCount * agentCount);
    
    return Math.min(normalizedOverhead, 1);
  }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  /**
   * Calculate memory importance score
   */
  static calculateImportanceScore(
    content: any,
    accessCount: number,
    recency: number,
    context: any
  ): number {
    let score = 0;
    
    // Access frequency (30% weight)
    const normalizedAccess = Math.min(accessCount / 10, 1);
    score += normalizedAccess * 0.3;
    
    // Recency (25% weight)
    score += recency * 0.25;
    
    // Content relevance (35% weight)
    const relevance = this.calculateContentRelevance(content, context);
    score += relevance * 0.35;
    
    // Size efficiency (10% weight)
    const sizeScore = this.calculateSizeEfficiency(content);
    score += sizeScore * 0.1;
    
    return Math.min(score, 1);
  }
  
  private static calculateContentRelevance(content: any, context: any): number {
    // Simplified relevance calculation
    // In practice, this would use more sophisticated analysis
    
    if (!content || !context) return 0.5;
    
    const contentStr = JSON.stringify(content).toLowerCase();
    const contextStr = JSON.stringify(context).toLowerCase();
    
    // Check for common keywords
    const contentWords = contentStr.split(/\W+/);
    const contextWords = contextStr.split(/\W+/);
    
    const commonWords = contentWords.filter(word => 
      word.length > 3 && contextWords.includes(word)
    );
    
    return Math.min(commonWords.length / Math.max(contentWords.length, 1), 1);
  }
  
  private static calculateSizeEfficiency(content: any): number {
    const size = JSON.stringify(content).length;
    
    // Prefer smaller, more efficient memories
    if (size < 1000) return 1;
    if (size < 5000) return 0.8;
    if (size < 10000) return 0.6;
    return 0.4;
  }
  
  /**
   * Optimize memory storage
   */
  static optimizeMemoryStorage(memories: any[], maxSize: number): any[] {
    // Sort by importance score
    const scoredMemories = memories.map(memory => ({
      memory,
      score: this.calculateImportanceScore(
        memory.content,
        memory.accessCount || 0,
        this.calculateRecency(memory.timestamp),
        memory.context
      )
    }));
    
    scoredMemories.sort((a, b) => b.score - a.score);
    
    // Select top memories within size limit
    const optimized: any[] = [];
    let currentSize = 0;
    
    for (const { memory } of scoredMemories) {
      const memorySize = JSON.stringify(memory).length;
      
      if (currentSize + memorySize <= maxSize) {
        optimized.push(memory);
        currentSize += memorySize;
      } else {
        break;
      }
    }
    
    return optimized;
  }
  
  private static calculateRecency(timestamp: Date): number {
    const now = Date.now();
    const memoryTime = timestamp.getTime();
    const age = now - memoryTime;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    return Math.max(0, 1 - (age / maxAge));
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate neural pattern
   */
  static validateNeuralPattern(pattern: NeuralPattern): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!pattern.id) errors.push('Pattern ID is required');
    if (!pattern.name) errors.push('Pattern name is required');
    if (!pattern.type) errors.push('Pattern type is required');
    if (pattern.confidence < 0 || pattern.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }
    if (!pattern.timestamp) errors.push('Timestamp is required');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate user intent
   */
  static validateUserIntent(intent: UserIntent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const validCategories = ['development', 'analysis', 'coordination', 'optimization', 'research', 'testing'];
    if (!validCategories.includes(intent.category)) {
      errors.push(`Invalid category: ${intent.category}`);
    }
    
    const validComplexities = ['trivial', 'simple', 'moderate', 'complex', 'enterprise'];
    if (!validComplexities.includes(intent.complexity)) {
      errors.push(`Invalid complexity: ${intent.complexity}`);
    }
    
    const validUrgencies = ['low', 'medium', 'high', 'immediate'];
    if (!validUrgencies.includes(intent.urgency)) {
      errors.push(`Invalid urgency: ${intent.urgency}`);
    }
    
    const validScopes = ['single_file', 'module', 'project', 'system'];
    if (!validScopes.includes(intent.scope)) {
      errors.push(`Invalid scope: ${intent.scope}`);
    }
    
    if (!Array.isArray(intent.requiredAgents) || intent.requiredAgents.length === 0) {
      errors.push('At least one required agent must be specified');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate performance metrics
   */
  static validatePerformanceMetrics(metrics: PerformanceMetrics): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (metrics.executionTime < 0) errors.push('Execution time must be non-negative');
    if (metrics.tokenUsage < 0) errors.push('Token usage must be non-negative');
    if (metrics.accuracy < 0 || metrics.accuracy > 1) errors.push('Accuracy must be between 0 and 1');
    if (metrics.efficiency < 0 || metrics.efficiency > 1) errors.push('Efficiency must be between 0 and 1');
    if (metrics.errorRate < 0 || metrics.errorRate > 1) errors.push('Error rate must be between 0 and 1');
    if (metrics.throughput < 0) errors.push('Throughput must be non-negative');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export all utilities
export {
  PatternMatcher,
  IntentAnalyzer,
  ComplexityAssessor,
  PerformanceOptimizer,
  AgentCoordinationUtils,
  MemoryManager,
  ValidationUtils
};