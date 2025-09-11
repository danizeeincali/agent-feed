/**
 * Throughput Measurement System
 * Measures API throughput and system capacity under load
 */

import { performance } from 'perf_hooks';

export class ThroughputBenchmark {
  constructor(protocol, configuration) {
    this.protocol = protocol;
    this.config = configuration;
    this.metrics = new MetricsCollector();
    this.loadGenerator = new LoadGenerator();
    this.activeRequests = new Set();
    this.completedRequests = [];
  }

  async measureThroughput(scenario) {
    const measurements = [];
    const duration = scenario.duration || 60000; // 1 minute default
    const startTime = Date.now();
    
    console.log(`Starting throughput measurement for ${duration/1000} seconds`);
    
    // Initialize load generator
    await this.loadGenerator.initialize({
      requestRate: scenario.initialRate || 10,
      rampUp: scenario.rampUp || false,
      pattern: scenario.pattern || 'constant',
      targetURL: scenario.targetURL || 'http://localhost:3000/api/agents/test-agent'
    });
    
    // Start metrics collection
    this.metrics.startCollection(['transactions_per_second', 'success_rate', 'response_times']);
    
    let currentRate = scenario.initialRate || 10;
    const rateIncrement = scenario.rateIncrement || 5;
    const measurementInterval = 5000; // 5 seconds
    
    while (Date.now() - startTime < duration) {
      const intervalStart = Date.now();
      
      // Generate load for this interval
      const transactions = await this.generateTransactionLoad(
        currentRate, measurementInterval, scenario.targetURL
      );
      
      // Measure throughput for this interval
      const intervalMetrics = await this.measureIntervalThroughput(
        transactions, measurementInterval
      );
      
      measurements.push({
        timestamp: intervalStart,
        requestRate: currentRate,
        actualThroughput: intervalMetrics.throughput,
        successRate: intervalMetrics.successRate,
        averageLatency: intervalMetrics.averageLatency,
        p95Latency: intervalMetrics.p95Latency,
        p99Latency: intervalMetrics.p99Latency,
        errorRate: intervalMetrics.errorRate,
        concurrentRequests: this.activeRequests.size
      });
      
      // Adaptive rate adjustment based on performance
      if (scenario.rampUp && intervalMetrics.successRate > 0.95 && intervalMetrics.p95Latency < 1000) {
        currentRate += rateIncrement;
        console.log(`Increasing load to ${currentRate} RPS`);
      } else if (intervalMetrics.successRate < 0.8 || intervalMetrics.p95Latency > 2000) {
        currentRate = Math.max(1, currentRate - rateIncrement);
        console.log(`Decreasing load to ${currentRate} RPS due to performance degradation`);
      }
      
      // Progress reporting
      console.log(`Interval: ${Math.floor((Date.now() - startTime) / 1000)}s, ` +
                 `Rate: ${currentRate} RPS, ` +
                 `Throughput: ${intervalMetrics.throughput.toFixed(2)}, ` +
                 `Success Rate: ${(intervalMetrics.successRate * 100).toFixed(1)}%`);
      
      // Wait for next interval
      const elapsed = Date.now() - intervalStart;
      if (elapsed < measurementInterval) {
        await this.sleep(measurementInterval - elapsed);
      }
    }
    
    // Stop metrics collection
    this.metrics.stopCollection();
    
    // Analyze throughput results
    return this.analyzeThroughputMeasurements(measurements);
  }

