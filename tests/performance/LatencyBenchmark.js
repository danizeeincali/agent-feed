/**
 * Latency Analysis System
 * Detailed latency measurement and analysis for API calls and component rendering
 */

import { performance } from 'perf_hooks';

export class LatencyBenchmark {
  constructor(protocol, configuration) {
    this.protocol = protocol;
    this.config = configuration;
    this.latencyHistogram = new LatencyHistogram();
    this.percentileCalculator = new PercentileCalculator();
    this.measurements = [];
  }

  async measureLatency(scenario) {
    const measurements = [];
    const sampleSize = scenario.sampleSize || 10000;
    const warmupSize = scenario.warmupSize || 1000;
    
    console.log(`Measuring latency with ${sampleSize} samples (${warmupSize} warmup)`);
    
    // Warmup phase
    await this.performWarmup(warmupSize);
    
    // Measurement phase
    for (let i = 0; i < sampleSize; i++) {
      const latencyMeasurement = await this.measureSingleTransactionLatency();
      measurements.push(latencyMeasurement);
      
      // Progress reporting
      if (i % 1000 === 0) {
        console.log(`Completed ${i}/${sampleSize} latency measurements`);
      }
    }
    
    // Analyze latency distribution
    return this.analyzeLatencyDistribution(measurements);
  }

  async measureSingleTransactionLatency() {
    const transaction = {
      id: `latency_tx_${Date.now()}_${Math.random()}`,
      type: 'benchmark',
      data: { value: Math.random() },
      phases: {}
    };
    
    // Phase 1: API Request Preparation
    const preparationStart = performance.now();
    const requestData = this.prepareApiRequest(transaction);
    transaction.phases.preparation = performance.now() - preparationStart;
    
    // Phase 2: Network Request
    const networkStart = performance.now();
    const response = await this.makeApiRequest(requestData);
    transaction.phases.network = performance.now() - networkStart;
    
    // Phase 3: Response Processing
    const processingStart = performance.now();
    const processedData = this.processApiResponse(response);
    transaction.phases.processing = performance.now() - processingStart;
    
    // Phase 4: Component Update
    const renderStart = performance.now();
    await this.simulateComponentUpdate(processedData);
    transaction.phases.render = performance.now() - renderStart;
    
    // Total end-to-end latency
    const totalLatency = transaction.phases.preparation + 
                        transaction.phases.network + 
                        transaction.phases.processing +
                        transaction.phases.render;
    
    return {
      transactionId: transaction.id,
      totalLatency: totalLatency,
      phases: transaction.phases,
      success: response.success,
      timestamp: Date.now()
    };
  }

  async performWarmup(warmupSize) {
    console.log(`Performing warmup with ${warmupSize} requests...`);
    
    for (let i = 0; i < warmupSize; i++) {
      try {
        await this.measureSingleTransactionLatency();
      } catch (error) {
        // Ignore warmup errors
      }
    }
    
    // Allow system to settle
    await this.sleep(1000);
    console.log('Warmup completed');
  }

  prepareApiRequest(transaction) {
    // Simulate request preparation overhead
    const requestData = {
      url: '/api/agents/test-agent',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timestamp: Date.now()
    };
    
    // Add some processing delay
    for (let i = 0; i < 100; i++) {
      JSON.stringify(requestData);
    }
    
    return requestData;
  }

  async makeApiRequest(requestData) {
    try {
      const startTime = performance.now();
      
      // Make actual API request or simulate based on config
      let response;
      if (this.config.useRealAPI) {
        const fetchResponse = await fetch(`http://localhost:3000${requestData.url}`);
        response = {
          success: fetchResponse.ok,
          status: fetchResponse.status,
          data: fetchResponse.ok ? await fetchResponse.json() : null,
          networkTime: performance.now() - startTime
        };
      } else {
        // Simulate network delay
        await this.sleep(Math.random() * 100 + 50);
        response = {
          success: Math.random() > 0.05, // 95% success rate
          status: Math.random() > 0.05 ? 200 : 500,
          data: this.generateMockResponse(),
          networkTime: performance.now() - startTime
        };
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        status: 0,
        error: error.message,
        networkTime: performance.now() - startTime
      };
    }
  }

