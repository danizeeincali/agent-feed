/**
 * Avi Strategic Oversight Service
 * Evaluates agent page requests based on strategic fit, data readiness, and resource allocation
 * Implements the SPARC specification for agent self-advocacy and page suggestion system
 */

import DatabaseService from '../database/DatabaseService.js';
import nldPatternDetectionService from '../nld-patterns/pattern-detection-service.js';
import agentDataReadiness from './agent-data-readiness.js';
import aviAIConfig from './avi-ai-config.js';

class AviStrategicOversight {
  constructor() {
    this.db = null;
    this.evaluationHistory = [];
    // Hybrid Decision Thresholds
    this.decisionThresholds = {
      AUTO_APPROVE: 85, // High confidence auto-approval
      AI_ESCALATION_UPPER: 84, // Upper bound for AI evaluation
      AI_ESCALATION_LOWER: 40, // Lower bound for AI evaluation
      AUTO_REJECT: 39 // Clear rejection threshold
    };
    
    // Protected Business Rules (cannot be overridden by users)
    this.protectedBusinessRules = {
      maxDevelopmentTime: 168, // 1 week in hours
      criticalSecurityRequirements: ['pii', 'financial', 'authentication'],
      maxResourceThreshold: 0.8,
      minDataQualityScore: 0.3,
      requiredJustificationFields: ['problemStatement', 'impactAnalysis']
    };
    
    // AI Avi Configuration
    this.aiAviConfig = {
      enabled: true,
      maxProcessingTime: 5000, // 5 seconds for AI decisions
      fallbackToManual: true,
      confidenceThreshold: 0.7
    };
    
    // Strategic priority matrix
    this.strategicPriorities = {
      'user_productivity': 0.30,
      'system_efficiency': 0.25,
      'data_quality': 0.20,
      'resource_optimization': 0.15,
      'innovation': 0.10
    };
    
    this.stats = {
      totalRequests: 0,
      autoApproved: 0,
      autoRejected: 0,
      aiEscalated: 0,
      manualReview: 0,
      averageProcessingTime: 0,
      averageAutoDecisionTime: 0,
      averageAiDecisionTime: 0,
      autoFixAttempts: 0,
      patternsDetected: 0,
      businessRuleViolations: 0,
      performanceOptimizations: 0
    };
    
    // Performance tracking for <100ms auto-decisions
    this.performanceTargets = {
      autoDecisionMaxTime: 100, // milliseconds
      aiDecisionMaxTime: 5000 // milliseconds
    };
  }
  
  async initialize() {
    try {
      // Import the database service instance
      const { databaseService } = await import('../database/DatabaseService.js');
      this.db = databaseService;
      await this.createRequestTables();
      console.log('✅ Avi Strategic Oversight initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Avi Strategic Oversight:', error);
      throw error;
    }
  }
  
