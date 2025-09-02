/**
 * Resource Leak Pattern Analysis and Learning System
 * Analyzes resource leak patterns and provides prevention recommendations
 */

import { ResourceLeakPattern } from '../detection/ResourceLeakDetector';
import { mcp__claude_flow__neural_patterns, mcp__claude_flow__neural_train } from '../../../types/claude-flow';

export interface LeakPreventionRecommendation {
  id: string;
  pattern: ResourceLeakPattern;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  preventionCode: string;
  testCase: string;
  confidence: number;
  relatedPatterns: string[];
}

export interface ResourceLeakAnalysis {
  commonLeakSources: Array<{
    source: string;
    frequency: number;
    components: string[];
    avgResourceCount: number;
  }>;
  leakTrends: Array<{
    date: string;
    leakCount: number;
    leakScore: number;
  }>;
  preventionSuccess: {
    totalAttempts: number;
    successfulPreventions: number;
    successRate: number;
  };
  recommendations: LeakPreventionRecommendation[];
}

export class ResourceLeakPatternAnalyzer {
  private patterns: ResourceLeakPattern[] = [];
  private analysisCache: Map<string, ResourceLeakAnalysis> = new Map();
  private preventionRules: Map<string, (pattern: ResourceLeakPattern) => LeakPreventionRecommendation> = new Map();

  constructor() {
    this.initializePreventionRules();
  }

