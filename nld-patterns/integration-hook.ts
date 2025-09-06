/**
 * NLD Integration Hook
 * React hook for integrating NLD monitoring into components
 * Provides easy-to-use interface for failure detection and learning
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { nldOrchestrator, NLDSession, NLDReport } from './nld-orchestrator';
import { previewMonitor, PreviewFailurePattern } from './preview-monitor';
import { urlAnalyzer, URLAnalysisResult } from './url-analyzer';
import { neuralTrainer, PredictionResult } from './neural-trainer';

export interface NLDHookConfig {
  autoStart?: boolean;
  monitorPreviews?: boolean;
  monitorPerformance?: boolean;
  monitorTDD?: boolean;
  reportingInterval?: number;
}

export interface NLDHookReturn {
  session: NLDSession | null;
  isMonitoring: boolean;
  patterns: PreviewFailurePattern[];
  predictions: PredictionResult[];
  startMonitoring: () => NLDSession;
  stopMonitoring: () => NLDSession | null;
  generateReport: () => Promise<NLDReport>;
  analyzeURL: (url: string) => URLAnalysisResult;
  recordFailure: (failure: Partial<PreviewFailurePattern>) => void;
  predictFailure: (url: string, context?: any) => Promise<PredictionResult>;
  getRecommendations: () => string[];
}

/**
 * Main NLD monitoring hook
 */