  processApiResponse(response) {
    const processingStart = performance.now();
    
    if (!response.success) {
      return {
        error: true,
        data: null,
        processingTime: performance.now() - processingStart
      };
    }
    
    // Simulate response processing
    const processedData = {
      ...response.data,
      processedAt: Date.now(),
      transformed: true
    };
    
    // Add processing overhead
    for (let i = 0; i < 50; i++) {
      JSON.parse(JSON.stringify(processedData));
    }
    
    return {
      error: false,
      data: processedData,
      processingTime: performance.now() - processingStart
    };
  }

  async simulateComponentUpdate(processedData) {
    // Simulate React component update cycle
    const operations = [
      () => this.simulateVirtualDOMDiff(processedData),
      () => this.simulateStateUpdate(processedData),
      () => this.simulateRerender(processedData),
      () => this.simulateEffectsExecution(processedData)
    ];
    
    for (const operation of operations) {
      await operation();
      await this.sleep(1); // Simulate async operations
    }
  }

  simulateVirtualDOMDiff(data) {
    // Simulate Virtual DOM diffing algorithm
    for (let i = 0; i < 200; i++) {
      const oldNode = { type: 'div', props: { id: i } };
      const newNode = { type: 'div', props: { id: i, data: data } };
      const diff = JSON.stringify(oldNode) !== JSON.stringify(newNode);
    }
  }

  simulateStateUpdate(data) {
    // Simulate React state update
    const stateUpdates = [
      { loading: false },
      { data: data },
      { error: null },
      { lastUpdated: Date.now() }
    ];
    
    stateUpdates.forEach(update => {
      for (let i = 0; i < 10; i++) {
        Object.assign({}, update);
      }
    });
  }

  simulateRerender(data) {
    // Simulate component re-rendering
    const renderOperations = [
      () => JSON.stringify(data),
      () => Object.keys(data || {}),
      () => Array.isArray(data) ? data.length : 0,
      () => typeof data
    ];
    
    renderOperations.forEach(op => {
      for (let i = 0; i < 5; i++) {
        op();
      }
    });
  }

  async simulateEffectsExecution(data) {
    // Simulate useEffect and other side effects
    const effects = [
      () => console.log('Effect 1 executed'),
      () => this.updateMetrics(data),
      () => this.cacheData(data)
    ];
    
    for (const effect of effects) {
      effect();
      await this.sleep(1);
    }
  }

  updateMetrics(data) {
    // Simulate metrics updating
    for (let i = 0; i < 10; i++) {
      const metric = { timestamp: Date.now(), data: data };
    }
  }

  cacheData(data) {
    // Simulate data caching
    const cacheKey = `cache_${Date.now()}`;
    const cacheEntry = { key: cacheKey, data: data, ttl: 5000 };
  }

  generateMockResponse() {
    return {
      id: 'test-agent',
      name: 'Test Agent',
      status: 'active',
      stats: {
        tasksCompleted: Math.floor(Math.random() * 1000),
        successRate: 95 + Math.random() * 5,
        averageResponseTime: 0.5 + Math.random() * 2
      }
    };
  }

  analyzeLatencyDistribution(measurements) {
    const successfulMeasurements = measurements.filter(m => m.success);
    const latencies = successfulMeasurements.map(m => m.totalLatency);
    
    if (latencies.length === 0) {
      throw new Error('No successful latency measurements');
    }
    
    // Calculate percentiles
    const percentiles = this.percentileCalculator.calculate(latencies, [
      50, 75, 90, 95, 99, 99.9, 99.99
    ]);
    
    // Phase-specific analysis
    const phaseAnalysis = this.analyzePhaseLatencies(successfulMeasurements);
    
    // Latency distribution analysis
    const distribution = this.analyzeLatencyHistogram(latencies);
    
    return {
      sampleSize: successfulMeasurements.length,
      mean: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      median: percentiles[50],
      standardDeviation: this.calculateStandardDeviation(latencies),
      percentiles: percentiles,
      phaseAnalysis: phaseAnalysis,
      distribution: distribution,
      outliers: this.identifyLatencyOutliers(latencies)
    };
  }

