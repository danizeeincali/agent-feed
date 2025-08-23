/**
 * Neural Learning Development - WebSocket Hub Security Pattern Detector
 * Identifies potential security threats through pattern analysis
 */

class SecurityPatternDetector {
  constructor() {
    this.securityPatterns = new Map();
    this.threatSignatures = new Map();
    this.connectionPatterns = new Map();
    this.anomalyDetectors = new Map();
    this.securityEvents = [];
    this.riskScores = new Map();
    this.learningRate = 0.1;
    this.anomalyThreshold = 0.7;
    this.maxEventHistory = 10000;
  }

  /**
   * Analyze connection for security threats
   */
  analyzeConnection(connectionData) {
    const timestamp = Date.now();
    const connectionProfile = this.extractConnectionProfile(connectionData);
    const securityAssessment = this.performSecurityAssessment(connectionProfile, connectionData);
    
    // Store security event
    this.storeSecurityEvent({
      timestamp,
      connectionId: connectionData.connectionId,
      profile: connectionProfile,
      assessment: securityAssessment,
      actions: connectionData.actions || []
    });

    // Update learning patterns
    this.updateSecurityPatterns(connectionProfile, securityAssessment);
    
    // Check for anomalies
    const anomalies = this.detectAnomalies(connectionProfile, connectionData);
    
    // Update risk scores
    this.updateRiskScore(connectionData.source || connectionData.ip, securityAssessment);

    return {
      riskLevel: securityAssessment.overallRisk,
      threats: securityAssessment.detectedThreats,
      anomalies: anomalies,
      recommendations: this.generateSecurityRecommendations(securityAssessment, anomalies),
      actionRequired: securityAssessment.overallRisk > 0.7
    };
  }

  /**
   * Extract connection profile for security analysis
   */
  extractConnectionProfile(data) {
    return {
      source: this.hashIP(data.source || data.ip),
      userAgent: this.categorizeUserAgent(data.userAgent),
      connectionFrequency: this.analyzeConnectionFrequency(data.source),
      messagePattern: this.analyzeMessagePattern(data.messages || []),
      geolocation: this.categorizeGeolocation(data.geolocation),
      timePattern: this.analyzeTimePattern(data.timestamp),
      protocolCompliance: this.checkProtocolCompliance(data),
      authenticationMethod: data.authMethod || 'unknown',
      sessionDuration: data.sessionDuration || 0,
      dataVolume: this.categorizeDataVolume(data.dataSize || 0)
    };
  }

  /**
   * Perform comprehensive security assessment
   */
  performSecurityAssessment(profile, data) {
    const threats = [];
    let overallRisk = 0;

    // Check for known threat signatures
    const signatureThreats = this.checkThreatSignatures(profile, data);
    threats.push(...signatureThreats);

    // Analyze connection frequency patterns
    const frequencyThreats = this.analyzeConnectionFrequencyThreats(profile);
    threats.push(...frequencyThreats);

    // Check for suspicious message patterns
    const messageThreats = this.analyzeMessageThreats(profile, data);
    threats.push(...messageThreats);

    // Analyze authentication anomalies
    const authThreats = this.analyzeAuthenticationThreats(profile, data);
    threats.push(...authThreats);

    // Check for protocol violations
    const protocolThreats = this.analyzeProtocolThreats(profile, data);
    threats.push(...protocolThreats);

    // Calculate overall risk
    overallRisk = this.calculateOverallRisk(threats, profile);

    return {
      overallRisk,
      detectedThreats: threats,
      threatLevel: this.categorizeThreatLevel(overallRisk),
      confidence: this.calculateAssessmentConfidence(threats, profile)
    };
  }

  /**
   * Check against known threat signatures
   */
  checkThreatSignatures(profile, data) {
    const threats = [];

    for (const [signatureId, signature] of this.threatSignatures) {
      const match = this.matchThreatSignature(signature, profile, data);
      if (match.isMatch) {
        threats.push({
          type: 'known_threat_signature',
          signature: signatureId,
          confidence: match.confidence,
          risk: signature.riskLevel,
          description: signature.description
        });
      }
    }

    return threats;
  }

  /**
   * Analyze connection frequency for threats
   */
  analyzeConnectionFrequencyThreats(profile) {
    const threats = [];
    const source = profile.source;
    const recentConnections = this.getRecentConnections(source, 300000); // Last 5 minutes

    // Too many connections (potential DDoS)
    if (recentConnections.length > 50) {
      threats.push({
        type: 'excessive_connections',
        count: recentConnections.length,
        risk: 0.8,
        description: 'Unusually high connection frequency detected'
      });
    }

    // Rapid connection cycling
    const avgSessionDuration = this.calculateAverageSessionDuration(recentConnections);
    if (recentConnections.length > 10 && avgSessionDuration < 10000) {
      threats.push({
        type: 'connection_cycling',
        avgDuration: avgSessionDuration,
        risk: 0.6,
        description: 'Rapid connection cycling pattern detected'
      });
    }

    return threats;
  }

