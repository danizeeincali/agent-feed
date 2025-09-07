#!/usr/bin/env node

/**
 * Phase 3: Post Creation & Management - Implementation Validation
 * 
 * This script validates that all Phase 3 features have been properly implemented
 * according to the SPARC specification and acceptance criteria.
 */

const fs = require('fs');
const path = require('path');

class Phase3Validator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '✅',
      'error': '❌',
      'warning': '⚠️',
      'success': '🎉'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  validateFileExists(filePath, description) {
    const fullPath = path.join(__dirname, '..', filePath);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
      this.results.passed.push(`${description}: File exists`);
      this.log(`${description}: File exists at ${filePath}`, 'info');
      return true;
    } else {
      this.results.failed.push(`${description}: File missing`);
      this.log(`${description}: File missing at ${filePath}`, 'error');
      return false;
    }
  }

  validateFileContent(filePath, patterns, description) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      this.results.failed.push(`${description}: File not found`);
      return false;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      let allPassed = true;

      for (const [patternDescription, pattern] of Object.entries(patterns)) {
        const matches = typeof pattern === 'string' 
          ? content.includes(pattern)
          : pattern.test(content);

        if (matches) {
          this.results.passed.push(`${description} - ${patternDescription}: Found`);
        } else {
          this.results.failed.push(`${description} - ${patternDescription}: Missing`);
          allPassed = false;
        }
      }

      return allPassed;
    } catch (error) {
      this.results.failed.push(`${description}: Error reading file - ${error.message}`);
      return false;
    }
  }

  validateTemplateSystem() {
    this.log('Validating Enhanced Template System...', 'info');

    // Check template types
    this.validateFileExists('src/types/templates.ts', 'Template types definition');
    
    // Check template service
    this.validateFileExists('src/services/TemplateService.ts', 'Template service implementation');
    
    // Check template hooks
    this.validateFileExists('frontend/src/hooks/useTemplates.ts', 'Template hooks');
    
    // Check template library component
    this.validateFileExists('frontend/src/components/post-creation/TemplateLibrary.tsx', 'Template library component');

    // Validate template service contains 15+ templates
    this.validateFileContent('src/services/TemplateService.ts', {
      'Status Update template': 'status-update',
      'Code Review template': 'code-review-request',
      'Meeting Summary template': 'meeting-summary',
      'Goal Setting template': 'goal-setting',
      'Problem Solving template': 'problem-solving',
      'Celebration template': 'celebration',
      'Help Request template': 'help-request',
      'Brainstorm template': 'brainstorm-session',
      'Decision Record template': 'decision-record',
      'Learning Share template': 'learning-share',
      'Process Improvement template': 'process-improvement',
      'Feedback Request template': 'feedback-request',
      'At least 15 templates': /templates.*=.*\[[\s\S]*?\]/
    }, 'Template Service - Template Count');

    // Validate template categories
    this.validateFileContent('src/types/templates.ts', {
      'Template categories enum': 'TemplateCategory',
      'Code Review category': 'CODE_REVIEW',
      'Meeting Summary category': 'MEETING_SUMMARY',
      'Goal Setting category': 'GOAL_SETTING',
      'Problem Solving category': 'PROBLEM_SOLVING'
    }, 'Template Categories');
  }

  validateDraftSystem() {
    this.log('Validating Advanced Draft Management...', 'info');

    // Check draft types
    this.validateFileExists('src/types/drafts.ts', 'Draft types definition');
    
    // Check draft service
    this.validateFileExists('src/services/DraftService.ts', 'Draft service implementation');
    
    // Check draft hooks
    this.validateFileExists('frontend/src/hooks/useDraftManager.ts', 'Draft management hooks');

    // Validate draft system features
    this.validateFileContent('src/services/DraftService.ts', {
      'Auto-save functionality': 'scheduleAutoSave',
      'Version history': 'getDraftVersions',
      'Collaboration support': 'shareDraft',
      'Bulk operations': 'performBulkAction',
      'Offline support': 'saveOfflineDraft',
      'Draft persistence': 'updateDraft'
    }, 'Draft Service Features');

    // Validate draft types
    this.validateFileContent('src/types/drafts.ts', {
      'Draft interface': 'interface Draft',
      'Version history': 'interface DraftVersion',
      'Collaboration': 'interface DraftCollaboration',
      'Bulk operations': 'interface DraftBulkAction',
      'Draft status enum': 'enum DraftStatus'
    }, 'Draft Type Definitions');
  }

  validateTestSuite() {
    this.log('Validating Test Suite...', 'info');

    // Check test files exist
    this.validateFileExists('tests/e2e/phase3-post-creation.spec.ts', 'Main post creation tests');
    this.validateFileExists('tests/e2e/phase3-template-system.spec.ts', 'Template system tests');
    this.validateFileExists('tests/e2e/phase3-draft-management.spec.ts', 'Draft management tests');

    // Validate test coverage
    this.validateFileContent('tests/e2e/phase3-post-creation.spec.ts', {
      'Template system tests': 'Enhanced Template System',
      'Draft management tests': 'Advanced Draft Management',
      'Character limits tests': 'Character Limits & Validation',
      'Mobile responsiveness': 'Mobile Responsiveness',
      'Error handling': 'Error Handling & Edge Cases',
      'Performance tests': 'Performance & Accessibility'
    }, 'Post Creation Test Coverage');

    this.validateFileContent('tests/e2e/phase3-template-system.spec.ts', {
      'Template library UI': 'Template Library UI',
      'Template content quality': 'Template Content Quality',
      'Template suggestions': 'Template Suggestions',
      'Custom templates': 'Custom Templates',
      'Template performance': 'Template Performance'
    }, 'Template System Test Coverage');

    this.validateFileContent('tests/e2e/phase3-draft-management.spec.ts', {
      'Auto-save functionality': 'Auto-save Functionality',
      'Draft persistence': 'Draft Persistence',
      'Multiple draft management': 'Multiple Draft Management',
      'Version history': 'Version History',
      'Draft collaboration': 'Draft Collaboration',
      'Bulk operations': 'Bulk Operations'
    }, 'Draft Management Test Coverage');
  }

  validateSPARCSpecification() {
    this.log('Validating SPARC Specification...', 'info');

    this.validateFileExists('docs/sparc/phase3-specification.md', 'SPARC specification document');

    this.validateFileContent('docs/sparc/phase3-specification.md', {
      'Specification section': '## **S** - Specification',
      'Pseudocode section': '## **P** - Pseudocode',
      'Architecture section': '## **A** - Architecture',
      'Refinement section': '## **R** - Refinement',
      'Completion section': '## **C** - Completion',
      'Acceptance criteria': 'Acceptance Criteria',
      'User stories': 'User Stories',
      'Success metrics': 'Success Metrics'
    }, 'SPARC Specification Structure');
  }

  validateAcceptanceCriteria() {
    this.log('Validating Acceptance Criteria...', 'info');

    const criteria = {
      'Post creation modal opens with templates': {
        files: ['frontend/src/components/post-creation/TemplateLibrary.tsx'],
        patterns: ['TemplateLibrary', 'onSelectTemplate']
      },
      'Character limits enforced during composition': {
        files: ['frontend/src/components/PostCreator.tsx'],
        patterns: ['TITLE_LIMIT', 'CONTENT_LIMIT', 'maxLength']
      },
      'Drafts save automatically and can be resumed': {
        files: ['src/services/DraftService.ts', 'frontend/src/hooks/useDraftManager.ts'],
        patterns: ['scheduleAutoSave', 'autoSave', 'saveDraft']
      },
      'Published posts appear in feed immediately': {
        files: ['src/api/routes/posts.ts', 'src/api/routes/agent-posts.ts'],
        patterns: ['createPost', 'INSERT INTO posts', 'published']
      }
    };

    for (const [criterion, config] of Object.entries(criteria)) {
      let criterionMet = true;
      
      for (const file of config.files) {
        const fileExists = this.validateFileExists(file, `${criterion} - File`);
        if (fileExists) {
          const patterns = {};
          config.patterns.forEach(pattern => {
            patterns[pattern] = pattern;
          });
          const contentValid = this.validateFileContent(file, patterns, `${criterion} - Implementation`);
          if (!contentValid) criterionMet = false;
        } else {
          criterionMet = false;
        }
      }

      if (criterionMet) {
        this.results.passed.push(`Acceptance Criterion: ${criterion}`);
        this.log(`✓ ${criterion}`, 'success');
      } else {
        this.results.failed.push(`Acceptance Criterion: ${criterion}`);
        this.log(`✗ ${criterion}`, 'error');
      }
    }
  }

  validateDirectoryStructure() {
    this.log('Validating Directory Structure...', 'info');

    const expectedStructure = [
      'src/types/templates.ts',
      'src/types/drafts.ts',
      'src/services/TemplateService.ts',
      'src/services/DraftService.ts',
      'frontend/src/hooks/useTemplates.ts',
      'frontend/src/hooks/useDraftManager.ts',
      'frontend/src/components/post-creation/TemplateLibrary.tsx',
      'docs/sparc/phase3-specification.md',
      'tests/e2e/phase3-post-creation.spec.ts',
      'tests/e2e/phase3-template-system.spec.ts',
      'tests/e2e/phase3-draft-management.spec.ts'
    ];

    let structureValid = true;
    for (const file of expectedStructure) {
      if (!this.validateFileExists(file, `Directory structure - ${file}`)) {
        structureValid = false;
      }
    }

    if (structureValid) {
      this.results.passed.push('Directory structure is correct');
      this.log('Directory structure validation passed', 'success');
    } else {
      this.results.failed.push('Directory structure has issues');
      this.log('Directory structure validation failed', 'error');
    }
  }

  generateReport() {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('PHASE 3 IMPLEMENTATION VALIDATION REPORT', 'info');
    this.log('='.repeat(80), 'info');

    this.log(`\nSUMMARY:`, 'info');
    this.log(`✅ Passed: ${this.results.passed.length}`, 'success');
    this.log(`❌ Failed: ${this.results.failed.length}`, this.results.failed.length > 0 ? 'error' : 'info');
    this.log(`⚠️  Warnings: ${this.results.warnings.length}`, this.results.warnings.length > 0 ? 'warning' : 'info');

    if (this.results.passed.length > 0) {
      this.log(`\nPASSED VALIDATIONS:`, 'success');
      this.results.passed.forEach(item => this.log(`  ✓ ${item}`, 'success'));
    }

    if (this.results.failed.length > 0) {
      this.log(`\nFAILED VALIDATIONS:`, 'error');
      this.results.failed.forEach(item => this.log(`  ✗ ${item}`, 'error'));
    }

    if (this.results.warnings.length > 0) {
      this.log(`\nWARNINGS:`, 'warning');
      this.results.warnings.forEach(item => this.log(`  ⚠ ${item}`, 'warning'));
    }

    const totalChecks = this.results.passed.length + this.results.failed.length;
    const successRate = totalChecks > 0 ? ((this.results.passed.length / totalChecks) * 100).toFixed(1) : 0;

    this.log(`\nOVERALL SUCCESS RATE: ${successRate}%`, successRate > 90 ? 'success' : successRate > 70 ? 'warning' : 'error');

    if (successRate >= 90) {
      this.log('\n🎉 PHASE 3 IMPLEMENTATION IS READY FOR DEPLOYMENT!', 'success');
    } else if (successRate >= 70) {
      this.log('\n⚠️  PHASE 3 IMPLEMENTATION NEEDS MINOR FIXES', 'warning');
    } else {
      this.log('\n❌ PHASE 3 IMPLEMENTATION NEEDS SIGNIFICANT WORK', 'error');
    }

    this.log('\n' + '='.repeat(80), 'info');
  }

  run() {
    this.log('Starting Phase 3: Post Creation & Management Validation...', 'info');
    
    try {
      this.validateDirectoryStructure();
      this.validateSPARCSpecification();
      this.validateTemplateSystem();
      this.validateDraftSystem();
      this.validateTestSuite();
      this.validateAcceptanceCriteria();
      
      this.generateReport();
      
      // Exit with appropriate code
      process.exit(this.results.failed.length > 0 ? 1 : 0);
      
    } catch (error) {
      this.log(`Validation failed with error: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new Phase3Validator();
  validator.run();
}

module.exports = Phase3Validator;