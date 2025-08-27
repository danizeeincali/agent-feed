/**
 * NLD Monitor - Real-time Pattern Detection System
 * 
 * Automatically detects when Claude claims success but users experience failure,
 * captures the pattern data, and builds training datasets for TDD improvement.
 */

import { nldDatabase } from './patterns/nlt-record-database';

export interface TriggerCondition {
  phrase: string;
  context?: string;
  confidence: number;
}

export interface SessionContext {
  currentTask?: string;
  claudeResponses: Array<{
    timestamp: string;
    response: string;
    confidence: number;
  }>;
  userInteractions: Array<{
    timestamp: string;
    action: string;
    result: 'success' | 'failure' | 'partial';
  }>;
  technicalContext: {
    component?: string;
    operation?: string;
    expectedResult?: string;
    actualResult?: string;
  };
}

export class NLDMonitor {
  private isActive = true;
  private sessionContext: SessionContext = {
    claudeResponses: [],
    userInteractions: [],
    technicalContext: {}
  };
  
  // Failure trigger phrases that indicate Claude's success claim was wrong
  private failureTriggers: TriggerCondition[] = [
    { phrase: "didn't work", confidence: 0.9 },
    { phrase: "that worked", confidence: -0.8 }, // Negative = success indicator
    { phrase: "failed", confidence: 0.85 },
    { phrase: "broken", confidence: 0.8 },
    { phrase: "working now", confidence: -0.7 }, // Success after fix
    { phrase: "undefined", confidence: 0.75 },
    { phrase: "null", confidence: 0.7 },
    { phrase: "error", confidence: 0.8 },
    { phrase: "not working", confidence: 0.9 },
    { phrase: "still broken", confidence: 0.95 },
    { phrase: "fix didn't work", confidence: 0.95 }
  ];
  
  /**
   * Monitor user input for trigger conditions
   */
  monitorUserInput(userInput: string, context?: any): void {
    if (!this.isActive) return;
    
    const normalizedInput = userInput.toLowerCase();
    
    for (const trigger of this.failureTriggers) {
      if (normalizedInput.includes(trigger.phrase)) {
        if (trigger.confidence > 0) {
          // Failure detected
          this.detectFailurePattern(trigger, userInput, context);
        } else {
          // Success detected - update context
          this.updateSuccessContext(trigger, userInput);
        }
        break;
      }
    }
    
    // Update session context
    this.sessionContext.userInteractions.push({
      timestamp: new Date().toISOString(),
      action: userInput,
      result: this.determineResultFromInput(normalizedInput)
    });
  }
  
  /**
   * Monitor Claude responses for confidence tracking
   */
  monitorClaudeResponse(response: string, confidence: number = 0.8): void {
    this.sessionContext.claudeResponses.push({
      timestamp: new Date().toISOString(),
      response: response,
      confidence: confidence
    });
  }
  
  /**
   * Set technical context for current operation
   */
  setTechnicalContext(context: {
    component?: string;
    operation?: string;
    expectedResult?: string;
    actualResult?: string;
  }): void {
    this.sessionContext.technicalContext = {
      ...this.sessionContext.technicalContext,
      ...context
    };
  }
  
  /**
   * Detect and capture failure pattern
   */
  private async detectFailurePattern(
    trigger: TriggerCondition, 
    userInput: string, 
    context?: any
  ): Promise<void> {
    
    console.log(`🔍 NLD: Failure pattern detected - "${trigger.phrase}" (confidence: ${trigger.confidence})`);
    
    // Special handling for instance ID undefined bug
    if (userInput.includes('undefined') || userInput.includes('instance')) {
      await this.captureInstanceIdPattern(userInput, context);
      return;
    }
    
    // Generic failure pattern capture
    const recordId = await nldDatabase.captureFailurePattern(userInput, {
      trigger: trigger,
      sessionContext: this.sessionContext,
      additionalContext: context
    });
    
    console.log(`📊 NLD: Pattern captured with ID ${recordId}`);
    
    // Export neural training data periodically
    if (Math.random() < 0.1) { // 10% chance to export
      this.exportTrainingData();
    }
  }
  