  analyzePhaseLatencies(measurements) {
    const phases = ['preparation', 'network', 'processing', 'render'];
    const phaseAnalysis = {};
    
    for (const phase of phases) {
      const phaseLatencies = measurements.map(m => m.phases[phase]).filter(l => l > 0);
      
      if (phaseLatencies.length > 0) {
        phaseAnalysis[phase] = {
          mean: phaseLatencies.reduce((sum, l) => sum + l, 0) / phaseLatencies.length,
          p50: this.percentileCalculator.calculate(phaseLatencies, [50])[50],
          p95: this.percentileCalculator.calculate(phaseLatencies, [95])[95],
          p99: this.percentileCalculator.calculate(phaseLatencies, [99])[99],
          max: Math.max(...phaseLatencies),
          contributionPercent: (phaseLatencies.reduce((sum, l) => sum + l, 0) / 
                               measurements.reduce((sum, m) => sum + m.totalLatency, 0)) * 100
        };
      }
    }
    
    return phaseAnalysis;
  }

  analyzeLatencyHistogram(latencies) {
    const buckets = this.createLatencyBuckets(latencies);
    const histogram = {};
    
    latencies.forEach(latency => {
      const bucket = this.findBucket(latency, buckets);
      histogram[bucket] = (histogram[bucket] || 0) + 1;
    });
    
    return {
      buckets: buckets,
      histogram: histogram,
      distribution: this.calculateDistributionStats(histogram)
    };
  }

  createLatencyBuckets(latencies) {
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const range = max - min;
    const bucketSize = range / 20; // 20 buckets
    
    const buckets = [];
    for (let i = 0; i < 20; i++) {
      const start = min + (i * bucketSize);
      const end = start + bucketSize;
      buckets.push(`${start.toFixed(2)}-${end.toFixed(2)}`);
    }
    
    return buckets;
  }

  findBucket(latency, buckets) {
    // Simple bucket assignment - in production would be more sophisticated
    const bucketIndex = Math.min(Math.floor(latency / 10), buckets.length - 1);
    return buckets[bucketIndex];
  }

  calculateDistributionStats(histogram) {
    const totalSamples = Object.values(histogram).reduce((sum, count) => sum + count, 0);
    const stats = {};
    
    for (const [bucket, count] of Object.entries(histogram)) {
      stats[bucket] = {
        count: count,
        percentage: (count / totalSamples * 100).toFixed(2)
      };
    }
    
    return stats;
  }

  identifyLatencyOutliers(latencies) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const q1 = this.percentileCalculator.calculate(sorted, [25])[25];
    const q3 = this.percentileCalculator.calculate(sorted, [75])[75];
    const iqr = q3 - q1;
    const lowerBound = q1 - (1.5 * iqr);
    const upperBound = q3 + (1.5 * iqr);
    
    const outliers = latencies.filter(l => l < lowerBound || l > upperBound);
    
    return {
      count: outliers.length,
      percentage: (outliers.length / latencies.length * 100).toFixed(2),
      values: outliers.sort((a, b) => b - a).slice(0, 10), // Top 10 outliers
      bounds: { lower: lowerBound, upper: upperBound }
    };
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class LatencyHistogram {
  constructor() {
    this.buckets = new Map();
  }
  
  record(latency) {
    const bucket = this.getBucket(latency);
    this.buckets.set(bucket, (this.buckets.get(bucket) || 0) + 1);
  }
  
  getBucket(latency) {
    // Create logarithmic buckets for better distribution
    return Math.floor(Math.log10(latency) * 10);
  }
  
  getDistribution() {
    return Object.fromEntries(this.buckets);
  }
}

export class PercentileCalculator {
  calculate(values, percentiles) {
    const sorted = [...values].sort((a, b) => a - b);
    const result = {};
    
    for (const p of percentiles) {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[p] = sorted[Math.max(0, index)];
    }
    
    return result;
  }
}

export default LatencyBenchmark;