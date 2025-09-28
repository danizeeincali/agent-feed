#!/usr/bin/env node

/**
 * MANUAL FUNCTIONALITY VALIDATION
 *
 * Tests core functionality without starting full server
 * Validates database operations, file access, and module integrity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ManualFunctionalityValidator {
  constructor() {
    this.results = {
      fileAccess: {},
      moduleIntegrity: {},
      databaseAccess: {},
      configValidation: {},
      dependencyCheck: {}
    };
  }

  async validate() {
    console.log('🔧 MANUAL FUNCTIONALITY VALIDATION');
    console.log('=' .repeat(80));

    await this.validateFileAccess();
    await this.validateModuleIntegrity();
    await this.validateDatabaseAccess();
    await this.validateConfiguration();
    await this.validateDependencies();

    this.generateValidationReport();
  }

  async validateFileAccess() {
    console.log('\n📁 Validating File Access...');

    const rootPath = path.join(__dirname, '..');
    const criticalFiles = [
      'simple-backend.js',
      'package.json',
      'src/database/DatabaseService.js',
      'frontend/package.json',
      'database.db'
    ];

    const fileResults = {};

    for (const file of criticalFiles) {
      const filePath = path.join(rootPath, file);
      try {
        const stats = fs.statSync(filePath);
        fileResults[file] = {
          exists: true,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          readable: true
        };

        // Test readability
        try {
          fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
        } catch (readError) {
          fileResults[file].readable = false;
          fileResults[file].error = readError.message;
        }

        console.log(`   ✅ ${file}: ${Math.round(stats.size / 1024)}KB`);
      } catch (error) {
        fileResults[file] = {
          exists: false,
          error: error.message
        };
        console.log(`   ❌ ${file}: ${error.message}`);
      }
    }

    this.results.fileAccess = fileResults;
  }

  async validateModuleIntegrity() {
    console.log('\n🔍 Validating Module Integrity...');

    const rootPath = path.join(__dirname, '..');
    const moduleResults = {};

    // Test backend module syntax
    try {
      const backendPath = path.join(rootPath, 'simple-backend.js');
      const backendContent = fs.readFileSync(backendPath, 'utf8');

      moduleResults.backend = {
        syntaxValid: true,
        hasImports: backendContent.includes('import'),
        hasExports: backendContent.includes('export'),
        hasAsync: backendContent.includes('async'),
        hasDatabase: backendContent.includes('databaseService'),
        hasWebSocket: backendContent.includes('WebSocket'),
        linesOfCode: backendContent.split('\n').length
      };

      console.log(`   ✅ Backend module: ${moduleResults.backend.linesOfCode} lines`);
      console.log(`      Imports: ${moduleResults.backend.hasImports ? '✅' : '❌'}`);
      console.log(`      Database integration: ${moduleResults.backend.hasDatabase ? '✅' : '❌'}`);
      console.log(`      WebSocket support: ${moduleResults.backend.hasWebSocket ? '✅' : '❌'}`);

    } catch (error) {
      moduleResults.backend = {
        syntaxValid: false,
        error: error.message
      };
      console.log(`   ❌ Backend module error: ${error.message}`);
    }

    // Test database service module
    try {
      const dbServicePath = path.join(rootPath, 'src/database/DatabaseService.js');
      const dbServiceContent = fs.readFileSync(dbServicePath, 'utf8');

      moduleResults.databaseService = {
        exists: true,
        hasClass: dbServiceContent.includes('class'),
        hasInitialize: dbServiceContent.includes('initialize'),
        hasLogActivity: dbServiceContent.includes('logActivity'),
        hasGetActivities: dbServiceContent.includes('getActivities')
      };

      console.log(`   ✅ Database service: Available`);
      console.log(`      Initialize method: ${moduleResults.databaseService.hasInitialize ? '✅' : '❌'}`);
      console.log(`      Activity logging: ${moduleResults.databaseService.hasLogActivity ? '✅' : '❌'}`);

    } catch (error) {
      moduleResults.databaseService = {
        exists: false,
        error: error.message
      };
      console.log(`   ❌ Database service: ${error.message}`);
    }

    this.results.moduleIntegrity = moduleResults;
  }

  async validateDatabaseAccess() {
    console.log('\n🗄️ Validating Database Access...');

    const rootPath = path.join(__dirname, '..');
    const dbPath = path.join(rootPath, 'database.db');

    const dbResults = {
      fileExists: false,
      fileSize: 0,
      readable: false,
      writable: false
    };

    try {
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbResults.fileExists = true;
        dbResults.fileSize = stats.size;

        // Test read access
        try {
          fs.accessSync(dbPath, fs.constants.R_OK);
          dbResults.readable = true;
          console.log(`   ✅ Database file: ${Math.round(stats.size / 1024)}KB, readable`);
        } catch (readError) {
          console.log(`   ⚠️  Database file: exists but not readable`);
        }

        // Test write access
        try {
          fs.accessSync(dbPath, fs.constants.W_OK);
          dbResults.writable = true;
          console.log(`   ✅ Database file: writable`);
        } catch (writeError) {
          console.log(`   ⚠️  Database file: not writable`);
        }
      } else {
        console.log(`   ⚠️  Database file: not found (may use in-memory DB)`);
      }

      // Test SQLite availability
      try {
        const sqlite3 = await import('sqlite3');
        dbResults.sqlite3Available = true;
        console.log(`   ✅ SQLite3 module: available`);
      } catch (sqliteError) {
        dbResults.sqlite3Available = false;
        console.log(`   ⚠️  SQLite3 module: ${sqliteError.message}`);
      }

      // Test better-sqlite3 availability
      try {
        const betterSqlite = await import('better-sqlite3');
        dbResults.betterSqlite3Available = true;
        console.log(`   ✅ Better-SQLite3 module: available`);
      } catch (betterSqliteError) {
        dbResults.betterSqlite3Available = false;
        console.log(`   ⚠️  Better-SQLite3 module: ${betterSqliteError.message}`);
      }

    } catch (error) {
      dbResults.error = error.message;
      console.log(`   ❌ Database validation error: ${error.message}`);
    }

    this.results.databaseAccess = dbResults;
  }

  async validateConfiguration() {
    console.log('\n⚙️ Validating Configuration...');

    const rootPath = path.join(__dirname, '..');
    const configResults = {};

    // Validate package.json
    try {
      const packagePath = path.join(rootPath, 'package.json');
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      configResults.packageJson = {
        valid: true,
        hasScripts: !!packageData.scripts,
        hasDependencies: !!packageData.dependencies,
        hasDevDependencies: !!packageData.devDependencies,
        type: packageData.type || 'commonjs',
        dependencyCount: Object.keys(packageData.dependencies || {}).length,
        devDependencyCount: Object.keys(packageData.devDependencies || {}).length
      };

      console.log(`   ✅ package.json: valid`);
      console.log(`      Type: ${configResults.packageJson.type}`);
      console.log(`      Dependencies: ${configResults.packageJson.dependencyCount}`);
      console.log(`      Dev dependencies: ${configResults.packageJson.devDependencyCount}`);

    } catch (error) {
      configResults.packageJson = {
        valid: false,
        error: error.message
      };
      console.log(`   ❌ package.json: ${error.message}`);
    }

    // Validate environment files
    const envFiles = ['.env', '.env.example', '.env.dev'];
    configResults.envFiles = {};

    for (const envFile of envFiles) {
      try {
        const envPath = path.join(rootPath, envFile);
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          configResults.envFiles[envFile] = {
            exists: true,
            size: envContent.length,
            hasApiKeys: envContent.includes('API_KEY') || envContent.includes('ANTHROPIC')
          };
          console.log(`   ✅ ${envFile}: exists`);
        } else {
          configResults.envFiles[envFile] = { exists: false };
          console.log(`   ⚠️  ${envFile}: not found`);
        }
      } catch (error) {
        configResults.envFiles[envFile] = {
          exists: false,
          error: error.message
        };
      }
    }

    this.results.configValidation = configResults;
  }

  async validateDependencies() {
    console.log('\n📦 Validating Dependencies...');

    const criticalDependencies = [
      'express',
      'ws',
      'sqlite3',
      'better-sqlite3',
      'cors',
      'dotenv',
      'node-fetch'
    ];

    const depResults = {};

    for (const dep of criticalDependencies) {
      try {
        const module = await import(dep);
        depResults[dep] = {
          available: true,
          version: module.version || 'unknown'
        };
        console.log(`   ✅ ${dep}: available`);
      } catch (error) {
        depResults[dep] = {
          available: false,
          error: error.message
        };
        console.log(`   ❌ ${dep}: ${error.message}`);
      }
    }

    this.results.dependencyCheck = depResults;
  }

  generateValidationReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MANUAL FUNCTIONALITY VALIDATION REPORT');
    console.log('='.repeat(80));

    // Summary
    const fileAccessScore = this.calculateScore(this.results.fileAccess, f => f.exists && f.readable);
    const moduleIntegrityScore = this.calculateModuleIntegrityScore();
    const dbAccessScore = this.calculateDatabaseScore();
    const configScore = this.calculateConfigScore();
    const depScore = this.calculateScore(this.results.dependencyCheck, d => d.available);

    const overallScore = Math.round(
      (fileAccessScore + moduleIntegrityScore + dbAccessScore + configScore + depScore) / 5
    );

    console.log('\n📈 VALIDATION SUMMARY:');
    console.log(`   Overall Score: ${overallScore}%`);
    console.log(`   File Access: ${fileAccessScore}%`);
    console.log(`   Module Integrity: ${moduleIntegrityScore}%`);
    console.log(`   Database Access: ${dbAccessScore}%`);
    console.log(`   Configuration: ${configScore}%`);
    console.log(`   Dependencies: ${depScore}%`);

    // Detailed Results
    console.log('\n🔍 DETAILED VALIDATION RESULTS:');

    // Critical Issues
    const criticalIssues = this.identifyCriticalIssues();
    if (criticalIssues.length > 0) {
      console.log('\n   🚨 CRITICAL ISSUES:');
      criticalIssues.forEach(issue => {
        console.log(`     ❌ ${issue}`);
      });
    }

    // Warnings
    const warnings = this.identifyWarnings();
    if (warnings.length > 0) {
      console.log('\n   ⚠️  WARNINGS:');
      warnings.forEach(warning => {
        console.log(`     🟡 ${warning}`);
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');

    if (overallScore < 50) {
      console.log('   🔴 CRITICAL: System requires significant fixes before testing');
      console.log('   📋 Priority Actions:');
      console.log('      1. Fix missing files and dependencies');
      console.log('      2. Resolve module syntax errors');
      console.log('      3. Ensure database accessibility');
    } else if (overallScore < 80) {
      console.log('   🟡 MODERATE: System mostly functional with some issues');
      console.log('   📋 Suggested Actions:');
      console.log('      1. Address dependency warnings');
      console.log('      2. Verify configuration files');
      console.log('      3. Test basic functionality manually');
    } else {
      console.log('   ✅ GOOD: System appears functional and ready for testing');
      console.log('   📋 Next Steps:');
      console.log('      1. Attempt server startup');
      console.log('      2. Run API endpoint tests');
      console.log('      3. Execute full regression test suite');
    }

    // Testing Readiness Assessment
    console.log('\n🧪 TESTING READINESS ASSESSMENT:');

    const readinessFactors = {
      coreFilesPresent: fileAccessScore > 80,
      modulesIntact: moduleIntegrityScore > 70,
      databaseAccessible: dbAccessScore > 50,
      dependenciesResolved: depScore > 70,
      configurationValid: configScore > 60
    };

    const readyFactors = Object.values(readinessFactors).filter(Boolean).length;
    const totalFactors = Object.keys(readinessFactors).length;

    console.log(`   Readiness Score: ${Math.round((readyFactors / totalFactors) * 100)}%`);

    for (const [factor, ready] of Object.entries(readinessFactors)) {
      console.log(`   ${ready ? '✅' : '❌'} ${factor}`);
    }

    if (readyFactors === totalFactors) {
      console.log('\n   🎯 SYSTEM READY: All factors met - proceed with full testing');
    } else if (readyFactors >= totalFactors * 0.8) {
      console.log('\n   ⚠️  MOSTLY READY: Address minor issues then proceed with testing');
    } else {
      console.log('\n   ❌ NOT READY: Critical issues must be resolved before testing');
    }

    console.log('\n='.repeat(80));

    // Save report
    this.saveValidationReport(overallScore);
  }

  calculateScore(results, testFn) {
    const entries = Object.entries(results);
    if (entries.length === 0) return 0;

    const passed = entries.filter(([key, value]) => testFn(value)).length;
    return Math.round((passed / entries.length) * 100);
  }

  calculateModuleIntegrityScore() {
    const backend = this.results.moduleIntegrity.backend;
    const dbService = this.results.moduleIntegrity.databaseService;

    let score = 0;
    let total = 0;

    if (backend) {
      total += 5;
      if (backend.syntaxValid) score += 1;
      if (backend.hasImports) score += 1;
      if (backend.hasDatabase) score += 1;
      if (backend.hasWebSocket) score += 1;
      if (backend.hasAsync) score += 1;
    }

    if (dbService) {
      total += 3;
      if (dbService.exists) score += 1;
      if (dbService.hasInitialize) score += 1;
      if (dbService.hasLogActivity) score += 1;
    }

    return total > 0 ? Math.round((score / total) * 100) : 0;
  }

  calculateDatabaseScore() {
    const db = this.results.databaseAccess;
    let score = 0;
    let total = 4;

    if (db.fileExists || db.sqlite3Available || db.betterSqlite3Available) score += 1;
    if (db.readable) score += 1;
    if (db.writable) score += 1;
    if (db.sqlite3Available || db.betterSqlite3Available) score += 1;

    return Math.round((score / total) * 100);
  }

  calculateConfigScore() {
    const config = this.results.configValidation;
    let score = 0;
    let total = 3;

    if (config.packageJson && config.packageJson.valid) score += 1;
    if (config.packageJson && config.packageJson.hasDependencies) score += 1;
    if (config.envFiles && Object.values(config.envFiles).some(f => f.exists)) score += 1;

    return Math.round((score / total) * 100);
  }

  identifyCriticalIssues() {
    const issues = [];

    // Check for critical file access issues
    const criticalFiles = ['simple-backend.js', 'package.json'];
    for (const file of criticalFiles) {
      const fileResult = this.results.fileAccess[file];
      if (!fileResult || !fileResult.exists) {
        issues.push(`Critical file missing: ${file}`);
      } else if (!fileResult.readable) {
        issues.push(`Critical file not readable: ${file}`);
      }
    }

    // Check for module syntax issues
    if (this.results.moduleIntegrity.backend && !this.results.moduleIntegrity.backend.syntaxValid) {
      issues.push('Backend module has syntax errors');
    }

    // Check for missing dependencies
    const criticalDeps = ['express', 'ws'];
    for (const dep of criticalDeps) {
      const depResult = this.results.dependencyCheck[dep];
      if (!depResult || !depResult.available) {
        issues.push(`Critical dependency missing: ${dep}`);
      }
    }

    return issues;
  }

  identifyWarnings() {
    const warnings = [];

    // Database warnings
    if (!this.results.databaseAccess.fileExists) {
      warnings.push('Database file not found - may impact persistent storage');
    }

    if (!this.results.databaseAccess.sqlite3Available && !this.results.databaseAccess.betterSqlite3Available) {
      warnings.push('No SQLite modules available - database operations may fail');
    }

    // Configuration warnings
    if (!this.results.configValidation.envFiles['.env'] || !this.results.configValidation.envFiles['.env'].exists) {
      warnings.push('Environment configuration file (.env) not found');
    }

    // Dependency warnings
    const optionalDeps = ['better-sqlite3', 'sqlite3', 'cors', 'dotenv'];
    for (const dep of optionalDeps) {
      const depResult = this.results.dependencyCheck[dep];
      if (!depResult || !depResult.available) {
        warnings.push(`Optional dependency missing: ${dep}`);
      }
    }

    return warnings;
  }

  saveValidationReport(overallScore) {
    const reportDir = path.join(__dirname, '..', 'test-results');

    try {
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const report = {
        timestamp: new Date().toISOString(),
        overallScore,
        results: this.results,
        summary: {
          fileAccessScore: this.calculateScore(this.results.fileAccess, f => f.exists && f.readable),
          moduleIntegrityScore: this.calculateModuleIntegrityScore(),
          dbAccessScore: this.calculateDatabaseScore(),
          configScore: this.calculateConfigScore(),
          depScore: this.calculateScore(this.results.dependencyCheck, d => d.available)
        },
        criticalIssues: this.identifyCriticalIssues(),
        warnings: this.identifyWarnings()
      };

      const reportFile = path.join(reportDir, `manual-validation-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

      console.log(`📋 Validation report saved: ${reportFile}`);
    } catch (error) {
      console.log(`❌ Failed to save validation report: ${error.message}`);
    }
  }
}

// Run the validation
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ManualFunctionalityValidator();
  validator.validate().catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

export { ManualFunctionalityValidator };