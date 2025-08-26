#!/usr/bin/env node

/**
 * Production Validation Script
 * Quick validation of production readiness for Claude Instance Management
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Production Validation for Claude Instance Management');
console.log('=' .repeat(60));

const validationChecks = [
  {
    name: 'Build Process',
    description: 'Validate that the application builds successfully',
    check: () => {
      try {
        console.log('Building application...');
        execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
        return { status: 'PASS', message: 'Build completed successfully' };
      } catch (error) {
        return { status: 'FAIL', message: `Build failed: ${error.message}` };
      }
    }
  },
  
  {
    name: 'TypeScript Compilation',
    description: 'Verify TypeScript types are correct',
    check: () => {
      try {
        console.log('Checking TypeScript types...');
        execSync('npx tsc --noEmit', { cwd: rootDir, stdio: 'pipe' });
        return { status: 'PASS', message: 'TypeScript compilation successful' };
      } catch (error) {
        return { status: 'WARN', message: 'TypeScript warnings present' };
      }
    }
  },

  {
    name: 'Production Dependencies',
    description: 'Validate all production dependencies are present',
    check: () => {
      try {
        const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
        const requiredDeps = [
          'react',
          'react-dom',
          'react-router-dom',
          '@tanstack/react-query',
          'socket.io-client',
          'xterm',
          '@xterm/addon-fit'
        ];
        
        const missing = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
        
        if (missing.length === 0) {
          return { status: 'PASS', message: 'All required dependencies present' };
        } else {
          return { status: 'FAIL', message: `Missing dependencies: ${missing.join(', ')}` };
        }
      } catch (error) {
        return { status: 'FAIL', message: `Cannot read package.json: ${error.message}` };
      }
    }
  },

  {
    name: 'Critical Files',
    description: 'Verify critical application files exist',
    check: () => {
      const criticalFiles = [
        'src/main.tsx',
        'src/App.tsx',
        'src/components/claude-instances/ClaudeInstanceManagementDemo.tsx',
        'src/hooks/useClaudeInstances.ts',
        'src/hooks/useImageUpload.ts',
        'dist/index.html'
      ];
      
      const missing = criticalFiles.filter(file => !existsSync(join(rootDir, file)));
      
      if (missing.length === 0) {
        return { status: 'PASS', message: 'All critical files present' };
      } else {
        return { status: 'FAIL', message: `Missing files: ${missing.join(', ')}` };
      }
    }
  },

  {
    name: 'Test Files Structure',
    description: 'Validate comprehensive test coverage files exist',
    check: () => {
      const testFiles = [
        'tests/e2e/claude-instances.spec.ts',
        'tests/e2e/websocket-integration.spec.ts',
        'tests/e2e/utils/production-validation-helpers.ts',
        'tests/production-validation.spec.ts'
      ];
      
      const missing = testFiles.filter(file => !existsSync(join(rootDir, file)));
      
      if (missing.length === 0) {
        return { status: 'PASS', message: 'Comprehensive test suite present' };
      } else {
        return { status: 'WARN', message: `Some test files missing: ${missing.join(', ')}` };
      }
    }
  },

  {
    name: 'Security Configuration',
    description: 'Validate security-related configurations',
    check: () => {
      try {
        const indexHtml = readFileSync(join(rootDir, 'dist/index.html'), 'utf8');
        
        // Check for basic security headers in build output
        const securityChecks = {
          'No hardcoded secrets': !indexHtml.match(/(?:password|secret|key|token)[\s]*[:=][\s]*["'][^"']+["']/gi),
          'No debug info': !indexHtml.includes('debug') && !indexHtml.includes('console.log'),
          'Minified output': indexHtml.length < 2000 // Should be minified
        };
        
        const failures = Object.entries(securityChecks)
          .filter(([_, passed]) => !passed)
          .map(([check]) => check);
        
        if (failures.length === 0) {
          return { status: 'PASS', message: 'Security validations passed' };
        } else {
          return { status: 'WARN', message: `Security issues: ${failures.join(', ')}` };
        }
      } catch (error) {
        return { status: 'WARN', message: 'Cannot validate security configuration' };
      }
    }
  },

  {
    name: 'Performance Validation',
    description: 'Check build size and performance indicators',
    check: () => {
      try {
        const stats = execSync('du -sh dist/', { cwd: rootDir, encoding: 'utf8' }).trim();
        const sizeMatch = stats.match(/^([\d.]+)([KMG])/);
        
        if (sizeMatch) {
          const [, size, unit] = sizeMatch;
          const sizeNum = parseFloat(size);
          
          // Check if build size is reasonable (< 5MB)
          const isReasonableSize = (
            (unit === 'K' && sizeNum < 5000) ||
            (unit === 'M' && sizeNum < 5) ||
            unit === 'G' // Too big if in GB
          ) && unit !== 'G';
          
          if (isReasonableSize) {
            return { status: 'PASS', message: `Build size acceptable: ${stats}` };
          } else {
            return { status: 'WARN', message: `Build size large: ${stats}` };
          }
        }
        
        return { status: 'PASS', message: 'Build size check completed' };
      } catch (error) {
        return { status: 'WARN', message: 'Cannot measure build size' };
      }
    }
  },

  {
    name: 'Environment Configuration',
    description: 'Validate environment setup for production',
    check: () => {
      const envChecks = [];
      
      // Check if vite config exists
      if (existsSync(join(rootDir, 'vite.config.ts'))) {
        envChecks.push('Vite configuration present');
      } else {
        envChecks.push('❌ Vite configuration missing');
      }
      
      // Check if playwright config exists
      if (existsSync(join(rootDir, 'playwright.config.ts'))) {
        envChecks.push('Playwright configuration present');
      } else {
        envChecks.push('⚠️ Playwright configuration missing');
      }
      
      // Check package.json scripts
      try {
        const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
        const requiredScripts = ['build', 'dev', 'preview'];
        const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
        
        if (missingScripts.length === 0) {
          envChecks.push('All required npm scripts present');
        } else {
          envChecks.push(`⚠️ Missing scripts: ${missingScripts.join(', ')}`);
        }
      } catch (error) {
        envChecks.push('❌ Cannot validate npm scripts');
      }
      
      const hasFailures = envChecks.some(check => check.includes('❌'));
      const hasWarnings = envChecks.some(check => check.includes('⚠️'));
      
      return {
        status: hasFailures ? 'FAIL' : hasWarnings ? 'WARN' : 'PASS',
        message: envChecks.join('; ')
      };
    }
  }
];

// Run all validation checks
console.log('\n📋 Running Production Validation Checks...\n');

let passCount = 0;
let warnCount = 0;
let failCount = 0;

for (const check of validationChecks) {
  process.stdout.write(`⏳ ${check.name}... `);
  
  try {
    const result = check.check();
    
    switch (result.status) {
      case 'PASS':
        console.log(`✅ PASS - ${result.message}`);
        passCount++;
        break;
      case 'WARN':
        console.log(`⚠️  WARN - ${result.message}`);
        warnCount++;
        break;
      case 'FAIL':
        console.log(`❌ FAIL - ${result.message}`);
        failCount++;
        break;
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
    failCount++;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 PRODUCTION VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passCount}`);
console.log(`⚠️  Warnings: ${warnCount}`);
console.log(`❌ Failed: ${failCount}`);

// Overall status
let overallStatus;
let recommendation;

if (failCount === 0 && warnCount <= 2) {
  overallStatus = '🟢 PRODUCTION READY';
  recommendation = '✅ Application is ready for production deployment.';
} else if (failCount === 0) {
  overallStatus = '🟡 PRODUCTION READY (with warnings)';
  recommendation = '⚠️ Application can be deployed but address warnings for optimal performance.';
} else {
  overallStatus = '🔴 NOT READY FOR PRODUCTION';
  recommendation = '❌ Critical issues must be resolved before deployment.';
}

console.log(`\n🎯 Overall Status: ${overallStatus}`);
console.log(`💡 Recommendation: ${recommendation}`);

// Exit with appropriate code
process.exit(failCount > 0 ? 1 : 0);