  private initializePreventionRules(): void {
    // Component mount leak prevention
    this.preventionRules.set('component_mount_leak', (pattern) => ({
      id: `rec_${Date.now()}_mount`,
      pattern,
      severity: pattern.resourceCount > 10 ? 'high' : 'medium',
      recommendation: `Add mount guards to prevent automatic resource creation in ${pattern.component}. Use user-triggered mounting instead of automatic mounting.`,
      preventionCode: `
// Add this to your ${pattern.component} component:
const [isUserTriggered, setIsUserTriggered] = useState(false);
const { tracker } = useResourceLeakPrevention({ componentName: '${pattern.component}' });

useEffect(() => {
  // Only create resources when user explicitly triggers them
  if (isUserTriggered) {
    // Your resource creation code here
    const cleanup = () => {
      // Cleanup code here
    };
    tracker.registerCustomResource('${pattern.leakSource}', cleanup);
  }
}, [isUserTriggered, tracker]);

return (
  <div>
    <button onClick={() => setIsUserTriggered(true)}>
      Start ${pattern.component}
    </button>
    {isUserTriggered && (
      // Your component content here
    )}
  </div>
);`,
      testCase: `
describe('${pattern.component} Resource Leak Prevention', () => {
  it('should not create resources automatically on mount', () => {
    const { unmount } = render(<${pattern.component} />);
    
    // Verify no resources are created automatically
    expect(getActiveResourceCount()).toBe(0);
    
    unmount();
  });

  it('should only create resources when user triggered', () => {
    const { getByText, unmount } = render(<${pattern.component} />);
    
    // Initially no resources
    expect(getActiveResourceCount()).toBe(0);
    
    // Trigger resource creation
    fireEvent.click(getByText('Start ${pattern.component}'));
    
    // Now resources should exist
    expect(getActiveResourceCount()).toBeGreaterThan(0);
    
    unmount();
    
    // Resources should be cleaned up
    expect(getActiveResourceCount()).toBe(0);
  });
});`,
      confidence: 0.9,
      relatedPatterns: []
    }));

    // Navigation accumulation prevention
    this.preventionRules.set('navigation_accumulation', (pattern) => ({
      id: `rec_${Date.now()}_nav`,
      pattern,
      severity: 'high',
      recommendation: `Implement navigation lifecycle monitoring to enforce cleanup on route changes. Add cleanup verification before navigation.`,
      preventionCode: `
// Add this navigation cleanup hook:
import { useEffect } from 'react';
import { useRouter } from 'your-router-library';
import { useResourceLeakPrevention } from '../hooks/useResourceLeakPrevention';

export function useNavigationCleanup(componentName: string) {
  const router = useRouter();
  const { cleanup, getResourceCount } = useResourceLeakPrevention({
    componentName,
    enableNavigationCleanup: true
  });

  useEffect(() => {
    const unsubscribe = router.listen((location) => {
      // Verify cleanup before navigation
      const resourceCount = getResourceCount();
      if (resourceCount > 0) {
        console.warn(\`Navigation with \${resourceCount} uncleaned resources in \${componentName}\`);
        cleanup();
      }
    });

    return unsubscribe;
  }, [router, cleanup, getResourceCount, componentName]);
}

// Use in your component:
function ${pattern.component}() {
  useNavigationCleanup('${pattern.component}');
  // Your component code...
}`,
      testCase: `
describe('${pattern.component} Navigation Cleanup', () => {
  it('should clean up resources before navigation', async () => {
    const { unmount } = render(<${pattern.component} />);
    
    // Create some resources
    // ... trigger resource creation
    
    expect(getActiveResourceCount()).toBeGreaterThan(0);
    
    // Simulate navigation
    act(() => {
      history.push('/new-route');
    });
    
    // Resources should be cleaned up
    await waitFor(() => {
      expect(getActiveResourceCount()).toBe(0);
    });
    
    unmount();
  });
});`,
      confidence: 0.85,
      relatedPatterns: []
    }));

    // Event listener leak prevention
    this.preventionRules.set('event_listener_leak', (pattern) => ({
      id: `rec_${Date.now()}_event`,
      pattern,
      severity: pattern.resourceCount > 20 ? 'critical' : 'high',
      recommendation: `Use tracked event listeners with automatic cleanup. Implement event listener monitoring and automatic removal.`,
      preventionCode: `
import { useTrackedEventListener } from '../hooks/useResourceLeakPrevention';

function ${pattern.component}() {
  // Use tracked event listener instead of regular addEventListener
  useTrackedEventListener(
    document,
    'click',
    handleClick,
    { passive: true }
  );

  // Or use the resource tracker directly
  const { registerEventListener } = useResourceLeakPrevention({ 
    componentName: '${pattern.component}',
    alertOnLeaks: true
  });

  useEffect(() => {
    const handleResize = () => {
      // Handle resize
    };

    // Register with automatic cleanup
    registerEventListener(window, 'resize', handleResize);
  }, [registerEventListener]);

  return (
    // Your component JSX
  );
}`,
      testCase: `
describe('${pattern.component} Event Listener Management', () => {
  it('should clean up event listeners on unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<${pattern.component} />);
    
    const addCallCount = addEventListenerSpy.mock.calls.length;
    
    unmount();
    
    // Should remove the same number of listeners that were added
    expect(removeEventListenerSpy.mock.calls.length).toBe(addCallCount);
    
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should not exceed event listener threshold', () => {
    render(<${pattern.component} />);
    
    // Check that we don't exceed reasonable listener count
    const listenerCount = getEventListenerCount();
    expect(listenerCount).toBeLessThan(10); // Reasonable threshold
  });
});`,
      confidence: 0.95,
      relatedPatterns: []
    }));

    // Timer leak prevention
    this.preventionRules.set('timer_leak', (pattern) => ({
      id: `rec_${Date.now()}_timer`,
      pattern,
      severity: 'medium',
      recommendation: `Use tracked timers with automatic cleanup. Implement timer monitoring and automatic clearing.`,
      preventionCode: `
import { useTrackedTimeout, useTrackedInterval } from '../hooks/useResourceLeakPrevention';

function ${pattern.component}() {
  // Use tracked timeout instead of setTimeout
  useTrackedTimeout(() => {
    // Your timeout callback
  }, 5000);

  // Use tracked interval instead of setInterval
  useTrackedInterval(() => {
    // Your interval callback
  }, 1000);

  // Or use manual registration
  const { registerTimer } = useResourceLeakPrevention({ 
    componentName: '${pattern.component}' 
  });

  useEffect(() => {
    const timerId = setTimeout(() => {
      // Your callback
    }, 2000);
    
    registerTimer(timerId, 'timeout');
  }, [registerTimer]);

  return (
    // Your component JSX
  );
}`,
      testCase: `
describe('${pattern.component} Timer Management', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should clean up timers on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    const { unmount } = render(<${pattern.component} />);
    
    unmount();
    
    // Should clear all created timers
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('should not create excessive timers', () => {
    render(<${pattern.component} />);
    
    const activeTimers = getActiveTimerCount();
    expect(activeTimers).toBeLessThan(5); // Reasonable threshold
  });
});`,
      confidence: 0.9,
      relatedPatterns: []
    }));
  }

  public analyzePattern(pattern: ResourceLeakPattern): void {
    this.patterns.push(pattern);
    this.invalidateCache();

    // Send pattern to neural learning system
    this.trainNeuralPatterns(pattern);
  }

  private async trainNeuralPatterns(pattern: ResourceLeakPattern): Promise<void> {
    try {
      const trainingData = JSON.stringify({
        patternType: pattern.type,
        component: pattern.component,
        leakSource: pattern.leakSource,
        resourceCount: pattern.resourceCount,
        cleanupMissing: pattern.cleanupMissing,
        navigationPath: pattern.navigationPath,
        metadata: pattern.metadata
      });

      // Send to claude-flow neural training
      if (typeof mcp__claude_flow__neural_train !== 'undefined') {
        await mcp__claude_flow__neural_train({
          pattern_type: 'optimization',
          training_data: trainingData,
          epochs: 50
        });
      }

      // Analyze with neural patterns
      if (typeof mcp__claude_flow__neural_patterns !== 'undefined') {
        await mcp__claude_flow__neural_patterns({
          action: 'learn',
          operation: 'resource_leak_prevention',
          outcome: `pattern_${pattern.type}`,
          metadata: {
            component: pattern.component,
            leakSource: pattern.leakSource,
            resourceCount: pattern.resourceCount
          }
        });
      }
    } catch (error) {
      console.warn('Failed to train neural patterns:', error);
    }
  }

