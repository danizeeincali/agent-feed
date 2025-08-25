/**
 * Solution Tracking and Learning System
 * Tracks solution effectiveness and builds intelligence for future recommendations
 */

const crypto = require('crypto');

class SolutionTracker {
  constructor(nldDatabase) {
    this.nld = nldDatabase;
    this.solutions = new Map();
    this.solutionHistory = [];
    this.effectivenessCache = new Map();
    
    // Solution categories
    this.solutionCategories = {
      PROTOCOL_FIX: 'Protocol compatibility fixes',
      RESOURCE_OPTIMIZATION: 'Resource usage optimizations',
      ARCHITECTURE_CHANGE: 'Architecture modifications',
      CONFIGURATION_CHANGE: 'Configuration adjustments',
      CODE_REFACTOR: 'Code refactoring',
      DEPENDENCY_UPDATE: 'Dependency updates',
      QUICK_FIX: 'Quick temporary fixes',
      COMPREHENSIVE_SOLUTION: 'Comprehensive long-term solutions'
    };

    this.initializeSolutionTemplates();
  }

  /**
   * Initialize common solution templates based on existing patterns
   */
  initializeSolutionTemplates() {
    this.solutionTemplates = {
      COMMUNICATION_PROTOCOL: [
        {
          id: 'protocol_websocket_conversion',
          name: 'Convert Frontend to Raw WebSocket',
          category: 'PROTOCOL_FIX',
          description: 'Replace Socket.IO client with raw WebSocket client',
          steps: [
            'Remove socket.io-client dependency',
            'Implement WebSocket connection management',
            'Add manual reconnection logic',
            'Update message formatting to JSON',
            'Test protocol compatibility'
          ],
          estimatedEffort: 'MEDIUM',
          riskLevel: 'LOW',
          historicalSuccess: 0.85,
          timeToImplement: '2-4 hours',
          prerequisites: ['Frontend access', 'WebSocket server compatibility']
        },
        {
          id: 'protocol_socketio_backend',
          name: 'Convert Backend to Socket.IO Server',
          category: 'PROTOCOL_FIX',
          description: 'Replace raw WebSocket server with Socket.IO server',
          steps: [
            'Install socket.io server dependency',
            'Replace WebSocket server with Socket.IO',
            'Update message handling for Engine.IO format',
            'Test client compatibility',
            'Update documentation'
          ],
          estimatedEffort: 'MEDIUM',
          riskLevel: 'LOW',
          historicalSuccess: 0.80,
          timeToImplement: '3-5 hours',
          prerequisites: ['Backend access', 'Socket.IO compatibility']
        }
      ],

      TERMINAL_HANG: [
        {
          id: 'claude_command_interception',
          name: 'Claude Command Hang Prevention',
          category: 'QUICK_FIX',
          description: 'Intercept problematic claude commands before they reach PTY',
          steps: [
            'Detect standalone claude commands',
            'Provide helpful alternatives',
            'Send usage guidance',
            'Prevent PTY hang'
          ],
          estimatedEffort: 'LOW',
          riskLevel: 'LOW',
          historicalSuccess: 0.95,
          timeToImplement: '1-2 hours',
          prerequisites: ['Terminal server access']
        }
      ],

      PROCESS_MANAGEMENT: [
        {
          id: 'pty_lifecycle_improvement',
          name: 'PTY Process Lifecycle Management',
          category: 'ARCHITECTURE_CHANGE',
          description: 'Improve PTY spawning, monitoring, and cleanup',
          steps: [
            'Add process health monitoring',
            'Implement graceful shutdown',
            'Add process restart capability',
            'Monitor resource usage',
            'Log process lifecycle events'
          ],
          estimatedEffort: 'HIGH',
          riskLevel: 'MEDIUM',
          historicalSuccess: 0.70,
          timeToImplement: '1-2 days',
          prerequisites: ['System administration access']
        }
      ],

      RESOURCE_ALLOCATION: [
        {
          id: 'connection_pooling',
          name: 'WebSocket Connection Pooling',
          category: 'RESOURCE_OPTIMIZATION',
          description: 'Implement connection pooling and limits',
          steps: [
            'Add connection counting',
            'Implement connection limits',
            'Add connection reuse logic',
            'Monitor connection health',
            'Add graceful degradation'
          ],
          estimatedEffort: 'MEDIUM',
          riskLevel: 'MEDIUM',
          historicalSuccess: 0.75,
          timeToImplement: '4-6 hours',
          prerequisites: ['Load testing capability']
        }
      ]
    };
  }