  /**
   * Analyze message patterns for threats
   */
  analyzeMessageThreats(profile, data) {
    const threats = [];
    const messages = data.messages || [];

    // Message flooding
    if (messages.length > 100) {
      threats.push({
        type: 'message_flooding',
        messageCount: messages.length,
        risk: 0.7,
        description: 'Excessive message volume detected'
      });
    }

    // Suspicious message content patterns
    const suspiciousPatterns = this.detectSuspiciousMessagePatterns(messages);
    threats.push(...suspiciousPatterns);

    // Message size anomalies
    const sizeAnomalies = this.detectMessageSizeAnomalies(messages);
    threats.push(...sizeAnomalies);

    return threats;
  }

  /**
   * Analyze authentication-related threats
   */
  analyzeAuthenticationThreats(profile, data) {
    const threats = [];

    // Multiple failed authentication attempts
    if (data.failedAuthAttempts > 3) {
      threats.push({
        type: 'brute_force_attempt',
        attempts: data.failedAuthAttempts,
        risk: 0.8,
        description: 'Multiple failed authentication attempts'
      });
    }

    // Authentication bypass attempts
    if (data.authBypassAttempts > 0) {
      threats.push({
        type: 'auth_bypass_attempt',
        attempts: data.authBypassAttempts,
        risk: 0.9,
        description: 'Authentication bypass attempts detected'
      });
    }

    // Unusual authentication method
    if (profile.authenticationMethod === 'unknown' && data.authenticatedActions > 0) {
      threats.push({
        type: 'unknown_auth_method',
        risk: 0.5,
        description: 'Unknown authentication method with authenticated actions'
      });
    }

    return threats;
  }

  /**
   * Analyze protocol compliance threats
   */
  analyzeProtocolThreats(profile, data) {
    const threats = [];

    // Protocol violations
    if (!profile.protocolCompliance.compliant) {
      threats.push({
        type: 'protocol_violation',
        violations: profile.protocolCompliance.violations,
        risk: 0.6,
        description: 'WebSocket protocol violations detected'
      });
    }

    // Malformed messages
    if (data.malformedMessages > 0) {
      threats.push({
        type: 'malformed_messages',
        count: data.malformedMessages,
        risk: 0.5,
        description: 'Malformed message patterns detected'
      });
    }

    return threats;
  }

  /**
   * Detect anomalies in connection behavior
   */
  detectAnomalies(profile, data) {
    const anomalies = [];

    // Check each anomaly detector
    for (const [detectorName, detector] of this.anomalyDetectors) {
      const anomaly = detector.detect(profile, data);
      if (anomaly.isAnomaly) {
        anomalies.push({
          detector: detectorName,
          anomalyScore: anomaly.score,
          description: anomaly.description,
          features: anomaly.features
        });
      }
    }

    // Time-based anomalies
    const timeAnomalies = this.detectTimeAnomalies(profile, data);
    anomalies.push(...timeAnomalies);

    // Geographic anomalies
    const geoAnomalies = this.detectGeographicAnomalies(profile, data);
    anomalies.push(...geoAnomalies);

    return anomalies;
  }