  async generateTransactionLoad(rate, duration, targetURL) {
    const transactions = [];
    const interval = 1000 / rate; // Interval between transactions in ms
    const endTime = Date.now() + duration;
    let transactionId = 0;
    
    while (Date.now() < endTime) {
      const transactionStart = Date.now();
      
      const transaction = {
        id: `tx_${Date.now()}_${transactionId++}`,
        type: this.getRandomTransactionType(),
        url: targetURL,
        timestamp: transactionStart,
        startTime: transactionStart
      };
      
      // Add to active requests tracking
      this.activeRequests.add(transaction.id);
      
      // Submit transaction and track promise
      const promise = this.submitTransaction(transaction)
        .then(result => {
          this.activeRequests.delete(transaction.id);
          const completedTransaction = {
            ...transaction,
            result: result,
            latency: Date.now() - transactionStart,
            success: result.success === true,
            endTime: Date.now()
          };
          this.completedRequests.push(completedTransaction);
          return completedTransaction;
        })
        .catch(error => {
          this.activeRequests.delete(transaction.id);
          const failedTransaction = {
            ...transaction,
            error: error,
            latency: Date.now() - transactionStart,
            success: false,
            endTime: Date.now()
          };
          this.completedRequests.push(failedTransaction);
          return failedTransaction;
        });
      
      transactions.push(promise);
      
      // Control rate limiting
      const nextTransactionTime = transactionStart + interval;
      const waitTime = nextTransactionTime - Date.now();
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
    
    // Wait for all transactions to complete (with timeout)
    const timeoutPromise = new Promise(resolve => 
      setTimeout(() => resolve([]), 10000) // 10 second timeout
    );
    
    const completedTransactions = await Promise.race([
      Promise.allSettled(transactions),
      timeoutPromise
    ]);
    
    return completedTransactions
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
  }

  async submitTransaction(transaction) {
    try {
      const startTime = performance.now();
      
      // Make HTTP request
      const response = await fetch(transaction.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      let responseData = null;
      try {
        responseData = await response.json();
      } catch (parseError) {
        // Response might not be JSON
        responseData = { error: 'Invalid JSON response' };
      }
      
      return {
        success: response.ok,
        status: response.status,
        responseTime: responseTime,
        data: responseData,
        size: response.headers.get('content-length') || 0
      };
      
    } catch (error) {
      return {
        success: false,
        status: 0,
        responseTime: 0,
        error: error.message
      };
    }
  }

  async measureIntervalThroughput(transactions, intervalDuration) {
    const completed = await Promise.all(transactions);
    const successful = completed.filter(t => t.success);
    const failed = completed.filter(t => !t.success);
    
    // Calculate throughput (successful transactions per second)
    const throughput = (successful.length / intervalDuration) * 1000;
    
    // Calculate success rate
    const successRate = completed.length > 0 ? successful.length / completed.length : 0;
    
    // Calculate latency statistics
    const latencies = successful.map(t => t.latency);
    const averageLatency = latencies.length > 0 ? 
      latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
    
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    
    const p95Latency = sortedLatencies[p95Index] || 0;
    const p99Latency = sortedLatencies[p99Index] || 0;
    
    // Calculate error rate
    const errorRate = completed.length > 0 ? failed.length / completed.length : 0;
    
    // Response time distribution
    const responseTimeDistribution = this.calculateResponseTimeDistribution(latencies);
    
    return {
      throughput: throughput,
      successRate: successRate,
      errorRate: errorRate,
      averageLatency: averageLatency,
      p95Latency: p95Latency,
      p99Latency: p99Latency,
      minLatency: Math.min(...latencies) || 0,
      maxLatency: Math.max(...latencies) || 0,
      totalRequests: completed.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      responseTimeDistribution: responseTimeDistribution
    };
  }

  calculateResponseTimeDistribution(latencies) {
    const buckets = {
      '0-50ms': 0,
      '50-100ms': 0,
      '100-200ms': 0,
      '200-500ms': 0,
      '500-1000ms': 0,
      '1000ms+': 0
    };
    
    latencies.forEach(latency => {
      if (latency < 50) buckets['0-50ms']++;
      else if (latency < 100) buckets['50-100ms']++;
      else if (latency < 200) buckets['100-200ms']++;
      else if (latency < 500) buckets['200-500ms']++;
      else if (latency < 1000) buckets['500-1000ms']++;
      else buckets['1000ms+']++;
    });
    
    return buckets;
  }

  analyzeThroughputMeasurements(measurements) {
    const totalMeasurements = measurements.length;
    if (totalMeasurements === 0) {
      throw new Error('No measurements to analyze');
    }
    
    const throughputs = measurements.map(m => m.actualThroughput);
    const successRates = measurements.map(m => m.successRate);
    const latencies = measurements.map(m => m.averageLatency);
    
    // Throughput analysis
    const avgThroughput = throughputs.reduce((sum, t) => sum + t, 0) / totalMeasurements;
    const maxThroughput = Math.max(...throughputs);
    const minThroughput = Math.min(...throughputs);
    
    // Success rate analysis
    const avgSuccessRate = successRates.reduce((sum, sr) => sum + sr, 0) / totalMeasurements;
    const minSuccessRate = Math.min(...successRates);
    
    // Find optimal operating point (highest throughput with >95% success rate)
    const optimalPoints = measurements.filter(m => m.successRate >= 0.95);
    const optimalThroughput = optimalPoints.length > 0 ? 
      Math.max(...optimalPoints.map(m => m.actualThroughput)) : 0;
    
    // Calculate sustainable throughput (P80 of throughputs where success rate > 90%)
    const sustainablePoints = measurements.filter(m => m.successRate >= 0.90);
    const sustainableThroughput = this.calculateSustainableThroughput(sustainablePoints);
    
    // Throughput variability analysis
    const throughputVariability = this.calculateThroughputVariability(measurements);
    
    // Performance degradation analysis
    const degradationPoints = this.identifyPerformanceDegradation(measurements);
    
    return {
      summary: {
        averageThroughput: avgThroughput,
        maxThroughput: maxThroughput,
        minThroughput: minThroughput,
        optimalThroughput: optimalThroughput,
        sustainableThroughput: sustainableThroughput,
        averageSuccessRate: avgSuccessRate,
        minSuccessRate: minSuccessRate
      },
      variability: throughputVariability,
      degradation: degradationPoints,
      measurements: measurements,
      recommendations: this.generateThroughputRecommendations(measurements)
    };
  }

  calculateSustainableThroughput(measurements) {
    if (measurements.length === 0) return 0;
    
    const throughputs = measurements.map(m => m.actualThroughput).sort((a, b) => b - a);
    const p80Index = Math.floor(throughputs.length * 0.2); // 80th percentile from top
    return throughputs[p80Index] || 0;
  }

  calculateThroughputVariability(measurements) {
    const throughputs = measurements.map(m => m.actualThroughput);
    const mean = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;
    const variance = throughputs.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / throughputs.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? (standardDeviation / mean) * 100 : 0;
    
    return {
      mean: mean,
      standardDeviation: standardDeviation,
      coefficientOfVariation: coefficientOfVariation,
      stability: coefficientOfVariation < 10 ? 'HIGH' : coefficientOfVariation < 25 ? 'MEDIUM' : 'LOW'
    };
  }

  identifyPerformanceDegradation(measurements) {
    const degradationPoints = [];
    
    for (let i = 1; i < measurements.length; i++) {
      const current = measurements[i];
      const previous = measurements[i - 1];
      
      // Check for throughput drop
      const throughputDrop = (previous.actualThroughput - current.actualThroughput) / previous.actualThroughput;
      if (throughputDrop > 0.2) { // 20% drop
        degradationPoints.push({
          type: 'THROUGHPUT_DROP',
          timestamp: current.timestamp,
          severity: throughputDrop > 0.5 ? 'HIGH' : 'MEDIUM',
          description: `Throughput dropped by ${(throughputDrop * 100).toFixed(1)}%`,
          values: {
            previous: previous.actualThroughput,
            current: current.actualThroughput
          }
        });
      }
      
      // Check for success rate drop
      const successRateDrop = previous.successRate - current.successRate;
      if (successRateDrop > 0.1) { // 10% drop
        degradationPoints.push({
          type: 'SUCCESS_RATE_DROP',
          timestamp: current.timestamp,
          severity: successRateDrop > 0.2 ? 'HIGH' : 'MEDIUM',
          description: `Success rate dropped by ${(successRateDrop * 100).toFixed(1)}%`,
          values: {
            previous: previous.successRate,
            current: current.successRate
          }
        });
      }
      
      // Check for latency spike
      const latencyIncrease = (current.averageLatency - previous.averageLatency) / previous.averageLatency;
      if (latencyIncrease > 0.5) { // 50% increase
        degradationPoints.push({
          type: 'LATENCY_SPIKE',
          timestamp: current.timestamp,
          severity: latencyIncrease > 2.0 ? 'HIGH' : 'MEDIUM',
          description: `Latency increased by ${(latencyIncrease * 100).toFixed(1)}%`,
          values: {
            previous: previous.averageLatency,
            current: current.averageLatency
          }
        });
      }
    }
    
    return degradationPoints;
  }

  generateThroughputRecommendations(measurements) {
    const recommendations = [];
    const avgThroughput = measurements.reduce((sum, m) => sum + m.actualThroughput, 0) / measurements.length;
    const avgSuccessRate = measurements.reduce((sum, m) => sum + m.successRate, 0) / measurements.length;
    const avgLatency = measurements.reduce((sum, m) => sum + m.averageLatency, 0) / measurements.length;
    
    // Throughput optimization recommendations
    if (avgThroughput < 10) {
      recommendations.push({
        category: 'Throughput Optimization',
        priority: 'HIGH',
        issue: `Low average throughput: ${avgThroughput.toFixed(2)} TPS`,
        suggestions: [
          'Implement connection pooling',
          'Add HTTP/2 support for multiplexing',
          'Optimize database queries',
          'Implement caching layers',
          'Consider horizontal scaling'
        ]
      });
    }
    
    // Success rate recommendations
    if (avgSuccessRate < 0.95) {
      recommendations.push({
        category: 'Reliability',
        priority: 'HIGH',
        issue: `Low success rate: ${(avgSuccessRate * 100).toFixed(1)}%`,
        suggestions: [
          'Implement circuit breakers',
          'Add retry mechanisms',
          'Improve error handling',
          'Monitor resource utilization',
          'Implement graceful degradation'
        ]
      });
    }
    
    // Latency recommendations
    if (avgLatency > 1000) {
      recommendations.push({
        category: 'Latency Optimization',
        priority: 'MEDIUM',
        issue: `High average latency: ${avgLatency.toFixed(0)}ms`,
        suggestions: [
          'Implement response compression',
          'Optimize serialization/deserialization',
          'Add CDN for static assets',
          'Implement query optimization',
          'Consider in-memory caching'
        ]
      });
    }
    
    // Scaling recommendations
    const maxConcurrent = Math.max(...measurements.map(m => m.concurrentRequests || 0));
    if (maxConcurrent > 100) {
      recommendations.push({
        category: 'Scalability',
        priority: 'MEDIUM',
        issue: `High concurrency observed: ${maxConcurrent} concurrent requests`,
        suggestions: [
          'Implement load balancing',
          'Add auto-scaling policies',
          'Optimize thread pool configuration',
          'Consider async processing',
          'Implement rate limiting'
        ]
      });
    }
    
    return recommendations;
  }

  getRandomTransactionType() {
    const types = ['read', 'write', 'update', 'delete'];
    return types[Math.floor(Math.random() * types.length)];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class MetricsCollector {
  constructor() {
    this.collecting = false;
    this.metrics = new Map();
    this.interval = null;
  }
  
  startCollection(metricNames) {
    this.collecting = true;
    console.log('Started metrics collection for:', metricNames);
    
    // In a real implementation, this would collect actual system metrics
    this.interval = setInterval(() => {
      if (this.collecting) {
        this.collectMetrics(metricNames);
      }
    }, 1000);
  }
  
  collectMetrics(metricNames) {
    const timestamp = Date.now();
    metricNames.forEach(name => {
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      
      // Simulate metric collection
      let value = 0;
      switch (name) {
        case 'transactions_per_second':
          value = Math.random() * 100;
          break;
        case 'success_rate':
          value = 0.95 + Math.random() * 0.05;
          break;
        case 'response_times':
          value = Math.random() * 500 + 100;
          break;
      }
      
      this.metrics.get(name).push({ timestamp, value });
    });
  }
  
  stopCollection() {
    this.collecting = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    console.log('Stopped metrics collection');
  }
  
  getMetrics(name) {
    return this.metrics.get(name) || [];
  }
}

export class LoadGenerator {
  constructor() {
    this.config = null;
  }
  
  async initialize(config) {
    this.config = config;
    console.log('Load generator initialized with config:', config);
  }
  
  async generateLoad(duration) {
    // Implementation would generate actual load
    console.log(`Generating load for ${duration}ms`);
  }
}

export default ThroughputBenchmark;