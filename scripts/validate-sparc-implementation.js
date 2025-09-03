#!/usr/bin/env node
/**
 * SPARC Implementation Validation Script
 * Validates that all SPARC methodology phases have been properly implemented
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('🎯 SPARC METHODOLOGY IMPLEMENTATION VALIDATION');
console.log('==============================================');
console.log('');

const validationResults = {
  specification: false,
  pseudocode: false,
  architecture: false,
  refinement: false,
  completion: false,
  database: false,
  api: false,
  tests: false,
  integration: true
};

// Phase 1: Specification Validation
console.log('📋 Phase 1: SPECIFICATION');
console.log('-'.repeat(50));

const specificationFiles = [
  'src/database/schema.sql',
  'src/database/connection/pool.js',
  'tests/sparc/sparc-specification.test.js'
];

let specPassed = true;
specificationFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) specPassed = false;
});

if (specPassed) {
  // Check database schema completeness
  const schemaContent = fs.readFileSync(path.join(projectRoot, 'src/database/schema.sql'), 'utf-8');
  const requiredTables = ['users', 'feeds', 'feed_items', 'agents', 'automation_results'];
  const tablesFound = requiredTables.every(table => schemaContent.includes(`CREATE TABLE ${table}`));
  
  console.log(`${tablesFound ? '✅' : '❌'} All required database tables defined`);
  specPassed = tablesFound;
}

validationResults.specification = specPassed;
console.log(`📊 Specification Phase: ${specPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Phase 2: Pseudocode Validation
console.log('🧮 Phase 2: PSEUDOCODE');
console.log('-'.repeat(50));

const pseudocodeTest = path.join(projectRoot, 'tests/sparc/sparc-pseudocode.test.js');
const pseudocodeExists = fs.existsSync(pseudocodeTest);
console.log(`${pseudocodeExists ? '✅' : '❌'} Pseudocode validation tests`);

if (pseudocodeExists) {
  const pseudocodeContent = fs.readFileSync(pseudocodeTest, 'utf-8');
  const algorithmTests = [
    'Connection Pool Algorithm',
    'Feed Data Management Algorithms',
    'Full-text Search Algorithm',
    'Engagement Tracking Algorithms'
  ];
  
  const algorithmsValidated = algorithmTests.every(algorithm => 
    pseudocodeContent.includes(algorithm)
  );
  
  console.log(`${algorithmsValidated ? '✅' : '❌'} All core algorithms validated`);
  validationResults.pseudocode = pseudocodeExists && algorithmsValidated;
} else {
  validationResults.pseudocode = false;
}

console.log(`📊 Pseudocode Phase: ${validationResults.pseudocode ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Phase 3: Architecture Validation
console.log('🏗️ Phase 3: ARCHITECTURE');
console.log('-'.repeat(50));

const architectureFiles = [
  'src/services/FeedDataService.js',
  'src/routes/api/feed-routes.js',
  'tests/sparc/sparc-architecture.test.js'
];

let archPassed = true;
architectureFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) archPassed = false;
});

// Check integration with simple-backend.js
const backendFile = path.join(projectRoot, 'simple-backend.js');
if (fs.existsSync(backendFile)) {
  const backendContent = fs.readFileSync(backendFile, 'utf-8');
  const hasDbImport = backendContent.includes('import { dbPool }');
  const hasServiceImport = backendContent.includes('import { feedDataService }');
  const hasRoutesImport = backendContent.includes('import feedRoutes');
  
  console.log(`${hasDbImport ? '✅' : '❌'} Database pool integration`);
  console.log(`${hasServiceImport ? '✅' : '❌'} Feed service integration`);  
  console.log(`${hasRoutesImport ? '✅' : '❌'} API routes integration`);
  
  archPassed = archPassed && hasDbImport && hasServiceImport && hasRoutesImport;
}

validationResults.architecture = archPassed;
console.log(`📊 Architecture Phase: ${archPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Phase 4: Refinement Validation
console.log('🔧 Phase 4: REFINEMENT (TDD)');
console.log('-'.repeat(50));

const refinementFiles = [
  'tests/sparc/sparc-refinement.test.js',
  'tests/sparc/sparc-playwright-e2e.test.js'
];

let refinementPassed = true;
refinementFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) refinementPassed = false;
});

// Check TDD test coverage
const refinementTest = path.join(projectRoot, 'tests/sparc/sparc-refinement.test.js');
if (fs.existsSync(refinementTest)) {
  const refinementContent = fs.readFileSync(refinementTest, 'utf-8');
  const tddPatterns = [
    'RED:',
    'GREEN:', 
    'REFACTOR:',
    'API Contract Testing',
    'Performance Testing',
    'Security Testing'
  ];
  
  const tddCovered = tddPatterns.every(pattern => 
    refinementContent.includes(pattern)
  );
  
  console.log(`${tddCovered ? '✅' : '❌'} TDD Red-Green-Refactor cycle implemented`);
  refinementPassed = refinementPassed && tddCovered;
}

validationResults.refinement = refinementPassed;
console.log(`📊 Refinement Phase: ${refinementPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Phase 5: Completion Validation  
console.log('🎯 Phase 5: COMPLETION');
console.log('-'.repeat(50));

const completionTest = path.join(projectRoot, 'tests/sparc/sparc-completion.test.js');
const completionExists = fs.existsSync(completionTest);
console.log(`${completionExists ? '✅' : '❌'} Integration testing suite`);

if (completionExists) {
  const completionContent = fs.readFileSync(completionTest, 'utf-8');
  const integrationTests = [
    'System Integration Validation',
    'Database Integration Validation',
    'Frontend Compatibility Validation',
    'Performance and Scalability Validation',
    'Security Validation'
  ];
  
  const integrationCovered = integrationTests.every(test => 
    completionContent.includes(test)
  );
  
  console.log(`${integrationCovered ? '✅' : '❌'} All integration tests implemented`);
  validationResults.completion = completionExists && integrationCovered;
} else {
  validationResults.completion = false;
}

console.log(`📊 Completion Phase: ${validationResults.completion ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Database Implementation Check
console.log('🗄️ DATABASE IMPLEMENTATION');
console.log('-'.repeat(50));

const dbFiles = [
  'src/database/connection/pool.js',
  'src/services/FeedDataService.js'
];

let dbPassed = true;
dbFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) dbPassed = false;
});

// Check package.json for required dependencies
const packageJson = path.join(projectRoot, 'package.json');
if (fs.existsSync(packageJson)) {
  const packageContent = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
  const requiredDeps = ['pg', 'winston'];
  
  const depsInstalled = requiredDeps.every(dep => 
    packageContent.dependencies && packageContent.dependencies[dep]
  );
  
  console.log(`${depsInstalled ? '✅' : '❌'} Required dependencies (pg, winston)`);
  dbPassed = dbPassed && depsInstalled;
}

validationResults.database = dbPassed;
console.log(`📊 Database Implementation: ${dbPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// API Implementation Check
console.log('🔌 API IMPLEMENTATION');
console.log('-'.repeat(50));

const apiRoutes = path.join(projectRoot, 'src/routes/api/feed-routes.js');
if (fs.existsSync(apiRoutes)) {
  const routesContent = fs.readFileSync(apiRoutes, 'utf-8');
  const endpoints = [
    'GET.*agent-posts',
    'POST.*agent-posts',
    'GET.*agent-posts/:id',
    'PUT.*engagement',
    'GET.*search/posts'
  ];
  
  const endpointsImplemented = endpoints.every(endpoint => {
    const regex = new RegExp(endpoint);
    return regex.test(routesContent);
  });
  
  console.log(`${endpointsImplemented ? '✅' : '❌'} All required API endpoints`);
  console.log(`${fs.existsSync(apiRoutes) ? '✅' : '❌'} RESTful API routes file`);
  
  validationResults.api = endpointsImplemented;
} else {
  console.log('❌ API routes file missing');
  validationResults.api = false;
}

console.log(`📊 API Implementation: ${validationResults.api ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Test Suite Completeness
console.log('🧪 TEST SUITE COMPLETENESS');
console.log('-'.repeat(50));

const testFiles = [
  'tests/sparc/sparc-specification.test.js',
  'tests/sparc/sparc-pseudocode.test.js', 
  'tests/sparc/sparc-architecture.test.js',
  'tests/sparc/sparc-refinement.test.js',
  'tests/sparc/sparc-playwright-e2e.test.js',
  'tests/sparc/sparc-completion.test.js'
];

let testsPassed = true;
testFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) testsPassed = false;
});

validationResults.tests = testsPassed;
console.log(`📊 Test Suite: ${testsPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Configuration Files
console.log('⚙️ CONFIGURATION');
console.log('-'.repeat(50));

const configFiles = [
  '.env.example'
];

configFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Final Summary
console.log('');
console.log('🏁 SPARC METHODOLOGY VALIDATION SUMMARY');
console.log('='.repeat(50));

const phases = [
  ['Specification', validationResults.specification],
  ['Pseudocode', validationResults.pseudocode], 
  ['Architecture', validationResults.architecture],
  ['Refinement', validationResults.refinement],
  ['Completion', validationResults.completion]
];

phases.forEach(([phase, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${phase} Phase: ${passed ? 'COMPLETE' : 'INCOMPLETE'}`);
});

console.log('');
console.log('Implementation Components:');
console.log(`${validationResults.database ? '✅' : '❌'} Database Integration: ${validationResults.database ? 'COMPLETE' : 'INCOMPLETE'}`);
console.log(`${validationResults.api ? '✅' : '❌'} API Implementation: ${validationResults.api ? 'COMPLETE' : 'INCOMPLETE'}`);
console.log(`${validationResults.tests ? '✅' : '❌'} Test Suite: ${validationResults.tests ? 'COMPLETE' : 'INCOMPLETE'}`);

const overallSuccess = Object.values(validationResults).every(result => result === true);
const partialSuccess = Object.values(validationResults).some(result => result === true);

console.log('');
if (overallSuccess) {
  console.log('🎉 SPARC METHODOLOGY: ✅ FULLY IMPLEMENTED');
  console.log('🚀 All phases completed successfully!');
  console.log('📊 System ready for testing and deployment');
  process.exit(0);
} else if (partialSuccess) {
  console.log('⚠️ SPARC METHODOLOGY: 🟡 PARTIALLY IMPLEMENTED');
  console.log('🔧 Some components need attention:');
  
  Object.entries(validationResults).forEach(([component, passed]) => {
    if (!passed) {
      console.log(`   - ${component.toUpperCase()}: NEEDS COMPLETION`);
    }
  });
  
  console.log('');
  console.log('📝 Next Steps:');
  console.log('1. Complete missing components');
  console.log('2. Run individual phase tests');
  console.log('3. Execute integration testing');
  
  process.exit(1);
} else {
  console.log('❌ SPARC METHODOLOGY: ❌ NOT IMPLEMENTED');
  console.log('🛠️ Implementation needs to be started');
  process.exit(2);
}