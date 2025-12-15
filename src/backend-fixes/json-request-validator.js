/**
 * SPARC JSON Request Validator  
 * Prevents malformed JSON parsing errors
 * Part of SPARC Phase 4: Refinement - Request Integrity
 */

import express from 'express';

class JSONRequestValidator {
  constructor() {
    this.validationOptions = {
      strict: true,
      limit: '10mb',
      type: 'application/json'
    };
  }

  // Enhanced JSON parser middleware with comprehensive error handling
  createJsonParserMiddleware() {
    return (req, res, next) => {
      // Skip non-JSON requests
      if (!req.is('application/json')) {
        return next();
      }

      // Custom body parsing with detailed error handling
      let rawBody = '';
      
      req.on('data', chunk => {
        rawBody += chunk.toString();
      });

      req.on('end', () => {
        try {
          // Validate raw body before parsing
          if (!rawBody || rawBody.trim().length === 0) {
            console.warn('⚠️ SPARC JSON VALIDATOR: Empty request body received');
            req.body = {};
            return next();
          }

          // Check for common malformed patterns
          const trimmedBody = rawBody.trim();
          if (!trimmedBody.startsWith('{') && !trimmedBody.startsWith('[')) {
            throw new SyntaxError('JSON must start with { or [');
          }

          if (!trimmedBody.endsWith('}') && !trimmedBody.endsWith(']')) {
            throw new SyntaxError('JSON must end with } or ]');
          }

          // Attempt to parse JSON
          const parsedBody = JSON.parse(rawBody);
          req.body = parsedBody;

          console.log(`✅ SPARC JSON VALIDATOR: Successfully parsed JSON (${rawBody.length} bytes)`);
          next();

        } catch (error) {
          console.error('❌ SPARC JSON VALIDATOR: Failed to parse JSON:', error.message);
          console.error('   Raw body preview:', rawBody.substring(0, 200) + '...');
          console.error('   Content-Type:', req.get('Content-Type'));
          console.error('   Content-Length:', req.get('Content-Length'));

          // Return detailed error response
          return res.status(400).json({
            error: 'Invalid JSON',
            message: error.message,
            details: {
              received_length: rawBody.length,
              content_type: req.get('Content-Type'),
              preview: rawBody.substring(0, 100)
            },
            suggestions: [
              'Ensure JSON is properly formatted',
              'Check for trailing commas',
              'Verify all quotes are properly escaped',
              'Ensure Content-Type header is application/json'
            ]
          });
        }
      });

      req.on('error', (error) => {
        console.error('❌ SPARC JSON VALIDATOR: Request stream error:', error);
        return res.status(400).json({
          error: 'Request stream error',
          message: error.message
        });
      });
    };
  }

  // Comprehensive request validation middleware
  createRequestValidationMiddleware() {
    return (req, res, next) => {
      // Log request details for debugging
      console.log(`📨 SPARC REQUEST VALIDATOR: ${req.method} ${req.path}`);
      console.log(`   Content-Type: ${req.get('Content-Type')}`);
      console.log(`   Content-Length: ${req.get('Content-Length')}`);
      console.log(`   User-Agent: ${req.get('User-Agent')}`);

      // Validate common request issues
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (!req.get('Content-Type')) {
          console.warn('⚠️ SPARC REQUEST VALIDATOR: Missing Content-Type header');
        }

        if (req.get('Content-Type')?.includes('application/json') && !req.body) {
          console.warn('⚠️ SPARC REQUEST VALIDATOR: JSON Content-Type but no body parsed');
        }
      }

      next();
    };
  }

  // Error handling middleware for JSON parsing failures
  createErrorHandlingMiddleware() {
    return (error, req, res, next) => {
      if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.error('❌ SPARC JSON ERROR HANDLER: Malformed JSON detected');
        console.error('   Error:', error.message);
        console.error('   Request path:', req.path);
        console.error('   Request method:', req.method);

        return res.status(400).json({
          error: 'Malformed JSON',
          message: 'Request body contains invalid JSON syntax',
          details: {
            type: 'JSON_SYNTAX_ERROR',
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
          },
          help: {
            common_causes: [
              'Missing or extra commas',
              'Unescaped quotes in strings',
              'Invalid escape sequences',
              'Trailing commas in objects/arrays'
            ],
            tools: [
              'Use JSON.stringify() to generate valid JSON',
              'Validate JSON with online tools',
              'Check network requests in browser dev tools'
            ]
          }
        });
      }

      // Pass other errors to default handler
      next(error);
    };
  }

  // Factory method to create all middleware
  static createMiddleware() {
    const validator = new JSONRequestValidator();
    
    return {
      requestValidator: validator.createRequestValidationMiddleware(),
      jsonParser: validator.createJsonParserMiddleware(),
      errorHandler: validator.createErrorHandlingMiddleware()
    };
  }
}

export { JSONRequestValidator };