  /**
   * Specialized capture for instance ID undefined pattern
   */
  private async captureInstanceIdPattern(userInput: string, context?: any): Promise<void> {
    
    console.log('🐛 NLD: Instance ID undefined pattern detected');
    
    // Set specific technical context for this bug
    this.setTechnicalContext({
      component: 'ClaudeInstanceManager + useHTTPSSE',
      operation: 'terminal_connection',
      expectedResult: 'Instance ID propagated from creation to terminal connection',
      actualResult: 'undefined sent to backend API endpoint'
    });
    
    const recordId = await nldDatabase.captureFailurePattern(
      "Instance ID shows as undefined in terminal connection", 
      {
        sessionContext: this.sessionContext,
        specificPattern: 'INSTANCE_ID_UNDEFINED',
        technicalDetails: {
          location: 'useHTTPSSE.ts:87',
          rootCause: 'connectionState.current.instanceId accessed before onopen sets it',
          raceCondition: true,
          timing: 'synchronous_emit_before_async_onopen'
        }
      }
    );
    
    console.log(`🔬 NLD: Instance ID pattern captured - Record ID: ${recordId}`);
    
    // Generate immediate TDD recommendations for this critical bug
    const recommendations = nldDatabase.generateTDDRecommendations();
    console.log('🧪 NLD: TDD Prevention Strategies:', recommendations.critical_gaps);
  }
  
  /**
   * Update context when success is detected
   */
  private updateSuccessContext(trigger: TriggerCondition, userInput: string): void {
    console.log(`✅ NLD: Success detected - "${trigger.phrase}"`);
    
    this.sessionContext.userInteractions.push({
      timestamp: new Date().toISOString(),
      action: userInput,
      result: 'success'
    });
  }
  
  /**
   * Export training data for neural networks
   */
  private exportTrainingData(): void {
    const trainingData = nldDatabase.exportNeuralTrainingData();
    
    console.log('🧠 NLD: Neural training data exported:', {
      totalRecords: trainingData.metadata.total_records,
      failureRate: trainingData.metadata.failure_rate,
      avgEffectiveness: trainingData.metadata.avg_effectiveness,
      tddGapPercentage: trainingData.metadata.tdd_gap_percentage
    });
    
    // In production, this would integrate with claude-flow neural system
    // For now, just log for development
    console.log('📊 NLD: Training dataset size:', trainingData.dataset.length);
  }
  
  /**
   * Determine result from user input text
   */
  private determineResultFromInput(input: string): 'success' | 'failure' | 'partial' {
    const failureWords = ['failed', 'broken', 'error', 'undefined', 'null', 'not working'];
    const successWords = ['working', 'fixed', 'resolved', 'success'];
    const partialWords = ['partially', 'some', 'kind of'];
    
    if (failureWords.some(word => input.includes(word))) return 'failure';
    if (successWords.some(word => input.includes(word))) return 'success';
    if (partialWords.some(word => input.includes(word))) return 'partial';
    
    return 'partial'; // Default assumption
  }
  
  /**
   * Get current analytics
   */
  getAnalytics() {
    const trends = nldDatabase.getTDDEffectivenessTrends();
    
    return {
      sessionContext: this.sessionContext,
      trainingData: nldDatabase.exportNeuralTrainingData(),
      tddTrends: trends,
      recommendations: nldDatabase.generateTDDRecommendations()
    };
  }
  
  /**
   * Reset session for new task
   */
  resetSession(): void {
    this.sessionContext = {
      claudeResponses: [],
      userInteractions: [],
      technicalContext: {}
    };
    console.log('🔄 NLD: Session reset');
  }
  
  /**
   * Enable/disable monitoring
   */
  setActive(active: boolean): void {
    this.isActive = active;
    console.log(`${active ? '🟢' : '🔴'} NLD: Monitoring ${active ? 'enabled' : 'disabled'}`);
  }
}

// Global instance for use across the application
export const nldMonitor = new NLDMonitor();

/**
 * Integration hook for frontend components
 * Call this from your React components to monitor user interactions
 */
export function useNLDMonitoring() {
  const logUserInteraction = (input: string, context?: any) => {
    nldMonitor.monitorUserInput(input, context);
  };
  
  const logClaudeResponse = (response: string, confidence?: number) => {
    nldMonitor.monitorClaudeResponse(response, confidence);
  };
  
  const setContext = (context: any) => {
    nldMonitor.setTechnicalContext(context);
  };
  
  const getAnalytics = () => nldMonitor.getAnalytics();
  
  return {
    logUserInteraction,
    logClaudeResponse,
    setContext,
    getAnalytics
  };
}