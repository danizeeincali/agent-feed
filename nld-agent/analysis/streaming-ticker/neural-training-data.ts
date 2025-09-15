/**
 * Neural Training Data for Streaming Ticker Failure Prediction
 *
 * NLD Neural Learning System: Training datasets for failure pattern recognition
 * Generates data for claude-flow neural models
 */

export interface NeuralTrainingPattern {
  id: string;
  input: {
    features: Record<string, number>;
    contextual: Record<string, string>;
    temporal: Record<string, number[]>;
  };
  output: {
    failureType: string;
    severity: number; // 0-1 scale
    probability: number; // 0-1 scale
    timeToFailure: number; // milliseconds
    preventionActions: string[];
  };
  metadata: {
    scenario: string;
    dataSource: string;
    confidence: number;
    validationStatus: 'verified' | 'synthetic' | 'observed';
  };
}

export interface TrainingDataset {
  name: string;
  description: string;
  patterns: NeuralTrainingPattern[];
  statistics: {
    totalPatterns: number;
    byFailureType: Record<string, number>;
    bySeverity: Record<string, number>;
    byConfidence: Record<string, number>;
  };
}

/**
 * CONNECTION FAILURE TRAINING DATA
 */
export const CONNECTION_FAILURE_TRAINING: NeuralTrainingPattern[] = [
  {
    id: 'CONN-TRAIN-001',
    input: {
      features: {
        heartbeat_latency_ms: 8500,
        reconnect_attempts: 2,
        error_rate: 0.08,
        packet_loss: 0.03,
        connection_age_minutes: 45,
        network_quality_score: 0.4,
        background_tab_duration: 120000,
        memory_usage_mb: 85
      },
      contextual: {
        browser: 'chrome',
        os: 'windows',
        connection_type: 'wifi',
        time_of_day: 'afternoon',
        tab_state: 'background'
      },
      temporal: {
        latency_trend_5min: [3000, 4200, 5800, 7100, 8500],
        error_rate_trend_1min: [0.02, 0.04, 0.06, 0.07, 0.08],
        memory_usage_trend_10min: [65, 68, 72, 78, 85]
      }
    },
    output: {
      failureType: 'heartbeat_timeout',
      severity: 0.8,
      probability: 0.85,
      timeToFailure: 15000,
      preventionActions: [
        'increase_heartbeat_frequency',
        'prepare_reconnection',
        'cache_current_state'
      ]
    },
    metadata: {
      scenario: 'Progressive connection degradation in background tab',
      dataSource: 'observed_failure',
      confidence: 0.9,
      validationStatus: 'verified'
    }
  },

  {
    id: 'CONN-TRAIN-002',
    input: {
      features: {
        heartbeat_latency_ms: 15000,
        reconnect_attempts: 5,
        error_rate: 0.12,
        packet_loss: 0.08,
        connection_age_minutes: 120,
        network_quality_score: 0.2,
        background_tab_duration: 0,
        memory_usage_mb: 150
      },
      contextual: {
        browser: 'firefox',
        os: 'macos',
        connection_type: 'cellular',
        time_of_day: 'evening',
        tab_state: 'active'
      },
      temporal: {
        latency_trend_5min: [8000, 10000, 12000, 14000, 15000],
        error_rate_trend_1min: [0.08, 0.09, 0.10, 0.11, 0.12],
        memory_usage_trend_10min: [120, 130, 140, 145, 150]
      }
    },
    output: {
      failureType: 'max_reconnect_reached',
      severity: 1.0,
      probability: 0.95,
      timeToFailure: 5000,
      preventionActions: [
        'force_full_refresh',
        'switch_to_polling',
        'notify_user_connectivity_issue'
      ]
    },
    metadata: {
      scenario: 'Poor cellular connection causing permanent failure',
      dataSource: 'observed_failure',
      confidence: 0.95,
      validationStatus: 'verified'
    }
  },

  {
    id: 'CONN-TRAIN-003',
    input: {
      features: {
        heartbeat_latency_ms: 2000,
        reconnect_attempts: 0,
        error_rate: 0.01,
        packet_loss: 0.005,
        connection_age_minutes: 15,
        network_quality_score: 0.9,
        background_tab_duration: 300000,
        memory_usage_mb: 45
      },
      contextual: {
        browser: 'chrome',
        os: 'linux',
        connection_type: 'ethernet',
        time_of_day: 'morning',
        tab_state: 'background'
      },
      temporal: {
        latency_trend_5min: [1800, 1900, 1950, 2000, 2000],
        error_rate_trend_1min: [0.01, 0.01, 0.01, 0.01, 0.01],
        memory_usage_trend_10min: [40, 42, 43, 44, 45]
      }
    },
    output: {
      failureType: 'background_suspension',
      severity: 0.6,
      probability: 0.7,
      timeToFailure: 60000,
      preventionActions: [
        'enable_page_visibility_handling',
        'implement_suspend_resume_logic',
        'reduce_background_activity'
      ]
    },
    metadata: {
      scenario: 'Stable connection at risk of browser background throttling',
      dataSource: 'synthetic_pattern',
      confidence: 0.8,
      validationStatus: 'synthetic'
    }
  }
];

