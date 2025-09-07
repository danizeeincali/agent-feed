/**
 * Comprehensive Filter Chain Debugging Utility
 * 
 * Provides detailed logging and inspection tools to trace the complete
 * multi-select filter flow from UI interaction to API response and state updates.
 * 
 * Usage:
 * import { FilterDebugger } from '@/utils/filterDebugger';
 * const debugger = new FilterDebugger('ComponentName');
 * debugger.logFilterCreation(filter);
 */

import { FilterOptions } from '../components/FilterPanel';

export interface FilterDebugInfo {
  timestamp: string;
  component: string;
  stage: string;
  data: any;
  stackTrace?: string;
}

export interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: FilterOptions;
}

export interface NetworkDebugInfo {
  url: string;
  method: string;
  headers: Record<string, string>;
  parameters: Record<string, any>;
  timestamp: string;
  responseTime?: number;
  status?: number;
  success?: boolean;
  error?: string;
}

export class FilterDebugger {
  private component: string;
  private logs: FilterDebugInfo[] = [];
  private networkLogs: NetworkDebugInfo[] = [];
  private enabled: boolean;

  constructor(component: string, enabled: boolean = true) {
    this.component = component;
    this.enabled = enabled && (process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG_FILTERS === 'true');
    
    if (this.enabled) {
      console.log(`🔧 FilterDebugger initialized for ${component}`);
    }
  }

  // Core logging methods
  private log(stage: string, data: any, includeStackTrace: boolean = false): void {
    if (!this.enabled) return;

    const debugInfo: FilterDebugInfo = {
      timestamp: new Date().toISOString(),
      component: this.component,
      stage,
      data: this.sanitizeLogData(data),
      stackTrace: includeStackTrace ? new Error().stack : undefined
    };

    this.logs.push(debugInfo);
    
    console.group(`🔍 [${this.component}] ${stage}`);
    console.log('⏰ Timestamp:', debugInfo.timestamp);
    console.log('📊 Data:', debugInfo.data);
    if (includeStackTrace) {
      console.log('📍 Stack:', debugInfo.stackTrace);
    }
    console.groupEnd();
  }

  private sanitizeLogData(data: any): any {
    try {
      return JSON.parse(JSON.stringify(data, null, 2));
    } catch {
      return String(data);
    }
  }

  // Filter lifecycle logging
  logFilterCreation(filter: FilterOptions): void {
    this.log('FILTER_CREATED', {
      type: filter.type,
      agents: filter.agents,
      hashtags: filter.hashtags,
      combinationMode: filter.combinationMode,
      multiSelectMode: filter.multiSelectMode,
      agentCount: filter.agents?.length || 0,
      hashtagCount: filter.hashtags?.length || 0,
      isEmpty: this.isEmptyFilter(filter),
      isValid: this.validateFilter(filter).isValid
    });
  }

  logFilterValidation(filter: FilterOptions, validationResult: FilterValidationResult): void {
    this.log('FILTER_VALIDATED', {
      originalFilter: filter,
      validationResult,
      hasErrors: validationResult.errors.length > 0,
      hasWarnings: validationResult.warnings.length > 0,
      wasSanitized: !!validationResult.sanitized
    });
  }

  logFilterApplication(filter: FilterOptions, context?: any): void {
    this.log('FILTER_APPLIED', {
      filter,
      context,
      parameterPreview: this.generateParameterPreview(filter),
      expectedBehavior: this.describeBehavior(filter)
    });
  }

  logApiCall(method: string, url: string, parameters: any, headers?: Record<string, string>): string {
    const callId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const networkInfo: NetworkDebugInfo = {
      url,
      method,
      headers: headers || {},
      parameters,
      timestamp: new Date().toISOString()
    };

    this.networkLogs.push(networkInfo);

    this.log('API_REQUEST_SENT', {
      callId,
      method,
      url,
      parameters,
      headers,
      parameterCount: Object.keys(parameters).length,
      urlLength: url.length,
      isMultiSelect: parameters.filter === 'multi-select'
    });

    return callId;
  }

  logApiResponse(callId: string, response: any, responseTime: number): void {
    const networkLog = this.networkLogs.find(log => 
      log.timestamp && Math.abs(Date.now() - new Date(log.timestamp).getTime()) < 10000
    );

    if (networkLog) {
      networkLog.responseTime = responseTime;
      networkLog.status = response.status;
      networkLog.success = !!response.success;
      networkLog.error = response.error;
    }

    this.log('API_RESPONSE_RECEIVED', {
      callId,
      responseTime: `${responseTime}ms`,
      success: !!response.success,
      dataCount: response.data?.length || 0,
      total: response.total || 0,
      filtered: response.filtered || false,
      appliedFilters: response.appliedFilters,
      hasError: !!response.error,
      error: response.error
    });
  }

