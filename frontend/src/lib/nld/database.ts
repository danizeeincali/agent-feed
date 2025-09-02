/**
 * NLD Database for Persistent Storage and Learning
 * Manages pattern storage, retrieval, and neural training data
 */

import { FailurePattern, NLDRecord } from './core';

export interface NLDDatabase {
  patterns: FailurePattern[];
  records: NLDRecord[];
  metadata: {
    version: string;
    created: number;
    updated: number;
    sessionCount: number;
    totalEvents: number;
  };
}

export interface PatternStatistics {
  totalPatterns: number;
  patternsByType: Record<string, number>;
  patternsBySeverity: Record<string, number>;
  averageConfidence: number;
  trendData: Array<{
    date: string;
    count: number;
    type: string;
  }>;
}

export interface NeuralTrainingData {
  features: number[][];
  labels: string[];
  metadata: {
    featureNames: string[];
    labelMapping: Record<string, number>;
    normalizedData: boolean;
  };
}

export class NLDDatabaseManager {
  private readonly DB_KEY = 'nld-database';
  private readonly DB_VERSION = '1.0.0';
  private database: NLDDatabase;

  constructor() {
    this.database = this.loadDatabase();
  }

  /**
   * Store a failure pattern
   */
  storePattern(pattern: FailurePattern): void {
    this.database.patterns.push(pattern);
    this.updateMetadata();
    this.saveDatabase();
    
    console.log('[NLD DB] Pattern stored:', pattern.id);
  }

  /**
   * Store multiple patterns
   */
  storePatterns(patterns: FailurePattern[]): void {
    this.database.patterns.push(...patterns);
    this.updateMetadata();
    this.saveDatabase();
    
    console.log('[NLD DB] Patterns stored:', patterns.length);
  }

  /**
   * Store an NLT record
   */
  storeRecord(record: NLDRecord): void {
    this.database.records.push(record);
    this.updateMetadata();
    this.saveDatabase();
    
    console.log('[NLD DB] Record stored:', record.recordId);
  }

  /**
   * Retrieve patterns by type
   */
  getPatternsByType(type: string): FailurePattern[] {
    return this.database.patterns.filter(p => p.type === type);
  }

  /**
   * Retrieve patterns by severity
   */
  getPatternsBySeverity(severity: string): FailurePattern[] {
    return this.database.patterns.filter(p => p.severity === severity);
  }

  /**
   * Retrieve patterns within time range
   */
  getPatternsByTimeRange(startTime: number, endTime: number): FailurePattern[] {
    return this.database.patterns.filter(p => 
      p.detectedAt >= startTime && p.detectedAt <= endTime
    );
  }

  /**
   * Retrieve recent patterns
   */
  getRecentPatterns(hours: number = 24): FailurePattern[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.database.patterns.filter(p => p.detectedAt >= cutoff);
  }

  /**
   * Get pattern statistics
   */
  getPatternStatistics(): PatternStatistics {
    const patterns = this.database.patterns;
    
    // Count by type
    const patternsByType: Record<string, number> = {};
    patterns.forEach(p => {
      patternsByType[p.type] = (patternsByType[p.type] || 0) + 1;
    });

    // Count by severity
    const patternsBySeverity: Record<string, number> = {};
    patterns.forEach(p => {
      patternsBySeverity[p.severity] = (patternsBySeverity[p.severity] || 0) + 1;
    });

    // Calculate average confidence
    const avgConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
      : 0;

    // Generate trend data (last 7 days)
    const trendData = this.generateTrendData(7);

    return {
      totalPatterns: patterns.length,
      patternsByType,
      patternsBySeverity,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      trendData
    };
  }

  /**
   * Generate neural training data
   */
  generateNeuralTrainingData(): NeuralTrainingData {
    const patterns = this.database.patterns;
    const features: number[][] = [];
    const labels: string[] = [];
    
    const featureNames = [
      'frequency',
      'confidence',
      'eventCount',
      'timeWindow',
      'severity_low',
      'severity_medium', 
      'severity_high',
      'severity_critical',
      'hour_of_day',
      'day_of_week'
    ];

    const labelMapping: Record<string, number> = {
      'connection_loop': 0,
      'race_condition': 1,
      'timeout_cascade': 2,
      'state_violation': 3,
      'user_confusion': 4
    };

    patterns.forEach(pattern => {
      const feature = this.extractFeatures(pattern);
      features.push(feature);
      labels.push(pattern.type);
    });

    return {
      features,
      labels,
      metadata: {
        featureNames,
        labelMapping,
        normalizedData: false
      }
    };
  }

  /**
   * Export database for external analysis
   */
  exportDatabase(): NLDDatabase {
    return JSON.parse(JSON.stringify(this.database));
  }

  /**
   * Import database from external source
   */
  importDatabase(data: NLDDatabase): void {
    // Validate data structure
    if (!this.validateDatabaseStructure(data)) {
      throw new Error('Invalid database structure');
    }

    this.database = data;
    this.updateMetadata();
    this.saveDatabase();
    
    console.log('[NLD DB] Database imported successfully');
  }

