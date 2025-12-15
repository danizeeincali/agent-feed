// Analytics Import Test Component
// This component tests all analytics imports to ensure they work correctly

import React from 'react';
import {
  // Main components
  CostOverviewDashboard,
  MessageStepAnalytics,
  OptimizationRecommendations,
  ExportReportingFeatures,
  
  // Enhanced components
  EnhancedAnalyticsPage,
  AnalyticsPage,
  
  // Provider and error handling
  AnalyticsProvider,
  useAnalytics,
  withAnalyticsProvider,
  AnalyticsErrorBoundary,
  withAnalyticsErrorBoundary,
  AnalyticsLoadingFallback,
  
  // Chart components
  LineChart,
  BarChart,
  PieChart,
  
  // Types
  type CostMetrics,
  type TokenUsageMetrics,
  type MessageAnalytics,
  type StepAnalytics,
  type ExportData,
  type CostOptimization,
  type AnalyticsDashboardState
} from '@/components/analytics';

// Test component to validate all imports
const AnalyticsImportTest: React.FC = () => {
  // Test mock data
  const mockCostMetrics: CostMetrics = {
    totalCost: 100.50,
    dailyCost: 5.25,
    weeklyCost: 36.75,
    monthlyCost: 150.00,
    costTrend: 'increasing',
    averageCostPerRequest: 0.05,
    lastUpdated: new Date()
  };
  
  const mockTokenUsage: TokenUsageMetrics = {
    totalTokens: 50000,
    inputTokens: 30000,
    outputTokens: 20000,
    tokensPerHour: 2000,
    tokensPerDay: 48000,
    averageTokensPerRequest: 150,
    tokenEfficiency: 0.85
  };
  
  const mockMessageAnalytics: MessageAnalytics = {
    totalMessages: 1000,
    successfulMessages: 950,
    failedMessages: 50,
    averageResponseTime: 1500,
    messageTypes: {
      'text-generation': 500,
      'code-analysis': 300,
      'data-processing': 200
    },
    errorRate: 0.05
  };
  
  const mockStepAnalytics: StepAnalytics = {
    totalSteps: 3000,
    completedSteps: 2850,
    failedSteps: 150,
    averageStepDuration: 800,
    stepTypes: {
      'prompt-generation': 1000,
      'api-call': 800,
      'response-parsing': 600,
      'data-validation': 400,
      'caching': 200
    },
    stepSuccessRate: 0.95
  };
  
  const mockExportData: ExportData = {
    exportDate: new Date().toISOString(),
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
      granularity: 'hour'
    },
    costMetrics: mockCostMetrics,
    tokenUsage: mockTokenUsage,
    messageAnalytics: mockMessageAnalytics,
    stepAnalytics: mockStepAnalytics,
    serviceTiers: [],
    recommendations: []
  };
  
  const mockOptimization: CostOptimization = {
    id: 'opt-1',
    title: 'Test Optimization',
    description: 'Test optimization description',
    potentialSavings: 50.00,
    implementation: 'easy',
    priority: 'medium',
    category: 'tokens'
  };
  
  const handleExport = (format: string, data: ExportData) => {
    console.log('Import test - Export:', format, data);
  };
  
  const handleOptimization = (optimization: CostOptimization) => {
    console.log('Import test - Optimization:', optimization);
  };
  
  const handleTimeRangeChange = (range: string) => {
    console.log('Import test - Time range:', range);
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Analytics Import Test
        </h2>
        <p className="text-gray-600 mb-4">
          This component validates that all analytics imports are working correctly.
        </p>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            ✅ CostOverviewDashboard: {typeof CostOverviewDashboard === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ MessageStepAnalytics: {typeof MessageStepAnalytics === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ OptimizationRecommendations: {typeof OptimizationRecommendations === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ ExportReportingFeatures: {typeof ExportReportingFeatures === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ EnhancedAnalyticsPage: {typeof EnhancedAnalyticsPage === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ AnalyticsProvider: {typeof AnalyticsProvider === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ AnalyticsErrorBoundary: {typeof AnalyticsErrorBoundary === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ LineChart: {typeof LineChart === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ BarChart: {typeof BarChart === 'function' ? 'Loaded' : 'Failed'}
          </div>
          <div className="text-sm text-gray-500">
            ✅ PieChart: {typeof PieChart === 'function' ? 'Loaded' : 'Failed'}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-medium text-gray-900 mb-2">Mock Data Test</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Cost Metrics: ${mockCostMetrics.totalCost}</div>
            <div>Token Usage: {mockTokenUsage.totalTokens.toLocaleString()}</div>
            <div>Messages: {mockMessageAnalytics.totalMessages}</div>
            <div>Steps: {mockStepAnalytics.totalSteps}</div>
          </div>
        </div>
        
        <div className="mt-4">
          <AnalyticsLoadingFallback message="Testing loading fallback..." />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsImportTest;

// HOC test
const TestComponentWithProvider = withAnalyticsProvider(
  () => <div>Provider HOC Test</div>
);

const TestComponentWithErrorBoundary = withAnalyticsErrorBoundary(
  () => <div>Error Boundary HOC Test</div>
);

export { TestComponentWithProvider, TestComponentWithErrorBoundary };