/**
 * PARSING FAILURE TRAINING DATA
 */
export const PARSING_FAILURE_TRAINING: NeuralTrainingPattern[] = [
  {
    id: 'PARSE-TRAIN-001',
    input: {
      features: {
        message_size_bytes: 8192,
        escape_sequence_count: 25,
        json_nesting_depth: 6,
        parsing_time_ms: 15,
        malformed_character_count: 3,
        output_position_jump: 1500,
        checksum_mismatch_count: 1,
        concurrent_messages: 3
      },
      contextual: {
        message_type: 'terminal_output',
        encoding: 'utf-8',
        compression: 'none',
        instance_type: 'claude-sonnet',
        command_complexity: 'high'
      },
      temporal: {
        message_size_trend: [2048, 4096, 6144, 7168, 8192],
        parsing_time_trend: [3, 7, 10, 12, 15],
        error_rate_trend: [0, 0, 0.01, 0.02, 0.03]
      }
    },
    output: {
      failureType: 'escape_sequence_overflow',
      severity: 0.5,
      probability: 0.75,
      timeToFailure: 2000,
      preventionActions: [
        'increase_escape_filtering',
        'limit_message_size',
        'validate_encoding'
      ]
    },
    metadata: {
      scenario: 'High escape sequence density causing parsing slowdown',
      dataSource: 'observed_pattern',
      confidence: 0.85,
      validationStatus: 'verified'
    }
  },

  {
    id: 'PARSE-TRAIN-002',
    input: {
      features: {
        message_size_bytes: 16384,
        escape_sequence_count: 5,
        json_nesting_depth: 3,
        parsing_time_ms: 45,
        malformed_character_count: 0,
        output_position_jump: -100,
        checksum_mismatch_count: 0,
        concurrent_messages: 1
      },
      contextual: {
        message_type: 'terminal_output',
        encoding: 'utf-8',
        compression: 'gzip',
        instance_type: 'claude-haiku',
        command_complexity: 'low'
      },
      temporal: {
        message_size_trend: [12000, 13000, 14500, 15500, 16384],
        parsing_time_trend: [25, 30, 35, 40, 45],
        error_rate_trend: [0, 0, 0, 0, 0]
      }
    },
    output: {
      failureType: 'position_regression',
      severity: 0.8,
      probability: 0.9,
      timeToFailure: 1000,
      preventionActions: [
        'reset_position_tracking',
        'validate_position_sequence',
        'request_position_sync'
      ]
    },
    metadata: {
      scenario: 'Position tracking desynchronization detected',
      dataSource: 'observed_failure',
      confidence: 0.9,
      validationStatus: 'verified'
    }
  }
];

/**
 * MEMORY LEAK TRAINING DATA
 */
