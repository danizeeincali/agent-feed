#!/usr/bin/env node

/**
 * Database Performance Analyzer
 * Specialized tool for PostgreSQL performance analysis and optimization
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class DatabasePerformanceAnalyzer {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME || 'agent_feed',
      user: config.user || process.env.DB_USER || 'postgres',
      password: config.password || process.env.DB_PASSWORD || '',
      ...config
    };
    
    this.pool = new Pool(this.config);
    this.testQueries = this.getTestQueries();
  }

  async analyze() {
    console.log('🗄️  Starting Database Performance Analysis...');
    
    const results = {
      timestamp: new Date().toISOString(),
      connection: await this.testConnection(),
      queryPerformance: await this.analyzeQueryPerformance(),
      indexUsage: await this.analyzeIndexUsage(),
      connectionPoolPerformance: await this.analyzeConnectionPool(),
      concurrencyTest: await this.testConcurrentQueries(),
      recommendations: []
    };
    
    results.recommendations = this.generateRecommendations(results);
    
    console.log('✅ Database analysis complete');
    return results;
  }

  async testConnection() {
    console.log('  📡 Testing database connection...');
    
    try {
      const start = performance.now();
      const client = await this.pool.connect();
      const connectionTime = performance.now() - start;
      
      const result = await client.query('SELECT version(), current_database(), current_user');
      client.release();
      
      return {
        success: true,
        connectionTime,
        version: result.rows[0].version,
        database: result.rows[0].current_database,
        user: result.rows[0].current_user
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeQueryPerformance() {
    console.log('  🔍 Analyzing query performance...');
    
    const results = {};
    
    for (const [queryName, queryInfo] of Object.entries(this.testQueries)) {
      console.log(`    Testing ${queryName}...`);
      
      const measurements = [];
      const sampleSize = 50;
      
      // Warmup
      for (let i = 0; i < 5; i++) {
        try {
          await this.pool.query(queryInfo.sql, queryInfo.params || []);
        } catch (error) {
          // Ignore warmup errors
        }
      }
      
      // Actual measurements
      for (let i = 0; i < sampleSize; i++) {
        const measurement = await this.measureQuery(queryInfo.sql, queryInfo.params);
        measurements.push(measurement);
      }
      
      const successful = measurements.filter(m => m.success);
      const durations = successful.map(m => m.duration);
      
      if (durations.length > 0) {
        results[queryName] = {
          averageTime: this.calculateAverage(durations),
          medianTime: this.calculatePercentile(durations, 50),
          p95Time: this.calculatePercentile(durations, 95),
          p99Time: this.calculatePercentile(durations, 99),
          minTime: Math.min(...durations),
          maxTime: Math.max(...durations),
          successRate: successful.length / measurements.length,
          sampleSize: measurements.length,
          queryPlan: await this.getQueryPlan(queryInfo.sql, queryInfo.params),
          target: queryInfo.target || 100,
          compliance: this.calculateAverage(durations) <= (queryInfo.target || 100)
        };
      }
    }
    
    return results;
  }

  async measureQuery(sql, params = []) {
    const start = performance.now();
    try {
      const result = await this.pool.query(sql, params);
      return {
        duration: performance.now() - start,
        success: true,
        rowCount: result.rowCount
      };
    } catch (error) {
      return {
        duration: performance.now() - start,
        success: false,
        error: error.message
      };
    }
  }

  async getQueryPlan(sql, params = []) {
    try {
      const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
      const result = await this.pool.query(explainSql, params);
      return result.rows[0]['QUERY PLAN'][0];
    } catch (error) {
      return { error: error.message };
    }
  }

  async analyzeIndexUsage() {
    console.log('  📊 Analyzing index usage...');
    
    const indexUsageQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan,
        CASE 
          WHEN idx_scan = 0 THEN 'UNUSED'
          WHEN idx_scan < 10 THEN 'LOW_USAGE'
          WHEN idx_scan < 100 THEN 'MODERATE_USAGE'
          ELSE 'HIGH_USAGE'
        END as usage_level
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC;
    `;
    
    const tableStatsQuery = `
      SELECT 
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        CASE 
          WHEN seq_scan > idx_scan THEN 'NEEDS_INDEX'
          ELSE 'INDEXED_ACCESS'
        END as access_pattern
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY seq_scan DESC;
    `;
    
    try {
      const indexResult = await this.pool.query(indexUsageQuery);
      const tableResult = await this.pool.query(tableStatsQuery);
      
      return {
        indexes: indexResult.rows,
        tables: tableResult.rows,
        summary: {
          totalIndexes: indexResult.rows.length,
          unusedIndexes: indexResult.rows.filter(row => row.usage_level === 'UNUSED').length,
          tablesNeedingIndexes: tableResult.rows.filter(row => row.access_pattern === 'NEEDS_INDEX').length
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async analyzeConnectionPool() {
    console.log('  🏊 Analyzing connection pool performance...');
    
    const measurements = [];
    const testDuration = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < testDuration) {
      const acquisitionStart = performance.now();
      
      try {
        const client = await this.pool.connect();
        const acquisitionTime = performance.now() - acquisitionStart;
        
        // Quick query to test connection
        await client.query('SELECT 1');
        client.release();
        
        measurements.push({
          acquisitionTime,
          success: true
        });
      } catch (error) {
        measurements.push({
          acquisitionTime: performance.now() - acquisitionStart,
          success: false,
          error: error.message
        });
      }
      
      await this.sleep(100); // 100ms between tests
    }
    
    const successful = measurements.filter(m => m.success);
    const acquisitionTimes = successful.map(m => m.acquisitionTime);
    
    return {
      totalTests: measurements.length,
      successfulConnections: successful.length,
      successRate: successful.length / measurements.length,
      averageAcquisitionTime: this.calculateAverage(acquisitionTimes),
      p95AcquisitionTime: this.calculatePercentile(acquisitionTimes, 95),
      maxAcquisitionTime: acquisitionTimes.length > 0 ? Math.max(...acquisitionTimes) : 0,
      poolStats: {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      }
    };
  }

  async testConcurrentQueries() {
    console.log('  ⚡ Testing concurrent query performance...');
    
    const concurrencyLevels = [1, 5, 10, 20, 50];
    const results = {};
    
    for (const level of concurrencyLevels) {
      console.log(`    Testing ${level} concurrent queries...`);
      
      const promises = [];
      const startTime = performance.now();
      
      for (let i = 0; i < level; i++) {
        promises.push(this.runConcurrentQuery(i));
      }
      
      const queryResults = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const successful = queryResults.filter(r => r.success);
      const durations = successful.map(r => r.duration);
      
      results[`level_${level}`] = {
        concurrency: level,
        totalTime,
        successRate: successful.length / queryResults.length,
        averageQueryTime: this.calculateAverage(durations),
        p95QueryTime: this.calculatePercentile(durations, 95),
        throughput: (successful.length / totalTime) * 1000, // queries/sec
        errors: queryResults.length - successful.length
      };
    }
    
    return results;
  }

  async runConcurrentQuery(queryId) {
    const start = performance.now();
    try {
      const result = await this.pool.query('SELECT * FROM agent_posts LIMIT 10');
      return {
        queryId,
        duration: performance.now() - start,
        success: true,
        rowCount: result.rowCount
      };
    } catch (error) {
      return {
        queryId,
        duration: performance.now() - start,
        success: false,
        error: error.message
      };
    }
  }

  getTestQueries() {
    return {
      simple_select: {
        sql: 'SELECT id, title, created_at FROM agent_posts LIMIT 10',
        target: 50 // ms
      },
      paginated_query: {
        sql: 'SELECT id, title, content, created_at FROM agent_posts ORDER BY created_at DESC LIMIT 20 OFFSET $1',
        params: [20],
        target: 100
      },
      search_query: {
        sql: `SELECT id, title, content, created_at 
              FROM agent_posts 
              WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
              LIMIT 20`,
        params: ['test search'],
        target: 200
      },
      count_query: {
        sql: 'SELECT COUNT(*) FROM agent_posts WHERE created_at > $1',
        params: [new Date(Date.now() - 24 * 60 * 60 * 1000)], // Last 24 hours
        target: 100
      },
      join_query: {
        sql: `SELECT p.id, p.title, p.engagement_count, u.username
              FROM agent_posts p
              LEFT JOIN users u ON p.author_id = u.id
              ORDER BY p.created_at DESC
              LIMIT 15`,
        target: 150
      },
      aggregate_query: {
        sql: `SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                COUNT(*) as post_count,
                AVG(engagement_count) as avg_engagement
              FROM agent_posts 
              WHERE created_at > NOW() - INTERVAL '24 hours'
              GROUP BY DATE_TRUNC('hour', created_at)
              ORDER BY hour DESC`,
        target: 300
      }
    };
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    // Connection pool recommendations
    if (results.connectionPoolPerformance) {
      const pool = results.connectionPoolPerformance;
      if (pool.averageAcquisitionTime > 50) {
        recommendations.push({
          category: 'CONNECTION_POOL',
          priority: 'HIGH',
          title: 'Optimize Connection Pool Size',
          description: `Average connection acquisition time is ${pool.averageAcquisitionTime.toFixed(2)}ms`,
          suggestion: 'Consider increasing pool size or optimizing connection reuse'
        });
      }
      
      if (pool.successRate < 0.95) {
        recommendations.push({
          category: 'CONNECTION_POOL',
          priority: 'HIGH',
          title: 'Improve Connection Reliability',
          description: `Connection success rate is ${(pool.successRate * 100).toFixed(1)}%`,
          suggestion: 'Check network connectivity and database configuration'
        });
      }
    }
    
    // Query performance recommendations
    if (results.queryPerformance) {
      for (const [queryName, metrics] of Object.entries(results.queryPerformance)) {
        if (!metrics.compliance) {
          recommendations.push({
            category: 'QUERY_PERFORMANCE',
            priority: 'MEDIUM',
            title: `Optimize ${queryName}`,
            description: `Query average time ${metrics.averageTime.toFixed(2)}ms exceeds target ${metrics.target}ms`,
            suggestion: 'Consider adding indexes, optimizing query structure, or caching results'
          });
        }
        
        if (metrics.p99Time > metrics.averageTime * 5) {
          recommendations.push({
            category: 'QUERY_PERFORMANCE',
            priority: 'MEDIUM',
            title: `Address ${queryName} Tail Latency`,
            description: `P99 latency (${metrics.p99Time.toFixed(2)}ms) is significantly higher than average`,
            suggestion: 'Investigate query plan variations and consider query optimization'
          });
        }
      }
    }
    
    // Index usage recommendations
    if (results.indexUsage && results.indexUsage.summary) {
      const indexSummary = results.indexUsage.summary;
      
      if (indexSummary.unusedIndexes > 0) {
        recommendations.push({
          category: 'INDEX_OPTIMIZATION',
          priority: 'LOW',
          title: 'Remove Unused Indexes',
          description: `${indexSummary.unusedIndexes} unused indexes detected`,
          suggestion: 'Consider dropping unused indexes to improve write performance'
        });
      }
      
      if (indexSummary.tablesNeedingIndexes > 0) {
        recommendations.push({
          category: 'INDEX_OPTIMIZATION',
          priority: 'HIGH',
          title: 'Add Missing Indexes',
          description: `${indexSummary.tablesNeedingIndexes} tables with high sequential scan ratio`,
          suggestion: 'Add indexes on frequently queried columns to improve read performance'
        });
      }
    }
    
    // Concurrency recommendations
    if (results.concurrencyTest) {
      const highConcurrency = results.concurrencyTest['level_50'];
      if (highConcurrency && highConcurrency.successRate < 0.9) {
        recommendations.push({
          category: 'CONCURRENCY',
          priority: 'HIGH',
          title: 'Improve Concurrent Query Handling',
          description: `Success rate drops to ${(highConcurrency.successRate * 100).toFixed(1)}% at 50 concurrent queries`,
          suggestion: 'Consider increasing connection pool size or implementing connection queuing'
        });
      }
    }
    
    return recommendations;
  }

  // Utility methods
  calculateAverage(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
  
  calculatePercentile(numbers, percentile) {
    if (!numbers || numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    await this.pool.end();
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new DatabasePerformanceAnalyzer();
  
  analyzer.analyze()
    .then(results => {
      console.log('\n📊 Database Performance Analysis Results:');
      console.log(JSON.stringify(results, null, 2));
      return analyzer.close();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Database analysis failed:', error);
      process.exit(1);
    });
}

module.exports = DatabasePerformanceAnalyzer;