export function useNLD(config: NLDHookConfig = {}): NLDHookReturn {
  const {
    autoStart = true,
    monitorPreviews = true,
    monitorPerformance = true,
    monitorTDD = true,
    reportingInterval = 30000 // 30 seconds
  } = config;

  const [session, setSession] = useState<NLDSession | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [patterns, setPatterns] = useState<PreviewFailurePattern[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && typeof window !== 'undefined') {
      const newSession = startMonitoring();
      setSession(newSession);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      nldOrchestrator.cleanup();
    };
  }, [autoStart]);

  // Update patterns periodically
  useEffect(() => {
    if (isMonitoring) {
      intervalRef.current = setInterval(() => {
        const currentPatterns = previewMonitor.getPatterns();
        setPatterns(currentPatterns);
      }, reportingInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMonitoring, reportingInterval]);

  const startMonitoring = useCallback(() => {
    const newSession = nldOrchestrator.startMonitoring();
    setSession(newSession);
    setIsMonitoring(true);
    return newSession;
  }, []);

  const stopMonitoring = useCallback(() => {
    const completedSession = nldOrchestrator.stopMonitoring();
    setSession(completedSession);
    setIsMonitoring(false);
    return completedSession;
  }, []);

  const generateReport = useCallback(async () => {
    return await nldOrchestrator.generateReport();
  }, []);

  const analyzeURL = useCallback((url: string) => {
    return urlAnalyzer.analyzeURL(url);
  }, []);

  const recordFailure = useCallback((failure: Partial<PreviewFailurePattern>) => {
    const completeFailure: PreviewFailurePattern = {
      id: `failure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      url: failure.url || '',
      failureType: failure.failureType || 'url-display',
      failureMode: failure.failureMode || 'unknown',
      expectedBehavior: failure.expectedBehavior || 'Expected correct behavior',
      actualBehavior: failure.actualBehavior || 'Actual behavior observed',
      context: failure.context || {
        displayMode: 'unknown',
        componentState: {},
        networkTiming: { requestStart: 0, responseStart: 0, responseEnd: 0, loadComplete: 0, errors: [] },
        domState: { componentMounted: false, previewVisible: false, thumbnailLoaded: false, linkParsed: false, renderErrors: [] }
      },
      patterns: failure.patterns || {},
      severity: failure.severity || 'medium',
      ...failure
    };

    // This would typically be handled by the monitor, but we can trigger manual recording
    console.log('Recording manual failure:', completeFailure);
  }, []);

  const predictFailure = useCallback(async (url: string, context: any = {}) => {
    try {
      return await neuralTrainer.predictFailure(url, context);
    } catch (error) {
      console.warn('Prediction failed:', error);
      return {
        prediction: 'unknown',
        confidence: 0,
        reasoning: ['Prediction service unavailable'],
        recommendations: [],
        alternatives: []
      };
    }
  }, []);

  const getRecommendations = useCallback(() => {
    return session?.recommendations || [];
  }, [session]);

  return {
    session,
    isMonitoring,
    patterns,
    predictions,
    startMonitoring,
    stopMonitoring,
    generateReport,
    analyzeURL,
    recordFailure,
    predictFailure,
    getRecommendations
  };
}

/**
 * Hook for monitoring specific component failures
 */
export function useComponentFailureDetection(componentName: string) {
  const failureCountRef = useRef(0);
  const lastFailureRef = useRef<number>(0);

  const detectFailure = useCallback((error: Error, context?: any) => {
    failureCountRef.current++;
    lastFailureRef.current = Date.now();

    const failure: Partial<PreviewFailurePattern> = {
      url: window.location.href,
      failureType: 'component-lifecycle',
      failureMode: 'javascript-error',
      expectedBehavior: `${componentName} should render without errors`,
      actualBehavior: `Component error: ${error.message}`,
      context: {
        displayMode: 'component',
        componentState: { componentName, failureCount: failureCountRef.current },
        networkTiming: { requestStart: 0, responseStart: 0, responseEnd: 0, loadComplete: 0, errors: [error.message] },
        domState: { componentMounted: true, previewVisible: false, thumbnailLoaded: false, linkParsed: false, renderErrors: [error.message] }
      },
      severity: failureCountRef.current > 3 ? 'critical' : 'high',
      reproductionSteps: [
        `1. Load component ${componentName}`,
        '2. Trigger the action that caused the error',
        `3. Error occurs: ${error.message}`
      ]
    };

    console.log('Component failure detected:', failure);
    // In real implementation, this would be sent to the monitoring system
  }, [componentName]);

  return {
    failureCount: failureCountRef.current,
    lastFailure: lastFailureRef.current,
    detectFailure
  };
}

/**
 * Hook for preview-specific monitoring
 */
export function usePreviewMonitoring(url?: string) {
  const [analysis, setAnalysis] = useState<URLAnalysisResult | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Analyze URL when provided
  useEffect(() => {
    if (url) {
      const result = urlAnalyzer.analyzeURL(url, { displayMode: 'card', maxLength: 50 });
      setAnalysis(result);
    }
  }, [url]);

  // Get failure prediction
  useEffect(() => {
    if (url) {
      setIsLoading(true);
      neuralTrainer.predictFailure(url, {
        componentComplexity: 2,
        loadTime: 1000,
        memoryUsage: 10
      }).then(result => {
        setPrediction(result);
      }).catch(error => {
        console.warn('Prediction failed:', error);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [url]);

  const reportSuccess = useCallback(() => {
    if (url) {
      console.log('Preview success reported for:', url);
      // Would record success in monitoring system
    }
  }, [url]);

  const reportFailure = useCallback((failureDetails: string) => {
    if (url) {
      const failure: Partial<PreviewFailurePattern> = {
        url,
        failureType: 'rendering',
        failureMode: 'preview-generation-failure',
        expectedBehavior: 'Preview should generate successfully',
        actualBehavior: failureDetails,
        severity: 'medium'
      };
      
      console.log('Preview failure reported:', failure);
      // Would record failure in monitoring system
    }
  }, [url]);

  return {
    analysis,
    prediction,
    isLoading,
    reportSuccess,
    reportFailure,
    hasWWWIssue: analysis?.displayIssues.some(issue => issue.type === 'www-prefix'),
    recommendations: analysis?.recommendations || []
  };
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        setMetrics(current => [...current, ...entries].slice(-100)); // Keep last 100 entries
      });

      observerRef.current.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const measureOperation = useCallback((name: string, fn: () => void | Promise<void>) => {
    if (typeof performance !== 'undefined') {
      const startMark = `${name}-start`;
      const endMark = `${name}-end`;
      const measureName = `${name}-duration`;

      performance.mark(startMark);
      
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          performance.mark(endMark);
          performance.measure(measureName, startMark, endMark);
        });
      } else {
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);
        return result;
      }
    } else {
      return fn();
    }
  }, []);

  return {
    metrics,
    measureOperation
  };
}

/**
 * Development-only debugging hook
 */
export function useNLDDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const updateDebugInfo = () => {
        setDebugInfo({
          session: nldOrchestrator.getCurrentSession(),
          patterns: previewMonitor.getPatterns().slice(-5), // Last 5 patterns
          modelStats: neuralTrainer.getModelStats(),
          timestamp: Date.now()
        });
      };

      const interval = setInterval(updateDebugInfo, 5000);
      updateDebugInfo(); // Initial call

      return () => clearInterval(interval);
    }
  }, []);

  const exportData = useCallback(() => {
    const data = nldOrchestrator.exportNLDData();
    console.log('NLD Debug Data:', data);
    return data;
  }, []);

  return {
    debugInfo,
    exportData,
    isDebugMode: process.env.NODE_ENV === 'development'
  };
}

/**
 * Utility hook for TDD pattern suggestions
 */
export function useTDDSuggestions(componentName: string, testType: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // In real implementation, this would query the TDD database
    const mockSuggestions = [
      `Add error handling tests for ${componentName}`,
      `Test async operations in ${componentName}`,
      `Add edge case tests for ${testType}`,
      `Improve mock usage in ${componentName} tests`,
      `Add user interaction tests for ${componentName}`
    ];

    setSuggestions(mockSuggestions.slice(0, 3));
  }, [componentName, testType]);

  return { suggestions };
}

export default useNLD;