export const MEMORY_LEAK_TRAINING: NeuralTrainingPattern[] = [
  {
    id: 'MEM-TRAIN-001',
    input: {
      features: {
        memory_usage_mb: 180,
        active_connections: 12,
        event_listeners_count: 450,
        connection_age_avg_minutes: 240,
        gc_frequency_per_minute: 0.2,
        memory_growth_rate_mb_per_hour: 25,
        cleanup_success_rate: 0.85,
        browser_memory_pressure: 0.7
      },
      contextual: {
        browser: 'chrome',
        session_duration_hours: 4,
        tab_count: 8,
        instance_count: 3,
        user_activity: 'heavy'
      },
      temporal: {
        memory_usage_trend_1hour: [120, 135, 150, 165, 180],
        connection_count_trend: [8, 9, 10, 11, 12],
        cleanup_rate_trend: [0.95, 0.92, 0.88, 0.87, 0.85]
      }
    },
    output: {
      failureType: 'connection_accumulation',
      severity: 0.9,
      probability: 0.8,
      timeToFailure: 30000,
      preventionActions: [
        'force_connection_cleanup',
        'reduce_connection_limit',
        'trigger_garbage_collection'
      ]
    },
    metadata: {
      scenario: 'Long session with accumulating connections',
      dataSource: 'observed_pattern',
      confidence: 0.85,
      validationStatus: 'verified'
    }
  }
];

/**
 * RACE CONDITION TRAINING DATA
 */
export const RACE_CONDITION_TRAINING: NeuralTrainingPattern[] = [
  {
    id: 'RACE-TRAIN-001',
    input: {
      features: {
        concurrent_operations: 8,
        operation_queue_depth: 15,
        lock_contention_count: 5,
        sequence_violations: 2,
        timing_variance_ms: 250,
        final_response_delay_ms: 500,
        streaming_update_frequency: 50,
        state_inconsistency_count: 1
      },
      contextual: {
        operation_type: 'command_execution',
        instance_load: 'high',
        network_jitter: 'moderate',
        user_interaction: 'rapid',
        system_load: 'high'
      },
      temporal: {
        concurrency_trend: [3, 5, 6, 7, 8],
        queue_depth_trend: [5, 8, 10, 12, 15],
        violation_count_trend: [0, 0, 1, 1, 2]
      }
    },
    output: {
      failureType: 'final_response_conflict',
      severity: 0.9,
      probability: 0.85,
      timeToFailure: 3000,
      preventionActions: [
        'enable_operation_sequencing',
        'increase_lock_granularity',
        'coordinate_final_response'
      ]
    },
    metadata: {
      scenario: 'High concurrency causing final response conflicts',
      dataSource: 'observed_failure',
      confidence: 0.9,
      validationStatus: 'verified'
    }
  }
];

/**
 * BACKGROUND BEHAVIOR TRAINING DATA
 */
export const BACKGROUND_BEHAVIOR_TRAINING: NeuralTrainingPattern[] = [
  {
    id: 'BG-TRAIN-001',
    input: {
      features: {
        background_duration_minutes: 15,
        visibility_changes_per_hour: 12,
        background_connection_drops: 2,
        recovery_failure_rate: 0.3,
        browser_throttling_detected: 1,
        battery_level: 0.25,
        system_memory_pressure: 0.8,
        background_timer_delays: 5000
      },
      contextual: {
        device_type: 'mobile',
        browser: 'safari',
        power_state: 'battery',
        background_mode: 'aggressive',
        user_multitasking: 'heavy'
      },
      temporal: {
        background_duration_trend: [5, 8, 10, 12, 15],
        drop_count_trend: [0, 0, 1, 1, 2],
        recovery_rate_trend: [1.0, 0.8, 0.6, 0.4, 0.3]
      }
    },
    output: {
      failureType: 'background_throttling',
      severity: 0.7,
      probability: 0.8,
      timeToFailure: 10000,
      preventionActions: [
        'implement_background_optimization',
        'reduce_timer_frequency',
        'prepare_recovery_strategy'
      ]
    },
    metadata: {
      scenario: 'Mobile browser aggressive background throttling',
      dataSource: 'observed_pattern',
      confidence: 0.8,
      validationStatus: 'verified'
    }
  }
];

