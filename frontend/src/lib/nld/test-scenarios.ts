/**
 * NLD Test Scenarios
 * Implements various failure scenarios for testing the NLD system
 */

import { nld } from './core';
import { nldDatabase } from './database';
import { preventionEngine } from './prevention-engine';

export interface TestScenario {
  name: string;
  description: string;
  duration: number;
  events: Array<{
    delay: number;
    action: () => void;
  }>;
}

export class NLDTestRunner {
  private isRunning = false;
  private currentScenario: string | null = null;
  private abortController: AbortController | null = null;

  /**
   * Run all test scenarios sequentially
   */
  async runAllScenarios(): Promise<void> {
    const scenarios = this.getAllScenarios();
    
    for (const scenario of scenarios) {
      console.log(`[NLD Test] Starting scenario: ${scenario.name}`);
      await this.runScenario(scenario.name);
      
      // Wait between scenarios
      await this.sleep(2000);
    }
    
    console.log('[NLD Test] All scenarios completed');
  }

  /**
   * Run a specific test scenario
   */
  async runScenario(scenarioName: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Another scenario is already running');
    }

    const scenario = this.getScenario(scenarioName);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioName}`);
    }

    this.isRunning = true;
    this.currentScenario = scenarioName;
    this.abortController = new AbortController();

    try {
      console.log(`[NLD Test] Running scenario: ${scenario.name}`);
      console.log(`[NLD Test] Description: ${scenario.description}`);
      console.log(`[NLD Test] Duration: ${scenario.duration}ms`);

      // Execute scenario events
      for (const event of scenario.events) {
        if (this.abortController.signal.aborted) {
          throw new Error('Scenario aborted');
        }

        await this.sleep(event.delay);
        event.action();
      }

      console.log(`[NLD Test] Scenario completed: ${scenario.name}`);

    } finally {
      this.isRunning = false;
      this.currentScenario = null;
      this.abortController = null;
    }
  }

  /**
   * Stop the currently running scenario
   */
  stopScenario(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
    this.currentScenario = null;
  }

  /**
   * Get all available test scenarios
   */
  getAllScenarios(): TestScenario[] {
    return [
      this.createConnectionLoopScenario(),
      this.createRaceConditionScenario(),
      this.createTimeoutCascadeScenario(),
      this.createStateViolationScenario(),
      this.createUserConfusionScenario(),
      this.createComplexFailureScenario()
    ];
  }

  /**
   * Get a specific scenario by name
   */
  getScenario(name: string): TestScenario | null {
    const scenarios = this.getAllScenarios();
    return scenarios.find(s => s.name === name) || null;
  }

  /**
   * Create connection loop test scenario
   */
  private createConnectionLoopScenario(): TestScenario {
    return {
      name: 'connection_loop',
      description: 'Simulates rapid connect/disconnect cycles',
      duration: 10000,
      events: [
        {
          delay: 0,
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'connection_loop',
            timestamp: Date.now()
          })
        },
        {
          delay: 200,
          action: () => nld.captureEvent('disconnection', { 
            test: true, 
            scenario: 'connection_loop',
            reason: 'unexpected'
          })
        },
        {
          delay: 300,
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'connection_loop',
            attempt: 2
          })
        },
        {
          delay: 500,
          action: () => nld.captureEvent('disconnection', { 
            test: true, 
            scenario: 'connection_loop',
            reason: 'timeout'
          })
        },
        {
          delay: 600,
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'connection_loop',
            attempt: 3
          })
        },
        {
          delay: 800,
          action: () => nld.captureEvent('disconnection', { 
            test: true, 
            scenario: 'connection_loop',
            reason: 'error'
          })
        },
        {
          delay: 900,
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'connection_loop',
            attempt: 4
          })
        },
        {
          delay: 1100,
          action: () => nld.captureEvent('disconnection', { 
            test: true, 
            scenario: 'connection_loop',
            reason: 'network'
          })
        }
      ]
    };
  }

  /**
   * Create race condition test scenario
   */
  private createRaceConditionScenario(): TestScenario {
    const baseTimestamp = Date.now();
    
    return {
      name: 'race_condition',
      description: 'Simulates simultaneous connection attempts',
      duration: 5000,
      events: [
        {
          delay: 0,
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'race_condition',
            timestamp: baseTimestamp,
            attempt: 1
          })
        },
        {
          delay: 50, // Very close timing
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'race_condition',
            timestamp: baseTimestamp + 50,
            attempt: 2
          })
        },
        {
          delay: 80, // Even closer timing
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'race_condition',
            timestamp: baseTimestamp + 80,
            attempt: 3
          })
        },
        {
          delay: 100,
          action: () => nld.captureEvent('error', { 
            test: true, 
            scenario: 'race_condition',
            error: 'Connection already in progress',
            type: 'race_condition_error'
          })
        },
        {
          delay: 2000,
          action: () => {
            // Simulate another race condition later
            const timestamp2 = Date.now();
            nld.captureEvent('connection', { 
              test: true, 
              scenario: 'race_condition',
              timestamp: timestamp2,
              attempt: 4
            });
          }
        },
        {
          delay: 2020,
          action: () => {
            const timestamp2 = Date.now();
            nld.captureEvent('connection', { 
              test: true, 
              scenario: 'race_condition',
              timestamp: timestamp2,
              attempt: 5
            });
          }
        }
      ]
    };
  }

  /**
   * Create timeout cascade test scenario
   */
  private createTimeoutCascadeScenario(): TestScenario {
    return {
      name: 'timeout_cascade',
      description: 'Simulates cascading timeout failures',
      duration: 30000,
      events: [
        {
          delay: 0,
          action: () => nld.captureEvent('timeout', { 
            test: true, 
            scenario: 'timeout_cascade',
            timeout: 5000,
            operation: 'connect'
          })
        },
        {
          delay: 5000,
          action: () => nld.captureEvent('timeout', { 
            test: true, 
            scenario: 'timeout_cascade',
            timeout: 10000,
            operation: 'reconnect'
          })
        },
        {
          delay: 10000,
          action: () => nld.captureEvent('timeout', { 
            test: true, 
            scenario: 'timeout_cascade',
            timeout: 15000,
            operation: 'authenticate'
          })
        },
        {
          delay: 15000,
          action: () => nld.captureEvent('timeout', { 
            test: true, 
            scenario: 'timeout_cascade',
            timeout: 20000,
            operation: 'heartbeat'
          })
        },
        {
          delay: 20000,
          action: () => nld.captureEvent('error', { 
            test: true, 
            scenario: 'timeout_cascade',
            error: 'Max timeout limit reached',
            severity: 'critical'
          })
        }
      ]
    };
  }

  /**
   * Create state violation test scenario
   */
  private createStateViolationScenario(): TestScenario {
    return {
      name: 'state_violation',
      description: 'Simulates invalid state transitions',
      duration: 8000,
      events: [
        {
          delay: 0,
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'state_violation',
            state: 'disconnected',
            newState: 'connected' // Invalid: should go through connecting
          })
        },
        {
          delay: 1000,
          action: () => nld.captureEvent('error', { 
            test: true, 
            scenario: 'state_violation',
            state: 'connected',
            newState: 'connecting', // Invalid: already connected
            violation: 'invalid_transition'
          })
        },
        {
          delay: 3000,
          action: () => nld.captureEvent('connection', { 
            test: true, 
            scenario: 'state_violation',
            state: 'error',
            newState: 'connected', // Invalid: should disconnect first
            expectedState: 'disconnected'
          })
        },
        {
          delay: 5000,
          action: () => nld.captureEvent('user_action', { 
            test: true, 
            scenario: 'state_violation',
            action: 'send_message',
            currentState: 'disconnected', // Trying to send while disconnected
            violation: 'action_in_invalid_state'
          })
        }
      ]
    };
  }

  /**
   * Create user confusion test scenario
   */
  private createUserConfusionScenario(): TestScenario {
    return {
      name: 'user_confusion',
      description: 'Simulates user confusion patterns (rapid repeated actions)',
      duration: 15000,
      events: [
        // Rapid connect button clicks
        { delay: 0, action: () => this.simulateUserAction('connect_button_click') },
        { delay: 500, action: () => this.simulateUserAction('connect_button_click') },
        { delay: 800, action: () => this.simulateUserAction('connect_button_click') },
        { delay: 1200, action: () => this.simulateUserAction('connect_button_click') },
        { delay: 1500, action: () => this.simulateUserAction('connect_button_click') },
        
        // Brief pause, then refresh attempts
        { delay: 3000, action: () => this.simulateUserAction('refresh_page') },
        { delay: 3500, action: () => this.simulateUserAction('refresh_page') },
        { delay: 4000, action: () => this.simulateUserAction('refresh_page') },
        
        // Frustrated clicking on disconnect/reconnect
        { delay: 6000, action: () => this.simulateUserAction('disconnect_button_click') },
        { delay: 6200, action: () => this.simulateUserAction('connect_button_click') },
        { delay: 6400, action: () => this.simulateUserAction('disconnect_button_click') },
        { delay: 6600, action: () => this.simulateUserAction('connect_button_click') },
        { delay: 6800, action: () => this.simulateUserAction('disconnect_button_click') },
        
        // Multiple send attempts on failed connection
        { delay: 10000, action: () => this.simulateUserAction('send_message_attempt') },
        { delay: 10500, action: () => this.simulateUserAction('send_message_attempt') },
        { delay: 11000, action: () => this.simulateUserAction('send_message_attempt') },
        { delay: 11300, action: () => this.simulateUserAction('send_message_attempt') }
      ]
    };
  }

  /**
   * Create complex failure scenario combining multiple patterns
   */
  private createComplexFailureScenario(): TestScenario {
    return {
      name: 'complex_failure',
      description: 'Complex scenario combining multiple failure patterns',
      duration: 25000,
      events: [
        // Start with connection loop
        { delay: 0, action: () => nld.captureEvent('connection', { test: true, scenario: 'complex', phase: 'initial' }) },
        { delay: 200, action: () => nld.captureEvent('disconnection', { test: true, scenario: 'complex', phase: 'initial' }) },
        { delay: 400, action: () => nld.captureEvent('connection', { test: true, scenario: 'complex', phase: 'initial' }) },
        
        // Add race condition
        { delay: 1000, action: () => {
          const timestamp = Date.now();
          nld.captureEvent('connection', { test: true, scenario: 'complex', phase: 'race', timestamp });
          setTimeout(() => nld.captureEvent('connection', { test: true, scenario: 'complex', phase: 'race', timestamp }), 30);
        }},
        
        // Escalate to timeout cascade
        { delay: 5000, action: () => nld.captureEvent('timeout', { test: true, scenario: 'complex', phase: 'cascade' }) },
        { delay: 8000, action: () => nld.captureEvent('timeout', { test: true, scenario: 'complex', phase: 'cascade' }) },
        { delay: 12000, action: () => nld.captureEvent('timeout', { test: true, scenario: 'complex', phase: 'cascade' }) },
        
        // User gets confused and starts clicking
        { delay: 15000, action: () => this.simulateUserAction('panic_clicking', { scenario: 'complex' }) },
        { delay: 15300, action: () => this.simulateUserAction('panic_clicking', { scenario: 'complex' }) },
        { delay: 15600, action: () => this.simulateUserAction('panic_clicking', { scenario: 'complex' }) },
        
        // State violations occur
        { delay: 18000, action: () => nld.captureEvent('error', { 
          test: true, 
          scenario: 'complex', 
          phase: 'violation',
          violation: 'multiple_simultaneous_connections',
          severity: 'critical'
        })},
        
        // Finally, system recovery attempt
        { delay: 22000, action: () => nld.captureEvent('connection', { 
          test: true, 
          scenario: 'complex', 
          phase: 'recovery',
          recoveryAttempt: true
        })}
      ]
    };
  }

  /**
   * Simulate user action
   */
  private simulateUserAction(action: string, context: any = {}): void {
    nld.captureEvent('user_action', {
      test: true,
      action,
      timestamp: Date.now(),
      ...context
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get test results summary
   */
  getTestResults(): any {
    const patterns = nld.getPatterns();
    const testPatterns = patterns.filter(p => 
      p.events.some(e => e.data.test === true)
    );

    const statistics = nldDatabase.getPatternStatistics();
    const recommendations = preventionEngine.getRecommendations();

    return {
      totalTestPatterns: testPatterns.length,
      patternsByScenario: this.groupPatternsByScenario(testPatterns),
      detectedPatternTypes: [...new Set(testPatterns.map(p => p.type))],
      averageConfidence: testPatterns.length > 0 
        ? testPatterns.reduce((sum, p) => sum + p.confidence, 0) / testPatterns.length 
        : 0,
      generatedRecommendations: recommendations.length,
      testEffectiveness: this.calculateTestEffectiveness(testPatterns),
      statistics
    };
  }

  /**
   * Group patterns by scenario
   */
  private groupPatternsByScenario(patterns: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    patterns.forEach(pattern => {
      const scenario = pattern.events.find(e => e.data.scenario)?.data.scenario || 'unknown';
      grouped[scenario] = (grouped[scenario] || 0) + 1;
    });
    
    return grouped;
  }

  /**
   * Calculate test effectiveness
   */
  private calculateTestEffectiveness(patterns: any[]): number {
    // Simple effectiveness calculation based on pattern detection rate
    const scenarioCount = this.getAllScenarios().length;
    const detectedScenarios = new Set(patterns.map(p => 
      p.events.find(e => e.data.scenario)?.data.scenario
    )).size;
    
    return detectedScenarios / scenarioCount;
  }

  /**
   * Clear test data
   */
  clearTestData(): void {
    const allPatterns = nld.getPatterns();
    const testPatterns = allPatterns.filter(p => 
      p.events.some(e => e.data.test === true)
    );
    
    console.log(`[NLD Test] Clearing ${testPatterns.length} test patterns`);
    
    // This would require implementing a cleanup method in the core NLD system
    // For now, we just log the action
  }

  // Status getters
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentScenario: this.currentScenario,
      availableScenarios: this.getAllScenarios().map(s => ({
        name: s.name,
        description: s.description,
        duration: s.duration
      }))
    };
  }
}

// Global test runner instance
export const nldTestRunner = new NLDTestRunner();