/**
 * Test Suite Manager
 * Manages test suite organization, categorization, and discovery
 */

import { EventEmitter } from 'events';
import {
  TestSuite,
  TestCase,
  TestCategory,
  TestPriority
} from '../types';

export class TestSuiteManager extends EventEmitter {
  private suites = new Map<string, TestSuite>();
  private categoryIndex = new Map<string, Set<string>>();
  private tagIndex = new Map<string, Set<string>>();
  private priorityIndex = new Map<TestPriority, Set<string>>();

  constructor() {
    super();
  }

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    // Load existing suites from storage if available
    await this.loadExistingSuites();
    this.emit('initialized');
  }

  /**
   * Register a test suite
   */
  async registerSuite(suite: TestSuite): Promise<void> {
    // Validate suite
    this.validateSuite(suite);

    // Store suite
    this.suites.set(suite.id, suite);

    // Update indexes
    this.updateIndexes(suite);

    // Persist suite
    await this.persistSuite(suite);

    this.emit('suiteRegistered', suite);
  }

  /**
   * Get all registered suites
   */
  async getAllSuites(): Promise<TestSuite[]> {
    return Array.from(this.suites.values());
  }

  /**
   * Get suite by ID
   */
  async getSuiteById(id: string): Promise<TestSuite | undefined> {
    return this.suites.get(id);
  }

  /**
   * Get suites by category
   */
  async getSuitesByCategory(category: string): Promise<TestSuite[]> {
    const suiteIds = this.categoryIndex.get(category) || new Set();
    return Array.from(suiteIds)
      .map(id => this.suites.get(id))
      .filter((suite): suite is TestSuite => suite !== undefined);
  }

  /**
   * Get suites by tags
   */
  async getSuitesByTags(tags: string[]): Promise<TestSuite[]> {
    if (tags.length === 0) return [];

    // Find suites that have all specified tags
    let matchingSuiteIds: Set<string> | undefined;

    for (const tag of tags) {
      const suiteIds = this.tagIndex.get(tag);
      if (!suiteIds) return []; // No suites have this tag

      if (!matchingSuiteIds) {
        matchingSuiteIds = new Set(suiteIds);
      } else {
        matchingSuiteIds = new Set([...matchingSuiteIds].filter(id => suiteIds.has(id)));
      }

      if (matchingSuiteIds.size === 0) break;
    }

    if (!matchingSuiteIds) return [];

    return Array.from(matchingSuiteIds)
      .map(id => this.suites.get(id))
      .filter((suite): suite is TestSuite => suite !== undefined);
  }

  /**
   * Get suites by priority
   */
  async getSuitesByPriority(priority: TestPriority): Promise<TestSuite[]> {
    const suiteIds = this.priorityIndex.get(priority) || new Set();
    return Array.from(suiteIds)
      .map(id => this.suites.get(id))
      .filter((suite): suite is TestSuite => suite !== undefined);
  }

  /**
   * Search suites by name or description
   */
  async searchSuites(query: string): Promise<TestSuite[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.suites.values()).filter(suite =>
      suite.name.toLowerCase().includes(lowerQuery) ||
      suite.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get suite statistics
   */
  async getSuiteStatistics(): Promise<{
    totalSuites: number;
    totalTestCases: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    mostUsedTags: Array<{ tag: string; count: number }>;
  }> {
    const suites = Array.from(this.suites.values());
    const totalTestCases = suites.reduce((sum, suite) => sum + suite.testCases.length, 0);

    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const tagCounts = new Map<string, number>();

    for (const suite of suites) {
      // Count by category
      byCategory[suite.category] = (byCategory[suite.category] || 0) + 1;

      // Count by priority and tags from test cases
      for (const testCase of suite.testCases) {
        byPriority[testCase.priority] = (byPriority[testCase.priority] || 0) + 1;
        
        for (const tag of testCase.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    const mostUsedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalSuites: suites.length,
      totalTestCases,
      byCategory,
      byPriority,
      mostUsedTags
    };
  }

  /**
   * Validate dependencies between test cases
   */
  async validateDependencies(): Promise<{
    valid: boolean;
    circularDependencies: string[];
    missingDependencies: string[];
  }> {
    const allTestIds = new Set<string>();
    const dependencies = new Map<string, string[]>();

    // Collect all test IDs and dependencies
    for (const suite of this.suites.values()) {
      for (const testCase of suite.testCases) {
        allTestIds.add(testCase.id);
        if (testCase.dependencies) {
          dependencies.set(testCase.id, testCase.dependencies);
        }
      }
    }

    // Check for missing dependencies
    const missingDependencies: string[] = [];
    for (const [testId, deps] of dependencies.entries()) {
      for (const dep of deps) {
        if (!allTestIds.has(dep)) {
          missingDependencies.push(`${testId} -> ${dep}`);
        }
      }
    }

    // Check for circular dependencies
    const circularDependencies = this.detectCircularDependencies(dependencies);

    return {
      valid: missingDependencies.length === 0 && circularDependencies.length === 0,
      circularDependencies,
      missingDependencies
    };
  }

  /**
   * Remove a suite
   */
  async removeSuite(suiteId: string): Promise<boolean> {
    const suite = this.suites.get(suiteId);
    if (!suite) return false;

    // Remove from indexes
    this.removeFromIndexes(suite);

    // Remove from storage
    this.suites.delete(suiteId);

    // Persist removal
    await this.removePersistentSuite(suiteId);

    this.emit('suiteRemoved', suiteId);
    return true;
  }

  /**
   * Update a suite
   */
  async updateSuite(suite: TestSuite): Promise<void> {
    const existing = this.suites.get(suite.id);
    if (existing) {
      this.removeFromIndexes(existing);
    }

    await this.registerSuite(suite);
    this.emit('suiteUpdated', suite);
  }

  // Private methods
  private validateSuite(suite: TestSuite): void {
    if (!suite.id || !suite.name) {
      throw new Error('Suite must have id and name');
    }

    if (this.suites.has(suite.id)) {
      throw new Error(`Suite with id ${suite.id} already exists`);
    }

    // Validate test cases
    const testIds = new Set<string>();
    for (const testCase of suite.testCases) {
      if (!testCase.id || !testCase.name) {
        throw new Error('Test case must have id and name');
      }

      if (testIds.has(testCase.id)) {
        throw new Error(`Duplicate test case id: ${testCase.id}`);
      }
      testIds.add(testCase.id);
    }
  }

  private updateIndexes(suite: TestSuite): void {
    // Update category index
    if (!this.categoryIndex.has(suite.category)) {
      this.categoryIndex.set(suite.category, new Set());
    }
    this.categoryIndex.get(suite.category)!.add(suite.id);

    // Update tag and priority indexes from test cases
    for (const testCase of suite.testCases) {
      // Priority index
      if (!this.priorityIndex.has(testCase.priority)) {
        this.priorityIndex.set(testCase.priority, new Set());
      }
      this.priorityIndex.get(testCase.priority)!.add(suite.id);

      // Tag index
      for (const tag of testCase.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(suite.id);
      }
    }
  }

  private removeFromIndexes(suite: TestSuite): void {
    // Remove from category index
    const categorySet = this.categoryIndex.get(suite.category);
    if (categorySet) {
      categorySet.delete(suite.id);
      if (categorySet.size === 0) {
        this.categoryIndex.delete(suite.category);
      }
    }

    // Remove from tag and priority indexes
    for (const testCase of suite.testCases) {
      // Priority index
      const prioritySet = this.priorityIndex.get(testCase.priority);
      if (prioritySet) {
        prioritySet.delete(suite.id);
        if (prioritySet.size === 0) {
          this.priorityIndex.delete(testCase.priority);
        }
      }

      // Tag index
      for (const tag of testCase.tags) {
        const tagSet = this.tagIndex.get(tag);
        if (tagSet) {
          tagSet.delete(suite.id);
          if (tagSet.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }
  }

  private detectCircularDependencies(dependencies: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps: string[] = [];

    const dfs = (testId: string, path: string[]): void => {
      if (recursionStack.has(testId)) {
        const cycleStart = path.indexOf(testId);
        const cycle = [...path.slice(cycleStart), testId];
        circularDeps.push(cycle.join(' -> '));
        return;
      }

      if (visited.has(testId)) return;

      visited.add(testId);
      recursionStack.add(testId);

      const deps = dependencies.get(testId) || [];
      for (const dep of deps) {
        dfs(dep, [...path, testId]);
      }

      recursionStack.delete(testId);
    };

    for (const testId of dependencies.keys()) {
      if (!visited.has(testId)) {
        dfs(testId, []);
      }
    }

    return circularDeps;
  }

  private async loadExistingSuites(): Promise<void> {
    // Implementation would load from persistent storage
    // For now, this is a placeholder
  }

  private async persistSuite(suite: TestSuite): Promise<void> {
    // Implementation would persist to storage
    // For now, this is a placeholder
  }

  private async removePersistentSuite(suiteId: string): Promise<void> {
    // Implementation would remove from persistent storage
    // For now, this is a placeholder
  }
}