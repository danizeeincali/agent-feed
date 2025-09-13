/**
 * NLD Validation and Auto-Fix Utilities
 * Comprehensive validation and automatic fixing utilities for preventing errors
 * Integrates with pattern detection service for proactive error prevention
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import nldPatternDetectionService from './pattern-detection-service.js';

export class NLDValidationUtilities {
  constructor(options = {}) {
    this.autoFix = options.autoFix !== false;
    this.logValidations = options.logValidations !== false;
    this.validationCache = new Map();
    this.fixHistory = [];
    
    console.log('⚙️ NLD: Validation Utilities initialized');
  }
  
  // ==================== FILE SYSTEM VALIDATION ====================
  
  /**
   * Validate that a page file exists and has correct structure
   */
  async validatePageFile(agentId, pageId, options = {}) {
    const validation = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agentId,
      pageId,
      type: 'file_validation',
      passed: false,
      issues: [],
      autoFixed: false,
      recommendations: []
    };
    
    try {
      const filePath = path.join('/workspaces/agent-feed/data/pages', agentId, `${pageId}.json`);
      validation.filePath = filePath;
      
      // Check if file exists
      try {
        await fs.access(filePath);
        validation.fileExists = true;
        
        // Validate file content
        const content = await fs.readFile(filePath, 'utf8');
        const pageData = JSON.parse(content);
        
        // Validate required fields
        const requiredFields = ['id', 'agent_id', 'title', 'content_type', 'content_value'];
        const missingFields = requiredFields.filter(field => !pageData[field]);
        
        if (missingFields.length > 0) {
          validation.issues.push({
            type: 'missing_fields',
            fields: missingFields,
            severity: 'high'
          });
          validation.recommendations.push('Add missing required fields to page data');
        }
        
        // Validate ID consistency
        if (pageData.id !== pageId) {
          validation.issues.push({
            type: 'id_mismatch',
            expected: pageId,
            actual: pageData.id,
            severity: 'high'
          });
          validation.recommendations.push('Fix page ID mismatch');
        }
        
        // Validate agent ID consistency
        if (pageData.agent_id !== agentId) {
          validation.issues.push({
            type: 'agent_id_mismatch',
            expected: agentId,
            actual: pageData.agent_id,
            severity: 'high'
          });
          validation.recommendations.push('Fix agent ID mismatch');
        }
        
        // Validate content structure
        if (pageData.content_type === 'json' && typeof pageData.content_value === 'string') {
          try {
            JSON.parse(pageData.content_value);
          } catch (error) {
            validation.issues.push({
              type: 'invalid_json_content',
              error: error.message,
              severity: 'medium'
            });
            validation.recommendations.push('Fix JSON syntax in content_value');
          }
        }
        
        validation.pageData = pageData;
      } catch (error) {
        if (error.code === 'ENOENT') {
          validation.fileExists = false;
          validation.issues.push({
            type: 'file_not_found',
            path: filePath,
            severity: 'critical'
          });
          validation.recommendations.push('Create missing page file');
        } else {
          validation.issues.push({
            type: 'file_access_error',
            error: error.message,
            severity: 'high'
          });
        }
      }
      
      // Determine if validation passed
      const criticalIssues = validation.issues.filter(issue => issue.severity === 'critical');
      validation.passed = criticalIssues.length === 0;
      
      // Attempt auto-fix if enabled and issues exist
      if (this.autoFix && validation.issues.length > 0 && options.autoFix !== false) {
        const fixResult = await this.autoFixPageFile(validation);
        validation.autoFixed = fixResult.success;
        validation.fixResult = fixResult;
        
        if (fixResult.success) {
          // Re-validate after fix
          validation.postFixValidation = await this.validatePageFile(agentId, pageId, { autoFix: false });
          validation.passed = validation.postFixValidation.passed;
        }
      }
      
      // Log validation if enabled
      if (this.logValidations) {
        await this.logValidation(validation);
      }
      
      return validation;
    } catch (error) {
      validation.error = error.message;
      validation.passed = false;
      return validation;
    }
  }
  
  /**
   * Auto-fix page file issues
   */
  async autoFixPageFile(validation) {
    const fixResult = {
      success: false,
      fixes: [],
      errors: []
    };
    
    try {
      for (const issue of validation.issues) {
        let fix;
        
        switch (issue.type) {
          case 'file_not_found':
            fix = await this.createMissingPageFile(validation.agentId, validation.pageId, issue.path);
            break;
            
          case 'missing_fields':
            fix = await this.addMissingFields(validation.filePath, validation.pageData, issue.fields);
            break;
            
          case 'id_mismatch':
            fix = await this.fixIdMismatch(validation.filePath, validation.pageData, validation.pageId);
            break;
            
          case 'agent_id_mismatch':
            fix = await this.fixAgentIdMismatch(validation.filePath, validation.pageData, validation.agentId);
            break;
            
          case 'invalid_json_content':
            fix = await this.fixInvalidJsonContent(validation.filePath, validation.pageData);
            break;
            
          default:
            fix = { success: false, error: `Unknown issue type: ${issue.type}` };
        }
        
        if (fix.success) {
          fixResult.fixes.push({ issue: issue.type, result: fix });
        } else {
          fixResult.errors.push({ issue: issue.type, error: fix.error });
        }
      }
      
      fixResult.success = fixResult.fixes.length > 0 && fixResult.errors.length === 0;
      
      // Log fix attempt
      this.fixHistory.push({
        id: validation.id,
        timestamp: new Date().toISOString(),
        validation,
        fixResult
      });
      
      return fixResult;
    } catch (error) {
      fixResult.error = error.message;
      return fixResult;
    }
  }
  
  // ==================== DATABASE VALIDATION ====================
  
  /**
   * Validate that database record exists and is consistent
   */
  async validateDatabaseRecord(db, agentId, pageId, options = {}) {
    const validation = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agentId,
      pageId,
      type: 'database_validation',
      passed: false,
      issues: [],
      autoFixed: false,
      recommendations: []
    };
    
    try {
      const query = `
        SELECT id, agent_id, title, page_type, content_type, 
               content_value, content_metadata, status, 
               created_at, updated_at, version
        FROM agent_pages 
        WHERE agent_id = ? AND id = ?
      `;
      
      const results = await db.query(query, [agentId, pageId]);
      validation.recordCount = results.length;
      
      if (results.length === 0) {
        validation.issues.push({
          type: 'record_not_found',
          severity: 'critical'
        });
        validation.recommendations.push('Create missing database record');
      } else if (results.length > 1) {
        validation.issues.push({
          type: 'duplicate_records',
          count: results.length,
          severity: 'high'
        });
        validation.recommendations.push('Remove duplicate database records');
      } else {
        const record = results[0];
        validation.record = record;
        
        // Validate record integrity
        if (!record.title || record.title.trim() === '') {
          validation.issues.push({
            type: 'missing_title',
            severity: 'medium'
          });
          validation.recommendations.push('Add meaningful title to page record');
        }
        
        if (!record.content_value) {
          validation.issues.push({
            type: 'missing_content',
            severity: 'high'
          });
          validation.recommendations.push('Add content to page record');
        } else {
          // Validate JSON content
          try {
            JSON.parse(record.content_value);
          } catch (error) {
            validation.issues.push({
              type: 'invalid_content_json',
              error: error.message,
              severity: 'high'
            });
            validation.recommendations.push('Fix invalid JSON in content_value');
          }
        }
        
        // Validate timestamps
        if (!record.created_at || !record.updated_at) {
          validation.issues.push({
            type: 'missing_timestamps',
            severity: 'low'
          });
          validation.recommendations.push('Add missing timestamps');
        }
      }
      
      // Determine if validation passed
      const criticalIssues = validation.issues.filter(issue => issue.severity === 'critical');
      validation.passed = criticalIssues.length === 0;
      
      // Attempt auto-fix if enabled
      if (this.autoFix && validation.issues.length > 0 && options.autoFix !== false) {
        const fixResult = await this.autoFixDatabaseRecord(db, validation);
        validation.autoFixed = fixResult.success;
        validation.fixResult = fixResult;
        
        if (fixResult.success) {
          // Re-validate after fix
          validation.postFixValidation = await this.validateDatabaseRecord(db, agentId, pageId, { autoFix: false });
          validation.passed = validation.postFixValidation.passed;
        }
      }
      
      // Log validation if enabled
      if (this.logValidations) {
        await this.logValidation(validation);
      }
      
      return validation;
    } catch (error) {
      validation.error = error.message;
      validation.passed = false;
      return validation;
    }
  }
  
  /**
   * Auto-fix database record issues
   */
  async autoFixDatabaseRecord(db, validation) {
    const fixResult = {
      success: false,
      fixes: [],
      errors: []
    };
    
    try {
      for (const issue of validation.issues) {
        let fix;
        
        switch (issue.type) {
          case 'record_not_found':
            fix = await this.createMissingDatabaseRecord(db, validation.agentId, validation.pageId);
            break;
            
          case 'duplicate_records':
            fix = await this.removeDuplicateRecords(db, validation.agentId, validation.pageId);
            break;
            
          case 'missing_title':
            fix = await this.addDefaultTitle(db, validation.record, validation.pageId);
            break;
            
          case 'missing_content':
            fix = await this.addDefaultContent(db, validation.record);
            break;
            
          case 'invalid_content_json':
            fix = await this.fixInvalidContentJson(db, validation.record);
            break;
            
          case 'missing_timestamps':
            fix = await this.addMissingTimestamps(db, validation.record);
            break;
            
          default:
            fix = { success: false, error: `Unknown issue type: ${issue.type}` };
        }
        
        if (fix.success) {
          fixResult.fixes.push({ issue: issue.type, result: fix });
        } else {
          fixResult.errors.push({ issue: issue.type, error: fix.error });
        }
      }
      
      fixResult.success = fixResult.fixes.length > 0 && fixResult.errors.length === 0;
      
      return fixResult;
    } catch (error) {
      fixResult.error = error.message;
      return fixResult;
    }
  }
  
  // ==================== API VALIDATION ====================
  
  /**
   * Validate API endpoint accessibility
   */
  async validateApiEndpoint(agentId, pageId, options = {}) {
    const validation = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agentId,
      pageId,
      type: 'api_validation',
      passed: false,
      endpoints: {},
      issues: [],
      recommendations: []
    };
    
    const baseUrl = options.baseUrl || 'http://localhost:3000';
    const endpoints = [
      `${baseUrl}/api/agents/${agentId}/pages`,
      `${baseUrl}/api/agents/${agentId}/pages/${pageId}`
    ];
    
    try {
      for (const endpoint of endpoints) {
        const endpointValidation = await this.validateSingleEndpoint(endpoint);
        validation.endpoints[endpoint] = endpointValidation;
        
        if (!endpointValidation.accessible) {
          validation.issues.push({
            type: 'endpoint_not_accessible',
            endpoint,
            error: endpointValidation.error,
            severity: 'high'
          });
        }
        
        if (endpointValidation.status === 404) {
          validation.issues.push({
            type: 'endpoint_returns_404',
            endpoint,
            severity: 'critical'
          });
        }
      }
      
      const accessibleEndpoints = Object.values(validation.endpoints).filter(e => e.accessible).length;
      validation.passed = accessibleEndpoints === endpoints.length;
      
      return validation;
    } catch (error) {
      validation.error = error.message;
      validation.passed = false;
      return validation;
    }
  }
  
  /**
   * Validate a single API endpoint
   */
  async validateSingleEndpoint(endpoint) {
    const validation = {
      endpoint,
      accessible: false,
      status: 0,
      response: null,
      error: null,
      timing: {
        start: Date.now(),
        end: null,
        duration: null
      }
    };
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: 5000
      });
      
      validation.timing.end = Date.now();
      validation.timing.duration = validation.timing.end - validation.timing.start;
      validation.status = response.status;
      validation.accessible = true;
      
      if (response.ok) {
        validation.response = await response.json();
      } else {
        validation.response = await response.text();
      }
    } catch (error) {
      validation.timing.end = Date.now();
      validation.timing.duration = validation.timing.end - validation.timing.start;
      validation.error = error.message;
      validation.accessible = false;
    }
    
    return validation;
  }
  
  // ==================== AUTO-FIX IMPLEMENTATIONS ====================
  
  async createMissingPageFile(agentId, pageId, filePath) {
    try {
      const defaultPageData = {
        id: pageId,
        agent_id: agentId,
        title: `Page ${pageId}`,
        page_type: 'dynamic',
        content_type: 'json',
        content_value: {
          components: [],
          template: 'custom'
        },
        content_metadata: {},
        status: 'published',
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      };
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(defaultPageData, null, 2));
      
      return {
        success: true,
        action: 'created_file',
        path: filePath,
        data: defaultPageData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        action: 'create_file_failed'
      };
    }
  }
  
  async createMissingDatabaseRecord(db, agentId, pageId) {
    try {
      const defaultPageData = {
        id: pageId,
        agent_id: agentId,
        title: `Auto-created Page ${pageId}`,
        page_type: 'dynamic',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [],
          template: 'custom'
        }),
        content_metadata: JSON.stringify({}),
        status: 'published',
        tags: JSON.stringify([]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      };
      
      await db.query(`
        INSERT INTO agent_pages (
          id, agent_id, title, page_type, content_type, 
          content_value, content_metadata, status, tags, 
          created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        defaultPageData.id,
        defaultPageData.agent_id,
        defaultPageData.title,
        defaultPageData.page_type,
        defaultPageData.content_type,
        defaultPageData.content_value,
        defaultPageData.content_metadata,
        defaultPageData.status,
        defaultPageData.tags,
        defaultPageData.created_at,
        defaultPageData.updated_at,
        defaultPageData.version
      ]);
      
      return {
        success: true,
        action: 'created_database_record',
        data: defaultPageData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        action: 'create_database_record_failed'
      };
    }
  }
  
  // ==================== COMPREHENSIVE VALIDATION ====================
  
  /**
   * Run comprehensive validation on a page (file + database + API)
   */
  async validatePage(agentId, pageId, db, options = {}) {
    const comprehensiveValidation = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agentId,
      pageId,
      type: 'comprehensive_validation',
      passed: false,
      validations: {},
      issues: [],
      autoFixed: false,
      summary: {}
    };
    
    try {
      // Run all validation types
      const [fileValidation, dbValidation, apiValidation] = await Promise.all([
        this.validatePageFile(agentId, pageId, options),
        this.validateDatabaseRecord(db, agentId, pageId, options),
        this.validateApiEndpoint(agentId, pageId, options)
      ]);
      
      comprehensiveValidation.validations = {
        file: fileValidation,
        database: dbValidation,
        api: apiValidation
      };
      
      // Collect all issues
      const allIssues = [
        ...fileValidation.issues.map(issue => ({ ...issue, source: 'file' })),
        ...dbValidation.issues.map(issue => ({ ...issue, source: 'database' })),
        ...apiValidation.issues.map(issue => ({ ...issue, source: 'api' }))
      ];
      
      comprehensiveValidation.issues = allIssues;
      
      // Determine overall pass/fail
      const criticalIssues = allIssues.filter(issue => issue.severity === 'critical');
      comprehensiveValidation.passed = criticalIssues.length === 0;
      
      // Check if any auto-fixes were applied
      comprehensiveValidation.autoFixed = [
        fileValidation.autoFixed,
        dbValidation.autoFixed
      ].some(fixed => fixed);
      
      // Generate summary
      comprehensiveValidation.summary = {
        totalIssues: allIssues.length,
        criticalIssues: criticalIssues.length,
        highIssues: allIssues.filter(issue => issue.severity === 'high').length,
        mediumIssues: allIssues.filter(issue => issue.severity === 'medium').length,
        lowIssues: allIssues.filter(issue => issue.severity === 'low').length,
        fileValidationPassed: fileValidation.passed,
        databaseValidationPassed: dbValidation.passed,
        apiValidationPassed: apiValidation.passed,
        overallPassed: comprehensiveValidation.passed,
        autoFixesApplied: comprehensiveValidation.autoFixed
      };
      
      // Report to pattern detection service
      if (!comprehensiveValidation.passed) {
        await nldPatternDetectionService.detectPattern({
          type: 'validation_failure',
          agentId,
          pageId,
          url: `/agents/${agentId}/pages/${pageId}`,
          error: {
            message: `Comprehensive validation failed: ${criticalIssues.length} critical issues found`,
            details: allIssues
          },
          description: `Page validation failed with ${allIssues.length} issues across ${Object.keys(comprehensiveValidation.validations).length} validation types`,
          db
        });
      }
      
      return comprehensiveValidation;
    } catch (error) {
      comprehensiveValidation.error = error.message;
      comprehensiveValidation.passed = false;
      return comprehensiveValidation;
    }
  }
  
  // ==================== UTILITY METHODS ====================
  
  async logValidation(validation) {
    const logEntry = {
      timestamp: validation.timestamp,
      type: 'nld_validation',
      data: validation
    };
    
    const logPath = '/workspaces/agent-feed/src/nld-patterns/validation-log.jsonl';
    
    try {
      await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('❌ Failed to log validation:', error);
    }
  }
  
  getValidationStats() {
    return {
      cacheSize: this.validationCache.size,
      fixHistoryCount: this.fixHistory.length,
      recentFixes: this.fixHistory.slice(-10),
      autoFixEnabled: this.autoFix,
      validationLoggingEnabled: this.logValidations
    };
  }
  
  clearCache() {
    this.validationCache.clear();
    console.log('🧽 NLD: Validation cache cleared');
  }
  
  clearFixHistory() {
    this.fixHistory = [];
    console.log('🧽 NLD: Fix history cleared');
  }
}

// Create singleton instance
export const nldValidationUtilities = new NLDValidationUtilities();

export default nldValidationUtilities;