  public generateRecommendations(patterns?: ResourceLeakPattern[]): LeakPreventionRecommendation[] {
    const patternsToAnalyze = patterns || this.patterns;
    const recommendations: LeakPreventionRecommendation[] = [];

    for (const pattern of patternsToAnalyze) {
      const ruleGenerator = this.preventionRules.get(pattern.type);
      if (ruleGenerator) {
        const recommendation = ruleGenerator(pattern);
        
        // Add related patterns
        recommendation.relatedPatterns = this.findRelatedPatterns(pattern)
          .map(p => p.id);

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private findRelatedPatterns(targetPattern: ResourceLeakPattern): ResourceLeakPattern[] {
    return this.patterns.filter(pattern => 
      pattern.id !== targetPattern.id &&
      (pattern.component === targetPattern.component ||
       pattern.type === targetPattern.type ||
       pattern.leakSource === targetPattern.leakSource)
    );
  }

  public analyzeLeakTrends(): ResourceLeakAnalysis {
    const cacheKey = 'full_analysis';
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    const analysis = this.performFullAnalysis();
    this.analysisCache.set(cacheKey, analysis);
    return analysis;
  }

  private performFullAnalysis(): ResourceLeakAnalysis {
    // Analyze common leak sources
    const leakSourceMap = new Map<string, {
      frequency: number;
      components: Set<string>;
      totalResourceCount: number;
    }>();

    for (const pattern of this.patterns) {
      const key = pattern.leakSource;
      const existing = leakSourceMap.get(key) || {
        frequency: 0,
        components: new Set(),
        totalResourceCount: 0
      };

      existing.frequency++;
      existing.components.add(pattern.component);
      existing.totalResourceCount += pattern.resourceCount;
      
      leakSourceMap.set(key, existing);
    }

    const commonLeakSources = Array.from(leakSourceMap.entries()).map(([source, data]) => ({
      source,
      frequency: data.frequency,
      components: Array.from(data.components),
      avgResourceCount: data.totalResourceCount / data.frequency
    })).sort((a, b) => b.frequency - a.frequency);

    // Analyze leak trends by day
    const dailyLeaks = new Map<string, { count: number; totalScore: number }>();
    
    for (const pattern of this.patterns) {
      const date = new Date(pattern.detectionTime).toISOString().split('T')[0];
      const existing = dailyLeaks.get(date) || { count: 0, totalScore: 0 };
      
      existing.count++;
      existing.totalScore += this.calculateLeakScore(pattern);
      
      dailyLeaks.set(date, existing);
    }

    const leakTrends = Array.from(dailyLeaks.entries())
      .map(([date, data]) => ({
        date,
        leakCount: data.count,
        leakScore: data.totalScore / data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate prevention success (this would be tracked separately in a real system)
    const preventionSuccess = {
      totalAttempts: this.patterns.length,
      successfulPreventions: Math.floor(this.patterns.length * 0.7), // Simulated
      successRate: 0.7
    };

    return {
      commonLeakSources,
      leakTrends,
      preventionSuccess,
      recommendations: this.generateRecommendations()
    };
  }

  private calculateLeakScore(pattern: ResourceLeakPattern): number {
    let score = 0;

    // Base score by type
    const typeScores = {
      'component_mount_leak': 0.6,
      'navigation_accumulation': 0.8,
      'event_listener_leak': 0.7,
      'timer_leak': 0.5,
      'api_subscription_leak': 0.9
    };

    score += typeScores[pattern.type] || 0.5;

    // Adjust by resource count
    score += Math.min(pattern.resourceCount / 50, 0.4);

    return Math.min(score, 1.0);
  }

  public getPatternsByComponent(componentName: string): ResourceLeakPattern[] {
    return this.patterns.filter(p => p.component === componentName);
  }

  public getPatternsByType(type: ResourceLeakPattern['type']): ResourceLeakPattern[] {
    return this.patterns.filter(p => p.type === type);
  }

  public exportAnalysis(): string {
    const analysis = this.analyzeLeakTrends();
    return JSON.stringify({
      analysis,
      patterns: this.patterns,
      timestamp: Date.now(),
      totalPatterns: this.patterns.length
    }, null, 2);
  }

  private invalidateCache(): void {
    this.analysisCache.clear();
  }

  public clearPatterns(): void {
    this.patterns = [];
    this.invalidateCache();
  }
}

// Singleton instance
export const resourceLeakPatternAnalyzer = new ResourceLeakPatternAnalyzer();