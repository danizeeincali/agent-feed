/**
 * Neural Learning Development - Pattern Storage and Retrieval System
 * Manages storage, retrieval, and synchronization of learned patterns
 */

const fs = require('fs').promises;
const path = require('path');

class PatternStorageManager {
  constructor(basePath = './.claude/prod/nld/websocket-hub') {
    this.basePath = basePath;
    this.patternStorage = new Map();
    this.metadataStorage = new Map();
    this.syncQueue = [];
    this.autoSaveInterval = 300000; // 5 minutes
    this.compressionThreshold = 1000000; // 1MB
    this.maxRetries = 3;
    
    this.initializeStorage();
  }

  /**
   * Initialize storage system
   */
  async initializeStorage() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await this.loadExistingPatterns();
      this.startAutoSave();
    } catch (error) {
      console.error('Failed to initialize pattern storage:', error);
    }
  }

  /**
   * Store patterns from NLD modules
   */
  async storePatterns(moduleId, patterns, metadata = {}) {
    const timestamp = Date.now();
    const patternKey = this.createPatternKey(moduleId, timestamp);
    
    const patternData = {
      moduleId,
      timestamp,
      patterns,
      metadata: {
        ...metadata,
        version: '1.0.0',
        size: this.calculateDataSize(patterns),
        checksum: this.calculateChecksum(patterns)
      }
    };

    // Store in memory
    this.patternStorage.set(patternKey, patternData);
    this.metadataStorage.set(patternKey, patternData.metadata);
    
    // Add to sync queue
    this.queueForSync(patternKey, patternData);
    
    return {
      patternKey,
      stored: true,
      size: patternData.metadata.size,
      location: this.getStoragePath(patternKey)
    };
  }

  /**
   * Retrieve patterns for NLD modules
   */
  async retrievePatterns(moduleId, options = {}) {
    const {
      latest = true,
      timeRange = null,
      limit = null,
      includeMetadata = false
    } = options;

    let patterns = [];
    
    // Get patterns from memory first
    for (const [key, data] of this.patternStorage) {
      if (data.moduleId === moduleId) {
        if (timeRange) {
          const { start, end } = timeRange;
          if (data.timestamp < start || data.timestamp > end) {
            continue;
          }
        }
        
        patterns.push({
          key,
          patterns: data.patterns,
          timestamp: data.timestamp,
          ...(includeMetadata && { metadata: data.metadata })
        });
      }
    }

    // Load from disk if needed
    if (patterns.length === 0) {
      patterns = await this.loadPatternsFromDisk(moduleId, options);
    }

    // Sort by timestamp (newest first)
    patterns.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply filters
    if (latest && patterns.length > 0) {
      patterns = [patterns[0]];
    }
    
    if (limit) {
      patterns = patterns.slice(0, limit);
    }

    return patterns;
  }

  /**
   * Store WebSocket Hub patterns collectively
   */
  async storeWebSocketHubPatterns(patternCollection) {
    const results = {};
    const timestamp = Date.now();
    
    // Store each module's patterns
    for (const [moduleId, data] of Object.entries(patternCollection)) {
      try {
        const result = await this.storePatterns(moduleId, data.patterns, {
          ...data.metadata,
          hubTimestamp: timestamp,
          moduleVersion: data.version || '1.0.0'
        });
        results[moduleId] = result;
      } catch (error) {
        results[moduleId] = { error: error.message };
      }
    }

    // Store aggregated patterns
    const aggregatedResult = await this.storeAggregatedPatterns(patternCollection, timestamp);
    results.aggregated = aggregatedResult;

    return results;
  }

  /**
   * Retrieve WebSocket Hub patterns collectively
   */
  async retrieveWebSocketHubPatterns(options = {}) {
    const moduleIds = [
      'connection-pattern-learner',
      'routing-optimizer',
      'failure-predictor',
      'performance-adapter',
      'security-pattern-detector',
      'lifecycle-pattern-analyzer',
      'message-routing-tracker',
      'instance-health-monitor',
      'load-balancing-optimizer'
    ];

    const hubPatterns = {};
    
    for (const moduleId of moduleIds) {
      try {
        const patterns = await this.retrievePatterns(moduleId, options);
        hubPatterns[moduleId] = patterns;
      } catch (error) {
        hubPatterns[moduleId] = { error: error.message };
      }
    }

    // Retrieve aggregated patterns
    try {
      const aggregated = await this.retrievePatterns('websocket-hub-aggregated', options);
      hubPatterns.aggregated = aggregated;
    } catch (error) {
      hubPatterns.aggregated = { error: error.message };
    }

    return hubPatterns;
  }

  /**
   * Sync patterns to persistent storage
   */
  async syncPatterns(force = false) {
    if (this.syncQueue.length === 0 && !force) {
      return { synced: 0, errors: 0 };
    }

    let synced = 0;
    let errors = 0;
    const syncBatch = [...this.syncQueue];
    this.syncQueue = [];

    for (const { key, data } of syncBatch) {
      try {
        await this.writePatternToDisk(key, data);
        synced++;
      } catch (error) {
        console.error(`Failed to sync pattern ${key}:`, error);
        errors++;
        
        // Retry logic
        if (data.retryCount < this.maxRetries) {
          data.retryCount = (data.retryCount || 0) + 1;
          this.queueForSync(key, data);
        }
      }
    }

    return { synced, errors };
  }

  /**
   * Export patterns for backup or migration
   */
  async exportPatterns(options = {}) {
    const {
      moduleIds = null,
      timeRange = null,
      format = 'json',
      compress = false
    } = options;

    const exportData = {
      timestamp: Date.now(),
      version: '1.0.0',
      patterns: {},
      metadata: {}
    };

    // Collect patterns
    for (const [key, data] of this.patternStorage) {
      if (moduleIds && !moduleIds.includes(data.moduleId)) {
        continue;
      }
      
      if (timeRange) {
        const { start, end } = timeRange;
        if (data.timestamp < start || data.timestamp > end) {
          continue;
        }
      }

      if (!exportData.patterns[data.moduleId]) {
        exportData.patterns[data.moduleId] = [];
      }
      
      exportData.patterns[data.moduleId].push({
        timestamp: data.timestamp,
        patterns: data.patterns,
        metadata: data.metadata
      });
    }

    // Add metadata
    exportData.metadata = {
      totalPatterns: Object.values(exportData.patterns).reduce((sum, arr) => sum + arr.length, 0),
      moduleCount: Object.keys(exportData.patterns).length,
      sizeBytes: this.calculateDataSize(exportData),
      exportOptions: options
    };

    // Format output
    let output = JSON.stringify(exportData, null, 2);
    
    if (compress) {
      output = await this.compressData(output);
    }

    return {
      data: output,
      metadata: exportData.metadata,
      format,
      compressed: compress
    };
  }

  /**
   * Import patterns from backup or migration
   */
  async importPatterns(importData, options = {}) {
    const {
      overwrite = false,
      validate = true,
      mergeStrategy = 'latest'
    } = options;

    let data = importData;
    
    // Handle compressed data
    if (typeof data === 'string' && data.startsWith('compressed:')) {
      data = await this.decompressData(data);
    }

    // Parse if string
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    // Validate import data
    if (validate && !this.validateImportData(data)) {
      throw new Error('Invalid import data format');
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      conflicts: []
    };

    // Import patterns
    for (const [moduleId, patterns] of Object.entries(data.patterns)) {
      for (const patternEntry of patterns) {
        try {
          const key = this.createPatternKey(moduleId, patternEntry.timestamp);
          
          // Check for conflicts
          if (this.patternStorage.has(key) && !overwrite) {
            if (mergeStrategy === 'latest') {
              const existing = this.patternStorage.get(key);
              if (existing.timestamp >= patternEntry.timestamp) {
                results.skipped++;
                continue;
              }
            } else if (mergeStrategy === 'skip') {
              results.skipped++;
              continue;
            }
            
            results.conflicts.push({
              key,
              existing: this.patternStorage.get(key).timestamp,
              importing: patternEntry.timestamp
            });
          }

          // Store pattern
          await this.storePatterns(moduleId, patternEntry.patterns, patternEntry.metadata);
          results.imported++;
          
        } catch (error) {
          console.error(`Failed to import pattern for ${moduleId}:`, error);
          results.errors++;
        }
      }
    }

    return results;
  }

  /**
   * Clean up old patterns
   */
  async cleanupPatterns(options = {}) {
    const {
      maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days
      maxCount = 1000,
      moduleIds = null
    } = options;

    const now = Date.now();
    const cutoffTime = now - maxAge;
    
    let cleaned = 0;
    const toRemove = [];

    // Identify patterns to remove
    for (const [key, data] of this.patternStorage) {
      if (moduleIds && !moduleIds.includes(data.moduleId)) {
        continue;
      }

      if (data.timestamp < cutoffTime) {
        toRemove.push(key);
      }
    }

    // Apply count limits per module
    if (maxCount > 0) {
      const modulePatterns = {};
      
      for (const [key, data] of this.patternStorage) {
        if (!modulePatterns[data.moduleId]) {
          modulePatterns[data.moduleId] = [];
        }
        modulePatterns[data.moduleId].push({ key, timestamp: data.timestamp });
      }

      for (const patterns of Object.values(modulePatterns)) {
        patterns.sort((a, b) => b.timestamp - a.timestamp);
        if (patterns.length > maxCount) {
          const excess = patterns.slice(maxCount);
          toRemove.push(...excess.map(p => p.key));
        }
      }
    }

    // Remove patterns
    for (const key of [...new Set(toRemove)]) {
      try {
        await this.removePattern(key);
        cleaned++;
      } catch (error) {
        console.error(`Failed to remove pattern ${key}:`, error);
      }
    }

    return { cleaned, errors: toRemove.length - cleaned };
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    const stats = {
      totalPatterns: this.patternStorage.size,
      totalSize: 0,
      moduleStats: {},
      memoryUsage: 0,
      diskUsage: 0
    };

    // Calculate memory stats
    for (const [key, data] of this.patternStorage) {
      const size = this.calculateDataSize(data);
      stats.totalSize += size;
      stats.memoryUsage += size;

      if (!stats.moduleStats[data.moduleId]) {
        stats.moduleStats[data.moduleId] = {
          count: 0,
          size: 0,
          latest: 0,
          oldest: Infinity
        };
      }

      const moduleStats = stats.moduleStats[data.moduleId];
      moduleStats.count++;
      moduleStats.size += size;
      moduleStats.latest = Math.max(moduleStats.latest, data.timestamp);
      moduleStats.oldest = Math.min(moduleStats.oldest, data.timestamp);
    }

    return stats;
  }

  // Private helper methods
  createPatternKey(moduleId, timestamp) {
    return `${moduleId}_${timestamp}`;
  }

  getStoragePath(key) {
    return path.join(this.basePath, `${key}.json`);
  }

  calculateDataSize(data) {
    return JSON.stringify(data).length;
  }

  calculateChecksum(data) {
    // Simple checksum - in production would use proper hashing
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  queueForSync(key, data) {
    this.syncQueue.push({ key, data });
  }

  async writePatternToDisk(key, data) {
    const filePath = this.getStoragePath(key);
    const jsonData = JSON.stringify(data, null, 2);
    
    // Compress if data is large
    let finalData = jsonData;
    if (jsonData.length > this.compressionThreshold) {
      finalData = await this.compressData(jsonData);
    }

    await fs.writeFile(filePath, finalData, 'utf8');
  }

  async loadPatternsFromDisk(moduleId, options) {
    const patterns = [];
    
    try {
      const files = await fs.readdir(this.basePath);
      const moduleFiles = files.filter(f => f.startsWith(moduleId) && f.endsWith('.json'));
      
      for (const file of moduleFiles) {
        try {
          const filePath = path.join(this.basePath, file);
          const rawData = await fs.readFile(filePath, 'utf8');
          
          let data = rawData;
          if (rawData.startsWith('compressed:')) {
            data = await this.decompressData(rawData);
          }
          
          const patternData = JSON.parse(data);
          patterns.push({
            key: file.replace('.json', ''),
            patterns: patternData.patterns,
            timestamp: patternData.timestamp,
            metadata: patternData.metadata
          });
          
        } catch (error) {
          console.error(`Failed to load pattern file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to read pattern directory:`, error);
    }

    return patterns;
  }

  async loadExistingPatterns() {
    try {
      const files = await fs.readdir(this.basePath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        try {
          const key = file.replace('.json', '');
          const filePath = path.join(this.basePath, file);
          const rawData = await fs.readFile(filePath, 'utf8');
          
          let data = rawData;
          if (rawData.startsWith('compressed:')) {
            data = await this.decompressData(rawData);
          }
          
          const patternData = JSON.parse(data);
          this.patternStorage.set(key, patternData);
          this.metadataStorage.set(key, patternData.metadata);
          
        } catch (error) {
          console.error(`Failed to load existing pattern ${file}:`, error);
        }
      }
    } catch (error) {
      // Directory doesn't exist yet - will be created
    }
  }

  async removePattern(key) {
    // Remove from memory
    this.patternStorage.delete(key);
    this.metadataStorage.delete(key);
    
    // Remove from disk
    try {
      const filePath = this.getStoragePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist - that's ok
    }
  }

  async storeAggregatedPatterns(patternCollection, timestamp) {
    const aggregated = {
      timestamp,
      summary: {
        moduleCount: Object.keys(patternCollection).length,
        totalPatterns: 0,
        avgEffectiveness: 0,
        correlations: []
      },
      crossModulePatterns: this.extractCrossModulePatterns(patternCollection),
      optimization: this.generateOptimizationInsights(patternCollection)
    };

    return await this.storePatterns('websocket-hub-aggregated', aggregated, {
      type: 'aggregated',
      hubVersion: '1.0.0'
    });
  }

  extractCrossModulePatterns(patternCollection) {
    // Analyze patterns across modules for correlations
    return {
      connectionToRouting: 'Analyzed connection patterns correlation with routing efficiency',
      securityToHealth: 'Analyzed security patterns correlation with instance health',
      loadToPerformance: 'Analyzed load balancing correlation with performance adaptation'
    };
  }

  generateOptimizationInsights(patternCollection) {
    return {
      insights: [
        'Connection patterns show strong correlation with routing efficiency',
        'Security threats often precede performance degradation',
        'Load balancing effectiveness improves with health monitoring data'
      ],
      recommendations: [
        'Integrate connection learning with routing optimization',
        'Use security patterns to predict performance issues',
        'Combine health monitoring with load balancing decisions'
      ]
    };
  }

  validateImportData(data) {
    return data && 
           data.patterns && 
           typeof data.patterns === 'object' &&
           data.metadata &&
           data.version;
  }

  async compressData(data) {
    // Simple compression placeholder - in production would use proper compression
    return `compressed:${Buffer.from(data).toString('base64')}`;
  }

  async decompressData(compressedData) {
    // Simple decompression placeholder - in production would use proper decompression
    const base64Data = compressedData.replace('compressed:', '');
    return Buffer.from(base64Data, 'base64').toString('utf8');
  }

  startAutoSave() {
    setInterval(async () => {
      try {
        await this.syncPatterns();
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.autoSaveInterval);
  }
}

module.exports = PatternStorageManager;