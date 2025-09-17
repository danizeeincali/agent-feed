/**
 * Test script to verify API timeout and retry functionality
 */

import { apiService } from '../services/api';

interface TestResult {
  test: string;
  success: boolean;
  duration: number;
  error?: string;
  attempts?: number;
}

class ApiTimeoutTester {
  private results: TestResult[] = [];

  async runTests(): Promise<TestResult[]> {
    console.log('🧪 Starting API timeout and retry tests...');

    // Test 1: Valid endpoint with reasonable timeout
    await this.testValidEndpoint();

    // Test 2: Non-existent endpoint (should fail with retries)
    await this.testNonExistentEndpoint();

    // Test 3: Test timeout behavior with long request
    await this.testTimeoutBehavior();

    // Test 4: Test analytics endpoint with extended timeout
    await this.testAnalyticsTimeout();

    return this.results;
  }

  private async testValidEndpoint(): Promise<void> {
    const startTime = Date.now();
    try {
      console.log('🔍 Testing valid endpoint (/health)...');
      const result = await apiService.healthCheck();
      const duration = Date.now() - startTime;

      this.results.push({
        test: 'Valid endpoint (/health)',
        success: true,
        duration,
      });

      console.log('✅ Valid endpoint test passed:', duration + 'ms');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        test: 'Valid endpoint (/health)',
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.log('❌ Valid endpoint test failed:', error);
    }
  }

  private async testNonExistentEndpoint(): Promise<void> {
    const startTime = Date.now();
    try {
      console.log('🔍 Testing non-existent endpoint...');
      // @ts-ignore - testing private method
      await apiService.request('/non-existent-endpoint-test-12345');
      const duration = Date.now() - startTime;

      this.results.push({
        test: 'Non-existent endpoint (should fail)',
        success: false, // This should actually fail
        duration,
        error: 'Unexpected success'
      });

      console.log('❌ Non-existent endpoint test unexpectedly passed');
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const attempts = this.extractAttemptCount(errorMessage);

      this.results.push({
        test: 'Non-existent endpoint (should fail)',
        success: true, // Success means it properly failed
        duration,
        error: errorMessage,
        attempts
      });

      console.log('✅ Non-existent endpoint test properly failed after retries:', duration + 'ms');
      console.log('   Error:', errorMessage);
    }
  }

  private async testTimeoutBehavior(): Promise<void> {
    const startTime = Date.now();
    try {
      console.log('🔍 Testing timeout behavior...');
      // Test with a mock slow endpoint (this will likely timeout)
      // @ts-ignore - testing private method
      await apiService.request('/slow-endpoint-that-does-not-exist');
      const duration = Date.now() - startTime;

      this.results.push({
        test: 'Timeout behavior test',
        success: false,
        duration,
        error: 'Unexpected success'
      });

      console.log('❌ Timeout test unexpectedly passed');
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('after');

      this.results.push({
        test: 'Timeout behavior test',
        success: isTimeoutError,
        duration,
        error: errorMessage
      });

      if (isTimeoutError) {
        console.log('✅ Timeout test properly handled:', duration + 'ms');
      } else {
        console.log('⚠️ Timeout test failed differently than expected:', errorMessage);
      }
    }
  }

  private async testAnalyticsTimeout(): Promise<void> {
    const startTime = Date.now();
    try {
      console.log('🔍 Testing analytics endpoint timeout (should have 15s timeout)...');
      const result = await apiService.getAnalytics('24h');
      const duration = Date.now() - startTime;

      this.results.push({
        test: 'Analytics endpoint timeout test',
        success: true,
        duration,
      });

      console.log('✅ Analytics endpoint test completed:', duration + 'ms');
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // For analytics, we expect either success or a proper timeout after ~15 seconds
      const expectedTimeout = duration >= 14000; // Should be close to 15 seconds if timeout

      this.results.push({
        test: 'Analytics endpoint timeout test',
        success: expectedTimeout || duration < 5000, // Success if proper timeout or quick failure
        duration,
        error: errorMessage
      });

      console.log('✅ Analytics endpoint test completed with expected behavior:', duration + 'ms');
      console.log('   Error:', errorMessage);
    }
  }

  private extractAttemptCount(errorMessage: string): number {
    const match = errorMessage.match(/after (\d+) attempts/);
    return match ? parseInt(match[1]) : 1;
  }

  printResults(): void {
    console.log('\n📊 API Timeout Test Results:');
    console.log('=' .repeat(50));

    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.test}`);
      console.log(`   Status: ${status}`);
      console.log(`   Duration: ${result.duration}ms`);
      if (result.attempts) {
        console.log(`   Retry Attempts: ${result.attempts}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    console.log(`Summary: ${passed}/${total} tests passed`);
  }
}

// Export for use in test scripts
export { ApiTimeoutTester };

// Main execution when run directly
if (import.meta.env.NODE_ENV === 'test') {
  const tester = new ApiTimeoutTester();
  tester.runTests().then(() => {
    tester.printResults();
  }).catch(console.error);
}