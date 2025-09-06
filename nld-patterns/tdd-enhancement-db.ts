/**
 * TDD Enhancement Database
 * Neural Learning system for improving Test-Driven Development patterns
 * based on real failure analysis and success patterns
 */

export interface TDDPattern {
  id: string;
  name: string;
  category: 'unit' | 'integration' | 'e2e' | 'visual' | 'performance';
  description: string;
  testPattern: string;
  implementationPattern: string;
  failureRate: number;
  successRate: number;
  commonFailures: TDDFailureCase[];
  improvements: TDDImprovement[];
  lastUpdated: number;
}

export interface TDDFailureCase {
  scenario: string;
  originalTest: string;
  failure: string;
  rootCause: string;
  solution: string;
  preventionStrategy: string;
  frequency: number;
}

export interface TDDImprovement {
  issue: string;
  enhancement: string;
  beforeCode: string;
  afterCode: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'minimal' | 'moderate' | 'significant';
}

export interface TDDMetrics {
  totalTests: number;
  passRate: number;
  coverageScore: number;
  patternEffectiveness: Record<string, number>;
  commonFailureTypes: Record<string, number>;
  improvementSuggestions: string[];
}

export class TDDEnhancementDatabase {
  private patterns: Map<string, TDDPattern> = new Map();
  private metrics: TDDMetrics = {
    totalTests: 0,
    passRate: 0,
    coverageScore: 0,
    patternEffectiveness: {},
    commonFailureTypes: {},
    improvementSuggestions: []
  };

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize with proven TDD patterns for URL/Preview components
   */
  private initializePatterns() {
    // URL Parsing TDD Pattern
    this.addPattern({
      id: 'url-parsing-tdd',
      name: 'URL Parsing Test Pattern',
      category: 'unit',
      description: 'Comprehensive testing pattern for URL parsing and display logic',
      testPattern: `
describe('URL Parser', () => {
  test.each([
    ['https://example.com', { hostname: 'example.com', hasWWW: false }],
    ['https://www.example.com', { hostname: 'www.example.com', hasWWW: true }],
    ['http://example.com/path', { hostname: 'example.com', pathname: '/path' }],
    ['example.com', { hostname: 'example.com', protocol: 'https:' }],
  ])('should parse %s correctly', (url, expected) => {
    const result = parseURL(url);
    expect(result).toMatchObject(expected);
  });
  
  test('should generate clean display text', () => {
    expect(getDisplayText('https://www.example.com')).toBe('example.com');
    expect(getDisplayText('https://example.com/long/path')).toBe('example.com/long/path');
  });
});
      `,
      implementationPattern: `
function parseURL(url: string): ParsedURL {
  // Normalize URL
  let normalized = url.startsWith('http') ? url : 'https://' + url;
  
  try {
    const parsed = new URL(normalized);
    return {
      hostname: parsed.hostname,
      hasWWW: parsed.hostname.startsWith('www.'),
      cleanHostname: parsed.hostname.replace(/^www\\./, ''),
      protocol: parsed.protocol,
      pathname: parsed.pathname
    };
  } catch (error) {
    return fallbackParse(url);
  }
}

function getDisplayText(url: string): string {
  const parsed = parseURL(url);
  return parsed.cleanHostname + (parsed.pathname !== '/' ? parsed.pathname : '');
}
      `,
      failureRate: 15,
      successRate: 85,
      commonFailures: [
        {
          scenario: 'www prefix showing in display',
          originalTest: 'expect(display).toBe("www.example.com")',
          failure: 'Display should not show www prefix',
          rootCause: 'Test expecting wrong behavior',
          solution: 'expect(display).toBe("example.com")',
          preventionStrategy: 'Always test for clean display text',
          frequency: 8
        }
      ],
      improvements: [],
      lastUpdated: Date.now()
    });

    // Preview Component TDD Pattern
    this.addPattern({
      id: 'preview-component-tdd',
      name: 'Preview Component Testing',
      category: 'integration',
      description: 'Testing pattern for link preview components with loading states',
      testPattern: `
describe('LinkPreview Component', () => {
  test('should show loading state initially', async () => {
    render(<LinkPreview url="https://example.com" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  test('should display preview data when loaded', async () => {
    const mockData = { title: 'Example', description: 'Test site' };
    jest.spyOn(api, 'fetchPreview').mockResolvedValue(mockData);
    
    render(<LinkPreview url="https://example.com" />);
    
    await waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
    });
  });
  
  test('should handle network errors gracefully', async () => {
    jest.spyOn(api, 'fetchPreview').mockRejectedValue(new Error('Network error'));
    
    render(<LinkPreview url="https://example.com" />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
      `,
      implementationPattern: `
const LinkPreview: React.FC<{url: string}> = ({ url }) => {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [data, setData] = useState<PreviewData | null>(null);
  
  useEffect(() => {
    api.fetchPreview(url)
      .then(data => {
        setData(data);
        setState('loaded');
      })
      .catch(() => setState('error'));
  }, [url]);
  
  if (state === 'loading') return <div>Loading...</div>;
  if (state === 'error') return <div>Failed to load preview</div>;
  
  return (
    <div className="preview">
      <h3>{data?.title}</h3>
      <p>{data?.description}</p>
    </div>
  );
};
      `,
      failureRate: 25,
      successRate: 75,
      commonFailures: [
        {
          scenario: 'Component crashes on network error',
          originalTest: 'No error handling test',
          failure: 'Unhandled promise rejection crashes component',
          rootCause: 'Missing error state testing',
          solution: 'Add error handling tests and implementation',
          preventionStrategy: 'Always test error scenarios first',
          frequency: 12
        }
      ],
      improvements: [],
      lastUpdated: Date.now()
    });

    // Visual Regression TDD Pattern
    this.addPattern({
      id: 'visual-regression-tdd',
      name: 'Visual Regression Testing',
      category: 'visual',
      description: 'Pattern for testing visual consistency of preview components',
      testPattern: `
describe('Preview Visual Tests', () => {
  test('should match baseline screenshot', async () => {
    await page.goto('/preview-test');
    
    const preview = await page.locator('[data-testid="link-preview"]');
    await preview.waitFor();
    
    await expect(preview).toHaveScreenshot('preview-baseline.png');
  });
  
  test('should handle collapsed state correctly', async () => {
    await page.goto('/preview-test');
    
    const collapseButton = await page.locator('[data-testid="collapse-button"]');
    await collapseButton.click();
    
    const preview = await page.locator('[data-testid="link-preview"]');
    await expect(preview).toHaveScreenshot('preview-collapsed.png');
  });
});
      `,
      implementationPattern: `
// Visual test utilities
export const createVisualTest = (componentName: string) => {
  return {
    async captureBaseline(selector: string) {
      const element = await page.locator(selector);
      await element.waitFor();
      return element.screenshot({ path: \`baselines/\${componentName}.png\` });
    },
    
    async compareScreenshot(selector: string, threshold = 0.1) {
      const element = await page.locator(selector);
      await expect(element).toHaveScreenshot(
        \`\${componentName}.png\`, 
        { threshold }
      );
    }
  };
};
      `,
      failureRate: 30,
      successRate: 70,
      commonFailures: [
        {
          scenario: 'Inconsistent visual rendering across browsers',
          originalTest: 'Only testing in Chrome',
          failure: 'Component looks different in Firefox/Safari',
          rootCause: 'Browser-specific rendering differences',
          solution: 'Cross-browser visual testing',
          preventionStrategy: 'Test in multiple browsers from start',
          frequency: 6
        }
      ],
      improvements: [],
      lastUpdated: Date.now()
    });
  }

