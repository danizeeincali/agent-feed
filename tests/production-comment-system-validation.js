#!/usr/bin/env node

/**
 * PRODUCTION COMMENT SYSTEM VALIDATION
 * 
 * Comprehensive real system testing for comment posting functionality
 * Tests against actual running backend and frontend servers
 */

import fetch from 'node-fetch';
import { execSync } from 'child_process';

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

class ProductionCommentValidator {
  constructor() {
    this.results = {
      backendTests: [],
      apiTests: [],
      integrationTests: [],
      errors: [],
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (type === 'error') {
      this.results.errors.push({ message, timestamp });
    }
  }

  async runTest(name, testFn) {
    this.results.total++;
    try {
      await this.log(`Running: ${name}`, 'test');
      await testFn();
      this.results.passed++;
      await this.log(`PASSED: ${name}`, 'info');
    } catch (error) {
      this.results.failed++;
      await this.log(`FAILED: ${name} - ${error.message}`, 'error');
      throw error;
    }
  }

  async validateBackendHealth() {
    await this.runTest('Backend Health Check', async () => {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      const health = await response.json();
      if (!health.data.database) {
        throw new Error('Database connection failed');
      }
    });
  }

  async validateFrontendAvailable() {
    await this.runTest('Frontend Availability Check', async () => {
      const response = await fetch(FRONTEND_URL);
      if (!response.ok) {
        throw new Error(`Frontend not available: ${response.status}`);
      }
    });
  }

  async validateGetComments() {
    await this.runTest('Get Comments API', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts/prod-post-1/comments`);
      if (!response.ok) {
        throw new Error(`Get comments failed: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid comment data structure');
      }
    });
  }

  async validateCreateRootComment() {
    await this.runTest('Create Root Comment API', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts/prod-post-1/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Production validation test comment - ${Date.now()}`,
          authorAgent: 'ProductionValidator'
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Create comment failed: ${response.status} - ${error}`);
      }
      
      const data = await response.json();
      if (!data.success || !data.data.id) {
        throw new Error('Invalid create comment response');
      }
      
      // Store comment ID for reply test
      this.testCommentId = data.data.id;
    });
  }

  async validateCreateReply() {
    if (!this.testCommentId) {
      // Get an existing comment ID first
      const commentsResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts/prod-post-1/comments`);
      const commentsData = await commentsResponse.json();
      this.testCommentId = commentsData.data[0]?.id;
    }

    await this.runTest('Create Comment Reply API', async () => {
      if (!this.testCommentId) {
        throw new Error('No comment ID available for reply test');
      }

      const response = await fetch(`${BACKEND_URL}/api/v1/comments/${this.testCommentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Production validation reply test - ${Date.now()}`,
          authorAgent: 'ProductionValidator',
          postId: 'prod-post-1'
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Create reply failed: ${response.status} - ${error}`);
      }
      
      const data = await response.json();
      if (!data.success || !data.data.id) {
        throw new Error('Invalid create reply response');
      }
    });
  }

  async validateCommentFormIntegration() {
    await this.runTest('Comment Form Integration', async () => {
      // Simulate the exact frontend API calls
      const frontendCommentData = {
        content: `Frontend integration test - ${Date.now()}`,
        authorAgent: 'FrontendIntegrationTest'
      };

      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts/prod-post-1/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Frontend Test)'
        },
        body: JSON.stringify(frontendCommentData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Frontend comment integration failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Frontend comment integration returned failure');
      }
    });
  }

  async validateReplyFormIntegration() {
    await this.runTest('Reply Form Integration', async () => {
      // Get existing comment for reply
      const commentsResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts/prod-post-1/comments`);
      const commentsData = await commentsResponse.json();
      const parentCommentId = commentsData.data[0]?.id;

      if (!parentCommentId) {
        throw new Error('No parent comment available for reply test');
      }

      // Simulate exact frontend reply API call
      const frontendReplyData = {
        content: `Frontend reply integration test - ${Date.now()}`,
        authorAgent: 'FrontendReplyTest',
        postId: 'prod-post-1'
      };

      const response = await fetch(`${BACKEND_URL}/api/v1/comments/${parentCommentId}/reply`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Frontend Test)'
        },
        body: JSON.stringify(frontendReplyData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Frontend reply integration failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Frontend reply integration returned failure');
      }
    });
  }

  async validateRealTimeUpdates() {
    await this.runTest('Real-Time Comment Updates', async () => {
      // Test that comments appear immediately after posting
      const beforeResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts/prod-post-1/comments`);
      const beforeData = await beforeResponse.json();
      const beforeCount = beforeData.data.length;

      // Create new comment
      const newCommentResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts/prod-post-1/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Real-time test comment - ${Date.now()}`,
          authorAgent: 'RealTimeTest'
        })
      });

      if (!newCommentResponse.ok) {
        throw new Error('Failed to create comment for real-time test');
      }

      // Check that comment appears immediately
      const afterResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts/prod-post-1/comments`);
      const afterData = await afterResponse.json();
      const afterCount = afterData.data.length;

      if (afterCount <= beforeCount) {
        throw new Error('Real-time comment update failed - count did not increase');
      }
    });
  }

  async validateErrorHandling() {
    await this.runTest('Error Handling - Invalid Comment ID', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/comments/invalid-comment-id/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test reply to invalid comment',
          authorAgent: 'ErrorTest',
          postId: 'prod-post-1'
        })
      });

      if (response.ok) {
        throw new Error('Expected error for invalid comment ID, but request succeeded');
      }

      // Should get FOREIGN KEY constraint error
      const error = await response.json();
      if (!error.error || !error.error.includes('FOREIGN KEY')) {
        throw new Error('Expected FOREIGN KEY constraint error');
      }
    });
  }

  async generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / this.results.total) * 100).toFixed(2) + '%'
      },
      errors: this.results.errors,
      status: this.results.failed === 0 ? 'PRODUCTION READY' : 'REQUIRES FIXES'
    };

    await this.log(`\n🔍 PRODUCTION VALIDATION COMPLETE`, 'info');
    await this.log(`📊 Results: ${report.summary.passed}/${report.summary.total} tests passed (${report.summary.successRate})`, 'info');
    await this.log(`🚀 Status: ${report.status}`, report.status === 'PRODUCTION READY' ? 'info' : 'error');

    if (this.results.errors.length > 0) {
      await this.log('\n❌ ERRORS FOUND:', 'error');
      this.results.errors.forEach(error => {
        console.log(`   - ${error.message}`);
      });
    }

    return report;
  }

  async runFullValidation() {
    await this.log('🚀 Starting Production Comment System Validation', 'info');
    
    try {
      // Infrastructure checks
      await this.validateBackendHealth();
      await this.validateFrontendAvailable();
      
      // API functionality tests
      await this.validateGetComments();
      await this.validateCreateRootComment();
      await this.validateCreateReply();
      
      // Integration tests
      await this.validateCommentFormIntegration();
      await this.validateReplyFormIntegration();
      await this.validateRealTimeUpdates();
      
      // Error handling tests
      await this.validateErrorHandling();
      
    } catch (error) {
      await this.log(`Critical test failure: ${error.message}`, 'error');
    }

    return await this.generateTestReport();
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionCommentValidator();
  validator.runFullValidation()
    .then(report => {
      console.log('\n📋 Final Report:', JSON.stringify(report, null, 2));
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

export { ProductionCommentValidator };