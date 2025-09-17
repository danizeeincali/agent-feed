/**
 * Demo component to showcase the improved API timeout and retry functionality
 */

import React, { useState } from 'react';
import { apiService } from '../../services/api';

interface TestResult {
  endpoint: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  duration?: number;
  error?: string;
  retryCount?: number;
}

export const ApiTimeoutDemo: React.FC = () => {
  const [tests, setTests] = useState<Record<string, TestResult>>({
    health: { endpoint: '/health', status: 'idle' },
    analytics: { endpoint: '/analytics', status: 'idle' },
    agents: { endpoint: '/agents', status: 'idle' },
    'non-existent': { endpoint: '/fake-endpoint-404', status: 'idle' },
  });

  const updateTest = (key: string, updates: Partial<TestResult>) => {
    setTests(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  };

  const runTest = async (key: string, testFn: () => Promise<any>) => {
    const startTime = Date.now();
    updateTest(key, { status: 'loading', duration: undefined, error: undefined });

    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(key, { status: 'success', duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const retryCount = errorMessage.includes('attempts') ?
        parseInt(errorMessage.match(/(\d+) attempts/)?.[1] || '1') : 1;

      updateTest(key, {
        status: 'error',
        duration,
        error: errorMessage,
        retryCount
      });
    }
  };

  const testEndpoints = {
    health: () => apiService.healthCheck(),
    analytics: () => apiService.getAnalytics('1h'),
    agents: () => apiService.getAgents(),
    'non-existent': () => (apiService as any).request('/fake-endpoint-404'),
  };

  const runAllTests = async () => {
    const promises = Object.entries(testEndpoints).map(([key, testFn]) =>
      runTest(key, testFn)
    );
    await Promise.allSettled(promises);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'loading': return 'text-blue-600 bg-blue-50';
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏸️';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          API Timeout & Retry Demo
        </h2>

        <p className="text-gray-600 mb-6">
          This demo showcases the improved API service with proper timeout handling,
          retry logic with exponential backoff, and endpoint-specific timeout values.
        </p>

        <div className="mb-6">
          <button
            onClick={runAllTests}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md
                     transition-colors duration-200 font-medium"
          >
            Run All Tests
          </button>
        </div>

        <div className="grid gap-4">
          {Object.entries(tests).map(([key, test]) => (
            <div
              key={key}
              className={`border rounded-lg p-4 transition-colors duration-200 ${getStatusColor(test.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getStatusIcon(test.status)}</span>
                  <h3 className="font-semibold capitalize">{key} Endpoint</h3>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {test.endpoint}
                  </code>
                </div>

                <button
                  onClick={() => runTest(key, testEndpoints[key as keyof typeof testEndpoints])}
                  disabled={test.status === 'loading'}
                  className="bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1
                           rounded text-sm transition-colors duration-200 disabled:opacity-50"
                >
                  {test.status === 'loading' ? 'Testing...' : 'Test'}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-1 capitalize">{test.status}</span>
                </div>

                {test.duration !== undefined && (
                  <div>
                    <span className="font-medium">Duration:</span>
                    <span className="ml-1">{test.duration}ms</span>
                  </div>
                )}

                {test.retryCount && (
                  <div>
                    <span className="font-medium">Retries:</span>
                    <span className="ml-1">{test.retryCount}</span>
                  </div>
                )}

                <div>
                  <span className="font-medium">Timeout:</span>
                  <span className="ml-1">
                    {key === 'analytics' ? '15s' :
                     key === 'health' ? '5s' :
                     key === 'agents' ? '10s' : '8s'}
                  </span>
                </div>
              </div>

              {test.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                  <span className="font-medium text-red-800">Error:</span>
                  <div className="text-red-700 mt-1 break-words">{test.error}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Timeout Configuration:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>Analytics/Metrics:</strong> 15 seconds (complex queries)</li>
            <li><strong>Activities/Stats:</strong> 12 seconds (real-time data)</li>
            <li><strong>Agents/Posts:</strong> 10 seconds (standard operations)</li>
            <li><strong>Health/Filter-data:</strong> 5 seconds (quick operations)</li>
            <li><strong>Default:</strong> 8 seconds</li>
          </ul>

          <h3 className="font-semibold text-gray-900 mb-2 mt-4">Retry Logic:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>Max Retries:</strong> 3 attempts</li>
            <li><strong>Backoff:</strong> Exponential (1s, 2s, 4s)</li>
            <li><strong>Max Delay:</strong> 5 seconds</li>
            <li><strong>No Retry:</strong> 4xx errors (except 408, 429), JSON parse errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
};