  /**
   * Add new TDD pattern to database
   */
  public addPattern(pattern: TDDPattern) {
    this.patterns.set(pattern.id, pattern);
    this.updateMetrics();
  }

  /**
   * Record a failure case for pattern improvement
   */
  public recordFailure(
    patternId: string, 
    scenario: string, 
    originalTest: string, 
    failure: string, 
    rootCause: string
  ) {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    // Check if failure already exists
    const existing = pattern.commonFailures.find(f => f.scenario === scenario);
    if (existing) {
      existing.frequency++;
    } else {
      pattern.commonFailures.push({
        scenario,
        originalTest,
        failure,
        rootCause,
        solution: '', // To be filled by analysis
        preventionStrategy: '', // To be filled by analysis
        frequency: 1
      });
    }

    // Update failure rate
    pattern.failureRate = Math.min(100, pattern.failureRate + 1);
    pattern.lastUpdated = Date.now();

    this.updateMetrics();
    this.generateImprovements(pattern);
  }

  /**
   * Record a success case
   */
  public recordSuccess(patternId: string, testCode: string, description: string) {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    // Update success rate
    pattern.successRate = Math.min(100, pattern.successRate + 0.5);
    pattern.failureRate = Math.max(0, pattern.failureRate - 0.5);
    pattern.lastUpdated = Date.now();

    this.updateMetrics();
  }

