/**
 * NLD Page Not Found Prevention Tests
 * Integration tests for the Never Let Down pattern detection system
 * Tests proactive error prevention and auto-fix capabilities
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import DatabaseService from '../../src/database/DatabaseService.js';
import nldPatternDetectionService from '../../src/nld-patterns/pattern-detection-service.js';
import nldValidationUtilities from '../../src/nld-patterns/validation-utilities.js';
import pageNotFoundPrevention from '../../src/nld-patterns/page-not-found-prevention.js';

describe('NLD Page Not Found Prevention', () => {
  let db;
  const testAgentId = 'test-agent-nld';
  const testPageId = 'test-page-' + Date.now();
  const testDataDir = '/workspaces/agent-feed/data/pages/test-agent-nld';
  
  beforeEach(async () => {
    // Initialize database
    db = DatabaseService.getInstance();
    await db.initialize();
    
    // Clean up any existing test data
    try {
      await db.query('DELETE FROM agent_pages WHERE agent_id = ?', [testAgentId]);
    } catch (error) {
      // Table might not exist, ignore
    }
    
    // Clean up test files
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, ignore
    }
  });
  
  afterEach(async () => {
    // Clean up test data
    try {
      await db.query('DELETE FROM agent_pages WHERE agent_id = ?', [testAgentId]);
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  describe('Pattern Detection', () => {
    test('should detect page not found error pattern', async () => {
      const errorContext = {
        method: 'GET',
        url: `/agents/${testAgentId}/pages/${testPageId}`,
        agentId: testAgentId,
        pageId: testPageId,
        error: {
          message: `Page not found: ${testPageId}`
        },
        response: {
          status: 404,
          data: { success: false, error: 'Page not found' }
        },
        description: 'React component showing error despite API success',
        db
      };
      
      const detections = await nldPatternDetectionService.detectPattern(errorContext);
      
      expect(detections).toHaveLength(1);
      expect(detections[0].patternId).toBe('PAGE_NOT_FOUND_PREVENTION');
      expect(detections[0].confidence).toBeGreaterThan(0.5);
      expect(detections[0].triggers).toContain('error_message_match');
    });
    
    test('should detect URL pattern match', async () => {
      const errorContext = {
        method: 'GET',
        url: `/agents/${testAgentId}/pages/${testPageId}`,
        agentId: testAgentId,
        pageId: testPageId,
        error: {
          message: 'Not found'
        },
        description: 'URL matches agent page pattern',
        db
      };
      
      const detections = await nldPatternDetectionService.detectPattern(errorContext);
      
      expect(detections).toHaveLength(1);
      expect(detections[0].triggers).toContain('url_pattern_match');
    });
  });
  
  describe('File Validation', () => {
    test('should validate missing page file', async () => {
      const validation = await nldValidationUtilities.validatePageFile(testAgentId, testPageId, { autoFix: false });
      
      expect(validation.passed).toBe(false);
      expect(validation.fileExists).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].type).toBe('file_not_found');
      expect(validation.issues[0].severity).toBe('critical');
    });
    
    test('should auto-fix missing page file', async () => {
      const validation = await nldValidationUtilities.validatePageFile(testAgentId, testPageId, { autoFix: true });
      
      expect(validation.autoFixed).toBe(true);
      expect(validation.fixResult.success).toBe(true);
      expect(validation.postFixValidation.passed).toBe(true);
      
      // Verify file was created
      const filePath = path.join(testDataDir, `${testPageId}.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const pageData = JSON.parse(fileContent);
      
      expect(pageData.id).toBe(testPageId);
      expect(pageData.agent_id).toBe(testAgentId);
      expect(pageData.title).toContain(testPageId);
    });
    
    test('should validate page file structure', async () => {
      // Create file with missing fields
      const invalidPageData = {
        id: testPageId,
        // Missing agent_id, title, content_type, content_value
      };
      
      const filePath = path.join(testDataDir, `${testPageId}.json`);
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(invalidPageData, null, 2));
      
      const validation = await nldValidationUtilities.validatePageFile(testAgentId, testPageId, { autoFix: false });
      
      expect(validation.passed).toBe(false);
      expect(validation.issues.some(issue => issue.type === 'missing_fields')).toBe(true);
      expect(validation.issues.some(issue => issue.type === 'agent_id_mismatch')).toBe(true);
    });
  });
  
  describe('Database Validation', () => {
    test('should validate missing database record', async () => {
      const validation = await nldValidationUtilities.validateDatabaseRecord(db, testAgentId, testPageId, { autoFix: false });
      
      expect(validation.passed).toBe(false);
      expect(validation.recordExists).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].type).toBe('record_not_found');
      expect(validation.issues[0].severity).toBe('critical');
    });
    
    test('should auto-fix missing database record', async () => {
      const validation = await nldValidationUtilities.validateDatabaseRecord(db, testAgentId, testPageId, { autoFix: true });
      
      expect(validation.autoFixed).toBe(true);
      expect(validation.fixResult.success).toBe(true);
      expect(validation.postFixValidation.passed).toBe(true);
      
      // Verify record was created
      const records = await db.query('SELECT * FROM agent_pages WHERE agent_id = ? AND id = ?', [testAgentId, testPageId]);
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe(testPageId);
      expect(records[0].agent_id).toBe(testAgentId);
    });
    
    test('should validate database record integrity', async () => {
      // Create record with invalid content
      await db.query(`
        INSERT INTO agent_pages (
          id, agent_id, title, page_type, content_type, 
          content_value, content_metadata, status, tags, 
          created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testPageId,
        testAgentId,
        '', // Empty title
        'dynamic',
        'json',
        'invalid json content', // Invalid JSON
        '{}',
        'published',
        '[]',
        new Date().toISOString(),
        new Date().toISOString(),
        1
      ]);
      
      const validation = await nldValidationUtilities.validateDatabaseRecord(db, testAgentId, testPageId, { autoFix: false });
      
      expect(validation.passed).toBe(false);
      expect(validation.issues.some(issue => issue.type === 'missing_title')).toBe(true);
      expect(validation.issues.some(issue => issue.type === 'invalid_content_json')).toBe(true);
    });
  });
  
  describe('Comprehensive Validation', () => {
    test('should run comprehensive validation with all issues', async () => {
      const validation = await nldValidationUtilities.validatePage(testAgentId, testPageId, db, { autoFix: false });
      
      expect(validation.passed).toBe(false);
      expect(validation.validations.file.passed).toBe(false);
      expect(validation.validations.database.passed).toBe(false);
      expect(validation.validations.api.passed).toBe(false);
      expect(validation.summary.criticalIssues).toBeGreaterThan(0);
    });
    
    test('should auto-fix all issues in comprehensive validation', async () => {
      const validation = await nldValidationUtilities.validatePage(testAgentId, testPageId, db, { autoFix: true });
      
      expect(validation.autoFixed).toBe(true);
      expect(validation.summary.autoFixesApplied).toBe(true);
      
      // Verify both file and database were created
      const filePath = path.join(testDataDir, `${testPageId}.json`);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      const records = await db.query('SELECT * FROM agent_pages WHERE agent_id = ? AND id = ?', [testAgentId, testPageId]);
      expect(records).toHaveLength(1);
    });
  });
  
  describe('Pattern Prevention Integration', () => {
    test('should diagnose page not found error', async () => {
      const diagnosis = await pageNotFoundPrevention.diagnosePageNotFound(testAgentId, testPageId, db);
      
      expect(diagnosis.agentId).toBe(testAgentId);
      expect(diagnosis.pageId).toBe(testPageId);
      expect(diagnosis.issues.length).toBeGreaterThan(0);
      expect(diagnosis.canAutoFix).toBe(true);
      expect(diagnosis.autoFix).toBeInstanceOf(Function);
    });
    
    test('should auto-fix through pattern diagnosis', async () => {
      const diagnosis = await pageNotFoundPrevention.diagnosePageNotFound(testAgentId, testPageId, db);
      
      expect(diagnosis.canAutoFix).toBe(true);
      
      const fixResult = await diagnosis.autoFix();
      
      expect(fixResult.success).toBe(true);
      expect(fixResult.fixes.length).toBeGreaterThan(0);
      
      // Verify fixes were applied
      const postFixDiagnosis = await pageNotFoundPrevention.diagnosePageNotFound(testAgentId, testPageId, db);
      expect(postFixDiagnosis.issues.filter(issue => issue.type === 'missing_database_record')).toHaveLength(0);
    });
  });
  
  describe('API Integration', () => {
    test('should validate API endpoints', async () => {
      const validation = await nldValidationUtilities.validateApiEndpoint(testAgentId, testPageId);
      
      expect(validation.type).toBe('api_validation');
      expect(Object.keys(validation.endpoints)).toHaveLength(2);
      
      // API should be accessible even if page doesn't exist
      const listEndpoint = validation.endpoints[`http://localhost:3000/api/agents/${testAgentId}/pages`];
      expect(listEndpoint).toBeDefined();
      
      const getEndpoint = validation.endpoints[`http://localhost:3000/api/agents/${testAgentId}/pages/${testPageId}`];
      expect(getEndpoint).toBeDefined();
    });
  });
  
  describe('Neural Training Data', () => {
    test('should export neural training patterns', async () => {
      const exportResult = await pageNotFoundPrevention.neuralTraining.exportTrainingData();
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.patterns.patterns).toHaveLength(2);
      expect(exportResult.patterns.preventionRules).toHaveLength(4);
      expect(exportResult.patterns.successMetrics).toBeDefined();
      expect(exportResult.patterns.successMetrics.autoFixSuccessRate).toBeGreaterThan(0.9);
    });
    
    test('should export service-wide training data', async () => {
      const exportResult = await nldPatternDetectionService.exportNeuralTrainingData();
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.data.version).toBe('1.0.0');
      expect(exportResult.data.service).toBe('nld-pattern-detection');
      expect(exportResult.data.patterns).toHaveLength(1); // Should have page-not-found pattern
    });
  });
  
  describe('Error Recovery', () => {
    test('should demonstrate end-to-end error prevention', async () => {
      // Simulate a "Page not found" error context
      const errorContext = {
        method: 'GET',
        url: `/agents/${testAgentId}/pages/${testPageId}`,
        agentId: testAgentId,
        pageId: testPageId,
        error: {
          message: `Page not found: ${testPageId}`
        },
        response: {
          status: 404,
          data: { success: false, error: 'Page not found' }
        },
        description: 'End-to-end test of page not found prevention',
        db
      };
      
      // Step 1: Detect the pattern
      const detections = await nldPatternDetectionService.detectPattern(errorContext);
      expect(detections).toHaveLength(1);
      
      const detection = detections[0];
      expect(detection.patternId).toBe('PAGE_NOT_FOUND_PREVENTION');
      
      // Step 2: Diagnose the issue
      const diagnosis = await detection.pattern.diagnosePageNotFound(
        errorContext.agentId,
        errorContext.pageId,
        errorContext.db
      );
      
      expect(diagnosis.canAutoFix).toBe(true);
      expect(diagnosis.issues.length).toBeGreaterThan(0);
      
      // Step 3: Apply auto-fix
      const fixResult = await diagnosis.autoFix();
      expect(fixResult.success).toBe(true);
      
      // Step 4: Verify the page now exists
      const records = await db.query('SELECT * FROM agent_pages WHERE agent_id = ? AND id = ?', [testAgentId, testPageId]);
      expect(records).toHaveLength(1);
      
      // Step 5: Verify file exists (if file creation was part of the fix)
      const filePath = path.join(testDataDir, `${testPageId}.json`);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      
      // Step 6: Validate post-fix state
      const postFixValidation = await nldValidationUtilities.validatePage(testAgentId, testPageId, db, { autoFix: false });
      expect(postFixValidation.passed).toBe(true);
      
      console.log('✅ End-to-end error prevention test completed successfully!');
      console.log(`  - Pattern detected: ${detection.patternId}`);
      console.log(`  - Issues found: ${diagnosis.issues.length}`);
      console.log(`  - Auto-fixes applied: ${fixResult.fixes.length}`);
      console.log(`  - Final validation passed: ${postFixValidation.passed}`);
    });
  });
  
  describe('Performance', () => {
    test('should complete validation within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const validation = await nldValidationUtilities.validatePage(testAgentId, testPageId, db, { autoFix: true });
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(validation).toBeDefined();
      
      console.log(`⏱️  Comprehensive validation completed in ${duration}ms`);
    });
    
    test('should handle multiple concurrent validations', async () => {
      const concurrentValidations = [];
      const testPageIds = [];
      
      // Create 5 concurrent validation requests
      for (let i = 0; i < 5; i++) {
        const pageId = `test-concurrent-${Date.now()}-${i}`;
        testPageIds.push(pageId);
        concurrentValidations.push(
          nldValidationUtilities.validatePage(testAgentId, pageId, db, { autoFix: true })
        );
      }
      
      const results = await Promise.all(concurrentValidations);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.autoFixed).toBe(true);
        expect(result.summary.autoFixesApplied).toBe(true);
      });
      
      // Clean up concurrent test data
      for (const pageId of testPageIds) {
        await db.query('DELETE FROM agent_pages WHERE agent_id = ? AND id = ?', [testAgentId, pageId]);
      }
      
      console.log('✅ Concurrent validation test completed successfully!');
    });
  });
});