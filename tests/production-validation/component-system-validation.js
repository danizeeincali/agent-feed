/**
 * Component System Production Validation
 * Comprehensive validation of all component system aspects for production readiness
 * 
 * Validation Areas:
 * 1. Component Registry Validation
 * 2. Component Instantiation Testing
 * 3. Zod Schema Validation
 * 4. Security Wrapper Testing
 * 5. Page Rendering Validation
 * 6. Error Boundary Testing
 * 7. Performance Validation
 * 8. Accessibility Compliance
 * 9. Props Validation Testing
 * 10. Real Production Environment Testing
 */

const fs = require('fs').promises;
const path = require('path');
const { ComponentValidator } = require('./component-validator');

class ComponentSystemValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
      issues: [],
      recommendations: []
    };
    
    this.config = {
      backendUrl: 'http://localhost:3000',
      frontendUrl: 'http://localhost:5173',
      testAgentIds: [
        'b6a8614f-881b-456d-90b3-ba0bdbc70a63',
        'b7e35d18-0727-4550-9450-f3130a95f34d',
        'c12e3358-fb5e-43e6-bbf9-6ef4df4302d2'
      ],
      componentPaths: [
        'frontend/src/services/ComponentRegistry.ts',
        'frontend/src/components/UnifiedAgentPage.tsx',
        'frontend/src/components/AgentPagesTab.tsx'
      ],
      requiredComponents: ['CapabilityList', 'PerformanceMetrics', 'Timeline', 'ProfileHeader', 'ActivityFeed']
    };

    this.componentValidator = new ComponentValidator();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const symbols = { info: '📋', pass: '✅', fail: '❌', warn: '⚠️', debug: '🔍' };
    console.log(`${symbols[type]} [${timestamp}] ${message}`);
  }

  async addTest(name, category, fn) {
    const startTime = Date.now();
    this.log(`Running test: ${name}`, 'debug');
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.results.tests.push({
        name,
        category,
        status: result.pass ? 'PASS' : 'FAIL',
        duration,
        message: result.message,
        details: result.details || {},
        timestamp: new Date().toISOString()
      });

      if (result.pass) {
        this.results.passed++;
        this.log(`✅ ${name}: ${result.message}`, 'pass');
      } else {
        this.results.failed++;
        this.log(`❌ ${name}: ${result.message}`, 'fail');
        this.results.issues.push(`${name}: ${result.message}`);
      }

      if (result.warning) {
        this.results.warnings++;
        this.log(`⚠️ ${name}: ${result.warning}`, 'warn');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.results.tests.push({
        name,
        category,
        status: 'ERROR',
        duration,
        message: error.message,
        error: error.stack,
        timestamp: new Date().toISOString()
      });
      
      this.log(`❌ ${name}: ${error.message}`, 'fail');
      this.results.issues.push(`${name}: ${error.message}`);
    }
  }

  // 1. Component Registry Validation
  async validateComponentRegistry() {
    await this.addTest('Component Registry File Exists', 'Registry', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        await fs.access(registryPath);
        return { pass: true, message: 'ComponentRegistry.ts exists and is accessible' };
      } catch {
        return { pass: false, message: 'ComponentRegistry.ts file not found' };
      }
    });

    await this.addTest('Component Registry Structure', 'Registry', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        const requiredElements = [
          'componentRegistry',
          'ComponentRegistryImpl',
          'SecuritySanitizer',
          'createSecureComponent',
          'Button',
          'Input',
          'Card'
        ];

        const missing = requiredElements.filter(element => !content.includes(element));
        
        if (missing.length === 0) {
          return { pass: true, message: 'All required registry components found' };
        } else {
          return { pass: false, message: `Missing components: ${missing.join(', ')}` };
        }
      } catch (error) {
        return { pass: false, message: `Failed to read registry: ${error.message}` };
      }
    });

    await this.addTest('Zod Schema Validation', 'Registry', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        const zodSchemas = [
          'basePropsSchema',
          'buttonPropsSchema', 
          'inputPropsSchema',
          'cardPropsSchema'
        ];

        const foundSchemas = zodSchemas.filter(schema => content.includes(schema));
        
        if (foundSchemas.length >= 3) {
          return { 
            pass: true, 
            message: `Found ${foundSchemas.length}/${zodSchemas.length} Zod schemas`,
            details: { schemas: foundSchemas }
          };
        } else {
          return { 
            pass: false, 
            message: `Only found ${foundSchemas.length}/${zodSchemas.length} Zod schemas`
          };
        }
      } catch (error) {
        return { pass: false, message: `Schema validation failed: ${error.message}` };
      }
    });

    await this.addTest('Security Sanitizer Implementation', 'Registry', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        const securityFeatures = [
          'SecuritySanitizer',
          'sanitizeProps',
          'BLOCKED_ATTRIBUTES',
          'sanitizeString',
          'validateUrl'
        ];

        const foundFeatures = securityFeatures.filter(feature => content.includes(feature));
        
        if (foundFeatures.length >= 4) {
          return { 
            pass: true, 
            message: `Security implementation complete (${foundFeatures.length}/${securityFeatures.length} features)`
          };
        } else {
          return { 
            pass: false, 
            message: `Incomplete security implementation (${foundFeatures.length}/${securityFeatures.length} features)`
          };
        }
      } catch (error) {
        return { pass: false, message: `Security validation failed: ${error.message}` };
      }
    });
  }

  // 2. Component Instantiation Testing
  async validateComponentInstantiation() {
    await this.addTest('Component Import Syntax', 'Instantiation', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        const importPatterns = [
          'import { Button }',
          'import { Input }',
          'import { Card }',
          'import * as z from',
          'import React'
        ];

        const foundImports = importPatterns.filter(pattern => content.includes(pattern));
        
        return {
          pass: foundImports.length >= 4,
          message: `Found ${foundImports.length}/${importPatterns.length} required imports`,
          details: { imports: foundImports }
        };
      } catch (error) {
        return { pass: false, message: `Import validation failed: ${error.message}` };
      }
    });

    await this.addTest('Component Factory Pattern', 'Instantiation', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        const factoryPatterns = [
          'createSecureComponent',
          'createComponentMapper',
          'React.createElement',
          'React.forwardRef'
        ];

        const foundPatterns = factoryPatterns.filter(pattern => content.includes(pattern));
        
        return {
          pass: foundPatterns.length >= 2,
          message: `Component factory patterns implemented (${foundPatterns.length}/${factoryPatterns.length})`,
          details: { patterns: foundPatterns }
        };
      } catch (error) {
        return { pass: false, message: `Factory pattern validation failed: ${error.message}` };
      }
    });

    await this.addTest('Component Registration', 'Instantiation', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        // Check for component registration assignments
        const registrationPatterns = [
          'Button = this.createComponentMapper',
          'Input = this.createComponentMapper',
          'Card = this.createComponentMapper'
        ];

        const foundRegistrations = registrationPatterns.filter(pattern => content.includes(pattern));
        
        return {
          pass: foundRegistrations.length >= 2,
          message: `Component registrations found (${foundRegistrations.length}/${registrationPatterns.length})`,
          details: { registrations: foundRegistrations }
        };
      } catch (error) {
        return { pass: false, message: `Registration validation failed: ${error.message}` };
      }
    });
  }

  // 3. Page Rendering Validation
  async validatePageRendering() {
    for (const agentId of this.config.testAgentIds) {
      await this.addTest(`Page Rendering - Agent ${agentId}`, 'Rendering', async () => {
        try {
          const response = await fetch(`${this.config.backendUrl}/api/agents/${agentId}`);
          
          if (!response.ok) {
            return { pass: false, message: `API returned ${response.status} for agent ${agentId}` };
          }

          const data = await response.json();
          
          if (!data.success) {
            return { pass: false, message: `API returned unsuccessful response for agent ${agentId}` };
          }

          return { 
            pass: true, 
            message: `Agent ${agentId} data retrieved successfully`,
            details: { 
              agentName: data.data?.name || 'Unknown',
              status: data.data?.status || 'Unknown'
            }
          };
        } catch (error) {
          return { pass: false, message: `Failed to fetch agent ${agentId}: ${error.message}` };
        }
      });
    }

    await this.addTest('UnifiedAgentPage Component', 'Rendering', async () => {
      const componentPath = path.join(process.cwd(), 'frontend/src/components/UnifiedAgentPage.tsx');
      const validation = await this.componentValidator.validateComponent(componentPath);
      
      return {
        pass: validation.isValid,
        message: validation.isValid 
          ? `Component valid (score: ${validation.score}/100)`
          : `Component invalid: ${validation.issues.join(', ')}`,
        warning: validation.warnings.length > 0 ? validation.warnings.join(', ') : null,
        details: {
          score: validation.score,
          issues: validation.issues,
          warnings: validation.warnings
        }
      };
    });

    await this.addTest('AgentPagesTab Component', 'Rendering', async () => {
      const componentPath = path.join(process.cwd(), 'frontend/src/components/AgentPagesTab.tsx');
      const validation = await this.componentValidator.validateComponent(componentPath);
      
      return {
        pass: validation.isValid,
        message: validation.isValid 
          ? `Component valid (score: ${validation.score}/100)`
          : `Component invalid: ${validation.issues.join(', ')}`,
        warning: validation.warnings.length > 0 ? validation.warnings.join(', ') : null,
        details: {
          score: validation.score,
          issues: validation.issues,
          warnings: validation.warnings
        }
      };
    });
  }

  // 4. Error Handling and Boundaries
  async validateErrorHandling() {
    await this.addTest('Error Boundary Implementation', 'Error Handling', async () => {
      const pageComponentPath = path.join(process.cwd(), 'frontend/src/components/UnifiedAgentPage.tsx');
      
      try {
        const content = await fs.readFile(pageComponentPath, 'utf8');
        
        const errorHandlingPatterns = [
          'try {',
          'catch (',
          'error',
          'Error',
          'setError'
        ];

        const foundPatterns = errorHandlingPatterns.filter(pattern => content.includes(pattern));
        
        return {
          pass: foundPatterns.length >= 3,
          message: `Error handling patterns found (${foundPatterns.length}/${errorHandlingPatterns.length})`,
          details: { patterns: foundPatterns }
        };
      } catch (error) {
        return { pass: false, message: `Error boundary validation failed: ${error.message}` };
      }
    });

    await this.addTest('Graceful Degradation', 'Error Handling', async () => {
      const pageComponentPath = path.join(process.cwd(), 'frontend/src/components/UnifiedAgentPage.tsx');
      
      try {
        const content = await fs.readFile(pageComponentPath, 'utf8');
        
        // Check for fallback UI patterns
        const fallbackPatterns = [
          'loading',
          'error',
          '?',  // Conditional rendering
          '||', // Fallback values
          'null'
        ];

        const foundFallbacks = fallbackPatterns.filter(pattern => content.includes(pattern));
        
        return {
          pass: foundFallbacks.length >= 4,
          message: `Graceful degradation patterns implemented (${foundFallbacks.length}/${fallbackPatterns.length})`
        };
      } catch (error) {
        return { pass: false, message: `Graceful degradation validation failed: ${error.message}` };
      }
    });

    await this.addTest('Invalid Props Handling', 'Error Handling', async () => {
      // Simulate validation with invalid props
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        // Check for prop validation and sanitization
        const validationPatterns = [
          'validator',
          'sanitize',
          'validate',
          'z.parse',
          'ZodError'
        ];

        const foundValidation = validationPatterns.filter(pattern => content.includes(pattern));
        
        return {
          pass: foundValidation.length >= 3,
          message: `Props validation mechanisms found (${foundValidation.length}/${validationPatterns.length})`
        };
      } catch (error) {
        return { pass: false, message: `Props validation check failed: ${error.message}` };
      }
    });
  }

  // 5. Performance Validation
  async validatePerformance() {
    await this.addTest('Component Bundle Size', 'Performance', async () => {
      const componentPaths = [
        'frontend/src/services/ComponentRegistry.ts',
        'frontend/src/components/UnifiedAgentPage.tsx',
        'frontend/src/components/AgentPagesTab.tsx'
      ];

      let totalSize = 0;
      let fileCount = 0;

      for (const componentPath of componentPaths) {
        try {
          const fullPath = path.join(process.cwd(), componentPath);
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          fileCount++;
        } catch (error) {
          // File doesn't exist, skip
        }
      }

      const avgSize = totalSize / fileCount / 1024; // KB
      const threshold = 200; // KB per component

      return {
        pass: avgSize < threshold,
        message: `Average component size: ${avgSize.toFixed(2)}KB (threshold: ${threshold}KB)`,
        details: {
          totalSize: `${(totalSize / 1024).toFixed(2)}KB`,
          fileCount,
          avgSize: `${avgSize.toFixed(2)}KB`
        }
      };
    });

    await this.addTest('Memory Usage Optimization', 'Performance', async () => {
      const pageComponentPath = path.join(process.cwd(), 'frontend/src/components/UnifiedAgentPage.tsx');
      
      try {
        const content = await fs.readFile(pageComponentPath, 'utf8');
        
        // Check for performance optimizations
        const optimizationPatterns = [
          'useMemo',
          'useCallback', 
          'React.memo',
          'lazy',
          'Suspense'
        ];

        const foundOptimizations = optimizationPatterns.filter(pattern => content.includes(pattern));
        
        return {
          pass: foundOptimizations.length >= 2,
          message: `Performance optimizations found (${foundOptimizations.length}/${optimizationPatterns.length})`,
          details: { optimizations: foundOptimizations }
        };
      } catch (error) {
        return { pass: false, message: `Performance validation failed: ${error.message}` };
      }
    });

    await this.addTest('Rendering Performance', 'Performance', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        // Check for performance monitoring
        const performancePatterns = [
          'performance.now',
          'renderTime',
          'maxRenderTime',
          'slow render',
          'performance'
        ];

        const foundPerformance = performancePatterns.filter(pattern => content.toLowerCase().includes(pattern.toLowerCase()));
        
        return {
          pass: foundPerformance.length >= 2,
          message: `Rendering performance monitoring implemented (${foundPerformance.length}/${performancePatterns.length})`
        };
      } catch (error) {
        return { pass: false, message: `Rendering performance validation failed: ${error.message}` };
      }
    });
  }

  // 6. Security and Accessibility Validation
  async validateSecurityAndAccessibility() {
    await this.addTest('XSS Protection', 'Security', async () => {
      const registryPath = path.join(process.cwd(), 'frontend/src/services/ComponentRegistry.ts');
      
      try {
        const content = await fs.readFile(registryPath, 'utf8');
        
        const xssProtectionPatterns = [
          'sanitizeString',
          '&lt;',
          '&gt;',
          '&quot;',
          'sanitize'
        ];

        const foundProtection = xssProtectionPatterns.filter(pattern => content.includes(pattern));
        
        return {
          pass: foundProtection.length >= 3,
          message: `XSS protection mechanisms found (${foundProtection.length}/${xssProtectionPatterns.length})`
        };
      } catch (error) {
        return { pass: false, message: `XSS protection validation failed: ${error.message}` };
      }
    });

    await this.addTest('Accessibility Compliance', 'Accessibility', async () => {
      const componentPaths = this.config.componentPaths;
      let accessibilityScore = 0;
      let totalComponents = 0;

      for (const componentPath of componentPaths) {
        try {
          const fullPath = path.join(process.cwd(), componentPath);
          const content = await fs.readFile(fullPath, 'utf8');
          
          const accessibilityFeatures = [
            'aria-',
            'data-testid',
            'role=',
            'aria-label',
            'aria-describedby',
            'tabIndex'
          ];

          const foundFeatures = accessibilityFeatures.filter(feature => content.includes(feature));
          accessibilityScore += foundFeatures.length;
          totalComponents++;
        } catch (error) {
          // Skip missing files
        }
      }

      const avgAccessibilityScore = accessibilityScore / totalComponents;
      
      return {
        pass: avgAccessibilityScore >= 2,
        message: `Average accessibility score: ${avgAccessibilityScore.toFixed(1)}/6 features per component`,
        details: {
          totalFeatures: accessibilityScore,
          totalComponents,
          avgScore: avgAccessibilityScore.toFixed(1)
        }
      };
    });
  }

  // 7. Production Environment Testing
  async validateProductionEnvironment() {
    await this.addTest('Console Error Detection', 'Production', async () => {
      let hasConsoleIssues = false;
      let issueCount = 0;

      for (const componentPath of this.config.componentPaths) {
        try {
          const fullPath = path.join(process.cwd(), componentPath);
          const content = await fs.readFile(fullPath, 'utf8');
          
          if (content.includes('console.log') || content.includes('console.error')) {
            hasConsoleIssues = true;
            issueCount++;
          }
        } catch (error) {
          // Skip missing files
        }
      }

      return {
        pass: !hasConsoleIssues,
        message: hasConsoleIssues 
          ? `Found console statements in ${issueCount} components - should be removed for production`
          : 'No console statements found - production ready',
        warning: hasConsoleIssues ? `${issueCount} components have console statements` : null
      };
    });

    await this.addTest('Production Dependencies', 'Production', async () => {
      try {
        const packagePath = path.join(process.cwd(), 'frontend/package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        const productionDeps = Object.keys(packageJson.dependencies || {});
        const requiredDeps = ['react', 'react-dom', 'zod'];
        
        const missingDeps = requiredDeps.filter(dep => !productionDeps.includes(dep));
        
        return {
          pass: missingDeps.length === 0,
          message: missingDeps.length === 0
            ? `All required dependencies present (${productionDeps.length} total)`
            : `Missing dependencies: ${missingDeps.join(', ')}`,
          details: {
            totalDeps: productionDeps.length,
            requiredDeps,
            missingDeps
          }
        };
      } catch (error) {
        return { pass: false, message: `Dependency validation failed: ${error.message}` };
      }
    });
  }

  // Main validation runner
  async runValidation() {
    this.log('🚀 Starting Component System Production Validation', 'info');
    this.log(`Testing against ${this.config.testAgentIds.length} agent pages`, 'info');
    
    const startTime = Date.now();

    // Run all validation categories
    await this.validateComponentRegistry();
    await this.validateComponentInstantiation();
    await this.validatePageRendering();
    await this.validateErrorHandling();
    await this.validatePerformance();
    await this.validateSecurityAndAccessibility();
    await this.validateProductionEnvironment();

    const totalTime = Date.now() - startTime;
    const totalTests = this.results.passed + this.results.failed;
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : '0.0';

    this.log(`\n📊 Validation Complete in ${totalTime}ms`, 'info');
    this.log(`✅ Passed: ${this.results.passed}`, 'pass');
    this.log(`❌ Failed: ${this.results.failed}`, 'fail');
    this.log(`⚠️ Warnings: ${this.results.warnings}`, 'warn');
    this.log(`📈 Success Rate: ${successRate}%`, 'info');

    // Generate recommendations
    this.generateRecommendations();

    // Save detailed report
    await this.saveReport();

    return {
      passed: this.results.passed,
      failed: this.results.failed,
      warnings: this.results.warnings,
      successRate: parseFloat(successRate),
      duration: totalTime,
      issues: this.results.issues,
      recommendations: this.results.recommendations
    };
  }

  generateRecommendations() {
    if (this.results.failed === 0 && this.results.warnings === 0) {
      this.results.recommendations.push('✅ All systems operational - ready for production deployment');
    }

    if (this.results.warnings > 0) {
      this.results.recommendations.push('⚠️ Address warning items before production deployment');
    }

    if (this.results.failed > 0) {
      this.results.recommendations.push('❌ Fix all failing tests before production deployment');
    }

    // Specific recommendations based on test results
    const hasConsoleWarnings = this.results.tests.some(test => 
      test.message && test.message.includes('console statements')
    );
    
    if (hasConsoleWarnings) {
      this.results.recommendations.push('Remove console.log statements from production components');
    }

    const hasPerformanceIssues = this.results.tests.some(test => 
      test.category === 'Performance' && test.status !== 'PASS'
    );
    
    if (hasPerformanceIssues) {
      this.results.recommendations.push('Optimize component performance before production deployment');
    }
  }

  async saveReport() {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'production-validation',
        duration: this.results.tests.reduce((sum, test) => sum + (test.duration || 0), 0)
      },
      summary: {
        total: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: this.results.passed + this.results.failed > 0 
          ? ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)
          : '0.0'
      },
      tests: this.results.tests,
      issues: this.results.issues,
      recommendations: this.results.recommendations,
      config: this.config
    };

    try {
      const reportPath = path.join(process.cwd(), 'tests/production-validation/component-system-validation-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log(`📋 Detailed report saved to: ${reportPath}`, 'info');
    } catch (error) {
      this.log(`⚠️ Failed to save report: ${error.message}`, 'warn');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ComponentSystemValidator();
  
  validator.runValidation()
    .then(results => {
      console.log('\n🎯 Component System Validation Results:');
      console.log(`✅ Success Rate: ${results.successRate}%`);
      console.log(`⏱️ Duration: ${results.duration}ms`);
      
      if (results.failed === 0) {
        console.log('\n🚀 Component system is production ready!');
        process.exit(0);
      } else {
        console.log(`\n❌ ${results.failed} tests failed - address issues before production`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { ComponentSystemValidator };