  /**
   * Generate improvements for pattern based on failures
   */
  private generateImprovements(pattern: TDDPattern) {
    const highFrequencyFailures = pattern.commonFailures
      .filter(f => f.frequency >= 3)
      .sort((a, b) => b.frequency - a.frequency);

    highFrequencyFailures.forEach(failure => {
      const improvement = this.analyzeFailureForImprovement(failure, pattern);
      if (improvement) {
        // Check if improvement already exists
        const existing = pattern.improvements.find(i => i.issue === improvement.issue);
        if (!existing) {
          pattern.improvements.push(improvement);
        }
      }
    });
  }

  /**
   * Analyze failure to generate improvement suggestion
   */
  private analyzeFailureForImprovement(failure: TDDFailureCase, pattern: TDDPattern): TDDImprovement | null {
    // www prefix display issue
    if (failure.scenario.includes('www prefix')) {
      return {
        issue: 'www prefix display inconsistency',
        enhancement: 'Add comprehensive www prefix testing',
        beforeCode: `
// Weak test
expect(getDisplayText(url)).toBeTruthy();
        `,
        afterCode: `
// Strong test with specific expectations
test.each([
  ['https://www.example.com', 'example.com'],
  ['https://example.com', 'example.com'],
  ['www.example.com', 'example.com']
])('should display %s as %s', (input, expected) => {
  expect(getDisplayText(input)).toBe(expected);
});
        `,
        impact: 'high',
        effort: 'minimal'
      };
    }

    // Error handling improvement
    if (failure.scenario.includes('error') || failure.scenario.includes('crash')) {
      return {
        issue: 'missing error state testing',
        enhancement: 'Add comprehensive error handling tests',
        beforeCode: `
// Missing error tests
test('should load preview', () => {
  // only happy path tested
});
        `,
        afterCode: `
// Comprehensive error testing
test('should handle network errors', async () => {
  api.fetchPreview.mockRejectedValue(new Error('Network'));
  render(<Preview url="test" />);
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});

test('should handle malformed URLs', () => {
  expect(() => parseURL('not-a-url')).not.toThrow();
});
        `,
        impact: 'high',
        effort: 'moderate'
      };
    }

    return null;
  }

