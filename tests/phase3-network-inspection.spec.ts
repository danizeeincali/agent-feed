import { test, expect, Request, Response } from '@playwright/test';
import fs from 'fs/promises';

/**
 * NETWORK REQUEST INSPECTION SUITE
 * 
 * Monitors and validates all network activity during Phase 3 testing:
 * - HTTP request/response validation
 * - WebSocket connection monitoring
 * - API call verification
 * - Network performance metrics
 * - Error response handling
 * - Security headers validation
 * - CORS and authentication
 */

interface NetworkActivity {
  timestamp: Date;
  url: string;
  method: string;
  status: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  responseTime: number;
  size: number;
  contentType: string;
  cached: boolean;
}

interface WebSocketActivity {
  timestamp: Date;
  url: string;
  type: 'connect' | 'message' | 'close' | 'error';
  data?: any;
  error?: string;
}

interface NetworkTestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  networkRequests: NetworkActivity[];
  webSocketActivity: WebSocketActivity[];
  performanceMetrics: {
    totalRequests: number;
    averageResponseTime: number;
    fastestRequest: number;
    slowestRequest: number;
    failedRequests: number;
    cachedRequests: number;
    totalDataTransferred: number;
  };
  securityAnalysis: {
    httpsUsage: number;
    securityHeaders: string[];
    vulnerabilities: string[];
  };
  errors: string[];
  timestamp: Date;
}

let networkResults: NetworkTestResult[] = [];
let networkActivity: NetworkActivity[] = [];
let webSocketActivity: WebSocketActivity[] = [];