  /**
   * Clear old patterns to maintain performance
   */
  cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): number { // 30 days default
    const cutoff = Date.now() - maxAge;
    const initialCount = this.database.patterns.length;
    
    this.database.patterns = this.database.patterns.filter(p => 
      p.detectedAt > cutoff
    );
    
    this.database.records = this.database.records.filter(r => 
      r.createdAt > cutoff
    );

    const removedCount = initialCount - this.database.patterns.length;
    
    if (removedCount > 0) {
      this.updateMetadata();
      this.saveDatabase();
      console.log('[NLD DB] Cleanup completed, removed:', removedCount);
    }
    
    return removedCount;
  }

  /**
   * Get database size and performance metrics
   */
  getDatabaseMetrics() {
    const dbString = JSON.stringify(this.database);
    const sizeInBytes = new Blob([dbString]).size;
    const sizeInKB = Math.round(sizeInBytes / 1024 * 100) / 100;
    
    return {
      sizeInBytes,
      sizeInKB,
      patternCount: this.database.patterns.length,
      recordCount: this.database.records.length,
      oldestPattern: this.getOldestPatternAge(),
      newestPattern: this.getNewestPatternAge(),
      estimatedMemoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Search patterns by description or metadata
   */
  searchPatterns(query: string): FailurePattern[] {
    const lowerQuery = query.toLowerCase();
    return this.database.patterns.filter(p => 
      p.description.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(p.metadata).toLowerCase().includes(lowerQuery)
    );
  }

  // Private methods
  private loadDatabase(): NLDDatabase {
    try {
      const stored = localStorage.getItem(this.DB_KEY);
      if (stored) {
        const data = JSON.parse(stored) as NLDDatabase;
        // Validate and migrate if necessary
        return this.migrateDatabase(data);
      }
    } catch (error) {
      console.warn('[NLD DB] Error loading database:', error);
    }

    // Return empty database if loading fails
    return this.createEmptyDatabase();
  }

  private saveDatabase(): void {
    try {
      localStorage.setItem(this.DB_KEY, JSON.stringify(this.database));
    } catch (error) {
      console.error('[NLD DB] Error saving database:', error);
      
      // Try cleanup and save again
      if (error.name === 'QuotaExceededError') {
        console.log('[NLD DB] Storage full, attempting cleanup...');
        this.cleanup(7 * 24 * 60 * 60 * 1000); // 7 days
        try {
          localStorage.setItem(this.DB_KEY, JSON.stringify(this.database));
        } catch (retryError) {
          console.error('[NLD DB] Failed to save even after cleanup:', retryError);
        }
      }
    }
  }

  private createEmptyDatabase(): NLDDatabase {
    return {
      patterns: [],
      records: [],
      metadata: {
        version: this.DB_VERSION,
        created: Date.now(),
        updated: Date.now(),
        sessionCount: 0,
        totalEvents: 0
      }
    };
  }

  private updateMetadata(): void {
    this.database.metadata.updated = Date.now();
    this.database.metadata.sessionCount++;
  }

  private migrateDatabase(data: any): NLDDatabase {
    // Handle version migrations here
    if (!data.metadata || data.metadata.version !== this.DB_VERSION) {
      console.log('[NLD DB] Migrating database to version', this.DB_VERSION);
      // Perform migration logic here
      data.metadata = {
        version: this.DB_VERSION,
        created: data.metadata?.created || Date.now(),
        updated: Date.now(),
        sessionCount: data.metadata?.sessionCount || 0,
        totalEvents: data.metadata?.totalEvents || 0
      };
    }
    
    return data;
  }

  private validateDatabaseStructure(data: any): boolean {
    return data &&
           Array.isArray(data.patterns) &&
           Array.isArray(data.records) &&
           data.metadata &&
           typeof data.metadata.version === 'string';
  }

  private extractFeatures(pattern: FailurePattern): number[] {
    const date = new Date(pattern.detectedAt);
    
    return [
      pattern.frequency || 1,
      pattern.confidence,
      pattern.events.length,
      pattern.metadata.timeWindow || 0,
      pattern.severity === 'low' ? 1 : 0,
      pattern.severity === 'medium' ? 1 : 0,
      pattern.severity === 'high' ? 1 : 0,
      pattern.severity === 'critical' ? 1 : 0,
      date.getHours(),
      date.getDay()
    ];
  }

  private generateTrendData(days: number) {
    const trends: Array<{date: string, count: number, type: string}> = [];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentPatterns = this.database.patterns.filter(p => p.detectedAt >= cutoff);
    
    // Group by day and type
    const grouped: Record<string, Record<string, number>> = {};
    
    recentPatterns.forEach(pattern => {
      const dateKey = new Date(pattern.detectedAt).toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = {};
      grouped[dateKey][pattern.type] = (grouped[dateKey][pattern.type] || 0) + 1;
    });

    // Convert to array format
    Object.entries(grouped).forEach(([date, types]) => {
      Object.entries(types).forEach(([type, count]) => {
        trends.push({ date, count, type });
      });
    });

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  private getOldestPatternAge(): number | null {
    if (this.database.patterns.length === 0) return null;
    const oldest = Math.min(...this.database.patterns.map(p => p.detectedAt));
    return Date.now() - oldest;
  }

  private getNewestPatternAge(): number | null {
    if (this.database.patterns.length === 0) return null;
    const newest = Math.max(...this.database.patterns.map(p => p.detectedAt));
    return Date.now() - newest;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation based on JSON string length
    const jsonSize = JSON.stringify(this.database).length;
    return jsonSize * 2; // Account for JavaScript object overhead
  }

  // Public getters
  getAllPatterns(): FailurePattern[] {
    return [...this.database.patterns];
  }

  getAllRecords(): NLDRecord[] {
    return [...this.database.records];
  }

  getMetadata() {
    return { ...this.database.metadata };
  }
}

// Global database instance
export const nldDatabase = new NLDDatabaseManager();