  /**
   * Get pattern recommendations for given scenario
   */
  public getRecommendations(scenario: string): TDDPattern[] {
    const recommendations: TDDPattern[] = [];

    // URL-related scenarios
    if (scenario.includes('url') || scenario.includes('link') || scenario.includes('www')) {
      const urlPattern = this.patterns.get('url-parsing-tdd');
      if (urlPattern) recommendations.push(urlPattern);
    }

    // Component testing scenarios
    if (scenario.includes('component') || scenario.includes('render') || scenario.includes('preview')) {
      const componentPattern = this.patterns.get('preview-component-tdd');
      if (componentPattern) recommendations.push(componentPattern);
    }

    // Visual testing scenarios
    if (scenario.includes('visual') || scenario.includes('screenshot') || scenario.includes('appearance')) {
      const visualPattern = this.patterns.get('visual-regression-tdd');
      if (visualPattern) recommendations.push(visualPattern);
    }

    return recommendations.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Get test case suggestions for specific failure
   */
  public getTestSuggestions(failure: string): string[] {
    const suggestions: string[] = [];

    if (failure.includes('www') || failure.includes('prefix')) {
      suggestions.push(
        'test("should display clean hostname without www", () => { expect(getDisplayText("https://www.example.com")).toBe("example.com"); });',
        'test("should not add www to URLs that don\'t have it", () => { expect(parseURL("https://example.com").hasWWW).toBe(false); });',
        'test("should preserve www when originally present", () => { expect(parseURL("https://www.example.com").hasWWW).toBe(true); });'
      );
    }

    if (failure.includes('error') || failure.includes('crash')) {
      suggestions.push(
        'test("should handle invalid URLs gracefully", () => { expect(() => parseURL("invalid")).not.toThrow(); });',
        'test("should show error state on network failure", async () => { /* mock network error and test error UI */ });',
        'test("should recover from errors", async () => { /* test error recovery logic */ });'
      );
    }

    if (failure.includes('loading') || failure.includes('state')) {
      suggestions.push(
        'test("should show loading state initially", () => { /* test loading UI */ });',
        'test("should hide loading state when data loads", async () => { /* test loading -> loaded transition */ });',
        'test("should handle concurrent state updates", async () => { /* test race conditions */ });'
      );
    }

    return suggestions;
  }

  /**
   * Update overall metrics
   */
  private updateMetrics() {
    const patterns = Array.from(this.patterns.values());
    
    this.metrics.totalTests = patterns.reduce((sum, p) => sum + (p.failureRate + p.successRate), 0);
    
    const avgSuccessRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
    this.metrics.passRate = avgSuccessRate;

    // Calculate pattern effectiveness
    this.metrics.patternEffectiveness = {};
    patterns.forEach(pattern => {
      this.metrics.patternEffectiveness[pattern.name] = pattern.successRate;
    });

    // Count failure types
    this.metrics.commonFailureTypes = {};
    patterns.forEach(pattern => {
      pattern.commonFailures.forEach(failure => {
        const key = failure.rootCause || 'unknown';
        this.metrics.commonFailureTypes[key] = (this.metrics.commonFailureTypes[key] || 0) + failure.frequency;
      });
    });

    // Generate improvement suggestions
    this.metrics.improvementSuggestions = this.generateTopSuggestions();
  }

  /**
   * Generate top improvement suggestions
   */
  private generateTopSuggestions(): string[] {
    const suggestions: string[] = [];

    // Based on common failure types
    const sortedFailures = Object.entries(this.metrics.commonFailureTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    sortedFailures.forEach(([failureType, frequency]) => {
      if (failureType.includes('www')) {
        suggestions.push(`Improve www prefix handling - found in ${frequency} cases`);
      }
      if (failureType.includes('error')) {
        suggestions.push(`Add better error handling tests - ${frequency} error cases identified`);
      }
      if (failureType.includes('state')) {
        suggestions.push(`Improve component state testing - ${frequency} state-related issues`);
      }
    });

    return suggestions;
  }

  /**
   * Export TDD patterns for neural training
   */
  public exportForTraining(): any {
    return {
      patterns: Array.from(this.patterns.values()),
      metrics: this.metrics,
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  /**
   * Get current metrics
   */
  public getMetrics(): TDDMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all patterns
   */
  public getAllPatterns(): TDDPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern by ID
   */
  public getPattern(id: string): TDDPattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Clear old patterns for memory management
   */
  public cleanup(olderThan: number = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cutoff = Date.now() - olderThan;
    
    for (const [id, pattern] of this.patterns) {
      if (pattern.lastUpdated < cutoff) {
        this.patterns.delete(id);
      }
    }

    this.updateMetrics();
  }
}

// Export singleton instance
export const tddDatabase = new TDDEnhancementDatabase();