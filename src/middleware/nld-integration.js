/**
 * NLD Integration Middleware
 * Integrates Never Let Down pattern detection and prevention into API routes
 * Provides proactive error prevention for the entire application
 */

import nldPatternDetectionService from '../nld-patterns/pattern-detection-service.js';
import nldValidationUtilities from '../nld-patterns/validation-utilities.js';
import DatabaseService from '../database/DatabaseService.js';

/**
 * NLD Pre-Request Middleware
 * Validates requests before they reach route handlers
 */
export const nldPreRequestMiddleware = async (req, res, next) => {
  try {
    // Add NLD context to request
    req.nld = {
      startTime: Date.now(),
      requestId: `nld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      patterns: [],
      validations: [],
      autoFixes: []
    };
    
    // Extract context for pattern detection
    const context = {
      method: req.method,
      url: req.originalUrl,
      agentId: req.params.agentId,
      pageId: req.params.pageId,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    // For page-related requests, run proactive validation
    if (context.agentId && context.pageId && req.method === 'GET') {
      console.log(`🔍 NLD: Proactive validation for ${context.agentId}/${context.pageId}`);
      
      try {
        const db = DatabaseService.getInstance();
        const validation = await nldValidationUtilities.validatePage(
          context.agentId, 
          context.pageId, 
          db,
          { autoFix: true }
        );
        
        req.nld.validations.push(validation);
        
        // If validation failed but was auto-fixed, continue normally
        if (!validation.passed && validation.autoFixed) {
          console.log(`✅ NLD: Auto-fixed validation issues for ${context.agentId}/${context.pageId}`);
          req.nld.autoFixes.push({
            type: 'proactive_validation_fix',
            validation: validation
          });
        }
        
        // If validation failed and couldn't be auto-fixed, detect patterns
        if (!validation.passed && !validation.autoFixed) {
          console.log(`🚨 NLD: Validation failed, detecting patterns...`);
          
          const detections = await nldPatternDetectionService.detectPattern({
            ...context,
            error: {
              message: `Validation failed: ${validation.summary.totalIssues} issues found`,
              details: validation.issues
            },
            description: `Proactive validation detected ${validation.summary.criticalIssues} critical issues`,
            db
          });
          
          req.nld.patterns.push(...detections);
        }
      } catch (error) {
        console.warn(`⚠️ NLD: Proactive validation failed:`, error);
        
        // Still proceed with request, but log the issue
        await nldPatternDetectionService.detectPattern({
          ...context,
          error: {
            message: `Proactive validation error: ${error.message}`,
            stack: error.stack
          },
          description: 'Proactive validation threw an error',
          db: DatabaseService.getInstance()
        });
      }
    }
    
    next();
  } catch (error) {
    console.error(`❌ NLD: Pre-request middleware error:`, error);
    next(); // Continue with request even if NLD fails
  }
};

/**
 * NLD Post-Response Middleware
 * Analyzes responses for patterns and logs successes
 */
export const nldPostResponseMiddleware = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Intercept res.send()
  res.send = function(data) {
    handleNLDPostResponse(req, res, data);
    return originalSend.call(this, data);
  };
  
  // Intercept res.json()
  res.json = function(data) {
    handleNLDPostResponse(req, res, data);
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Handle NLD post-response analysis
 */
async function handleNLDPostResponse(req, res, data) {
  try {
    if (!req.nld) return;
    
    const responseTime = Date.now() - req.nld.startTime;
    const context = {
      method: req.method,
      url: req.originalUrl,
      agentId: req.params.agentId,
      pageId: req.params.pageId,
      status: res.statusCode,
      responseTime,
      timestamp: new Date().toISOString()
    };
    
    // Check for error responses
    if (res.statusCode >= 400) {
      console.log(`🚨 NLD: Error response detected (${res.statusCode}) for ${req.originalUrl}`);
      
      let errorMessage = 'Unknown error';
      let errorDetails = null;
      
      try {
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object' && data.error) {
          errorMessage = data.error;
          errorDetails = data;
        }
      } catch (parseError) {
        // Ignore parsing errors
      }
      
      // Detect patterns for error responses
      const detections = await nldPatternDetectionService.detectPattern({
        ...context,
        error: {
          message: errorMessage,
          details: errorDetails
        },
        response: {
          status: res.statusCode,
          data: typeof data === 'object' ? data : { message: data }
        },
        description: `HTTP ${res.statusCode} error response`,
        db: DatabaseService.getInstance()
      });
      
      req.nld.patterns.push(...detections);
    } else {
      // Success response - log for learning
      if (req.nld.autoFixes.length > 0) {
        console.log(`✅ NLD: Successful response after auto-fix for ${req.originalUrl}`);
        
        // Log successful auto-fix for neural training
        for (const autoFix of req.nld.autoFixes) {
          await nldPatternDetectionService.emit('autoFixSuccess', {
            context,
            autoFix,
            responseTime
          });
        }
      }
    }
    
    // Log request summary
    if (req.nld.patterns.length > 0 || req.nld.autoFixes.length > 0) {
      console.log(`📊 NLD Request Summary [${req.nld.requestId}]:`);
      console.log(`  URL: ${req.originalUrl}`);
      console.log(`  Status: ${res.statusCode}`);
      console.log(`  Response Time: ${responseTime}ms`);
      console.log(`  Patterns Detected: ${req.nld.patterns.length}`);
      console.log(`  Auto-fixes Applied: ${req.nld.autoFixes.length}`);
      console.log(`  Validations Run: ${req.nld.validations.length}`);
    }
  } catch (error) {
    console.error(`❌ NLD: Post-response middleware error:`, error);
  }
}

/**
 * NLD Error Handler Middleware
 * Catches errors and attempts pattern-based recovery
 */
export const nldErrorHandler = async (error, req, res, next) => {
  try {
    const context = {
      method: req.method,
      url: req.originalUrl,
      agentId: req.params.agentId,
      pageId: req.params.pageId,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      description: `Server error during ${req.method} ${req.originalUrl}`,
      db: DatabaseService.getInstance()
    };
    
    console.log(`❌ NLD: Error handler triggered for ${req.originalUrl}: ${error.message}`);
    
    // Detect patterns for the error
    const detections = await nldPatternDetectionService.detectPattern(context);
    
    // Check if any patterns have auto-recovery mechanisms
    let recovered = false;
    for (const detection of detections) {
      if (detection.pattern.autoFix && detection.pattern.autoFix.enabled) {
        try {
          console.log(`🔧 NLD: Attempting recovery using pattern: ${detection.patternId}`);
          
          // Attempt pattern-specific recovery
          if (detection.pattern.diagnosePageNotFound) {
            const diagnosis = await detection.pattern.diagnosePageNotFound(
              context.agentId,
              context.pageId,
              context.db
            );
            
            if (diagnosis.canAutoFix) {
              const fixResult = await diagnosis.autoFix();
              
              if (fixResult.success) {
                console.log(`✅ NLD: Successfully recovered from error using auto-fix`);
                
                // Retry the original request logic
                if (context.method === 'GET' && context.agentId && context.pageId) {
                  try {
                    const db = DatabaseService.getInstance();
                    const pages = await db.query(`
                      SELECT * FROM agent_pages 
                      WHERE agent_id = ? AND id = ?
                    `, [context.agentId, context.pageId]);
                    
                    if (pages.length > 0) {
                      const page = pages[0];
                      const processedPage = {
                        ...page,
                        content_value: page.content_value ? JSON.parse(page.content_value) : null,
                        content_metadata: page.content_metadata ? JSON.parse(page.content_metadata) : {},
                        tags: page.tags ? JSON.parse(page.tags) : []
                      };
                      
                      res.json({
                        success: true,
                        agent_id: context.agentId,
                        page: processedPage,
                        _nld: {
                          recovered: true,
                          pattern: detection.patternId,
                          fixes: fixResult.fixes
                        }
                      });
                      
                      recovered = true;
                      return; // Exit early, response sent
                    }
                  } catch (retryError) {
                    console.warn(`⚠️ NLD: Recovery retry failed:`, retryError);
                  }
                }
              }
            }
          }
        } catch (recoveryError) {
          console.warn(`⚠️ NLD: Recovery attempt failed for pattern ${detection.patternId}:`, recoveryError);
        }
      }
    }
    
    // If no recovery was possible, proceed with normal error handling
    if (!recovered) {
      // For "Page not found" errors, provide enhanced error response
      if (error.message === 'Page not found' || error.message.includes('Page not found')) {
        res.status(404).json({
          success: false,
          error: 'Page not found',
          message: `Page with ID "${context.pageId}" not found for agent "${context.agentId}"`,
          _nld: {
            patternsDetected: detections.length,
            detections: detections.map(d => d.patternId),
            suggestion: 'This error has been logged for analysis and prevention improvements',
            canAutoRecover: detections.some(d => d.pattern.autoFix?.enabled)
          }
        });
      } else {
        // Pass through to default error handler
        next(error);
      }
    }
  } catch (middlewareError) {
    console.error(`❌ NLD: Error handler middleware failed:`, middlewareError);
    next(error); // Pass through original error
  }
};

/**
 * NLD Health Check Middleware
 * Provides NLD system status and statistics
 */
export const nldHealthCheck = async (req, res, next) => {
  try {
    if (req.path === '/api/nld/health') {
      const stats = nldPatternDetectionService.getStats();
      const validationStats = nldValidationUtilities.getValidationStats();
      
      res.json({
        success: true,
        service: 'nld-pattern-detection',
        version: '1.0.0',
        status: 'healthy',
        uptime: process.uptime(),
        statistics: {
          patternDetection: stats,
          validation: validationStats
        },
        capabilities: {
          autoFix: true,
          proactiveValidation: true,
          neuralTraining: true,
          realTimeMonitoring: true
        },
        endpoints: {
          health: '/api/nld/health',
          stats: '/api/nld/stats',
          patterns: '/api/nld/patterns',
          export: '/api/nld/export'
        }
      });
      return; // Don't call next()
    }
    
    next();
  } catch (error) {
    console.error('❌ NLD: Health check failed:', error);
    next();
  }
};

/**
 * NLD Stats Endpoint Middleware
 */
export const nldStatsEndpoint = async (req, res, next) => {
  try {
    if (req.path === '/api/nld/stats') {
      const stats = nldPatternDetectionService.getStats();
      const validationStats = nldValidationUtilities.getValidationStats();
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        statistics: {
          patterns: stats,
          validation: validationStats,
          system: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version
          }
        }
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('❌ NLD: Stats endpoint failed:', error);
    next();
  }
};

/**
 * NLD Export Endpoint Middleware
 */
export const nldExportEndpoint = async (req, res, next) => {
  try {
    if (req.path === '/api/nld/export') {
      const exportResult = await nldPatternDetectionService.exportNeuralTrainingData();
      
      if (exportResult.success) {
        res.json({
          success: true,
          message: 'Neural training data exported successfully',
          export: exportResult
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to export neural training data',
          details: exportResult.error
        });
      }
      return;
    }
    
    next();
  } catch (error) {
    console.error('❌ NLD: Export endpoint failed:', error);
    next();
  }
};

// Export all middleware functions
export default {
  preRequest: nldPreRequestMiddleware,
  postResponse: nldPostResponseMiddleware,
  errorHandler: nldErrorHandler,
  healthCheck: nldHealthCheck,
  statsEndpoint: nldStatsEndpoint,
  exportEndpoint: nldExportEndpoint
};