  /**
   * Track solution application and outcome
   */
  async trackSolutionApplication(solutionData) {
    const tracking = {
      id: this.generateSolutionId(solutionData),
      timestamp: Date.now(),
      solution: solutionData.solution,
      failurePattern: solutionData.failurePattern,
      applicationContext: solutionData.applicationContext,
      outcome: null, // Will be updated when outcome is known
      effectiveness: null,
      implementationTime: null,
      complications: [],
      userFeedback: null,
      status: 'APPLIED'
    };

    this.solutions.set(tracking.id, tracking);
    this.solutionHistory.push({
      id: tracking.id,
      timestamp: tracking.timestamp,
      type: 'APPLICATION'
    });

    console.log(`[Solution Tracker] Tracking solution application: ${tracking.id}`);
    return tracking.id;
  }

  /**
   * Update solution outcome based on results
   */
  async updateSolutionOutcome(solutionId, outcomeData) {
    const tracking = this.solutions.get(solutionId);
    if (!tracking) {
      console.warn(`[Solution Tracker] Solution not found: ${solutionId}`);
      return false;
    }

    // Update tracking record
    tracking.outcome = outcomeData.outcome; // SUCCESS, FAILURE, PARTIAL
    tracking.effectiveness = this.calculateSolutionEffectiveness(outcomeData);
    tracking.implementationTime = outcomeData.implementationTime;
    tracking.complications = outcomeData.complications || [];
    tracking.userFeedback = outcomeData.userFeedback;
    tracking.status = 'COMPLETED';
    tracking.completedAt = Date.now();

    // Update solution template effectiveness
    await this.updateTemplateEffectiveness(tracking.solution, tracking.effectiveness);

    // Store learning data
    await this.storeSolutionLearning(tracking);

    console.log(`[Solution Tracker] Updated solution outcome: ${solutionId} (${outcomeData.outcome})`);
    
    this.solutionHistory.push({
      id: solutionId,
      timestamp: Date.now(),
      type: 'OUTCOME_UPDATE',
      outcome: outcomeData.outcome
    });

    return true;
  }

