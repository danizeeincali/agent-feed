/**
 * London School Test Sequencer
 * Orders tests to follow London School TDD methodology
 */

const path = require('path');

class LondonSchoolTestSequencer {
  constructor() {
    // London School TDD test execution priority
    this.testPriority = {
      // 1. Contracts first - define expected behaviors
      contracts: 1,
      // 2. Unit tests - mock-driven component testing
      unit: 2,
      // 3. Integration tests - component interactions
      integration: 3,
      // 4. End-to-end tests - complete user journeys
      e2e: 4,
      // 5. Performance and regression tests
      performance: 5
    };
    
    this.behaviorPriority = {
      // Within each category, prioritize by behavior complexity
      'mock-creation': 1,
      'contract-verification': 2,
      'interaction-testing': 3,
      'behavior-validation': 4,
      'error-handling': 5,
      'edge-cases': 6
    };
  }

  sort(tests) {
    return tests.sort((a, b) => {
      const aCategory = this.getTestCategory(a.path);
      const bCategory = this.getTestCategory(b.path);
      
      // First, sort by category priority
      const aCategoryPriority = this.testPriority[aCategory] || 999;
      const bCategoryPriority = this.testPriority[bCategory] || 999;
      
      if (aCategoryPriority !== bCategoryPriority) {
        return aCategoryPriority - bCategoryPriority;
      }
      
      // Within same category, sort by behavior priority
      const aBehaviorPriority = this.getBehaviorPriority(a.path);
      const bBehaviorPriority = this.getBehaviorPriority(b.path);
      
      if (aBehaviorPriority !== bBehaviorPriority) {
        return aBehaviorPriority - bBehaviorPriority;
      }
      
      // Finally, sort alphabetically
      return a.path.localeCompare(b.path);
    });
  }

  getTestCategory(testPath) {
    const normalizedPath = path.normalize(testPath);
    
    if (normalizedPath.includes('/contracts/')) {
      return 'contracts';
    }
    if (normalizedPath.includes('/unit/')) {
      return 'unit';
    }
    if (normalizedPath.includes('/integration/')) {
      return 'integration';
    }
    if (normalizedPath.includes('/e2e/')) {
      return 'e2e';
    }
    if (normalizedPath.includes('/performance/')) {
      return 'performance';
    }
    
    // Default to unit tests
    return 'unit';
  }

  getBehaviorPriority(testPath) {
    const fileName = path.basename(testPath).toLowerCase();
    
    // Analyze filename for behavior keywords
    for (const [behavior, priority] of Object.entries(this.behaviorPriority)) {
      if (fileName.includes(behavior)) {
        return priority;
      }
    }
    
    // Analyze test content patterns
    if (fileName.includes('mock')) return this.behaviorPriority['mock-creation'];
    if (fileName.includes('contract')) return this.behaviorPriority['contract-verification'];
    if (fileName.includes('interaction')) return this.behaviorPriority['interaction-testing'];
    if (fileName.includes('behavior')) return this.behaviorPriority['behavior-validation'];
    if (fileName.includes('error')) return this.behaviorPriority['error-handling'];
    if (fileName.includes('edge')) return this.behaviorPriority['edge-cases'];
    
    // Default priority
    return 999;
  }
}

module.exports = LondonSchoolTestSequencer;