/**
 * Neural Learning Detection Dashboard
 * 
 * Real-time monitoring dashboard for the ClaudeServiceManager architecture
 * providing live pattern detection, failure prediction, and optimization insights.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { neuralLearningDetector, FailurePattern, NeuralTrainingRecord, ArchitecturalMetrics } from './NeuralLearningDetector';
import { nldIntegration, UserFeedbackEvent, PerformanceMetric } from './NLDIntegration';

interface DashboardState {
  metrics: ArchitecturalMetrics;
  patterns: FailurePattern[];
  trainingRecords: NeuralTrainingRecord[];
  systemState: any;
  isMonitoring: boolean;
  lastUpdate: Date;
}

export const NLDDashboard: React.FC = () => {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    metrics: {
      connectionStability: 100,
      apiSpamScore: 0,
      singleConnectionCompliance: 100,
      raceConditionIndicators: 0,
      serviceManagerConflicts: 0,
      workerInstanceFailures: 0,
      feedIntegrationBottlenecks: 0,
      interfaceResponsiveness: 100,
      componentLoadingFailures: 0,
      stateSynchronizationIssues: 0,
      memoryLeakIndicators: 0,
      cpuUsageSpikes: 0,
      apiResponseDegradation: 0,
      resourceConsumption: 0
    },
    patterns: [],
    trainingRecords: [],
    systemState: {},
    isMonitoring: false,
    lastUpdate: new Date()
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'patterns' | 'training' | 'predictions'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Update dashboard data
  const updateDashboard = useCallback(() => {
    setDashboardState(prev => ({
      ...prev,
      metrics: neuralLearningDetector.getMetrics(),
      patterns: neuralLearningDetector.getPatterns(),
      trainingRecords: neuralLearningDetector.getTrainingData(),
      systemState: nldIntegration.getSystemState(),
      lastUpdate: new Date()
    }));
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(updateDashboard, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, updateDashboard]);

  // Initial load
  useEffect(() => {
    updateDashboard();
  }, [updateDashboard]);

  const toggleMonitoring = () => {
    if (dashboardState.isMonitoring) {
      neuralLearningDetector.deactivate();
    } else {
      neuralLearningDetector.activate();
    }
    
    setDashboardState(prev => ({ 
      ...prev, 
      isMonitoring: !prev.isMonitoring 
    }));
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMetricColor = (value: number, isInverse: boolean = false): string => {
    const threshold = isInverse ? 
      (value > 20 ? 'red' : value > 10 ? 'orange' : 'green') :
      (value < 70 ? 'red' : value < 85 ? 'orange' : 'green');
    
    return threshold === 'red' ? 'text-red-600' : 
           threshold === 'orange' ? 'text-orange-600' : 'text-green-600';
  };

  const criticalPatterns = dashboardState.patterns.filter(p => p.severity === 'critical');
  const highPatterns = dashboardState.patterns.filter(p => p.severity === 'high');
  const successRate = dashboardState.trainingRecords.length > 0 ? 
    dashboardState.trainingRecords.filter(r => r.userFeedback === 'success').length / dashboardState.trainingRecords.length * 100 : 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                🧠 Neural Learning Detection Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Monitoring ClaudeServiceManager architecture for failure patterns and optimization opportunities
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${dashboardState.isMonitoring ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {dashboardState.isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
                </span>
              </div>
              
              <button
                onClick={toggleMonitoring}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dashboardState.isMonitoring 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {dashboardState.isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </button>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoRefresh 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
              >
                Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
              </button>
              
              <button
                onClick={updateDashboard}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            Last updated: {dashboardState.lastUpdate.toLocaleTimeString()} | 
            Active patterns: {dashboardState.patterns.length} | 
            Training records: {dashboardState.trainingRecords.length}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {[
                { key: 'overview', label: '📊 Overview', count: null },
                { key: 'patterns', label: '🔍 Patterns', count: dashboardState.patterns.length },
                { key: 'training', label: '🧠 Training', count: dashboardState.trainingRecords.length },
                { key: 'predictions', label: '🔮 Predictions', count: criticalPatterns.length + highPatterns.length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-semibold">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className={`text-2xl font-semibold ${getMetricColor(successRate)}`}>
                      {successRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-sm font-semibold">🔗</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Connection Stability</p>
                    <p className={`text-2xl font-semibold ${getMetricColor(dashboardState.metrics.connectionStability)}`}>
                      {dashboardState.metrics.connectionStability}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600 text-sm font-semibold">🚨</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                    <p className="text-2xl font-semibold text-red-600">
                      {criticalPatterns.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-sm font-semibold">🧠</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Training Records</p>
                    <p className="text-2xl font-semibold text-purple-600">
                      {dashboardState.trainingRecords.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Health Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Architecture Health Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(dashboardState.metrics).map(([key, value]) => {
                  const isInverse = ['apiSpamScore', 'raceConditionIndicators', 'serviceManagerConflicts', 'workerInstanceFailures', 
                                    'feedIntegrationBottlenecks', 'componentLoadingFailures', 'stateSynchronizationIssues',
                                    'memoryLeakIndicators', 'cpuUsageSpikes', 'apiResponseDegradation', 'resourceConsumption'].includes(key);
                  const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  
                  return (
                    <div key={key} className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">{displayName}</span>
                      <span className={`font-semibold ${getMetricColor(value, isInverse)}`}>
                        {typeof value === 'number' ? value.toFixed(1) : value}
                        {isInverse || key.includes('Compliance') || key.includes('Stability') || key.includes('Responsiveness') ? '%' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Critical Patterns */}
            {criticalPatterns.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-red-600">🚨 Critical Issues Requiring Attention</h3>
                <div className="space-y-4">
                  {criticalPatterns.slice(0, 5).map(pattern => (
                    <div key={pattern.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900">{pattern.description}</h4>
                          <p className="text-sm text-red-700 mt-1">
                            Category: {pattern.category} | Subcategory: {pattern.subcategory}
                          </p>
                          <p className="text-sm text-red-600 mt-2">
                            <strong>Recommended Action:</strong> {pattern.prediction.recommendedAction}
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="text-sm text-red-600">
                            Probability: {(pattern.prediction.probability * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-red-500">
                            Confidence: {(pattern.prediction.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'patterns' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Detected Failure Patterns</h3>
            {dashboardState.patterns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No failure patterns detected yet.</p>
                <p className="text-sm mt-2">Patterns will appear as the system detects issues.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardState.patterns.map(pattern => (
                  <div key={pattern.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(pattern.severity)}`}>
                            {pattern.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {pattern.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mt-2">{pattern.description}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {pattern.category} → {pattern.subcategory}
                        </p>
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Recommendation:</strong> {pattern.prediction.recommendedAction}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-sm text-gray-600">
                          Probability: {(pattern.prediction.probability * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          Confidence: {(pattern.prediction.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          TDD Factor: {pattern.tddFactor.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'training' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Neural Training Records</h3>
            {dashboardState.trainingRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No training records available yet.</p>
                <p className="text-sm mt-2">Records will be created as the system learns from user interactions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardState.trainingRecords.slice(-10).reverse().map(record => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.userFeedback === 'success' ? 'text-green-600 bg-green-100' :
                            record.userFeedback === 'failure' ? 'text-red-600 bg-red-100' :
                            'text-yellow-600 bg-yellow-100'
                          }`}>
                            {record.userFeedback.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {record.timestamp.toLocaleString()}
                          </span>
                          {record.tddUsed && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                              TDD
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mt-2">{record.taskContext}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Claude Confidence: {(record.claudeConfidence * 100).toFixed(0)}%
                        </p>
                        {record.failureMode && (
                          <p className="text-sm text-gray-700 mt-1">
                            <strong>Failure Mode:</strong> {record.failureMode}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-sm text-gray-600">
                          Effectiveness: {(record.effectivenessScore * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'predictions' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Failure Predictions & Recommendations</h3>
            
            <div className="space-y-6">
              {/* High Priority Predictions */}
              {(criticalPatterns.length > 0 || highPatterns.length > 0) && (
                <div>
                  <h4 className="text-md font-semibold text-red-700 mb-3">🔴 High Priority Predictions</h4>
                  <div className="space-y-3">
                    {[...criticalPatterns, ...highPatterns].map(pattern => (
                      <div key={pattern.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-red-900">{pattern.subcategory}</h5>
                            <p className="text-sm text-red-700 mt-1">{pattern.prediction.recommendedAction}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-red-600">
                              {(pattern.prediction.probability * 100).toFixed(0)}% probability
                            </div>
                            <div className="text-xs text-red-500">
                              {(pattern.prediction.confidence * 100).toFixed(0)}% confidence
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Health Forecast */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">📈 System Health Forecast</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Based on current patterns and trends, the ClaudeServiceManager architecture shows:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• Connection stability trending {dashboardState.metrics.connectionStability > 90 ? '✅ stable' : '⚠️ unstable'}</li>
                    <li>• API performance {dashboardState.metrics.apiResponseDegradation < 20 ? '✅ optimal' : '⚠️ degrading'}</li>
                    <li>• Resource usage {dashboardState.metrics.resourceConsumption < 70 ? '✅ healthy' : '⚠️ concerning'}</li>
                    <li>• User experience {dashboardState.metrics.interfaceResponsiveness > 80 ? '✅ responsive' : '⚠️ lagging'}</li>
                  </ul>
                </div>
              </div>

              {/* TDD Effectiveness */}
              <div>
                <h4 className="text-md font-semibold text-blue-700 mb-3">🧪 TDD Effectiveness Analysis</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    Test-Driven Development impact on success rates:
                  </p>
                  <div className="mt-2">
                    <div className="text-sm text-blue-600">
                      TDD Success Rate: {dashboardState.trainingRecords.filter(r => r.tddUsed && r.userFeedback === 'success').length / Math.max(dashboardState.trainingRecords.filter(r => r.tddUsed).length, 1) * 100}%
                    </div>
                    <div className="text-sm text-blue-600">
                      Non-TDD Success Rate: {dashboardState.trainingRecords.filter(r => !r.tddUsed && r.userFeedback === 'success').length / Math.max(dashboardState.trainingRecords.filter(r => !r.tddUsed).length, 1) * 100}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
          <div className="text-center text-sm text-gray-500">
            Neural Learning Detection Agent v1.0 | Monitoring ClaudeServiceManager Architecture | 
            <button 
              onClick={() => {
                const report = neuralLearningDetector.generateReport();
                console.log(report);
                alert('Full report logged to console');
              }}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Export Full Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};