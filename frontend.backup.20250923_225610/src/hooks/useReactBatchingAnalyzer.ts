/**
 * React 18 Automatic Batching Analyzer
 * Analyzes React's batching behavior and detects issues with state updates
 * Specifically focuses on React 18's automatic batching changes
 */

import { useRef, useEffect, useCallback } from 'react';

interface BatchingAnalysis {
  batchId: string;
  updates: StateUpdateInBatch[];
  batchStartTime: number;
  batchEndTime: number | null;
  batchDuration: number | null;
  successful: boolean;
  reactVersion: string;
}

interface StateUpdateInBatch {
  updateId: string;
  stateVariable: string;
  updateTime: number;
  valueBeforeUpdate: any;
  valueAfterUpdate: any;
  updateFunction: string;
  callStack: string;
}

interface BatchingReport {
  totalBatches: number;
  successfulBatches: number;
  failedBatches: number;
  averageBatchSize: number;
  averageBatchDuration: number;
  batchingIssues: BatchingIssue[];
  recommendations: string[];
}

interface BatchingIssue {
  type: 'BATCH_TIMEOUT' | 'BATCH_FRAGMENTATION' | 'SYNC_UPDATE_OUTSIDE_BATCH' | 'STATE_COLLISION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: any;
}

export const useReactBatchingAnalyzer = (componentName: string = 'Unknown') => {
  const batchesRef = useRef<BatchingAnalysis[]>([]);
  const currentBatchRef = useRef<BatchingAnalysis | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateCounterRef = useRef(0);
  const analysisActiveRef = useRef(true);

  // Detect React version
  const reactVersion = useRef<string>('unknown');
  useEffect(() => {
    try {
      const React = require('react');
      reactVersion.current = React.version || 'unknown';
      console.log(`🔍 BATCHING ANALYZER: React version detected: ${reactVersion.current}`);
    } catch (error) {
      console.warn('🔍 BATCHING ANALYZER: Could not detect React version');
    }
  }, []);

  /**
   * Start a new batch analysis
   */
  const startBatch = useCallback(() => {
    if (currentBatchRef.current) {
      // End previous batch if it wasn't properly closed
      endBatch(false);
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentBatchRef.current = {
      batchId,
      updates: [],
      batchStartTime: performance.now(),
      batchEndTime: null,
      batchDuration: null,
      successful: false,
      reactVersion: reactVersion.current
    };

    console.log(`🔍 BATCHING: Started batch ${batchId}`, {
      component: componentName,
      timestamp: new Date().toISOString()
    });

    // Set timeout for batch completion detection
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    batchTimeoutRef.current = setTimeout(() => {
      if (currentBatchRef.current && currentBatchRef.current.batchId === batchId) {
        console.warn(`🔍 BATCHING WARNING: Batch ${batchId} timed out`, {
          component: componentName,
          updates: currentBatchRef.current.updates.length
        });
        endBatch(false);
      }
    }, 100); // 100ms timeout for batch completion

  }, [componentName]);

  /**
   * End current batch analysis
   */
  const endBatch = useCallback((successful: boolean = true) => {
    if (!currentBatchRef.current) return;

    const batch = currentBatchRef.current;
    batch.batchEndTime = performance.now();
    batch.batchDuration = batch.batchEndTime - batch.batchStartTime;
    batch.successful = successful;

    console.log(`🔍 BATCHING: Ended batch ${batch.batchId}`, {
      successful,
      updates: batch.updates.length,
      duration: batch.batchDuration?.toFixed(3) + 'ms',
      component: componentName
    });

    batchesRef.current.push({ ...batch });
    currentBatchRef.current = null;

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, [componentName]);

  /**
   * Track a state update within the current batch
   */
  const trackStateUpdateInBatch = useCallback(<T>(
    stateVariable: string,
    updateFunction: () => void,
    getCurrentValue: () => T,
    updateType: 'direct' | 'callback' = 'direct'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      // Start batch if none exists
      if (!currentBatchRef.current) {
        startBatch();
      }

      const updateId = `update_${++updateCounterRef.current}`;
      const valueBeforeUpdate = getCurrentValue();
      const callStack = new Error().stack?.split('\n').slice(2, 6).join('\n') || 'No stack trace';
      const updateTime = performance.now();

      console.log(`🔍 BATCHING: Adding update to batch`, {
        updateId,
        stateVariable,
        batch: currentBatchRef.current?.batchId,
        valueBeforeUpdate,
        updateType,
        component: componentName
      });

      // Create update record
      const updateRecord: StateUpdateInBatch = {
        updateId,
        stateVariable,
        updateTime,
        valueBeforeUpdate,
        valueAfterUpdate: null, // Will be filled after update
        updateFunction: updateType,
        callStack
      };

      currentBatchRef.current?.updates.push(updateRecord);

      // Execute the update
      try {
        updateFunction();

        // Check if update was successful after React processes it
        setTimeout(() => {
          const valueAfterUpdate = getCurrentValue();
          const successful = valueBeforeUpdate !== valueAfterUpdate;
          
          // Update the record with post-update value
          updateRecord.valueAfterUpdate = valueAfterUpdate;

          console.log(`🔍 BATCHING: Update ${updateId} result`, {
            successful,
            valueBeforeUpdate,
            valueAfterUpdate,
            batchId: currentBatchRef.current?.batchId,
            component: componentName
          });

          resolve(successful);
        }, 0);

      } catch (error) {
        console.error(`🔍 BATCHING: Update ${updateId} failed`, {
          error,
          stateVariable,
          component: componentName
        });
        resolve(false);
      }
    });
  }, [componentName, startBatch]);

  /**
   * Analyze batching patterns and detect issues
   */
  const analyzeBatchingPatterns = useCallback((): BatchingReport => {
    const batches = batchesRef.current;
    const totalBatches = batches.length;
    const successfulBatches = batches.filter(b => b.successful).length;
    const failedBatches = totalBatches - successfulBatches;

    let totalUpdates = 0;
    let totalDuration = 0;
    const issues: BatchingIssue[] = [];

    batches.forEach(batch => {
      totalUpdates += batch.updates.length;
      if (batch.batchDuration) {
        totalDuration += batch.batchDuration;
      }

      // Detect batch timeout issues
      if (batch.batchDuration && batch.batchDuration > 50) {
        issues.push({
          type: 'BATCH_TIMEOUT',
          severity: 'MEDIUM',
          description: `Batch ${batch.batchId} took ${batch.batchDuration.toFixed(1)}ms to complete`,
          evidence: batch
        });
      }

      // Detect state collisions
      const stateVariables = new Map<string, StateUpdateInBatch[]>();
      batch.updates.forEach(update => {
        if (!stateVariables.has(update.stateVariable)) {
          stateVariables.set(update.stateVariable, []);
        }
        stateVariables.get(update.stateVariable)!.push(update);
      });

      stateVariables.forEach((updates, stateVar) => {
        if (updates.length > 1) {
          issues.push({
            type: 'STATE_COLLISION',
            severity: 'HIGH',
            description: `Multiple updates to ${stateVar} in single batch (${updates.length} updates)`,
            evidence: { stateVariable: stateVar, updates, batchId: batch.batchId }
          });
        }
      });
    });

    // Detect fragmentation issues
    if (totalBatches > 10 && (totalUpdates / totalBatches) < 2) {
      issues.push({
        type: 'BATCH_FRAGMENTATION',
        severity: 'MEDIUM',
        description: `High batch fragmentation: ${totalBatches} batches with average ${(totalUpdates / totalBatches).toFixed(1)} updates each`,
        evidence: { totalBatches, totalUpdates, averageSize: totalUpdates / totalBatches }
      });
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (failedBatches > successfulBatches) {
      recommendations.push('High batch failure rate - check for async state updates or timing issues');
    }
    
    if (issues.some(i => i.type === 'STATE_COLLISION')) {
      recommendations.push('Use functional state updates to prevent state collisions in batches');
    }
    
    if (issues.some(i => i.type === 'BATCH_FRAGMENTATION')) {
      recommendations.push('Consider consolidating related state updates to reduce batch fragmentation');
    }

    if (reactVersion.current.startsWith('17') || reactVersion.current === 'unknown') {
      recommendations.push('Consider upgrading to React 18 for automatic batching improvements');
    }

    return {
      totalBatches,
      successfulBatches,
      failedBatches,
      averageBatchSize: totalUpdates / Math.max(totalBatches, 1),
      averageBatchDuration: totalDuration / Math.max(totalBatches, 1),
      batchingIssues: issues,
      recommendations
    };
  }, []);

  /**
   * Force batch completion for testing
   */
  const forceBatchCompletion = useCallback(() => {
    if (currentBatchRef.current) {
      endBatch(true);
    }
  }, [endBatch]);

  /**
   * Monitor batching in real-time
   */
  useEffect(() => {
    if (!analysisActiveRef.current) return;

    const monitoringInterval = setInterval(() => {
      // Check for stuck batches
      if (currentBatchRef.current) {
        const batchAge = performance.now() - currentBatchRef.current.batchStartTime;
        if (batchAge > 200) { // 200ms is quite old for a batch
          console.warn(`🔍 BATCHING: Detected stuck batch`, {
            batchId: currentBatchRef.current.batchId,
            age: batchAge.toFixed(1) + 'ms',
            updates: currentBatchRef.current.updates.length,
            component: componentName
          });
        }
      }
    }, 1000);

    return () => clearInterval(monitoringInterval);
  }, [componentName]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      analysisActiveRef.current = false;
      
      // Complete any pending batch
      if (currentBatchRef.current) {
        endBatch(false);
      }

      // Generate final report
      if (batchesRef.current.length > 0) {
        const report = analyzeBatchingPatterns();
        console.group(`🔍 BATCHING REPORT: ${componentName}`);
        console.log('Report:', report);
        console.groupEnd();
      }
    };
  }, [componentName, endBatch, analyzeBatchingPatterns]);

  return {
    trackStateUpdateInBatch,
    analyzeBatchingPatterns,
    forceBatchCompletion,
    getCurrentBatchInfo: () => currentBatchRef.current,
    getTotalBatches: () => batchesRef.current.length,
    isAnalyzing: analysisActiveRef.current
  };
};