  async createRequestTables() {
    const createRequestsTable = `
      CREATE TABLE IF NOT EXISTS avi_page_requests (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        request_type TEXT NOT NULL,
        title TEXT NOT NULL,
        justification TEXT NOT NULL,
        data_requirements TEXT,
        priority_level INTEGER,
        estimated_impact REAL,
        resource_estimate TEXT,
        status TEXT DEFAULT 'pending',
        evaluation_score REAL,
        decision TEXT,
        feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        evaluated_at DATETIME,
        approved_by TEXT,
        implementation_deadline DATETIME
      )
    `;
    
    const createEvaluationHistory = `
      CREATE TABLE IF NOT EXISTS avi_evaluation_history (
        id TEXT PRIMARY KEY,
        request_id TEXT REFERENCES avi_page_requests(id),
        evaluation_criteria TEXT,
        strategic_alignment REAL,
        data_readiness REAL,
        resource_efficiency REAL,
        risk_assessment REAL,
        urgency_impact REAL,
        final_score REAL,
        decision_rationale TEXT,
        auto_fixes_attempted TEXT,
        patterns_detected TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createDecisionLog = `
      CREATE TABLE IF NOT EXISTS avi_decision_log (
        id TEXT PRIMARY KEY,
        request_id TEXT REFERENCES avi_page_requests(id),
        decision_type TEXT NOT NULL,
        decision_reason TEXT,
        conditions TEXT,
        follow_up_actions TEXT,
        nld_patterns TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Use the unified database service
    await this.db.query(createRequestsTable);
    await this.db.query(createEvaluationHistory);
    await this.db.query(createDecisionLog);
  }
  
  /**
   * Submit a page request for evaluation
   * @param {Object} request - Page request details
   * @returns {Object} Request submission result
   */
  async submitPageRequest(request) {
    const startTime = Date.now();
    
    try {
      // Generate request ID
      const requestId = `avi-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Validate request format
      const validation = this.validateRequestFormat(request);
      if (!validation.valid) {
        return {
          success: false,
          requestId,
          error: 'Invalid request format',
          details: validation.errors
        };
      }
      
      // Check agent data readiness
      const dataCheck = await this.validateAgentDataReadiness(request.agentId);
      if (!dataCheck.hasData && request.requiresData !== false) {
        // Log as failed request pattern for NLD
        await this.recordFailedRequest(requestId, request, 'insufficient_data', {
          message: 'Agent has no data available for page creation',
          dataStatus: dataCheck
        });
        
        return {
          success: false,
          requestId,
          error: 'Insufficient data',
          message: `Agent ${request.agentId} does not have sufficient data for page creation`,
          dataStatus: dataCheck,
          suggestion: 'Generate meaningful data or activities before requesting a page'
        };
      }
      
      // Store request in database
      await this.db.query(`
        INSERT INTO avi_page_requests (
          id, agent_id, request_type, title, justification, 
          data_requirements, priority_level, estimated_impact, 
          resource_estimate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        requestId,
        request.agentId,
        request.pageType,
        request.title,
        JSON.stringify(request.justification),
        JSON.stringify(request.dataRequirements || {}),
        request.priority || 5,
        request.estimatedImpact || 0,
        JSON.stringify(request.resourceEstimate || {}),
        'pending'
      ]);
      
      this.stats.totalRequests++;
      
      // Begin hybrid evaluation process
      const evaluation = await this.evaluateRequest(requestId, request);
      
      // Create comprehensive audit trail
      await this.createAuditTrail(requestId, evaluation.decision, evaluation.decisionType, 
        evaluation.processingTime, {
          conditions: { score: evaluation.finalScore, quickScore: evaluation.quickScore },
          patterns: evaluation.patterns || [],
          nextSteps: evaluation.nextSteps || []
        });
      
      const processingTime = evaluation.processingTime;
      this.updateAverageProcessingTime(processingTime);
      this.updateStats(evaluation.decision, evaluation.decisionType);
      
      return {
        success: true,
        requestId,
        status: evaluation.decision,
        score: evaluation.finalScore,
        processingTime,
        evaluation: evaluation,
        nextSteps: evaluation.nextSteps || this.generateNextSteps(evaluation),
        hybridMetrics: {
          decisionType: evaluation.decisionType,
          autoDecision: evaluation.autoDecision || false,
          aiProcessed: evaluation.aiProcessed || false,
          performanceCompliant: evaluation.processingTime <= this.performanceTargets.autoDecisionMaxTime
        }
      };
      
    } catch (error) {
      console.error(`❌ Avi: Failed to submit request:`, error);
      
      // Record failure pattern
      await this.recordFailedRequest(requestId || 'unknown', request, 'submission_error', {
        message: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: 'Request submission failed',
        details: error.message
      };
    }
  }
  
  /**
   * Hybrid evaluation system: Fast code logic + AI intelligence for complex decisions
   * @param {string} requestId - Request identifier
   * @param {Object} request - Request details
   * @returns {Object} Evaluation result
   */
  async evaluateRequest(requestId, request) {
    const startTime = performance.now();
    
    try {
      console.log(`🧠 Avi Hybrid: Evaluating request ${requestId} for agent ${request.agentId}`);
      
      // Step 1: Protected Business Rules Check (cannot be bypassed)
      const businessRuleCheck = await this.enforceProtectedBusinessRules(request);
      if (!businessRuleCheck.passed) {
        this.stats.businessRuleViolations++;
        return this.createRejectionResult(requestId, 'BUSINESS_RULE_VIOLATION', 
          businessRuleCheck.reason, startTime, 'AUTO_REJECT');
      }
      
      // Step 2: Fast Score Calculation
      const quickScore = await this.calculateQuickScore(request);
      const processingTime = performance.now() - startTime;
      
      // Step 3: Hybrid Decision Logic
      if (quickScore >= this.decisionThresholds.AUTO_APPROVE) {
        // 80% of cases: Auto-approve high confidence requests
        this.stats.autoApproved++;
        return this.createApprovalResult(requestId, quickScore, processingTime, 'HIGH_CONFIDENCE');
        
      } else if (quickScore <= this.decisionThresholds.AUTO_REJECT) {
        // Clear rejections: Auto-deny low confidence requests
        this.stats.autoRejected++;
        return this.createRejectionResult(requestId, 'LOW_CONFIDENCE', 
          'Request does not meet minimum quality standards', processingTime, 'AUTO_REJECT');
        
      } else {
        // 20% of cases: Escalate to AI Avi for nuanced decision
        this.stats.aiEscalated++;
        return await this.escalateToAviAI(requestId, request, quickScore, processingTime);
      }
      
    } catch (error) {
      console.error(`❌ Avi Hybrid: Evaluation failed for request ${requestId}:`, error);
      
      // Record evaluation failure pattern
      await nldPatternDetectionService.detectPattern({
        type: 'avi_evaluation_error',
        requestId,
        agentId: request.agentId,
        error: {
          message: error.message,
          stack: error.stack
        },
        description: 'Avi hybrid evaluation process failed',
        db: this.db
      });
      
      return {
        requestId,
        decision: 'ERROR',
        finalScore: 0,
        error: error.message,
        feedback: 'Evaluation failed due to system error. Please try again.',
        decisionType: 'ERROR',
        processingTime: performance.now() - startTime
      };
    }
  }
  
  /**
   * Enforce protected business rules that cannot be overridden
   */
  async enforceProtectedBusinessRules(request) {
    const violations = [];
    
    // Rule 1: Maximum development time constraint
    if (request.resourceEstimate?.developmentTime > this.protectedBusinessRules.maxDevelopmentTime) {
      violations.push(`Development time (${request.resourceEstimate.developmentTime}h) exceeds maximum allowed (${this.protectedBusinessRules.maxDevelopmentTime}h)`);
    }
    
    // Rule 2: Critical security requirements
    if (request.securityRequirements?.level === 'critical' && 
        !this.protectedBusinessRules.criticalSecurityRequirements.includes(request.dataRequirements?.securityLevel)) {
      violations.push('Critical security requirements not properly specified');
    }
    
    // Rule 3: Required justification fields
    for (const field of this.protectedBusinessRules.requiredJustificationFields) {
      if (!request.justification?.[field]) {
        violations.push(`Missing required justification field: ${field}`);
      }
    }
    
    // Rule 4: Resource threshold protection
    if (request.resourceEstimate?.systemImpact > this.protectedBusinessRules.maxResourceThreshold) {
      violations.push(`System impact (${request.resourceEstimate.systemImpact}) exceeds threshold (${this.protectedBusinessRules.maxResourceThreshold})`);
    }
    
    return {
      passed: violations.length === 0,
      violations,
      reason: violations.length > 0 ? violations.join('; ') : null
    };
  }
  
  /**
   * Fast score calculation optimized for <100ms performance
   */
  async calculateQuickScore(request) {
    let score = 50; // Start at neutral
    
    // Quick strategic alignment (simplified)
    if (request.justification?.impactAnalysis && request.estimatedImpact > 7) score += 20;
    if (request.justification?.businessObjectives) score += 10;
    
    // Fast data readiness check
    const hasData = await this.quickDataCheck(request.agentId);
    if (hasData) score += 15;
    else score -= 25;
    
    // Resource efficiency (simplified)
    const devTime = request.resourceEstimate?.developmentTime || 8;
    if (devTime <= 4) score += 15; // Quick win
    else if (devTime >= 40) score -= 20; // Too complex
    
    // Priority boost
    if (request.priority <= 2) score += 10;
    else if (request.priority >= 8) score -= 10;
    
    // Performance optimizations
    if (request.resourceEstimate?.performanceImpact === 'low') score += 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Quick data availability check (optimized)
   */
  async quickDataCheck(agentId) {
    try {
      // Simplified check - just verify agent exists and has some data
      const dataStatus = await agentDataReadiness.getDataReadiness(agentId);
      return dataStatus.hasData;
    } catch (error) {
      return false; // Conservative approach
    }
  }
  
  /**
   * Escalate complex decisions to AI Avi for nuanced evaluation
   */
  async escalateToAviAI(requestId, request, quickScore, initialProcessingTime) {
    const aiStartTime = performance.now();
    
    try {
      console.log(`🤖 AI Avi: Escalating request ${requestId} for complex decision (Score: ${quickScore})`);
      
      // Perform comprehensive evaluation for AI decision
      const comprehensiveEvaluation = await this.performComprehensiveEvaluation(request);
      
      // AI decision logic (simulated - would integrate with actual AI service)
      const aiDecision = await this.makeAIDecision(request, quickScore, comprehensiveEvaluation);
      
      const totalProcessingTime = performance.now() - (performance.now() - initialProcessingTime - aiStartTime);
      const aiProcessingTime = performance.now() - aiStartTime;
      
      this.updateAverageAiDecisionTime(aiProcessingTime);
      
      // Log comprehensive evaluation
      await this.logEvaluationHistory(requestId, {
        ...aiDecision,
        quickScore,
        comprehensiveEvaluation,
        decisionType: 'AI_ESCALATION',
        aiProcessingTime
      });
      
      // Update request status
      await this.updateRequestStatus(requestId, aiDecision);
      
      console.log(`🧠 AI Avi: Complex decision completed - ${aiDecision.decision} (AI Score: ${aiDecision.finalScore}, Processing: ${aiProcessingTime.toFixed(0)}ms)`);
      
      return {
        ...aiDecision,
        requestId,
        quickScore,
        decisionType: 'AI_ESCALATION',
        processingTime: totalProcessingTime,
        aiProcessingTime
      };
      
    } catch (error) {
      console.error(`❌ AI Avi: Escalation failed for request ${requestId}:`, error);
      
      // Fallback to manual review if AI fails
      if (this.aiAviConfig.fallbackToManual) {
        this.stats.manualReview++;
        return this.createManualReviewResult(requestId, quickScore, 
          'AI evaluation failed, requires manual review', 
          performance.now() - aiStartTime);
      }
      
      throw error;
    }
  }
  
  /**
   * Perform comprehensive evaluation for AI decision
   */
  async performComprehensiveEvaluation(request) {
    const evaluation = {
      strategicAlignment: await this.assessStrategicAlignment(request),
      dataReadiness: await this.assessDataReadiness(request),
      resourceEfficiency: await this.assessResourceEfficiency(request),
      riskAssessment: await this.assessRisk(request),
      urgencyImpact: await this.assessUrgencyImpact(request)
    };
    
    evaluation.weightedScore = this.calculateWeightedScore(evaluation);
    return evaluation;
  }
  
  /**
   * AI decision logic using dedicated AI configuration service
   */
  async makeAIDecision(request, quickScore, comprehensiveEvaluation) {
    // AI considers context, patterns, and nuanced factors
    const contextFactors = await this.analyzeContextFactors(request);
    
    // Delegate to AI configuration service for sophisticated decision making
    const aiDecision = await aviAIConfig.makeAIDecision(
      request, 
      quickScore, 
      comprehensiveEvaluation, 
      contextFactors
    );
    
    // Format for consistency with existing system
    return {
      decision: aiDecision.decision,
      finalScore: (quickScore + (comprehensiveEvaluation.weightedScore * 100)) / 2,
      feedback: aiDecision.reasoning,
      aiConfidence: aiDecision.confidence,
      contextFactors,
      patterns: contextFactors.patterns || [],
      conditions: aiDecision.conditions || [],
      aiAnalysis: aiDecision.analysisFactors,
      cached: aiDecision.cached || false
    };
  }
  
  /**
   * Analyze contextual factors for AI decision
   */
  async analyzeContextFactors(request) {
    return {
      historicalPatterns: await this.getHistoricalPatterns(request.agentId),
      systemLoad: await this.getSystemLoadFactor(),
      seasonalFactors: this.getSeasonalFactors(),
      competitiveFactors: this.analyzeCompetitiveFactors(request),
      patterns: ['complex_justification', 'resource_intensive']
    };
  }
  
  /**
   * Apply contextual adjustments to AI score
   */
  applyContextualAdjustments(baseScore, contextFactors) {
    let adjustedScore = baseScore;
    
    // Historical success patterns
    if (contextFactors.historicalPatterns?.successRate > 0.8) {
      adjustedScore += 5;
    }
    
    // System load considerations
    if (contextFactors.systemLoad < 0.5) {
      adjustedScore += 3; // Low load, can handle more complex requests
    } else if (contextFactors.systemLoad > 0.8) {
      adjustedScore -= 5; // High load, be more selective
    }
    
    return Math.max(0, Math.min(100, adjustedScore));
  }
  
  /**
   * Calculate AI confidence in decision
   */
  calculateAIConfidence(score, contextFactors) {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence for extreme scores
    if (score >= 80 || score <= 20) confidence += 0.2;
    
    // Historical patterns boost confidence
    if (contextFactors.historicalPatterns?.dataPoints > 10) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }
  
  /**
   * Assess strategic alignment of request
   */
  async assessStrategicAlignment(request) {
    let score = 0;
    const factors = [];
    
    try {
      // Check alignment with system goals
      if (request.justification.platformGoals) {
        score += 0.3;
        factors.push('platform_goals_aligned');
      }
      
      // User needs assessment
      if (request.justification.userNeeds && request.justification.impactAnalysis) {
        const impact = request.estimatedImpact || 0;
        score += Math.min(impact / 10, 0.3);
        factors.push('user_needs_identified');
      }
      
      // Technical roadmap alignment
      const roadmapAlignment = this.checkRoadmapAlignment(request);
      score += roadmapAlignment * 0.2;
      if (roadmapAlignment > 0) factors.push('roadmap_aligned');
      
      // Business objectives
      if (request.justification.businessObjectives) {
        score += 0.2;
        factors.push('business_objectives_clear');
      }
      
      return Math.min(score, 1.0);
      
    } catch (error) {
      console.warn(`⚠️ Avi: Strategic alignment assessment failed:`, error);
      return 0;
    }
  }
  
  /**
   * Assess data readiness for the request
   */
  async assessDataReadiness(request) {
    try {
      // Get agent data status
      const dataStatus = await agentDataReadiness.getDataReadiness(request.agentId);
      
      if (!dataStatus.hasData) {
        return 0; // No data available
      }
      
      let score = 0.5; // Base score for having data
      
      // Assess data quality
      if (dataStatus.data && typeof dataStatus.data === 'object') {
        const dataKeys = Object.keys(dataStatus.data);
        
        // More comprehensive data gets higher score
        if (dataKeys.length > 5) score += 0.2;
        if (dataKeys.length > 10) score += 0.2;
        
        // Recent activity indicator
        if (dataStatus.data.recentUpdates && dataStatus.data.recentUpdates.length > 0) {
          score += 0.1;
        }
      }
      
      // Schema compliance check
      if (request.dataRequirements && request.dataRequirements.schemaRequirements) {
        // Simplified schema validation - in real implementation would be more thorough
        score += 0.1;
      }
      
      // Data freshness check
      const currentTime = new Date();
      const dataTimestamp = dataStatus.lastUpdated ? new Date(dataStatus.lastUpdated) : currentTime;
      const hoursOld = (currentTime - dataTimestamp) / (1000 * 60 * 60);
      
      if (hoursOld < 24) score += 0.1;
      else if (hoursOld > 168) score -= 0.2; // Week old data
      
      return Math.max(0, Math.min(score, 1.0));
      
    } catch (error) {
      console.warn(`⚠️ Avi: Data readiness assessment failed:`, error);
      return 0;
    }
  }
  
  /**
   * Assess resource efficiency
   */
  async assessResourceEfficiency(request) {
    try {
      let score = 0.8; // Start optimistic
      
      // Development time estimate
      const devTime = request.resourceEstimate?.developmentTime || 8;
      if (devTime > 40) score -= 0.3; // Too complex
      else if (devTime < 4) score += 0.1; // Quick win
      
      // Compute resources
      if (request.resourceEstimate?.computeResources?.high) {
        score -= 0.2;
      }
      
      // Maintenance overhead
      const maintenance = request.resourceEstimate?.maintenanceOverhead || 0;
      score -= Math.min(maintenance / 10, 0.2);
      
      // Dependencies complexity
      const deps = request.resourceEstimate?.dependencies?.length || 0;
      if (deps > 5) score -= 0.1;
      
      return Math.max(0, Math.min(score, 1.0));
      
    } catch (error) {
      console.warn(`⚠️ Avi: Resource efficiency assessment failed:`, error);
      return 0.5; // Neutral score
    }
  }
  
  /**
   * Assess implementation risks
   */
  async assessRisk(request) {
    try {
      let riskScore = 0; // Lower risk = higher score
      
      // Technical risk assessment
      if (request.pageType === 'profile') {
        riskScore += 0.3; // Low risk
      } else if (request.pageType === 'dashboard') {
        riskScore += 0.2; // Medium risk
      } else if (request.pageType === 'custom') {
        riskScore += 0.1; // Higher risk
      }
      
      // Data risk
      const dataStatus = await agentDataReadiness.getDataReadiness(request.agentId);
      if (dataStatus.hasData) {
        riskScore += 0.3;
      } else {
        riskScore += 0.1; // High data risk
      }
      
      // Performance risk
      if (request.resourceEstimate?.performanceImpact === 'low') {
        riskScore += 0.2;
      } else if (request.resourceEstimate?.performanceImpact === 'high') {
        riskScore += 0.05;
      } else {
        riskScore += 0.1;
      }
      
      // Security risk
      if (request.securityRequirements?.level === 'high') {
        riskScore += 0.1; // Higher security = higher risk
      } else {
        riskScore += 0.2;
      }
      
      return Math.min(riskScore, 1.0);
      
    } catch (error) {
      console.warn(`⚠️ Avi: Risk assessment failed:`, error);
      return 0.3; // Conservative risk score
    }
  }
  
  /**
   * Assess urgency and impact
   */
  async assessUrgencyImpact(request) {
    try {
      let score = 0;
      
      // Priority level impact
      const priority = request.priority || 5;
      if (priority <= 2) score += 0.4; // High priority
      else if (priority <= 4) score += 0.3; // Medium priority
      else score += 0.1; // Low priority
      
      // User impact assessment
      const impact = request.estimatedImpact || 0;
      score += Math.min(impact / 10, 0.3);
      
      // System stability impact
      if (request.justification.systemStability) {
        score += 0.2;
      }
      
      // Competitive advantage
      if (request.justification.competitiveAdvantage) {
        score += 0.1;
      }
      
      return Math.min(score, 1.0);
      
    } catch (error) {
      console.warn(`⚠️ Avi: Urgency impact assessment failed:`, error);
      return 0.2;
    }
  }
  
  /**
   * Calculate weighted final score
   */
  calculateWeightedScore(evaluation) {
    return (
      evaluation.strategicAlignment * 0.30 +
      evaluation.dataReadiness * 0.25 +
      evaluation.resourceEfficiency * 0.20 +
      evaluation.riskAssessment * 0.15 +
      evaluation.urgencyImpact * 0.10
    );
  }
  
  /**
   * Legacy decision method - replaced by hybrid system
   * @deprecated Use hybrid evaluation instead
   */
  makeDecision(score) {
    // Convert to 0-100 scale for consistency
    const normalizedScore = score * 100;
    
    if (normalizedScore >= this.decisionThresholds.AUTO_APPROVE) {
      return 'APPROVED';
    } else if (normalizedScore <= this.decisionThresholds.AUTO_REJECT) {
      return 'REJECTED';
    } else {
      return 'AI_ESCALATION';
    }
  }
  
  /**
   * Generate feedback based on evaluation
   */
  generateFeedback(evaluation) {
    const feedback = [];
    
    if (evaluation.strategicAlignment < 0.5) {
      feedback.push("Strategic alignment could be improved. Consider better aligning with current platform goals and user needs.");
    }
    
    if (evaluation.dataReadiness < 0.3) {
      feedback.push("Insufficient data readiness. Agent should generate more meaningful data before requesting a page.");
    }
    
    if (evaluation.resourceEfficiency < 0.4) {
      feedback.push("Resource efficiency concerns. Consider simplifying requirements or breaking into smaller deliverables.");
    }
    
    if (evaluation.riskAssessment < 0.3) {
      feedback.push("High implementation risk detected. Additional risk mitigation strategies recommended.");
    }
    
    if (feedback.length === 0) {
      feedback.push("Request meets quality standards. Proceeding with approval process.");
    }
    
    return feedback.join(' ');
  }
  
  /**
   * Validate agent data readiness
   */
  async validateAgentDataReadiness(agentId) {
    try {
      return await agentDataReadiness.getDataReadiness(agentId);
    } catch (error) {
      console.warn(`⚠️ Avi: Data readiness check failed for ${agentId}:`, error);
      return {
        hasData: false,
        message: `Data validation error: ${error.message}`
      };
    }
  }
  
  /**
   * Validate request format
   */
  validateRequestFormat(request) {
    const errors = [];
    const required = ['agentId', 'pageType', 'title', 'justification'];
    
    for (const field of required) {
      if (!request[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    if (request.justification && !request.justification.problemStatement) {
      errors.push('Justification must include problemStatement');
    }
    
    if (request.estimatedImpact && (request.estimatedImpact < 0 || request.estimatedImpact > 10)) {
      errors.push('Estimated impact must be between 0 and 10');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Record failed request for NLD pattern detection
   */
  async recordFailedRequest(requestId, request, failureType, errorDetails) {
    try {
      this.stats.patternsDetected++;
      
      await nldPatternDetectionService.detectPattern({
        type: 'avi_request_failure',
        requestId,
        agentId: request.agentId,
        failureType,
        request: {
          pageType: request.pageType,
          title: request.title,
          priority: request.priority
        },
        error: errorDetails,
        description: `Agent page request failed: ${failureType}`,
        db: this.db
      });
      
      console.log(`📊 NLD: Recorded failed request pattern for ${requestId}`);
    } catch (error) {
      console.warn(`⚠️ Avi: Failed to record request failure pattern:`, error);
    }
  }
  
  /**
   * Check roadmap alignment (simplified implementation)
   */
  checkRoadmapAlignment(request) {
    const roadmapFeatures = [
      'dashboard', 'profile', 'analytics', 'monitoring', 'automation'
    ];
    
    if (roadmapFeatures.includes(request.pageType)) {
      return 0.8;
    }
    
    // Check if title contains roadmap keywords
    const roadmapKeywords = ['performance', 'user', 'data', 'integration'];
    const titleLower = (request.title || '').toLowerCase();
    
    for (const keyword of roadmapKeywords) {
      if (titleLower.includes(keyword)) {
        return 0.6;
      }
    }
    
    return 0.3; // Default moderate alignment
  }
  
  /**
   * Update request status in database
   */
  async updateRequestStatus(requestId, evaluation) {
    try {
      await this.db.query(`
        UPDATE avi_page_requests 
        SET status = ?, evaluation_score = ?, decision = ?, 
            feedback = ?, evaluated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        evaluation.decision.toLowerCase(),
        evaluation.finalScore,
        evaluation.decision,
        evaluation.feedback,
        requestId
      ]);
    } catch (error) {
      console.error(`❌ Avi: Failed to update request status:`, error);
    }
  }
  
  /**
   * Log evaluation history
   */
  async logEvaluationHistory(requestId, evaluation) {
    try {
      const historyId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      await this.db.query(`
        INSERT INTO avi_evaluation_history (
          id, request_id, evaluation_criteria, strategic_alignment,
          data_readiness, resource_efficiency, risk_assessment,
          urgency_impact, final_score, decision_rationale,
          auto_fixes_attempted, patterns_detected
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        historyId,
        requestId,
        JSON.stringify({
          strategicPriorities: this.strategicPriorities,
          decisionThresholds: this.decisionThresholds
        }),
        evaluation.strategicAlignment,
        evaluation.dataReadiness,
        evaluation.resourceEfficiency,
        evaluation.riskAssessment,
        evaluation.urgencyImpact,
        evaluation.finalScore,
        evaluation.feedback,
        JSON.stringify(evaluation.autoFixes || []),
        JSON.stringify(evaluation.patterns || [])
      ]);
    } catch (error) {
      console.error(`❌ Avi: Failed to log evaluation history:`, error);
    }
  }
  
  /**
   * Generate next steps based on evaluation
   */
  generateNextSteps(evaluation) {
    const steps = [];
    
    switch (evaluation.decision) {
      case 'APPROVED':
        steps.push('Request approved - forwarding to page-builder-agent');
        steps.push('Implementation timeline: 1-3 business days');
        steps.push('Quality assurance review will be conducted');
        break;
        
      case 'CONDITIONAL':
        steps.push('Request conditionally approved');
        if (evaluation.dataReadiness < 0.5) {
          steps.push('Improve data readiness before implementation');
        }
        if (evaluation.resourceEfficiency < 0.5) {
          steps.push('Optimize resource requirements');
        }
        break;
        
      case 'DEFERRED':
        steps.push('Request deferred for future consideration');
        steps.push('Focus on improving evaluation criteria scores');
        steps.push('Resubmit after addressing feedback points');
        break;
        
      case 'REJECTED':
        steps.push('Request rejected - significant improvements needed');
        steps.push('Review strategic alignment and data readiness');
        steps.push('Consider alternative approaches or simplified requirements');
        break;
        
      default:
        steps.push('Manual review required');
        steps.push('Additional evaluation by senior stakeholders');
    }
    
    return steps;
  }
  
  /**
   * Update processing statistics for hybrid system
   */
  updateStats(decision, decisionType = null) {
    switch (decision) {
      case 'APPROVED':
        if (decisionType === 'HIGH_CONFIDENCE') {
          this.stats.autoApproved++;
        }
        break;
      case 'REJECTED':
        if (decisionType === 'AUTO_REJECT') {
          this.stats.autoRejected++;
        }
        break;
      case 'CONDITIONAL':
      case 'DEFERRED':
        if (decisionType === 'AI_ESCALATION') {
          // Already counted in aiEscalated
        }
        break;
      case 'MANUAL_REVIEW':
        this.stats.manualReview++;
        break;
    }
  }
  
  /**
   * Update average processing time with separate tracking for auto vs AI decisions
   */
  updateAverageProcessingTime(processingTime) {
    if (this.stats.averageProcessingTime === 0) {
      this.stats.averageProcessingTime = processingTime;
    } else {
      this.stats.averageProcessingTime = (
        (this.stats.averageProcessingTime * (this.stats.totalRequests - 1)) + processingTime
      ) / this.stats.totalRequests;
    }
  }
  
  /**
   * Update average auto-decision time for performance monitoring
   */
  updateAverageAutoDecisionTime(processingTime) {
    const autoDecisions = this.stats.autoApproved + this.stats.autoRejected;
    if (autoDecisions === 1) {
      this.stats.averageAutoDecisionTime = processingTime;
    } else if (autoDecisions > 1) {
      this.stats.averageAutoDecisionTime = (
        (this.stats.averageAutoDecisionTime * (autoDecisions - 1)) + processingTime
      ) / autoDecisions;
    }
    
    // Track performance optimization opportunities
    if (processingTime > this.performanceTargets.autoDecisionMaxTime) {
      this.stats.performanceOptimizations++;
      console.warn(`⚡ Performance: Auto-decision took ${processingTime.toFixed(0)}ms (target: ${this.performanceTargets.autoDecisionMaxTime}ms)`);
    }
  }
  
  /**
   * Update average AI decision time
   */
  updateAverageAiDecisionTime(processingTime) {
    if (this.stats.averageAiDecisionTime === 0) {
      this.stats.averageAiDecisionTime = processingTime;
    } else {
      this.stats.averageAiDecisionTime = (
        (this.stats.averageAiDecisionTime * (this.stats.aiEscalated - 1)) + processingTime
      ) / this.stats.aiEscalated;
    }
  }
  
  /**
   * Get comprehensive hybrid system statistics
   */
  getStats() {
    const totalApproved = this.stats.autoApproved + (this.stats.aiEscalated * 0.6); // Estimate AI approvals
    const automationRate = this.stats.totalRequests > 0 
      ? ((this.stats.autoApproved + this.stats.autoRejected) / this.stats.totalRequests * 100).toFixed(1)
      : '0';
    
    return {
      ...this.stats,
      totalApproved,
      approvalRate: this.stats.totalRequests > 0 
        ? (totalApproved / this.stats.totalRequests * 100).toFixed(1) + '%'
        : '0%',
      automationRate: automationRate + '%',
      aiEscalationRate: this.stats.totalRequests > 0 
        ? (this.stats.aiEscalated / this.stats.totalRequests * 100).toFixed(1) + '%'
        : '0%',
      averageAutoDecisionTime: this.stats.averageAutoDecisionTime.toFixed(1) + 'ms',
      averageAiDecisionTime: this.stats.averageAiDecisionTime.toFixed(1) + 'ms',
      performanceCompliance: {
        autoDecisionTarget: this.performanceTargets.autoDecisionMaxTime + 'ms',
        actualAutoAverage: this.stats.averageAutoDecisionTime.toFixed(1) + 'ms',
        meetingTarget: this.stats.averageAutoDecisionTime <= this.performanceTargets.autoDecisionMaxTime
      },
      uptime: process.uptime(),
      decisionThresholds: this.decisionThresholds,
      protectedRulesActive: Object.keys(this.protectedBusinessRules).length,
      businessRuleViolations: this.stats.businessRuleViolations
    };
  }
  
  /**
   * Get request history for an agent
   */
  async getAgentRequestHistory(agentId, limit = 10) {
    try {
      const requests = await this.db.all(`
        SELECT * FROM avi_page_requests 
        WHERE agent_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [agentId, limit]);
      
      return requests.map(req => ({
        ...req,
        justification: JSON.parse(req.justification),
        data_requirements: JSON.parse(req.data_requirements || '{}'),
        resource_estimate: JSON.parse(req.resource_estimate || '{}')
      }));
    } catch (error) {
      console.error(`❌ Avi: Failed to get request history:`, error);
      return [];
    }
  }
  
  /**
   * Coordinate with page-builder-agent for approved requests
   */
  async coordinateWithPageBuilder(requestId, evaluation) {
    try {
      if (evaluation.decision === 'APPROVED' || evaluation.decision === 'CONDITIONAL') {
        console.log(`🤝 Avi: Coordinating with page-builder for request ${requestId}`);
        
        // Get original request
        const requests = await this.db.all(
          'SELECT * FROM avi_page_requests WHERE id = ?',
          [requestId]
        );
        
        if (requests.length > 0) {
          const request = requests[0];
          
          // Format request for page-builder-agent
          const pageBuilderRequest = {
            requestId,
            agentId: request.agent_id,
            pageType: request.request_type,
            title: request.title,
            justification: JSON.parse(request.justification),
            dataRequirements: JSON.parse(request.data_requirements || '{}'),
            approvedBy: 'avi-strategic-oversight',
            approvalScore: evaluation.finalScore,
            conditions: evaluation.decision === 'CONDITIONAL' ? evaluation.feedback : null
          };
          
          return {
            success: true,
            message: 'Request forwarded to page-builder-agent',
            pageBuilderRequest
          };
        }
      }
      
      return {
        success: false,
        message: 'Request not approved for page building'
      };
    } catch (error) {
      console.error(`❌ Avi: Failed to coordinate with page-builder:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Helper method to create auto-approval result
   */
  createApprovalResult(requestId, score, processingTime, decisionType) {
    this.updateAverageAutoDecisionTime(processingTime);
    
    return {
      requestId,
      decision: 'APPROVED',
      finalScore: score,
      feedback: 'Request automatically approved due to high confidence score and strategic alignment.',
      decisionType,
      processingTime,
      autoDecision: true,
      aiProcessed: false,
      nextSteps: [
        'Request approved - forwarding to page-builder-agent',
        'Implementation timeline: 1-3 business days',
        'Quality assurance review will be conducted'
      ]
    };
  }
  
  /**
   * Helper method to create auto-rejection result
   */
  createRejectionResult(requestId, reason, feedback, processingTime, decisionType) {
    this.updateAverageAutoDecisionTime(processingTime);
    
    return {
      requestId,
      decision: 'REJECTED',
      finalScore: 0,
      feedback: feedback || `Request automatically rejected: ${reason}`,
      decisionType,
      processingTime,
      autoDecision: true,
      aiProcessed: false,
      rejectionReason: reason,
      nextSteps: [
        'Request rejected due to business rule violations or insufficient quality',
        'Review feedback and address identified issues',
        'Resubmit after making necessary improvements'
      ]
    };
  }
  
  /**
   * Helper method to create manual review result
   */
  createManualReviewResult(requestId, score, reason, processingTime) {
    return {
      requestId,
      decision: 'MANUAL_REVIEW',
      finalScore: score,
      feedback: reason,
      decisionType: 'MANUAL_FALLBACK',
      processingTime,
      autoDecision: false,
      aiProcessed: false,
      nextSteps: [
        'Request escalated to manual review',
        'Senior stakeholder evaluation required',
        'Decision pending human oversight'
      ]
    };
  }
  
  /**
   * Get historical patterns for agent (simplified implementation)
   */
  async getHistoricalPatterns(agentId) {
    try {
      const history = await this.getAgentRequestHistory(agentId, 20);
      const successCount = history.filter(req => req.status === 'approved').length;
      
      return {
        successRate: history.length > 0 ? successCount / history.length : 0,
        totalRequests: history.length,
        dataPoints: history.length,
        recentTrend: history.length > 5 ? 'positive' : 'insufficient_data'
      };
    } catch (error) {
      return { successRate: 0, totalRequests: 0, dataPoints: 0, recentTrend: 'unknown' };
    }
  }
  
  /**
   * Get system load factor (simplified implementation)
   */
  async getSystemLoadFactor() {
    // Simplified - would integrate with actual system metrics
    const currentHour = new Date().getHours();
    
    // Simulate higher load during business hours
    if (currentHour >= 9 && currentHour <= 17) {
      return 0.7; // Higher load
    } else {
      return 0.3; // Lower load
    }
  }
  
  /**
   * Get seasonal factors
   */
  getSeasonalFactors() {
    const month = new Date().getMonth();
    
    // Simplified seasonal adjustment
    if (month === 11 || month === 0) { // December/January
      return { factor: 'holiday_season', adjustment: -0.1 };
    } else if (month >= 8 && month <= 10) { // Sep-Nov (busy season)
      return { factor: 'busy_season', adjustment: 0.1 };
    }
    
    return { factor: 'normal', adjustment: 0 };
  }
  
  /**
   * Analyze competitive factors
   */
  analyzeCompetitiveFactors(request) {
    const competitiveKeywords = ['performance', 'user experience', 'efficiency', 'automation'];
    const requestText = `${request.title} ${JSON.stringify(request.justification)}`.toLowerCase();
    
    const matchCount = competitiveKeywords.filter(keyword => 
      requestText.includes(keyword)
    ).length;
    
    return {
      competitiveAdvantage: matchCount > 1,
      marketRelevance: matchCount / competitiveKeywords.length,
      priority: matchCount > 2 ? 'high' : matchCount > 0 ? 'medium' : 'low'
    };
  }
  
  /**
   * Enhanced audit trail for all decisions
   */
  async createAuditTrail(requestId, decision, decisionType, processingTime, additionalData = {}) {
    try {
      const auditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        requestId,
        decision,
        decisionType,
        processingTime,
        timestamp: new Date().toISOString(),
        systemVersion: '1.0.0-hybrid',
        ...additionalData
      };
      
      await this.db.query(`
        INSERT INTO avi_decision_log (
          id, request_id, decision_type, decision_reason, 
          conditions, follow_up_actions, nld_patterns, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        auditEntry.id,
        requestId,
        decisionType,
        JSON.stringify(auditEntry),
        JSON.stringify(additionalData.conditions || {}),
        JSON.stringify(additionalData.nextSteps || []),
        JSON.stringify(additionalData.patterns || []),
        auditEntry.timestamp
      ]);
      
      console.log(`📋 Audit: Decision logged for ${requestId} - ${decision} (${decisionType})`);
    } catch (error) {
      console.error('❌ Audit: Failed to log decision:', error);
    }
  }
}

// Create singleton instance with hybrid capabilities
const aviStrategicOversight = new AviStrategicOversight();

export default aviStrategicOversight;