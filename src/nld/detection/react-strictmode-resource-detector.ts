/**
 * React StrictMode Resource Creation Detector
 * Part of NLD (Neuro-Learning Development) System
 * 
 * Detects and prevents automatic resource creation in React components
 * that could be triggered multiple times due to StrictMode double execution.
 */

export interface ResourceCreationDetection {
  componentName: string;
  resourceType: string;
  creationMethod: string;
  triggerContext: 'mount' | 'effect' | 'callback' | 'navigation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  strictModeImpact: boolean;
  preventionRecommendation: string;
}

export interface StrictModeResourcePattern {
  pattern: string;
  description: string;
  riskLevel: 'high' | 'medium' | 'low';
  detectionRegex: RegExp;
  preventionStrategy: string;
}

export class ReactStrictModeResourceDetector {
  private static readonly RISKY_PATTERNS: StrictModeResourcePattern[] = [
    {
      pattern: 'USEEFFECT_RESOURCE_CREATION',
      description: 'Resource creation directly in useEffect hook',
      riskLevel: 'high',
      detectionRegex: /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?(create|initialize|connect|start)[\s\S]*?\}\s*,\s*\[\s*\]\s*\)/g,
      preventionStrategy: 'Move resource creation to user-controlled event handlers'
    },
    {
      pattern: 'ASYNC_USEEFFECT_RESOURCE',
      description: 'Async resource creation in useEffect',
      riskLevel: 'high', 
      detectionRegex: /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?const\s+\w+\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?(create|initialize|connect)[\s\S]*?\}\s*,\s*\[\s*\]\s*\)/g,
      preventionStrategy: 'Use explicit initialization with user interaction'
    },
    {
      pattern: 'AUTOMATIC_API_INITIALIZATION',
      description: 'Automatic API service initialization on component mount',
      riskLevel: 'high',
      detectionRegex: /(createProduction\w*|initialize\w*Service|connect\w*API)[\s\S]*?useEffect/g,
      preventionStrategy: 'Defer API initialization until user action'
    },
    {
      pattern: 'WEBSOCKET_AUTO_CONNECT',
      description: 'Automatic WebSocket connection in component lifecycle',
      riskLevel: 'medium',
      detectionRegex: /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?(new\s+WebSocket|connect\w*Socket)[\s\S]*?\}/g,
      preventionStrategy: 'Use connection button instead of automatic connection'
    }
  ];

  /**
   * Analyze component code for StrictMode resource leak patterns
   */
  public analyzeComponent(componentCode: string, componentName: string): ResourceCreationDetection[] {
    const detections: ResourceCreationDetection[] = [];

    for (const pattern of ReactStrictModeResourceDetector.RISKY_PATTERNS) {
      const matches = componentCode.match(pattern.detectionRegex);
      
      if (matches) {
        matches.forEach(match => {
          detections.push({
            componentName,
            resourceType: this.extractResourceType(match),
            creationMethod: this.extractCreationMethod(match),
            triggerContext: this.determineTriggerContext(match),
            severity: this.mapRiskToSeverity(pattern.riskLevel),
            strictModeImpact: true,
            preventionRecommendation: pattern.preventionStrategy
          });
        });
      }
    }

    return detections;
  }

  /**
   * Check if component has proper resource cleanup
   */
  public hasProperCleanup(componentCode: string): boolean {
    // Look for cleanup in useEffect return or useEffect dependency
    const cleanupPatterns = [
      /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?return\s*\(\)\s*=>\s*\{[\s\S]*?(cleanup|destroy|disconnect|close)[\s\S]*?\}/g,
      /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?return\s+\w+\.cleanup/g,
      /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?return\s+cleanup\w*/g
    ];

    return cleanupPatterns.some(pattern => pattern.test(componentCode));
  }

  /**
   * Generate test recommendations for detected patterns
   */
  public generateTestRecommendations(detections: ResourceCreationDetection[]): string[] {
    const recommendations: string[] = [];

    if (detections.length === 0) {
      return ['No resource creation patterns detected. Consider adding tests for future resource additions.'];
    }

    detections.forEach(detection => {
      switch (detection.triggerContext) {
        case 'mount':
          recommendations.push(`Test that ${detection.resourceType} is not created automatically on component mount`);
          recommendations.push(`Verify ${detection.resourceType} creation is user-controlled with explicit action`);
          break;
        case 'effect':
          recommendations.push(`Test ${detection.resourceType} creation in StrictMode to prevent double execution`);
          recommendations.push(`Mock ${detection.creationMethod} and verify call count in StrictMode environment`);
          break;
        case 'navigation':
          recommendations.push(`Test repeated navigation does not leak ${detection.resourceType} resources`);
          break;
        default:
          recommendations.push(`Test ${detection.resourceType} resource management for ${detection.triggerContext}`);
      }
    });

    // Add cleanup recommendations
    recommendations.push('Test proper resource cleanup on component unmount');
    recommendations.push('Verify no resource leaks during rapid mount/unmount cycles');

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Generate prevention strategies based on detected patterns
   */
  public generatePreventionStrategies(detections: ResourceCreationDetection[]): string[] {
    const strategies = new Set<string>();

    detections.forEach(detection => {
      strategies.add(detection.preventionRecommendation);
      
      // Add specific strategies based on detection type
      if (detection.resourceType.includes('API') || detection.resourceType.includes('Service')) {
        strategies.add('Implement lazy initialization with isInitialized state tracking');
        strategies.add('Use loading states to prevent duplicate initialization attempts');
      }
      
      if (detection.resourceType.includes('WebSocket') || detection.resourceType.includes('Connection')) {
        strategies.add('Provide connection control buttons instead of auto-connect');
        strategies.add('Implement connection state management to prevent duplicate connections');
      }
    });

    return Array.from(strategies);
  }

  private extractResourceType(codeMatch: string): string {
    // Extract resource type from the matched code
    const resourcePatterns = [
      { pattern: /create\w*Feed/i, type: 'Feed Integration Service' },
      { pattern: /create\w*Production/i, type: 'Production Service' },
      { pattern: /new\s+WebSocket/i, type: 'WebSocket Connection' },
      { pattern: /initialize\w*Service/i, type: 'Service Instance' },
      { pattern: /connect\w*API/i, type: 'API Connection' }
    ];

    for (const { pattern, type } of resourcePatterns) {
      if (pattern.test(codeMatch)) {
        return type;
      }
    }

    return 'Unknown Resource';
  }

  private extractCreationMethod(codeMatch: string): string {
    // Extract the method name used for creation
    const methodMatch = codeMatch.match(/(create\w*|initialize\w*|connect\w*|new\s+\w+)/i);
    return methodMatch ? methodMatch[0] : 'unknown';
  }

  private determineTriggerContext(codeMatch: string): 'mount' | 'effect' | 'callback' | 'navigation' {
    if (/useEffect[\s\S]*?\[\s*\]/.test(codeMatch)) {
      return 'mount';
    }
    if (/useEffect/.test(codeMatch)) {
      return 'effect';
    }
    if (/onClick|onSubmit|onLoad/.test(codeMatch)) {
      return 'callback';
    }
    return 'navigation';
  }

  private mapRiskToSeverity(riskLevel: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (riskLevel) {
      case 'high': return 'critical';
      case 'medium': return 'high'; 
      case 'low': return 'medium';
      default: return 'low';
    }
  }
}

/**
 * Factory function to create detector instance
 */
export function createStrictModeResourceDetector(): ReactStrictModeResourceDetector {
  return new ReactStrictModeResourceDetector();
}

/**
 * Analyze component file for StrictMode resource patterns
 */
export async function analyzeComponentForResourceLeaks(
  filePath: string,
  componentCode: string
): Promise<{
  detections: ResourceCreationDetection[];
  hasCleanup: boolean;
  testRecommendations: string[];
  preventionStrategies: string[];
}> {
  const detector = createStrictModeResourceDetector();
  const componentName = filePath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'Unknown';
  
  const detections = detector.analyzeComponent(componentCode, componentName);
  const hasCleanup = detector.hasProperCleanup(componentCode);
  const testRecommendations = detector.generateTestRecommendations(detections);
  const preventionStrategies = detector.generatePreventionStrategies(detections);

  return {
    detections,
    hasCleanup,
    testRecommendations,
    preventionStrategies
  };
}