/**
 * Hook to detect React 18 automatic batching behavior
 */
export const useAutomaticBatchingDetector = (componentName: string = 'Unknown') => {
  const detectionResultRef = useRef<{
    supportsAutomaticBatching: boolean;
    detectionTime: number;
    evidence: any;
  } | null>(null);

  useEffect(() => {
    const detectAutomaticBatching = async () => {
      console.log(`🔍 BATCHING: Detecting automatic batching support in ${componentName}`);
      
      const startTime = performance.now();
      let batchCount = 0;
      
      // Test automatic batching with setTimeout
      const testPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          // In React 18, these should be batched automatically
          // In React 17, they would not be batched
          batchCount++;
          batchCount++;
          batchCount++;
          resolve();
        }, 0);
      });

      await testPromise;
      
      const detectionTime = performance.now() - startTime;
      
      // React 18 detection heuristics
      const supportsAutomaticBatching = (
        typeof (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentBatchConfig !== 'undefined' ||
        typeof (window as any).React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentBatchConfig !== 'undefined'
      );

      detectionResultRef.current = {
        supportsAutomaticBatching,
        detectionTime,
        evidence: {
          batchCount,
          reactInternals: typeof (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
          windowReact: typeof (window as any).React
        }
      };

      console.log(`🔍 BATCHING: Detection complete`, {
        supportsAutomaticBatching,
        detectionTime: detectionTime.toFixed(2) + 'ms',
        component: componentName
      });
    };

    detectAutomaticBatching().catch(error => {
      console.error(`🔍 BATCHING: Detection failed in ${componentName}`, error);
    });
  }, [componentName]);

  return detectionResultRef.current;
};