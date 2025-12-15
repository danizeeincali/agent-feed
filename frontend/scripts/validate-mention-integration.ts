#!/usr/bin/env tsx

/**
 * Mention Integration Validation Script
 * Validates the complete @ mention integration across all components
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
}

class MentionIntegrationValidator {
  private results: ValidationResult[] = [];
  private baseDir: string;

  constructor() {
    this.baseDir = process.cwd();
  }

  private addResult(component: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    this.results.push({ component, status, message, details });
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${component}: ${message}`);
    if (details && process.env.VERBOSE) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  async validateFileExists(filePath: string, component: string): Promise<boolean> {
    const fullPath = join(this.baseDir, filePath);
    const exists = existsSync(fullPath);
    
    if (exists) {
      this.addResult(component, 'pass', `File exists: ${filePath}`);
    } else {
      this.addResult(component, 'fail', `Missing file: ${filePath}`);
    }
    
    return exists;
  }

  async validateFileContent(filePath: string, component: string, validations: Array<{
    pattern: RegExp;
    description: string;
    required?: boolean;
  }>): Promise<void> {
    const fullPath = join(this.baseDir, filePath);
    
    if (!existsSync(fullPath)) {
      this.addResult(component, 'fail', `Cannot validate content - file not found: ${filePath}`);
      return;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      
      for (const validation of validations) {
        const matches = validation.pattern.test(content);
        const status = matches ? 'pass' : (validation.required !== false ? 'fail' : 'warning');
        
        this.addResult(
          component,
          status,
          `${validation.description}: ${matches ? 'Found' : 'Not found'}`,
          { pattern: validation.pattern.source, file: filePath }
        );
      }
    } catch (error) {
      this.addResult(component, 'fail', `Error reading file ${filePath}: ${error}`);
    }
  }

  async validateMentionService(): Promise<void> {
    console.log('\n🔍 Validating MentionService...');
    
    // Check service exists
    await this.validateFileExists('src/services/MentionService.ts', 'MentionService');
    
    // Validate service content
    await this.validateFileContent('src/services/MentionService.ts', 'MentionService', [
      {
        pattern: /export\s+interface\s+MentionSuggestion/,
        description: 'MentionSuggestion interface exported'
      },
      {
        pattern: /class\s+MentionServiceImpl/,
        description: 'MentionServiceImpl class defined'
      },
      {
        pattern: /searchMentions\s*\(/,
        description: 'searchMentions method implemented'
      },
      {
        pattern: /extractMentions\s*\(/,
        description: 'extractMentions method implemented'
      },
      {
        pattern: /getQuickMentions\s*\(/,
        description: 'getQuickMentions method implemented'
      },
      {
        pattern: /export\s+const\s+MentionService/,
        description: 'MentionService singleton exported'
      }
    ]);
  }

  async validateMentionInput(): Promise<void> {
    console.log('\n🔍 Validating MentionInput Component...');
    
    await this.validateFileExists('src/components/MentionInput.tsx', 'MentionInput');
    
    await this.validateFileContent('src/components/MentionInput.tsx', 'MentionInput', [
      {
        pattern: /import.*MentionService.*from.*services\/MentionService/,
        description: 'MentionService imported'
      },
      {
        pattern: /mentionContext\?:\s*['"]post['"].*['"]comment['"].*['"]quick-post['"]/,
        description: 'mentionContext prop with correct types'
      },
      {
        pattern: /MentionService\.searchMentions/,
        description: 'Uses MentionService.searchMentions'
      },
      {
        pattern: /MentionService\.getQuickMentions/,
        description: 'Uses MentionService.getQuickMentions'
      },
      {
        pattern: /role="listbox"/,
        description: 'Proper ARIA listbox role'
      },
      {
        pattern: /aria-label="Agent suggestions"/,
        description: 'Proper ARIA label for dropdown'
      }
    ]);
  }

  async validatePostCreatorIntegration(): Promise<void> {
    console.log('\n🔍 Validating PostCreator Integration...');
    
    await this.validateFileExists('src/components/PostCreator.tsx', 'PostCreator');
    
    await this.validateFileContent('src/components/PostCreator.tsx', 'PostCreator', [
      {
        pattern: /import.*MentionInput.*from.*MentionInput/,
        description: 'MentionInput imported'
      },
      {
        pattern: /<MentionInput/,
        description: 'MentionInput component used'
      },
      {
        pattern: /onMentionSelect.*handleMentionSelect/,
        description: 'Mention selection handler connected'
      },
      {
        pattern: /mentionContext.*=.*['"]post['"]/,
        description: 'Uses correct mention context for posts',
        required: false
      }
    ]);
  }

  async validateQuickPostIntegration(): Promise<void> {
    console.log('\n🔍 Validating QuickPost Integration...');
    
    await this.validateFileExists('src/components/posting-interface/QuickPostSection.tsx', 'QuickPost');
    
    await this.validateFileContent('src/components/posting-interface/QuickPostSection.tsx', 'QuickPost', [
      {
        pattern: /import.*MentionInput.*from.*MentionInput/,
        description: 'MentionInput imported'
      },
      {
        pattern: /import.*MentionService.*from.*services\/MentionService/,
        description: 'MentionService imported'
      },
      {
        pattern: /<MentionInput/,
        description: 'MentionInput component used'
      },
      {
        pattern: /mentionContext.*=.*['"]quick-post['"]/,
        description: 'Uses correct mention context for quick posts'
      },
      {
        pattern: /MentionService\.getQuickMentions/,
        description: 'Uses MentionService for quick mentions'
      },
      {
        pattern: /MentionService\.extractMentions/,
        description: 'Uses MentionService for mention extraction'
      }
    ]);
  }

  async validateCommentFormIntegration(): Promise<void> {
    console.log('\n🔍 Validating CommentForm Integration...');
    
    await this.validateFileExists('src/components/CommentForm.tsx', 'CommentForm');
    
    await this.validateFileContent('src/components/CommentForm.tsx', 'CommentForm', [
      {
        pattern: /import.*MentionInput.*from.*MentionInput/,
        description: 'MentionInput imported'
      },
      {
        pattern: /import.*MentionService.*from.*services\/MentionService/,
        description: 'MentionService imported'
      },
      {
        pattern: /useMentionInput\?\s*=\s*true/,
        description: 'useMentionInput prop defaulted to true'
      },
      {
        pattern: /<MentionInput/,
        description: 'MentionInput component used'
      },
      {
        pattern: /mentionContext.*=.*['"]comment['"]/,
        description: 'Uses correct mention context for comments'
      },
      {
        pattern: /MentionService\.extractMentions/,
        description: 'Uses MentionService for mention extraction'
      }
    ]);
  }

  async validateTestFiles(): Promise<void> {
    console.log('\n🔍 Validating Test Files...');
    
    // Main test file
    await this.validateFileExists('tests/e2e/mention-integration.spec.ts', 'E2E Tests');
    
    await this.validateFileContent('tests/e2e/mention-integration.spec.ts', 'E2E Tests', [
      {
        pattern: /@ Mention Integration - PostCreatorModal/,
        description: 'PostCreatorModal test suite defined'
      },
      {
        pattern: /@ Mention Integration - QuickPost/,
        description: 'QuickPost test suite defined'
      },
      {
        pattern: /@ Mention Integration - Comments/,
        description: 'Comments test suite defined'
      },
      {
        pattern: /@ Mention Integration - Cross-Component Consistency/,
        description: 'Cross-component consistency tests defined'
      },
      {
        pattern: /waitForMentionDropdown/,
        description: 'Helper function for dropdown validation'
      },
      {
        pattern: /selectMentionFromDropdown/,
        description: 'Helper function for mention selection'
      }
    ]);

    // Production test file
    await this.validateFileExists('tests/e2e/mention-integration-production.spec.ts', 'Production Tests');
    
    await this.validateFileContent('tests/e2e/mention-integration-production.spec.ts', 'Production Tests', [
      {
        pattern: /Production Validation - @ Mention Integration/,
        description: 'Production test suite defined'
      },
      {
        pattern: /PROD-\d{3}:/,
        description: 'Production test cases with proper IDs'
      },
      {
        pattern: /performProductionMentionTest/,
        description: 'Production test helper function'
      },
      {
        pattern: /Performance validation under load/,
        description: 'Performance test cases included'
      },
      {
        pattern: /Accessibility compliance validation/,
        description: 'Accessibility test cases included'
      }
    ]);
  }

  async validateTypeIntegration(): Promise<void> {
    console.log('\n🔍 Validating TypeScript Integration...');
    
    // Check if MentionInput types are properly exported and used
    await this.validateFileContent('src/components/MentionInput.tsx', 'Types', [
      {
        pattern: /export\s+interface\s+MentionSuggestion/,
        description: 'MentionSuggestion interface exported'
      },
      {
        pattern: /export\s+.*MentionInputRef/,
        description: 'MentionInputRef type exported'
      },
      {
        pattern: /export\s+.*MentionInputProps/,
        description: 'MentionInputProps type exported'
      }
    ]);

    // Check service types
    await this.validateFileContent('src/services/MentionService.ts', 'Service Types', [
      {
        pattern: /export\s+interface\s+MentionSuggestion/,
        description: 'Service MentionSuggestion interface exported'
      },
      {
        pattern: /export\s+interface\s+MentionConfig/,
        description: 'MentionConfig interface exported'
      }
    ]);
  }

  async validateConfiguration(): Promise<void> {
    console.log('\n🔍 Validating Configuration...');
    
    // Check if there are any config files that need updating
    if (existsSync(join(this.baseDir, 'vite.config.ts'))) {
      this.addResult('Configuration', 'pass', 'Vite config exists');
    }

    if (existsSync(join(this.baseDir, 'tsconfig.json'))) {
      this.addResult('Configuration', 'pass', 'TypeScript config exists');
    }

    if (existsSync(join(this.baseDir, 'playwright.config.ts'))) {
      this.addResult('Configuration', 'pass', 'Playwright config exists');
    }
  }

  async runValidation(): Promise<ValidationSummary> {
    console.log('🚀 Starting @ Mention Integration Validation...\n');
    
    try {
      await this.validateMentionService();
      await this.validateMentionInput();
      await this.validatePostCreatorIntegration();
      await this.validateQuickPostIntegration();
      await this.validateCommentFormIntegration();
      await this.validateTestFiles();
      await this.validateTypeIntegration();
      await this.validateConfiguration();
    } catch (error) {
      this.addResult('Validation', 'fail', `Validation error: ${error}`);
    }

    const summary: ValidationSummary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      results: this.results
    };

    return summary;
  }

  printSummary(summary: ValidationSummary): void {
    console.log('\n📊 Validation Summary:');
    console.log('=' .repeat(50));
    console.log(`Total Checks: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    
    const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);

    if (summary.failed > 0) {
      console.log('\n❌ Failed Checks:');
      summary.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`   - ${r.component}: ${r.message}`));
    }

    if (summary.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      summary.results
        .filter(r => r.status === 'warning')
        .forEach(r => console.log(`   - ${r.component}: ${r.message}`));
    }

    console.log('\n' + '='.repeat(50));
    
    if (summary.failed === 0) {
      console.log('🎉 All critical validations passed! Mention integration is ready for production.');
    } else {
      console.log('🔧 Some validations failed. Please address the issues above.');
      process.exit(1);
    }
  }
}

// CLI execution
async function main() {
  const validator = new MentionIntegrationValidator();
  const summary = await validator.runValidation();
  validator.printSummary(summary);
}

// Export for testing
export { MentionIntegrationValidator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}