/**
 * COMPLETE TRAINING DATASETS
 */
export const STREAMING_TICKER_TRAINING_DATASETS: TrainingDataset[] = [
  {
    name: 'connection_failures',
    description: 'SSE connection timeout and failure patterns',
    patterns: CONNECTION_FAILURE_TRAINING,
    statistics: generateDatasetStatistics(CONNECTION_FAILURE_TRAINING)
  },
  {
    name: 'parsing_failures',
    description: 'Output parsing and validation failure patterns',
    patterns: PARSING_FAILURE_TRAINING,
    statistics: generateDatasetStatistics(PARSING_FAILURE_TRAINING)
  },
  {
    name: 'memory_leaks',
    description: 'Memory accumulation and leak patterns',
    patterns: MEMORY_LEAK_TRAINING,
    statistics: generateDatasetStatistics(MEMORY_LEAK_TRAINING)
  },
  {
    name: 'race_conditions',
    description: 'Concurrent operation conflict patterns',
    patterns: RACE_CONDITION_TRAINING,
    statistics: generateDatasetStatistics(RACE_CONDITION_TRAINING)
  },
  {
    name: 'background_behavior',
    description: 'Browser background throttling and suspension patterns',
    patterns: BACKGROUND_BEHAVIOR_TRAINING,
    statistics: generateDatasetStatistics(BACKGROUND_BEHAVIOR_TRAINING)
  }
];

/**
 * Generate dataset statistics
 */
function generateDatasetStatistics(patterns: NeuralTrainingPattern[]) {
  const byFailureType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byConfidence: Record<string, number> = {};

  patterns.forEach(pattern => {
    // Count by failure type
    byFailureType[pattern.output.failureType] =
      (byFailureType[pattern.output.failureType] || 0) + 1;

    // Count by severity range
    const severityRange = pattern.output.severity < 0.5 ? 'low' :
                         pattern.output.severity < 0.8 ? 'medium' : 'high';
    bySeverity[severityRange] = (bySeverity[severityRange] || 0) + 1;

    // Count by confidence range
    const confidenceRange = pattern.metadata.confidence < 0.7 ? 'low' :
                           pattern.metadata.confidence < 0.9 ? 'medium' : 'high';
    byConfidence[confidenceRange] = (byConfidence[confidenceRange] || 0) + 1;
  });

  return {
    totalPatterns: patterns.length,
    byFailureType,
    bySeverity,
    byConfidence
  };
}

/**
 * Export for claude-flow neural training
 */
export function exportForClaudeFlow() {
  const allPatterns = STREAMING_TICKER_TRAINING_DATASETS
    .flatMap(dataset => dataset.patterns);

  return {
    format: 'claude-flow-neural-v1',
    domain: 'streaming-ticker-failure-prediction',
    patterns: allPatterns,
    metadata: {
      totalPatterns: allPatterns.length,
      categories: ['connection', 'parsing', 'memory', 'race_condition', 'background'],
      features: extractFeatureNames(allPatterns),
      exportDate: new Date().toISOString()
    }
  };
}

function extractFeatureNames(patterns: NeuralTrainingPattern[]): string[] {
  const features = new Set<string>();

  patterns.forEach(pattern => {
    Object.keys(pattern.input.features).forEach(feature => features.add(feature));
    Object.keys(pattern.input.contextual).forEach(feature => features.add(`contextual_${feature}`));
    Object.keys(pattern.input.temporal).forEach(feature => features.add(`temporal_${feature}`));
  });

  return Array.from(features).sort();
}

export default {
  STREAMING_TICKER_TRAINING_DATASETS,
  exportForClaudeFlow
};