  logStateUpdate(previousState: any, newState: any, trigger: string): void {
    this.log('STATE_UPDATED', {
      trigger,
      previous: previousState,
      new: newState,
      changes: this.detectStateChanges(previousState, newState),
      timestamp: new Date().toISOString()
    });
  }

  logUiUpdate(element: string, action: string, data?: any): void {
    this.log('UI_UPDATED', {
      element,
      action,
      data,
      timestamp: new Date().toISOString()
    });
  }

  logError(error: Error, context: string, data?: any): void {
    this.log('ERROR_OCCURRED', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      data
    }, true);
  }

  // Filter validation methods
  validateFilter(filter: FilterOptions): FilterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!filter) {
      errors.push('Filter is null or undefined');
      return { isValid: false, errors, warnings };
    }

    if (!filter.type) {
      errors.push('Filter type is required');
    }

    if (filter.type === 'multi-select') {
      const hasAgents = filter.agents && filter.agents.length > 0;
      const hasHashtags = filter.hashtags && filter.hashtags.length > 0;

      if (!hasAgents && !hasHashtags) {
        errors.push('Multi-select filter must have at least one agent or hashtag');
      }

      if (filter.agents && !Array.isArray(filter.agents)) {
        errors.push('Agents must be an array');
      }

      if (filter.hashtags && !Array.isArray(filter.hashtags)) {
        errors.push('Hashtags must be an array');
      }

      if (filter.combinationMode && !['AND', 'OR'].includes(filter.combinationMode)) {
        errors.push('Combination mode must be either "AND" or "OR"');
      }

      if (filter.agents && filter.agents.some(agent => typeof agent !== 'string' || agent.trim() === '')) {
        errors.push('All agents must be non-empty strings');
      }

      if (filter.hashtags && filter.hashtags.some(tag => typeof tag !== 'string' || tag.trim() === '')) {
        errors.push('All hashtags must be non-empty strings');
      }

      // Warnings
      if (hasAgents && filter.agents!.length > 10) {
        warnings.push('Large number of agents selected may impact performance');
      }

      if (hasHashtags && filter.hashtags!.length > 10) {
        warnings.push('Large number of hashtags selected may impact performance');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  sanitizeFilter(filter: any): FilterOptions {
    const sanitized: FilterOptions = {
      type: filter?.type === 'multi-select' ? 'multi-select' : 'all',
      agents: Array.isArray(filter?.agents) ? filter.agents.filter(a => typeof a === 'string' && a.trim()) : [],
      hashtags: Array.isArray(filter?.hashtags) ? filter.hashtags.filter(h => typeof h === 'string' && h.trim()) : [],
      combinationMode: ['AND', 'OR'].includes(filter?.combinationMode) ? filter.combinationMode : 'AND',
      multiSelectMode: filter?.type === 'multi-select'
    };

    this.log('FILTER_SANITIZED', {
      original: filter,
      sanitized,
      changesApplied: {
        typeChanged: filter?.type !== sanitized.type,
        agentsFiltered: filter?.agents?.length !== sanitized.agents?.length,
        hashtagsFiltered: filter?.hashtags?.length !== sanitized.hashtags?.length,
        modeChanged: filter?.combinationMode !== sanitized.combinationMode
      }
    });

    return sanitized;
  }

  // Utility methods
  private isEmptyFilter(filter: FilterOptions): boolean {
    if (filter.type !== 'multi-select') return false;
    return (!filter.agents || filter.agents.length === 0) && 
           (!filter.hashtags || filter.hashtags.length === 0);
  }

  private generateParameterPreview(filter: FilterOptions): Record<string, any> {
    if (filter.type !== 'multi-select') {
      return { filter: filter.type };
    }

    const params: Record<string, any> = {
      filter: 'multi-select',
      mode: filter.combinationMode || 'AND'
    };

    if (filter.agents && filter.agents.length > 0) {
      params.agents = filter.agents.join(',');
    }

    if (filter.hashtags && filter.hashtags.length > 0) {
      params.hashtags = filter.hashtags.join(',');
    }

    return params;
  }

  private describeBehavior(filter: FilterOptions): string {
    if (filter.type !== 'multi-select') {
      return `Filter by ${filter.type}`;
    }

    const hasAgents = filter.agents && filter.agents.length > 0;
    const hasHashtags = filter.hashtags && filter.hashtags.length > 0;
    const mode = filter.combinationMode || 'AND';

    if (hasAgents && hasHashtags) {
      return `Show posts where author is in [${filter.agents!.join(', ')}] ${mode} tags include [${filter.hashtags!.join(', ')}]`;
    } else if (hasAgents) {
      return `Show posts where author is ${mode === 'OR' ? 'any of' : 'one of'} [${filter.agents!.join(', ')}]`;
    } else if (hasHashtags) {
      return `Show posts that include ${mode === 'OR' ? 'any of' : 'all of'} tags [${filter.hashtags!.join(', ')}]`;
    }

    return 'Invalid filter configuration';
  }

  private detectStateChanges(previous: any, current: any): Record<string, any> {
    const changes: Record<string, any> = {};

    if (JSON.stringify(previous) === JSON.stringify(current)) {
      return { noChanges: true };
    }

    // Check specific properties
    const keys = [...new Set([...Object.keys(previous || {}), ...Object.keys(current || {})])];
    
    for (const key of keys) {
      const prevValue = previous?.[key];
      const currValue = current?.[key];
      
      if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changes[key] = {
          from: prevValue,
          to: currValue,
          type: typeof currValue
        };
      }
    }

    return changes;
  }

  // Reporting methods
  generateDebugReport(): string {
    const report = {
      component: this.component,
      timestamp: new Date().toISOString(),
      totalLogs: this.logs.length,
      networkCalls: this.networkLogs.length,
      recentLogs: this.logs.slice(-10),
      networkSummary: this.generateNetworkSummary(),
      filterSummary: this.generateFilterSummary()
    };

    return JSON.stringify(report, null, 2);
  }

  private generateNetworkSummary(): any {
    if (this.networkLogs.length === 0) return null;

    const successful = this.networkLogs.filter(log => log.success).length;
    const failed = this.networkLogs.length - successful;
    const avgResponseTime = this.networkLogs
      .filter(log => log.responseTime)
      .reduce((sum, log) => sum + (log.responseTime || 0), 0) / 
      (this.networkLogs.filter(log => log.responseTime).length || 1);

    return {
      total: this.networkLogs.length,
      successful,
      failed,
      successRate: `${((successful / this.networkLogs.length) * 100).toFixed(1)}%`,
      averageResponseTime: `${avgResponseTime.toFixed(0)}ms`
    };
  }

  private generateFilterSummary(): any {
    const filterLogs = this.logs.filter(log => log.stage.includes('FILTER'));
    
    return {
      totalFilterOperations: filterLogs.length,
      filterTypes: [...new Set(filterLogs.map(log => log.data.type || log.data.filter?.type).filter(Boolean))],
      recentFilters: filterLogs.slice(-5).map(log => ({
        stage: log.stage,
        type: log.data.type || log.data.filter?.type,
        timestamp: log.timestamp
      }))
    };
  }

  // Export methods
  exportLogs(): FilterDebugInfo[] {
    return [...this.logs];
  }

  exportNetworkLogs(): NetworkDebugInfo[] {
    return [...this.networkLogs];
  }

  clearLogs(): void {
    this.logs = [];
    this.networkLogs = [];
    this.log('LOGS_CLEARED', { timestamp: new Date().toISOString() });
  }

  // Console helpers for manual debugging
  printFilterChain(): void {
    if (!this.enabled) return;

    console.group('🔗 Filter Chain Debug');
    console.table(this.logs.map(log => ({
      Stage: log.stage,
      Component: log.component,
      Timestamp: log.timestamp,
      HasData: !!log.data
    })));
    console.groupEnd();
  }

  printNetworkActivity(): void {
    if (!this.enabled) return;

    console.group('🌐 Network Activity Debug');
    console.table(this.networkLogs.map(log => ({
      Method: log.method,
      URL: log.url.substring(0, 50) + '...',
      Status: log.status || 'Pending',
      Time: log.responseTime ? `${log.responseTime}ms` : 'N/A',
      Success: log.success ?? 'Pending'
    })));
    console.groupEnd();
  }

  // Static utility methods
  static enableGlobalDebugging(): void {
    (window as any).FILTER_DEBUG = true;
    console.log('🔧 Global filter debugging enabled');
  }

  static disableGlobalDebugging(): void {
    (window as any).FILTER_DEBUG = false;
    console.log('🔧 Global filter debugging disabled');
  }

  static createTestScenario(name: string, filters: FilterOptions[]): void {
    console.group(`🧪 Test Scenario: ${name}`);
    filters.forEach((filter, index) => {
      console.log(`Step ${index + 1}:`, filter);
      const filterDebugger = new FilterDebugger('TestScenario');
      const validation = filterDebugger.validateFilter(filter);
      if (!validation.isValid) {
        console.error('❌ Validation failed:', validation.errors);
      } else {
        console.log('✅ Filter valid');
      }
    });
    console.groupEnd();
  }
}

// Global debugging utilities
export const createFilterDebugger = (component: string) => new FilterDebugger(component);

export const debugFilter = (filter: FilterOptions, component: string = 'Unknown') => {
  const filterDebugger = new FilterDebugger(component);
  filterDebugger.logFilterCreation(filter);
  const validation = filterDebugger.validateFilter(filter);
  filterDebugger.logFilterValidation(filter, validation);
  return validation;
};

export const traceFilterChain = (operations: Array<{ name: string; data: any }>) => {
  const filterDebugger = new FilterDebugger('FilterChainTracer');
  operations.forEach((op, index) => {
    filterDebugger.log(`CHAIN_STEP_${index + 1}_${op.name}`, op.data);
  });
  return filterDebugger.generateDebugReport();
};