  /**
   * Detect time-based anomalies
   */
  detectTimeAnomalies(profile, data) {
    const anomalies = [];
    const currentHour = new Date(data.timestamp).getHours();
    const source = profile.source;
    
    // Get historical time patterns for this source
    const historicalPatterns = this.getHistoricalTimePatterns(source);
    
    if (historicalPatterns.length > 10) {
      const expectedProbability = this.calculateTimeProbability(currentHour, historicalPatterns);
      
      if (expectedProbability < 0.1) {
        anomalies.push({
          type: 'unusual_time_pattern',
          score: 1 - expectedProbability,
          description: `Connection at unusual time (${currentHour}:00)`
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect geographic anomalies
   */
  detectGeographicAnomalies(profile, data) {
    const anomalies = [];
    const source = profile.source;
    const currentLocation = profile.geolocation;
    
    // Get historical geographic patterns
    const historicalLocations = this.getHistoricalLocations(source);
    
    if (historicalLocations.length > 5) {
      const locationAnomaly = this.calculateLocationAnomaly(currentLocation, historicalLocations);
      
      if (locationAnomaly > 0.7) {
        anomalies.push({
          type: 'geographic_anomaly',
          score: locationAnomaly,
          description: 'Connection from unusual geographic location'
        });
      }
    }

    return anomalies;
  }

  /**
   * Update security patterns based on analysis
   */
  updateSecurityPatterns(profile, assessment) {
    const patternKey = this.createPatternKey(profile);
    
    if (!this.securityPatterns.has(patternKey)) {
      this.securityPatterns.set(patternKey, {
        profile,
        riskHistory: [],
        threatHistory: [],
        lastSeen: Date.now(),
        frequency: 0
      });
    }

    const pattern = this.securityPatterns.get(patternKey);
    pattern.frequency++;
    pattern.lastSeen = Date.now();
    pattern.riskHistory.push(assessment.overallRisk);
    pattern.threatHistory.push(...assessment.detectedThreats);

    // Keep only recent history
    if (pattern.riskHistory.length > 100) {
      pattern.riskHistory = pattern.riskHistory.slice(-100);
      pattern.threatHistory = pattern.threatHistory.slice(-100);
    }

    // Learn threat signatures from high-risk patterns
    if (assessment.overallRisk > 0.8) {
      this.learnThreatSignature(profile, assessment);
    }
  }

  /**
   * Learn new threat signatures from high-risk patterns
   */
  learnThreatSignature(profile, assessment) {
    const signatureId = this.generateSignatureId(profile, assessment);
    
    if (!this.threatSignatures.has(signatureId)) {
      this.threatSignatures.set(signatureId, {
        profile,
        riskLevel: assessment.overallRisk,
        description: this.generateThreatDescription(assessment),
        confidence: 0.5,
        occurrences: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    } else {
      const signature = this.threatSignatures.get(signatureId);
      signature.occurrences++;
      signature.lastSeen = Date.now();
      signature.confidence = Math.min(0.95, signature.confidence + 0.1);
      
      // Update risk level using exponential moving average
      signature.riskLevel = signature.riskLevel * 0.8 + assessment.overallRisk * 0.2;
    }
  }

  /**
   * Update risk score for source
   */
  updateRiskScore(source, assessment) {
    const hashedSource = this.hashIP(source);
    
    if (!this.riskScores.has(hashedSource)) {
      this.riskScores.set(hashedSource, {
        currentRisk: assessment.overallRisk,
        maxRisk: assessment.overallRisk,
        avgRisk: assessment.overallRisk,
        assessmentCount: 1,
        lastUpdate: Date.now(),
        riskTrend: 0
      });
    } else {
      const riskData = this.riskScores.get(hashedSource);
      const oldRisk = riskData.currentRisk;
      
      riskData.assessmentCount++;
      riskData.currentRisk = assessment.overallRisk;
      riskData.maxRisk = Math.max(riskData.maxRisk, assessment.overallRisk);
      riskData.avgRisk = (riskData.avgRisk * (riskData.assessmentCount - 1) + assessment.overallRisk) / riskData.assessmentCount;
      riskData.riskTrend = assessment.overallRisk - oldRisk;
      riskData.lastUpdate = Date.now();
    }
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations(assessment, anomalies) {
    const recommendations = [];

    // High-risk recommendations
    if (assessment.overallRisk > 0.8) {
      recommendations.push({
        priority: 'critical',
        action: 'block_connection',
        reason: 'High security risk detected'
      });
      
      recommendations.push({
        priority: 'critical',
        action: 'alert_security_team',
        reason: 'Potential security incident'
      });
    } else if (assessment.overallRisk > 0.6) {
      recommendations.push({
        priority: 'high',
        action: 'enhanced_monitoring',
        reason: 'Elevated security risk'
      });
      
      recommendations.push({
        priority: 'medium',
        action: 'rate_limit_connection',
        reason: 'Prevent potential abuse'
      });
    }

    // Threat-specific recommendations
    assessment.detectedThreats.forEach(threat => {
      switch (threat.type) {
        case 'excessive_connections':
          recommendations.push({
            priority: 'high',
            action: 'implement_connection_limit',
            reason: 'Prevent DDoS attacks'
          });
          break;
          
        case 'brute_force_attempt':
          recommendations.push({
            priority: 'high',
            action: 'temporary_ip_ban',
            reason: 'Stop brute force attack'
          });
          break;
          
        case 'protocol_violation':
          recommendations.push({
            priority: 'medium',
            action: 'protocol_validation',
            reason: 'Enforce protocol compliance'
          });
          break;
      }
    });

    // Anomaly-specific recommendations
    anomalies.forEach(anomaly => {
      if (anomaly.anomalyScore > 0.7) {
        recommendations.push({
          priority: 'medium',
          action: 'investigate_anomaly',
          reason: `Unusual pattern detected: ${anomaly.description}`
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Store security event for analysis
   */
  storeSecurityEvent(event) {
    this.securityEvents.push(event);
    
    // Trim event history
    if (this.securityEvents.length > this.maxEventHistory) {
      this.securityEvents = this.securityEvents.slice(-this.maxEventHistory);
    }
  }

  // Helper methods
  hashIP(ip) {
    if (!ip) return 'unknown';
    // Simple hash for privacy (in production, use proper hashing)
    return ip.split('.').map(part => parseInt(part) % 100).join('_');
  }

  categorizeUserAgent(userAgent) {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('bot') || userAgent.includes('crawler')) return 'bot';
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    return 'other';
  }

  categorizeGeolocation(geo) {
    if (!geo) return 'unknown';
    return `${geo.country}_${geo.region}`;
  }

  categorizeDataVolume(size) {
    if (size < 1024) return 'small';
    if (size < 10240) return 'medium';
    if (size < 102400) return 'large';
    return 'very_large';
  }

  checkProtocolCompliance(data) {
    const violations = [];
    
    // Check various protocol compliance issues
    if (data.invalidHeaders) violations.push('invalid_headers');
    if (data.incorrectHandshake) violations.push('incorrect_handshake');
    if (data.protocolVersionMismatch) violations.push('version_mismatch');
    
    return {
      compliant: violations.length === 0,
      violations
    };
  }

  calculateOverallRisk(threats, profile) {
    if (threats.length === 0) return 0;
    
    const threatRisks = threats.map(t => t.risk || 0);
    const maxRisk = Math.max(...threatRisks);
    const avgRisk = threatRisks.reduce((sum, risk) => sum + risk, 0) / threatRisks.length;
    
    // Combine max and average risk with threat count factor
    const threatCountFactor = Math.min(threats.length / 5, 1.0);
    
    return Math.min(0.95, (maxRisk * 0.6 + avgRisk * 0.3 + threatCountFactor * 0.1));
  }

  categorizeThreatLevel(risk) {
    if (risk >= 0.8) return 'critical';
    if (risk >= 0.6) return 'high';
    if (risk >= 0.4) return 'medium';
    if (risk >= 0.2) return 'low';
    return 'minimal';
  }

  calculateAssessmentConfidence(threats, profile) {
    // Higher confidence with more data and known patterns
    const patternKey = this.createPatternKey(profile);
    const pattern = this.securityPatterns.get(patternKey);
    
    let baseConfidence = 0.5;
    
    if (pattern) {
      baseConfidence = Math.min(0.9, 0.5 + (pattern.frequency / 100));
    }
    
    // Adjust based on threat detection
    const threatConfidence = threats.reduce((sum, t) => sum + (t.confidence || 0.5), 0) / Math.max(threats.length, 1);
    
    return (baseConfidence + threatConfidence) / 2;
  }

  createPatternKey(profile) {
    const keyData = {
      source: profile.source,
      userAgent: profile.userAgent,
      authMethod: profile.authenticationMethod,
      geolocation: profile.geolocation
    };
    
    return JSON.stringify(keyData, Object.keys(keyData).sort());
  }

  generateSignatureId(profile, assessment) {
    const threats = assessment.detectedThreats.map(t => t.type).sort().join('_');
    return `${profile.source}_${threats}_${Math.floor(assessment.overallRisk * 10)}`;
  }

  generateThreatDescription(assessment) {
    const threatTypes = [...new Set(assessment.detectedThreats.map(t => t.type))];
    return `Multiple threats detected: ${threatTypes.join(', ')}`;
  }

  /**
   * Export security data for analysis
   */
  exportSecurityData() {
    return {
      timestamp: Date.now(),
      securityPatterns: Array.from(this.securityPatterns.entries()),
      threatSignatures: Array.from(this.threatSignatures.entries()),
      riskScores: Array.from(this.riskScores.entries()),
      recentEvents: this.securityEvents.slice(-1000),
      metadata: {
        learningRate: this.learningRate,
        anomalyThreshold: this.anomalyThreshold,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import security data
   */
  importSecurityData(data) {
    if (data.securityPatterns) {
      this.securityPatterns = new Map(data.securityPatterns);
    }
    if (data.threatSignatures) {
      this.threatSignatures = new Map(data.threatSignatures);
    }
    if (data.riskScores) {
      this.riskScores = new Map(data.riskScores);
    }
    if (data.recentEvents) {
      this.securityEvents = data.recentEvents;
    }
  }
}

module.exports = SecurityPatternDetector;