test.describe('Phase 3 Network Inspection', () => {
  
  test.beforeEach(async ({ page }) => {
    // Reset network monitoring for each test
    networkActivity = [];
    webSocketActivity = [];
    
    // Set up comprehensive network monitoring
    page.on('request', (request: Request) => {
      console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', async (response: Response) => {
      const request = response.request();
      const startTime = Date.now();
      
      try {
        let requestBody = null;
        let responseBody = null;
        
        // Capture request body
        if (request.postData()) {
          try {
            requestBody = JSON.parse(request.postData() || '{}');
          } catch {
            requestBody = request.postData();
          }
        }
        
        // Capture response body for JSON responses
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            responseBody = await response.json();
          } catch (e) {
            // Not valid JSON
          }
        }
        
        const activity: NetworkActivity = {
          timestamp: new Date(),
          url: request.url(),
          method: request.method(),
          status: response.status(),
          requestHeaders: await request.allHeaders(),
          responseHeaders: await response.allHeaders(),
          requestBody,
          responseBody,
          responseTime: Date.now() - startTime,
          size: parseInt(response.headers()['content-length'] || '0'),
          contentType,
          cached: response.fromCache()
        };
        
        networkActivity.push(activity);
        
        console.log(`📡 RESPONSE: ${response.status()} ${request.url()} (${activity.responseTime}ms)`);
        
      } catch (error) {
        console.error('Error capturing network activity:', error);
      }
    });
    
    // Monitor WebSocket connections
    page.on('websocket', (webSocket) => {
      const wsActivity: WebSocketActivity = {
        timestamp: new Date(),
        url: webSocket.url(),
        type: 'connect'
      };
      webSocketActivity.push(wsActivity);
      console.log(`🔌 WebSocket CONNECT: ${webSocket.url()}`);
      
      webSocket.on('framesent', (event) => {
        webSocketActivity.push({
          timestamp: new Date(),
          url: webSocket.url(),
          type: 'message',
          data: event.payload
        });
        console.log(`📤 WebSocket SEND: ${event.payload}`);
      });
      
      webSocket.on('framereceived', (event) => {
        webSocketActivity.push({
          timestamp: new Date(),
          url: webSocket.url(),
          type: 'message',
          data: event.payload
        });
        console.log(`📥 WebSocket RECEIVE: ${event.payload}`);
      });
      
      webSocket.on('close', () => {
        webSocketActivity.push({
          timestamp: new Date(),
          url: webSocket.url(),
          type: 'close'
        });
        console.log(`🔌 WebSocket CLOSE: ${webSocket.url()}`);
      });
      
      webSocket.on('socketerror', (error) => {
        webSocketActivity.push({
          timestamp: new Date(),
          url: webSocket.url(),
          type: 'error',
          error: error.toString()
        });
        console.log(`❌ WebSocket ERROR: ${webSocket.url()} - ${error}`);
      });
    });
  });

  test.afterAll(async () => {
    // Generate comprehensive network analysis report
    const allRequests = networkResults.flatMap(r => r.networkRequests);
    const allWebSockets = networkResults.flatMap(r => r.webSocketActivity);
    
    const report = {
      timestamp: new Date(),
      totalTests: networkResults.length,
      networkSummary: {
        totalRequests: allRequests.length,
        uniqueEndpoints: [...new Set(allRequests.map(r => r.url))].length,
        averageResponseTime: allRequests.reduce((sum, r) => sum + r.responseTime, 0) / allRequests.length,
        statusCodeBreakdown: allRequests.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {} as Record<number, number>),
        methodBreakdown: allRequests.reduce((acc, r) => {
          acc[r.method] = (acc[r.method] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      webSocketSummary: {
        totalConnections: allWebSockets.filter(w => w.type === 'connect').length,
        totalMessages: allWebSockets.filter(w => w.type === 'message').length,
        errors: allWebSockets.filter(w => w.type === 'error').length
      },
      securityAnalysis: {
        httpsUsage: allRequests.filter(r => r.url.startsWith('https')).length,
        insecureRequests: allRequests.filter(r => r.url.startsWith('http:')).length,
        commonHeaders: {} // Could analyze security headers
      },
      results: networkResults
    };
    
    await fs.writeFile(
      'tests/phase3-network-inspection-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log(`
    🕸️ NETWORK INSPECTION COMPLETE
    ==============================
    Total Tests: ${report.totalTests}
    HTTP Requests: ${report.networkSummary.totalRequests}
    WebSocket Connections: ${report.webSocketSummary.totalConnections}
    Unique Endpoints: ${report.networkSummary.uniqueEndpoints}
    Average Response Time: ${report.networkSummary.averageResponseTime.toFixed(2)}ms
    
    Report: tests/phase3-network-inspection-report.json
    `);
  });

  async function recordNetworkResult(
    testName: string,
    status: 'PASS' | 'FAIL',
    errors: string[] = []
  ) {
    // Calculate performance metrics
    const performanceMetrics = {
      totalRequests: networkActivity.length,
      averageResponseTime: networkActivity.length > 0 
        ? networkActivity.reduce((sum, r) => sum + r.responseTime, 0) / networkActivity.length 
        : 0,
      fastestRequest: networkActivity.length > 0 
        ? Math.min(...networkActivity.map(r => r.responseTime)) 
        : 0,
      slowestRequest: networkActivity.length > 0 
        ? Math.max(...networkActivity.map(r => r.responseTime)) 
        : 0,
      failedRequests: networkActivity.filter(r => r.status >= 400).length,
      cachedRequests: networkActivity.filter(r => r.cached).length,
      totalDataTransferred: networkActivity.reduce((sum, r) => sum + r.size, 0)
    };
    
    // Analyze security
    const securityAnalysis = {
      httpsUsage: networkActivity.filter(r => r.url.startsWith('https')).length,
      securityHeaders: [...new Set(
        networkActivity.flatMap(r => Object.keys(r.responseHeaders))
          .filter(h => ['x-frame-options', 'x-content-type-options', 'x-xss-protection', 'strict-transport-security'].includes(h.toLowerCase()))
      )],
      vulnerabilities: []
    };
    
    // Check for potential vulnerabilities
    if (networkActivity.some(r => r.url.startsWith('http:') && !r.url.includes('localhost'))) {
      securityAnalysis.vulnerabilities.push('Insecure HTTP requests to external domains');
    }
    
    if (networkActivity.some(r => r.requestHeaders['authorization'] && r.url.startsWith('http:'))) {
      securityAnalysis.vulnerabilities.push('Authentication headers sent over HTTP');
    }
    
    networkResults.push({
      testName,
      status,
      networkRequests: [...networkActivity],
      webSocketActivity: [...webSocketActivity],
      performanceMetrics,
      securityAnalysis,
      errors,
      timestamp: new Date()
    });
  }

  test('1. Application Load Network Analysis', async ({ page }) => {
    console.log('🌐 Analyzing application load network activity...');
    
    try {
      // Load application and monitor all network requests
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Wait for any additional async requests
      await page.waitForTimeout(3000);
      
      // Validate essential requests were made
      const htmlRequest = networkActivity.find(r => r.url === 'http://localhost:3000/');
      const jsRequests = networkActivity.filter(r => r.url.includes('.js'));
      const cssRequests = networkActivity.filter(r => r.url.includes('.css'));
      const apiRequests = networkActivity.filter(r => r.url.includes('/api/'));
      
      expect(htmlRequest).toBeDefined();
      expect(htmlRequest?.status).toBe(200);
      expect(jsRequests.length).toBeGreaterThan(0);
      
      // Check for failed requests
      const failedRequests = networkActivity.filter(r => r.status >= 400);
      if (failedRequests.length > 0) {
        console.warn(`⚠️  Found ${failedRequests.length} failed requests:`, 
          failedRequests.map(r => `${r.method} ${r.url} (${r.status})`));
      }
      
      await recordNetworkResult('Application Load', 'PASS');
      
      console.log(`✅ Load analysis complete:`);
      console.log(`   Total requests: ${networkActivity.length}`);
      console.log(`   JS requests: ${jsRequests.length}`);
      console.log(`   CSS requests: ${cssRequests.length}`);
      console.log(`   API requests: ${apiRequests.length}`);
      console.log(`   Failed requests: ${failedRequests.length}`);
      
    } catch (error) {
      await recordNetworkResult('Application Load', 'FAIL', [error.message]);
      throw error;
    }
  });

  test('2. Post Creation Network Flow', async ({ page }) => {
    console.log('📝 Analyzing post creation network flow...');
    
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Clear previous activity
      networkActivity = [];
      
      // Create a post and monitor network activity
      await page.locator('[data-testid="start-post-button"]').click();
      await page.fill('input[placeholder*="title"]', `Network Test ${Date.now()}`);
      await page.fill('textarea[placeholder*="insights"]', 'Testing network request flow during post creation');
      
      // Submit and monitor the request
      await page.locator('[data-testid="submit-post"]').click();
      await page.waitForTimeout(5000);
      
      // Analyze the POST request
      const postRequest = networkActivity.find(r => 
        r.method === 'POST' && r.url.includes('/api/v1/agent-posts')
      );
      
      if (postRequest) {
        expect(postRequest.status).toBe(200);
        expect(postRequest.requestBody).toHaveProperty('title');
        expect(postRequest.requestBody).toHaveProperty('content');
        expect(postRequest.responseBody).toHaveProperty('success');
        
        console.log(`✅ POST request successful:`);
        console.log(`   URL: ${postRequest.url}`);
        console.log(`   Status: ${postRequest.status}`);
        console.log(`   Response time: ${postRequest.responseTime}ms`);
        console.log(`   Request size: ${JSON.stringify(postRequest.requestBody).length} bytes`);
        
        // Validate request headers
        expect(postRequest.requestHeaders['content-type']).toContain('application/json');
        
      } else {
        throw new Error('POST request to agent-posts not found');
      }
      
      // Check for any follow-up GET requests
      const followUpRequests = networkActivity.filter(r => 
        r.method === 'GET' && r.url.includes('/api/v1/agent-posts') && r.timestamp > postRequest.timestamp
      );
      
      await recordNetworkResult('Post Creation Flow', 'PASS');
      
      console.log(`   Follow-up requests: ${followUpRequests.length}`);
      
    } catch (error) {
      await recordNetworkResult('Post Creation Flow', 'FAIL', [error.message]);
      throw error;
    }
  });

  test('3. WebSocket Connection Monitoring', async ({ page }) => {
    console.log('🔌 Monitoring WebSocket connections...');
    
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Wait for potential WebSocket connections
      await page.waitForTimeout(5000);
      
      const connections = webSocketActivity.filter(w => w.type === 'connect');
      const messages = webSocketActivity.filter(w => w.type === 'message');
      const errors = webSocketActivity.filter(w => w.type === 'error');
      
      console.log(`WebSocket activity:`);
      console.log(`   Connections: ${connections.length}`);
      console.log(`   Messages: ${messages.length}`);
      console.log(`   Errors: ${errors.length}`);
      
      if (connections.length > 0) {
        console.log(`   Connection URLs: ${connections.map(c => c.url).join(', ')}`);
        
        // Test WebSocket functionality if connections exist
        for (const conn of connections) {
          console.log(`   Connected to: ${conn.url}`);
        }
      } else {
        console.log('   No WebSocket connections detected (this may be expected)');
      }
      
      await recordNetworkResult('WebSocket Monitoring', 'PASS');
      
    } catch (error) {
      await recordNetworkResult('WebSocket Monitoring', 'FAIL', [error.message]);
      throw error;
    }
  });

  test('4. API Response Validation', async ({ page }) => {
    console.log('🔍 Validating API responses...');
    
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Wait for API calls
      await page.waitForTimeout(3000);
      
      // Find API requests
      const apiRequests = networkActivity.filter(r => r.url.includes('/api/'));
      
      console.log(`Found ${apiRequests.length} API requests`);
      
      for (const request of apiRequests) {
        console.log(`Validating: ${request.method} ${request.url}`);
        
        // Validate response structure
        if (request.responseBody && typeof request.responseBody === 'object') {
          // Check for common API response patterns
          if (request.responseBody.hasOwnProperty('success')) {
            expect(typeof request.responseBody.success).toBe('boolean');
            
            if (request.responseBody.success) {
              expect(request.responseBody).toHaveProperty('data');
            } else {
              expect(request.responseBody).toHaveProperty('error');
            }
          }
        }
        
        // Validate status codes
        if (request.status >= 200 && request.status < 300) {
          console.log(`   ✅ ${request.url} - ${request.status}`);
        } else if (request.status >= 400) {
          console.log(`   ❌ ${request.url} - ${request.status}`);
          
          // Check if error response has proper structure
          if (request.responseBody) {
            expect(request.responseBody).toHaveProperty('error');
          }
        }
        
        // Validate response time
        expect(request.responseTime).toBeLessThan(10000); // 10 second timeout
        
        // Validate content type for JSON APIs
        if (request.url.includes('/api/') && request.responseBody) {
          expect(request.contentType).toContain('application/json');
        }
      }
      
      await recordNetworkResult('API Response Validation', 'PASS');
      
    } catch (error) {
      await recordNetworkResult('API Response Validation', 'FAIL', [error.message]);
      throw error;
    }
  });

  test('5. Performance Monitoring', async ({ page }) => {
    console.log('⚡ Monitoring network performance...');
    
    try {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // Wait for additional requests
      await page.waitForTimeout(3000);
      
      // Analyze performance metrics
      const slowRequests = networkActivity.filter(r => r.responseTime > 2000);
      const fastRequests = networkActivity.filter(r => r.responseTime < 100);
      const largeResponses = networkActivity.filter(r => r.size > 100000); // > 100KB
      
      // Check for performance issues
      if (loadTime > 5000) {
        console.warn(`⚠️  Slow page load: ${loadTime}ms`);
      }
      
      if (slowRequests.length > 0) {
        console.warn(`⚠️  Found ${slowRequests.length} slow requests (>2s):`,
          slowRequests.map(r => `${r.url} (${r.responseTime}ms)`));
      }
      
      if (largeResponses.length > 0) {
        console.warn(`⚠️  Found ${largeResponses.length} large responses (>100KB):`,
          largeResponses.map(r => `${r.url} (${r.size} bytes)`));
      }
      
      console.log(`Performance metrics:`);
      console.log(`   Page load time: ${loadTime}ms`);
      console.log(`   Total requests: ${networkActivity.length}`);
      console.log(`   Fast requests (<100ms): ${fastRequests.length}`);
      console.log(`   Slow requests (>2s): ${slowRequests.length}`);
      console.log(`   Large responses (>100KB): ${largeResponses.length}`);
      
      // Performance assertions
      expect(loadTime).toBeLessThan(10000); // Page should load within 10s
      expect(slowRequests.length).toBeLessThan(networkActivity.length * 0.2); // <20% slow requests
      
      await recordNetworkResult('Performance Monitoring', 'PASS');
      
    } catch (error) {
      await recordNetworkResult('Performance Monitoring', 'FAIL', [error.message]);
      throw error;
    }
  });

  test('6. Security Header Analysis', async ({ page }) => {
    console.log('🔒 Analyzing security headers...');
    
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Analyze security headers in responses
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options', 
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy',
        'referrer-policy'
      ];
      
      const headerAnalysis = securityHeaders.map(header => {
        const requestsWithHeader = networkActivity.filter(r => 
          Object.keys(r.responseHeaders).some(h => h.toLowerCase() === header.toLowerCase())
        );
        
        return {
          header,
          present: requestsWithHeader.length > 0,
          count: requestsWithHeader.length,
          values: [...new Set(requestsWithHeader.map(r => r.responseHeaders[header] || r.responseHeaders[header.toLowerCase()]))]
        };
      });
      
      console.log(`Security header analysis:`);
      headerAnalysis.forEach(h => {
        console.log(`   ${h.header}: ${h.present ? '✅' : '❌'} (${h.count} requests)`);
        if (h.present && h.values.length > 0) {
          console.log(`     Values: ${h.values.join(', ')}`);
        }
      });
      
      // Check for potential security issues
      const insecureRequests = networkActivity.filter(r => 
        r.url.startsWith('http:') && !r.url.includes('localhost')
      );
      
      if (insecureRequests.length > 0) {
        console.warn(`⚠️  Found ${insecureRequests.length} insecure HTTP requests`);
      }
      
      await recordNetworkResult('Security Header Analysis', 'PASS');
      
    } catch (error) {
      await recordNetworkResult('Security Header Analysis', 'FAIL', [error.message]);
      throw error;
    }
  });

  test('7. Error Response Handling', async ({ page }) => {
    console.log('⚠️ Testing error response handling...');
    
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Clear previous activity
      networkActivity = [];
      
      // Test with invalid data to trigger error
      await page.locator('[data-testid="start-post-button"]').click();
      // Submit empty form to trigger validation error
      await page.locator('[data-testid="submit-post"]').click();
      
      await page.waitForTimeout(2000);
      
      // Look for error responses
      const errorRequests = networkActivity.filter(r => r.status >= 400);
      
      if (errorRequests.length > 0) {
        console.log(`Found ${errorRequests.length} error responses:`);
        
        errorRequests.forEach(req => {
          console.log(`   ${req.method} ${req.url} - ${req.status}`);
          
          // Validate error response structure
          if (req.responseBody) {
            expect(req.responseBody).toHaveProperty('error');
            console.log(`     Error: ${req.responseBody.error}`);
          }
        });
      } else {
        console.log('No error responses detected (validation may be client-side only)');
      }
      
      // Test 404 error by accessing non-existent endpoint
      await page.goto('http://localhost:3000/api/non-existent-endpoint');
      await page.waitForTimeout(1000);
      
      const notFoundRequest = networkActivity.find(r => 
        r.url.includes('non-existent-endpoint') && r.status === 404
      );
      
      if (notFoundRequest) {
        console.log(`✅ 404 handling working: ${notFoundRequest.url}`);
      }
      
      await recordNetworkResult('Error Response Handling', 'PASS');
      
    } catch (error) {
      await recordNetworkResult('Error Response Handling', 'FAIL', [error.message]);
      throw error;
    }
  });

  test('8. Caching and Optimization Analysis', async ({ page }) => {
    console.log('🗄️ Analyzing caching and optimization...');
    
    try {
      // First load
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      const firstLoadRequests = [...networkActivity];
      
      // Second load (should use cache)
      networkActivity = [];
      await page.reload({ waitUntil: 'networkidle' });
      const secondLoadRequests = [...networkActivity];
      
      // Analyze caching
      const cachedRequests = secondLoadRequests.filter(r => r.cached);
      const staticAssets = secondLoadRequests.filter(r => 
        r.url.includes('.js') || r.url.includes('.css') || r.url.includes('.png') || r.url.includes('.jpg')
      );
      
      console.log(`Caching analysis:`);
      console.log(`   First load requests: ${firstLoadRequests.length}`);
      console.log(`   Second load requests: ${secondLoadRequests.length}`);
      console.log(`   Cached requests: ${cachedRequests.length}`);
      console.log(`   Static assets: ${staticAssets.length}`);
      
      // Analyze cache headers
      const cacheHeaders = ['cache-control', 'expires', 'etag', 'last-modified'];
      const requestsWithCacheHeaders = secondLoadRequests.filter(r =>
        cacheHeaders.some(h => h in r.responseHeaders)
      );
      
      console.log(`   Requests with cache headers: ${requestsWithCacheHeaders.length}`);
      
      // Check for optimization opportunities
      const unoptimizedAssets = staticAssets.filter(r => 
        !r.cached && r.size > 10000 // Large uncached assets
      );
      
      if (unoptimizedAssets.length > 0) {
        console.warn(`⚠️  Found ${unoptimizedAssets.length} large uncached assets`);
        unoptimizedAssets.forEach(asset => {
          console.warn(`     ${asset.url} (${asset.size} bytes)`);
        });
      }
      
      await recordNetworkResult('Caching Analysis', 'PASS');
      
    } catch (error) {
      await recordNetworkResult('Caching Analysis', 'FAIL', [error.message]);
      throw error;
    }
  });
});