  /**
   * Get recommended solutions for a failure pattern
   */
  async getRecommendedSolutions(failureData) {
    const category = failureData.category || 'UNKNOWN';
    const templates = this.solutionTemplates[category] || [];
    
    // Score solutions based on historical effectiveness
    const scoredSolutions = await Promise.all(
      templates.map(async template => ({
        ...template,
        relevanceScore: await this.calculateRelevanceScore(template, failureData),
        adjustedSuccess: await this.getAdjustedSuccessRate(template.id),
        similarCases: await this.findSimilarSuccessfulCases(template, failureData)
      }))
    );

    // Sort by combined score (relevance * success rate)
    scoredSolutions.sort((a, b) => 
      (b.relevanceScore * b.adjustedSuccess) - (a.relevanceScore * a.adjustedSuccess)
    );

    return scoredSolutions.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Calculate solution effectiveness score
   */
  calculateSolutionEffectiveness(outcomeData) {
    let score = 0;

    // Base score from outcome
    switch (outcomeData.outcome) {
      case 'SUCCESS': score = 1.0; break;
      case 'PARTIAL': score = 0.6; break;
      case 'FAILURE': score = 0.1; break;
      default: score = 0.5;
    }

    // Adjust for implementation time
    if (outcomeData.implementationTime) {
      const expectedTime = this.parseTimeToMinutes(outcomeData.expectedTime || '2 hours');
      const actualTime = this.parseTimeToMinutes(outcomeData.implementationTime);
      
      if (actualTime <= expectedTime) {
        score += 0.1; // Bonus for meeting time expectations
      } else if (actualTime > expectedTime * 2) {
        score -= 0.2; // Penalty for significant overrun
      }
    }

    // Adjust for complications
    if (outcomeData.complications && outcomeData.complications.length > 0) {
      score -= outcomeData.complications.length * 0.1;
    }

    // Adjust for user feedback
    if (outcomeData.userFeedback) {
      const feedback = outcomeData.userFeedback.toLowerCase();
      if (feedback.includes('worked') || feedback.includes('fixed')) {
        score += 0.1;
      } else if (feedback.includes('failed') || feedback.includes('broken')) {
        score -= 0.2;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate relevance score for a solution template
   */
  async calculateRelevanceScore(template, failureData) {
    let score = 0.5; // Base relevance

    // Match by category
    if (failureData.category && template.category) {
      const categoryMatch = failureData.category === template.category;
      score += categoryMatch ? 0.3 : 0;
    }

    // Match by keywords in failure description
    const failureText = JSON.stringify(failureData).toLowerCase();
    const templateText = JSON.stringify(template).toLowerCase();
    
    const failureWords = failureText.match(/\w+/g) || [];
    const templateWords = templateText.match(/\w+/g) || [];
    
    const commonWords = failureWords.filter(word => 
      templateWords.includes(word) && word.length > 3
    );
    
    score += (commonWords.length / Math.max(failureWords.length, 1)) * 0.2;

    // Consider environmental factors
    if (failureData.environmentContext) {
      const env = failureData.environmentContext;
      
      // Adjust for system resources
      if (env.memoryUsage && template.category === 'RESOURCE_OPTIMIZATION') {
        score += 0.1;
      }
      
      // Adjust for platform compatibility
      if (env.platform && template.prerequisites) {
        const platformMatch = template.prerequisites.some(prereq => 
          prereq.toLowerCase().includes(env.platform)
        );
        score += platformMatch ? 0.1 : -0.1;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get adjusted success rate based on recent performance
   */
  async getAdjustedSuccessRate(templateId) {
    const recentApplications = Array.from(this.solutions.values())
      .filter(s => s.solution.id === templateId && s.status === 'COMPLETED')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Last 10 applications

    if (recentApplications.length === 0) {
      // Use historical success rate from template
      const template = this.findTemplateById(templateId);
      return template?.historicalSuccess || 0.5;
    }

    // Calculate recent success rate
    const successes = recentApplications.filter(app => app.effectiveness > 0.7).length;
    const recentRate = successes / recentApplications.length;

    // Weight recent vs historical (70% recent, 30% historical)
    const template = this.findTemplateById(templateId);
    const historicalRate = template?.historicalSuccess || 0.5;
    
    return recentRate * 0.7 + historicalRate * 0.3;
  }

  /**
   * Find similar successful cases
   */
  async findSimilarSuccessfulCases(template, failureData) {
    const similar = [];
    
    for (const [id, solution] of this.solutions) {
      if (solution.solution.id === template.id && 
          solution.effectiveness > 0.7 &&
          solution.status === 'COMPLETED') {
        
        const similarity = await this.calculateFailureSimilarity(
          failureData, 
          solution.failurePattern
        );
        
        if (similarity > 0.6) {
          similar.push({
            id,
            similarity,
            effectiveness: solution.effectiveness,
            implementationTime: solution.implementationTime
          });
        }
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  /**
   * Calculate similarity between failure patterns
   */
  async calculateFailureSimilarity(failure1, failure2) {
    if (!failure1 || !failure2) return 0;

    let similarity = 0;

    // Category match
    if (failure1.category === failure2.category) {
      similarity += 0.3;
    }

    // Type match
    if (failure1.type === failure2.type) {
      similarity += 0.2;
    }

    // Context similarity (simple text comparison)
    const text1 = JSON.stringify(failure1.context || {}).toLowerCase();
    const text2 = JSON.stringify(failure2.context || {}).toLowerCase();
    
    const words1 = text1.match(/\w+/g) || [];
    const words2 = text2.match(/\w+/g) || [];
    
    const common = words1.filter(word => words2.includes(word));
    const textSimilarity = common.length / Math.max(words1.length, words2.length, 1);
    
    similarity += textSimilarity * 0.3;

    // Environmental similarity
    if (failure1.environmentContext && failure2.environmentContext) {
      const env1 = failure1.environmentContext;
      const env2 = failure2.environmentContext;
      
      if (env1.platform === env2.platform) similarity += 0.1;
      if (env1.nodeVersion === env2.nodeVersion) similarity += 0.1;
    }

    return Math.min(1, similarity);
  }

  /**
   * Store solution learning data in NLD
   */
  async storeSolutionLearning(tracking) {
    const learningData = {
      type: 'SOLUTION_OUTCOME',
      category: 'SOLUTION_TRACKING',
      taskDescription: `Applied solution: ${tracking.solution.name}`,
      claudeConfidence: 0.8, // Assume high confidence in recommended solutions
      actualOutcome: tracking.effectiveness,
      userFeedback: tracking.userFeedback,
      solution: {
        approach: tracking.solution.name,
        effectiveness: tracking.effectiveness,
        implementationTime: tracking.implementationTime,
        complications: tracking.complications
      },
      environmentContext: tracking.applicationContext
    };

    try {
      await this.nld.storeFailurePattern(learningData);
    } catch (error) {
      console.error('[Solution Tracker] Failed to store learning data:', error);
    }
  }

  /**
   * Update template effectiveness based on new data
   */
  async updateTemplateEffectiveness(solution, effectiveness) {
    const template = this.findTemplateById(solution.id);
    if (!template) return;

    // Update historical success rate with new data point
    const currentRate = template.historicalSuccess;
    const alpha = 0.1; // Learning rate
    template.historicalSuccess = currentRate * (1 - alpha) + effectiveness * alpha;

    console.log(`[Solution Tracker] Updated template ${solution.id} effectiveness: ${template.historicalSuccess.toFixed(3)}`);
  }

  /**
   * Generate solution analytics report
   */
  async generateAnalyticsReport() {
    const completedSolutions = Array.from(this.solutions.values())
      .filter(s => s.status === 'COMPLETED');

    const report = {
      timestamp: new Date().toISOString(),
      totalSolutions: this.solutions.size,
      completedSolutions: completedSolutions.length,
      averageEffectiveness: this.calculateAverageEffectiveness(completedSolutions),
      categoryBreakdown: this.getCategoryBreakdown(completedSolutions),
      topPerformingSolutions: this.getTopPerformingSolutions(completedSolutions),
      implementationTimeAnalysis: this.analyzeImplementationTimes(completedSolutions),
      userFeedbackSummary: this.summarizeUserFeedback(completedSolutions),
      recommendations: this.generateRecommendations(completedSolutions)
    };

    return report;
  }

  /**
   * Helper methods
   */
  generateSolutionId(solutionData) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      solutionId: solutionData.solution.id,
      failurePattern: solutionData.failurePattern.id,
      timestamp: Math.floor(Date.now() / 1000 / 60) // Minute precision
    }));
    return hash.digest('hex').substring(0, 16);
  }

  findTemplateById(templateId) {
    for (const templates of Object.values(this.solutionTemplates)) {
      const template = templates.find(t => t.id === templateId);
      if (template) return template;
    }
    return null;
  }

  parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    
    const hours = timeStr.match(/(\d+)\s*h/i);
    const minutes = timeStr.match(/(\d+)\s*m/i);
    
    let total = 0;
    if (hours) total += parseInt(hours[1]) * 60;
    if (minutes) total += parseInt(minutes[1]);
    
    return total || 120; // Default 2 hours
  }

  calculateAverageEffectiveness(solutions) {
    if (solutions.length === 0) return 0;
    return solutions.reduce((sum, s) => sum + (s.effectiveness || 0), 0) / solutions.length;
  }

  getCategoryBreakdown(solutions) {
    const breakdown = {};
    for (const solution of solutions) {
      const category = solution.solution.category || 'UNKNOWN';
      breakdown[category] = (breakdown[category] || 0) + 1;
    }
    return breakdown;
  }

  getTopPerformingSolutions(solutions) {
    return solutions
      .sort((a, b) => (b.effectiveness || 0) - (a.effectiveness || 0))
      .slice(0, 5)
      .map(s => ({
        name: s.solution.name,
        effectiveness: s.effectiveness,
        category: s.solution.category,
        applications: this.countApplications(s.solution.id)
      }));
  }

  countApplications(solutionId) {
    return Array.from(this.solutions.values())
      .filter(s => s.solution.id === solutionId).length;
  }

  analyzeImplementationTimes(solutions) {
    const times = solutions
      .map(s => this.parseTimeToMinutes(s.implementationTime))
      .filter(t => t > 0);

    if (times.length === 0) return { average: 0, median: 0, range: [0, 0] };

    times.sort((a, b) => a - b);
    const average = times.reduce((sum, t) => sum + t, 0) / times.length;
    const median = times[Math.floor(times.length / 2)];

    return {
      average: Math.round(average),
      median,
      range: [times[0], times[times.length - 1]],
      distribution: this.categorizeImplementationTimes(times)
    };
  }

  categorizeImplementationTimes(times) {
    const categories = { quick: 0, medium: 0, long: 0 };
    
    for (const time of times) {
      if (time <= 60) categories.quick++;
      else if (time <= 240) categories.medium++;
      else categories.long++;
    }

    return categories;
  }

  summarizeUserFeedback(solutions) {
    const feedback = solutions
      .map(s => s.userFeedback)
      .filter(f => f)
      .map(f => f.toLowerCase());

    const positive = feedback.filter(f => 
      f.includes('worked') || f.includes('fixed') || f.includes('good')
    ).length;
    
    const negative = feedback.filter(f => 
      f.includes('failed') || f.includes('broken') || f.includes('bad')
    ).length;

    return {
      total: feedback.length,
      positive,
      negative,
      neutral: feedback.length - positive - negative,
      sentimentScore: feedback.length > 0 ? (positive - negative) / feedback.length : 0
    };
  }

  generateRecommendations(solutions) {
    const recommendations = [];

    // Analyze effectiveness trends
    const avgEffectiveness = this.calculateAverageEffectiveness(solutions);
    if (avgEffectiveness < 0.7) {
      recommendations.push({
        priority: 'HIGH',
        area: 'Solution Quality',
        message: `Average solution effectiveness is ${(avgEffectiveness * 100).toFixed(1)}%`,
        action: 'Review and improve solution templates'
      });
    }

    // Analyze category performance
    const categoryBreakdown = this.getCategoryBreakdown(solutions);
    const poorCategories = Object.entries(categoryBreakdown)
      .filter(([category, count]) => {
        const categoryEffectiveness = this.calculateCategoryEffectiveness(solutions, category);
        return categoryEffectiveness < 0.6 && count > 2;
      });

    for (const [category, count] of poorCategories) {
      recommendations.push({
        priority: 'MEDIUM',
        area: 'Category Performance',
        message: `${category} solutions showing low effectiveness`,
        action: `Review and enhance ${category} solution templates`
      });
    }

    return recommendations;
  }

  calculateCategoryEffectiveness(solutions, category) {
    const categorySolutions = solutions.filter(s => s.solution.category === category);
    return this.calculateAverageEffectiveness(categorySolutions);
  }
}

module.exports = SolutionTracker;