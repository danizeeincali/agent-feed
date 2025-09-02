/**
 * Claude API Integration Validator
 * Tests real Claude API responses and integration reliability
 */

const axios = require('axios');

class ClaudeAPIValidator {
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:3001/api',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      retries: 0,
      responseTimes: [],
      errors: []
    };
  }

  async validateBasicAPIResponse() {
    const testId = `basic-api-${Date.now()}`;
    console.log(`🤖 Testing basic Claude API response: ${testId}`);
    
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    try {
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        message: 'Hello, this is a production validation test. Please respond with "validation successful".',
        sessionId: testId
      }, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;
      this.metrics.responseTimes.push(responseTime);
      this.metrics.successfulRequests++;

      const isValidResponse = response.data && 
                             response.data.response && 
                             typeof response.data.response === 'string' &&
                             response.data.response.length > 0;

      const containsExpectedText = response.data.response
        .toLowerCase()
        .includes('validation successful');

      return {
        testId,
        success: isValidResponse,
        expectedTextFound: containsExpectedText,
        responseTime,
        statusCode: response.status,
        responseLength: response.data.response ? response.data.response.length : 0,
        hasSessionId: !!response.data.sessionId,
        response: response.data.response.substring(0, 100) + '...' // First 100 chars
      };

    } catch (error) {
      this.metrics.failedRequests++;
      const responseTime = Date.now() - startTime;
      
      if (error.code === 'ECONNABORTED') {
        this.metrics.timeouts++;
      }
      
      this.metrics.errors.push({
        type: 'api_request',
        error: error.message,
        timestamp: Date.now()
      });

      return {
        testId,
        success: false,
        error: error.message,
        responseTime,
        statusCode: error.response ? error.response.status : null
      };
    }
  }

  async validateComplexInteraction() {
    const testId = `complex-${Date.now()}`;
    console.log(`🧠 Testing complex Claude API interaction: ${testId}`);
    
    const conversationSteps = [
      {
        message: "I'm going to give you a math problem. Please solve: 15 + 27 = ?",
        expectedInResponse: "42"
      },
      {
        message: "Now multiply that result by 2",
        expectedInResponse: "84"
      },
      {
        message: "What was the original first number I gave you?",
        expectedInResponse: "15"
      }
    ];

    const results = [];
    let sessionId = testId;

    for (let i = 0; i < conversationSteps.length; i++) {
      const step = conversationSteps[i];
      const stepStart = Date.now();

      try {
        const response = await axios.post(`${this.config.apiUrl}/chat`, {
          message: step.message,
          sessionId
        }, {
          timeout: this.config.timeout
        });

        const responseTime = Date.now() - stepStart;
        const hasExpectedContent = response.data.response
          .toLowerCase()
          .includes(step.expectedInResponse.toLowerCase());

        results.push({
          step: i + 1,
          success: true,
          responseTime,
          hasExpectedContent,
          expectedContent: step.expectedInResponse,
          actualResponse: response.data.response.substring(0, 100) + '...'
        });

        // Update session ID for conversation continuity
        if (response.data.sessionId) {
          sessionId = response.data.sessionId;
        }

        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        this.metrics.responseTimes.push(responseTime);

      } catch (error) {
        results.push({
          step: i + 1,
          success: false,
          error: error.message,
          responseTime: Date.now() - stepStart
        });

        this.metrics.totalRequests++;
        this.metrics.failedRequests++;
      }
    }

    const overallSuccess = results.every(r => r.success && r.hasExpectedContent);

    return {
      testId,
      success: overallSuccess,
      conversationSteps: results,
      maintainedContext: results.filter(r => r.hasExpectedContent).length === results.length
    };
  }

  async validateConcurrentRequests(requestCount = 5) {
    const testId = `concurrent-${Date.now()}`;
    console.log(`👥 Testing ${requestCount} concurrent API requests: ${testId}`);
    
    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < requestCount; i++) {
      promises.push(this.makeConcurrentRequest(`${testId}-${i}`, i));
    }

    const results = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;

    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;

    const failed = results.length - successful;

    return {
      testId,
      requestCount,
      successful,
      failed,
      successRate: (successful / requestCount) * 100,
      totalTime,
      averageTimePerRequest: totalTime / requestCount,
      results: results.map(r => 
        r.status === 'fulfilled' ? r.value : { success: false, error: r.reason.message }
      )
    };
  }

  async makeConcurrentRequest(requestId, index) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        message: `Concurrent request #${index + 1}: What is ${(index + 1) * 7}?`,
        sessionId: requestId
      }, {
        timeout: this.config.timeout
      });

      const responseTime = Date.now() - startTime;
      this.metrics.responseTimes.push(responseTime);
      this.metrics.successfulRequests++;

      const expectedAnswer = ((index + 1) * 7).toString();
      const hasCorrectAnswer = response.data.response.includes(expectedAnswer);

      return {
        requestId,
        success: true,
        responseTime,
        hasCorrectAnswer,
        expectedAnswer,
        statusCode: response.status
      };

    } catch (error) {
      this.metrics.failedRequests++;
      return {
        requestId,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async validateErrorHandling() {
    const testId = `error-handling-${Date.now()}`;
    console.log(`🚨 Testing API error handling: ${testId}`);
    
    const errorTests = [
      {
        name: 'empty_message',
        payload: { message: '', sessionId: testId },
        expectError: true
      },
      {
        name: 'missing_message',
        payload: { sessionId: testId },
        expectError: true
      },
      {
        name: 'invalid_session_id',
        payload: { 
          message: 'Test message',
          sessionId: null
        },
        expectError: false // Should create new session
      },
      {
        name: 'very_long_message',
        payload: { 
          message: 'A'.repeat(10000),
          sessionId: testId
        },
        expectError: false // Should handle or truncate
      }
    ];

    const results = [];

    for (const test of errorTests) {
      try {
        const startTime = Date.now();
        const response = await axios.post(`${this.config.apiUrl}/chat`, test.payload, {
          timeout: this.config.timeout
        });

        results.push({
          test: test.name,
          expectedError: test.expectError,
          gotError: false,
          statusCode: response.status,
          responseTime: Date.now() - startTime,
          handled: !test.expectError // If we didn't expect error and didn't get one, it's handled
        });

      } catch (error) {
        results.push({
          test: test.name,
          expectedError: test.expectError,
          gotError: true,
          statusCode: error.response ? error.response.status : null,
          errorMessage: error.message,
          handled: test.expectError // If we expected error and got one, it's handled
        });
      }
    }

    const allHandledCorrectly = results.every(r => 
      (r.expectedError && r.gotError) || (!r.expectedError && !r.gotError)
    );

    return {
      testId,
      success: allHandledCorrectly,
      errorTests: results,
      handledCorrectly: results.filter(r => r.handled).length
    };
  }

  async validateResponseConsistency(iterations = 5) {
    const testId = `consistency-${Date.now()}`;
    console.log(`🔄 Testing response consistency over ${iterations} iterations: ${testId}`);
    
    const testMessage = "What is the capital of France?";
    const expectedAnswer = "paris";
    const results = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = Date.now();
        const response = await axios.post(`${this.config.apiUrl}/chat`, {
          message: testMessage,
          sessionId: `${testId}-${i}`
        }, {
          timeout: this.config.timeout
        });

        const responseTime = Date.now() - startTime;
        const containsAnswer = response.data.response
          .toLowerCase()
          .includes(expectedAnswer);

        results.push({
          iteration: i + 1,
          success: true,
          responseTime,
          containsExpectedAnswer: containsAnswer,
          responseLength: response.data.response.length
        });

        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        this.metrics.responseTimes.push(responseTime);

      } catch (error) {
        results.push({
          iteration: i + 1,
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime
        });

        this.metrics.totalRequests++;
        this.metrics.failedRequests++;
      }
    }

    const successfulRequests = results.filter(r => r.success);
    const consistentAnswers = successfulRequests.filter(r => r.containsExpectedAnswer);
    const consistencyRate = successfulRequests.length > 0 
      ? (consistentAnswers.length / successfulRequests.length) * 100 
      : 0;

    return {
      testId,
      iterations,
      successfulRequests: successfulRequests.length,
      failedRequests: results.length - successfulRequests.length,
      consistencyRate,
      averageResponseTime: successfulRequests.length > 0
        ? successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length
        : 0,
      results
    };
  }

  async validateWithRetry(maxAttempts = 3) {
    console.log(`🔁 Testing API with retry mechanism (${maxAttempts} attempts)...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.validateBasicAPIResponse();
        if (result.success) {
          return {
            success: true,
            attemptUsed: attempt,
            result
          };
        }
        
        if (attempt < maxAttempts) {
          console.log(`❌ Attempt ${attempt} failed, retrying...`);
          this.metrics.retries++;
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
        
      } catch (error) {
        if (attempt === maxAttempts) {
          return {
            success: false,
            attemptUsed: attempt,
            error: error.message
          };
        }
        
        this.metrics.retries++;
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }

    return {
      success: false,
      attemptUsed: maxAttempts,
      error: 'All retry attempts exhausted'
    };
  }

  getMetrics() {
    const responseTimes = this.metrics.responseTimes;
    
    return {
      requests: {
        total: this.metrics.totalRequests,
        successful: this.metrics.successfulRequests,
        failed: this.metrics.failedRequests,
        timeouts: this.metrics.timeouts,
        retries: this.metrics.retries,
        successRate: this.metrics.totalRequests > 0 
          ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
          : 0
      },
      performance: responseTimes.length > 0 ? {
        averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        p95ResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]
      } : null,
      errors: {
        total: this.metrics.errors.length,
        byType: this.metrics.errors.reduce((acc, error) => {
          acc[error.type] = (acc[error.type] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }
}

module.exports = { ClaudeAPIValidator };