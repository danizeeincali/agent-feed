import { ClaudeTerminalPage } from '../page-objects/claude-terminal-page';

export interface ConcurrentAction {
  id: string;
  action: () => Promise<any>;
}

export interface StormAction {
  id: string;
  action: () => Promise<any>;
}

export interface OrchestrationMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  averageExecutionTime: number;
  concurrencyLevel: number;
  resourceContention: number;
}

export class ConcurrentTestOrchestrator {
  private pendingActions: Map<string, Promise<any>> = new Map();
  private completedActions: Map<string, any> = new Map();
  private failedActions: Map<string, Error> = new Map();
  private metrics: OrchestrationMetrics = {
    totalActions: 0,
    successfulActions: 0,
    failedActions: 0,
    averageExecutionTime: 0,
    concurrencyLevel: 0,
    resourceContention: 0
  };

  constructor() {
    this.resetMetrics();
  }

  async initializeInstances(claudePages: ClaudeTerminalPage[]): Promise<void> {
    const initPromises = claudePages.map(async (page, index) => {
      await page.navigate();
      await page.waitForPageLoad();
    });

    await Promise.all(initPromises);
  }

  async cleanupInstances(claudePages: ClaudeTerminalPage[]): Promise<void> {
    const cleanupPromises = claudePages.map(async (page, index) => {
      try {
        await page.cleanupAllProcesses();
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    await Promise.all(cleanupPromises);
  }

  scheduleAction(id: string, action: () => Promise<any>): ConcurrentAction {
    return {
      id,
      action
    };
  }

  scheduleStorm(id: string, action: () => Promise<any>): StormAction {
    return {
      id,
      action
    };
  }

  async executeSimultaneous(actions: ConcurrentAction[]): Promise<any[]> {
    this.metrics.totalActions += actions.length;
    this.metrics.concurrencyLevel = Math.max(this.metrics.concurrencyLevel, actions.length);
    
    const startTime = Date.now();
    const promises = actions.map(async (concurrentAction, index) => {
      const actionStartTime = Date.now();
      
      try {
        const result = await concurrentAction.action();
        
        const executionTime = Date.now() - actionStartTime;
        this.updateExecutionTime(executionTime);
        
        this.completedActions.set(concurrentAction.id, result);
        this.metrics.successfulActions++;
        
        return result;
      } catch (error) {
        this.failedActions.set(concurrentAction.id, error as Error);
        this.metrics.failedActions++;
        
        // Don't throw - return error object instead
        return { error: error, actionId: concurrentAction.id };
      }
    });

    // Execute all actions simultaneously
    const results = await Promise.all(promises);
    
    // Check for resource contention
    const totalExecutionTime = Date.now() - startTime;
    this.assessResourceContention(actions.length, totalExecutionTime);
    
    return results;
  }

  async executeParallel(actions: { id: string; action: () => Promise<any> }[]): Promise<void> {
    const concurrentActions = actions.map(a => this.scheduleAction(a.id, a.action));
    await this.executeSimultaneous(concurrentActions);
  }

  async executeSequential(actions: ConcurrentAction[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const action of actions) {
      const startTime = Date.now();
      
      try {
        const result = await action.action();
        const executionTime = Date.now() - startTime;
        
        this.updateExecutionTime(executionTime);
        this.completedActions.set(action.id, result);
        this.metrics.successfulActions++;
        
        results.push(result);
      } catch (error) {
        this.failedActions.set(action.id, error as Error);
        this.metrics.failedActions++;
        
        results.push({ error: error, actionId: action.id });
      }
      
      this.metrics.totalActions++;
    }
    
    return results;
  }

  async executeBatched(actions: ConcurrentAction[], batchSize: number): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < actions.length; i += batchSize) {
      const batch = actions.slice(i, i + batchSize);
      const batchResults = await this.executeSimultaneous(batch);
      results.push(...batchResults);
      
      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < actions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  async executeWithTimeout(actions: ConcurrentAction[], timeoutMs: number): Promise<any[]> {
    const executePromise = this.executeSimultaneous(actions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    try {
      return await Promise.race([executePromise, timeoutPromise]) as any[];
    } catch (error) {
      // Cancel pending actions if possible
      this.cancelPendingActions();
      throw error;
    }
  }

  async executeWithRetry(actions: ConcurrentAction[], maxRetries: number = 3): Promise<any[]> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.executeSimultaneous(actions);
      } catch (error) {
        lastError = error as Error;
        
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  async executeWithResourceLimits(
    actions: ConcurrentAction[], 
    limits: { maxMemoryMB?: number; maxConcurrency?: number }
  ): Promise<any[]> {
    const maxConcurrency = limits.maxConcurrency || actions.length;
    const maxMemoryBytes = (limits.maxMemoryMB || 1000) * 1024 * 1024;
    
    // Monitor memory usage during execution
    const memoryMonitor = setInterval(() => {
      if ((window as any).performance?.memory) {
        const memoryUsage = (window as any).performance.memory.usedJSHeapSize;
        if (memoryUsage > maxMemoryBytes) {
          console.warn(`Memory usage (${memoryUsage / 1024 / 1024}MB) exceeded limit (${limits.maxMemoryMB}MB)`);
        }
      }
    }, 1000);
    
    try {
      if (actions.length <= maxConcurrency) {
        return await this.executeSimultaneous(actions);
      } else {
        return await this.executeBatched(actions, maxConcurrency);
      }
    } finally {
      clearInterval(memoryMonitor);
    }
  }

  getMetrics(): OrchestrationMetrics {
    return { ...this.metrics };
  }

  getCompletedActions(): Map<string, any> {
    return new Map(this.completedActions);
  }

  getFailedActions(): Map<string, Error> {
    return new Map(this.failedActions);
  }

  getActionResult(id: string): any {
    if (this.completedActions.has(id)) {
      return this.completedActions.get(id);
    }
    
    if (this.failedActions.has(id)) {
      throw this.failedActions.get(id);
    }
    
    throw new Error(`Action ${id} not found or still pending`);
  }

  isActionComplete(id: string): boolean {
    return this.completedActions.has(id) || this.failedActions.has(id);
  }

  async waitForAction(id: string, timeoutMs: number = 30000): Promise<any> {
    const startTime = Date.now();
    
    while (!this.isActionComplete(id)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for action ${id} to complete`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.getActionResult(id);
  }

  async waitForAllActions(ids: string[], timeoutMs: number = 60000): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const waitPromises = ids.map(async (id) => {
      try {
        const result = await this.waitForAction(id, timeoutMs);
        results.set(id, result);
      } catch (error) {
        results.set(id, { error });
      }
    });
    
    await Promise.all(waitPromises);
    return results;
  }

  // Stress testing utilities
  async createStressTest(
    actionFactory: (index: number) => ConcurrentAction,
    actionCount: number,
    executionStrategy: 'simultaneous' | 'batched' | 'sequential' = 'simultaneous',
    batchSize: number = 10
  ): Promise<any[]> {
    const actions = Array.from({ length: actionCount }, (_, index) => 
      actionFactory(index)
    );
    
    switch (executionStrategy) {
      case 'simultaneous':
        return await this.executeSimultaneous(actions);
      case 'batched':
        return await this.executeBatched(actions, batchSize);
      case 'sequential':
        return await this.executeSequential(actions);
      default:
        throw new Error(`Unknown execution strategy: ${executionStrategy}`);
    }
  }

  async createLoadTest(
    actionFactory: (index: number) => ConcurrentAction,
    rampUpConfig: {
      startUsers: number;
      endUsers: number;
      rampUpTimeMs: number;
      sustainTimeMs: number;
    }
  ): Promise<any[]> {
    const { startUsers, endUsers, rampUpTimeMs, sustainTimeMs } = rampUpConfig;
    const results: any[] = [];
    
    // Ramp up phase
    const rampUpSteps = 10;
    const stepDuration = rampUpTimeMs / rampUpSteps;
    const userIncrement = (endUsers - startUsers) / rampUpSteps;
    
    for (let step = 0; step < rampUpSteps; step++) {
      const currentUsers = Math.floor(startUsers + (userIncrement * step));
      const actions = Array.from({ length: currentUsers }, (_, index) => 
        actionFactory(step * 1000 + index)
      );
      
      const stepResults = await this.executeSimultaneous(actions);
      results.push(...stepResults);
      
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
    
    // Sustain phase
    const sustainActions = Array.from({ length: endUsers }, (_, index) => 
      actionFactory(10000 + index)
    );
    
    const sustainResults = await this.executeWithTimeout(sustainActions, sustainTimeMs);
    results.push(...sustainResults);
    
    return results;
  }

  async createChaosTest(
    actionFactories: Array<(index: number) => ConcurrentAction>,
    chaosConfig: {
      totalActions: number;
      chaosLevel: 'low' | 'medium' | 'high';
      randomizeDelay: boolean;
      injectFailures: boolean;
    }
  ): Promise<any[]> {
    const { totalActions, chaosLevel, randomizeDelay, injectFailures } = chaosConfig;
    const actions: ConcurrentAction[] = [];
    
    // Create random mix of actions
    for (let i = 0; i < totalActions; i++) {
      const factoryIndex = Math.floor(Math.random() * actionFactories.length);
      let action = actionFactories[factoryIndex](i);
      
      // Add chaos elements
      if (randomizeDelay) {
        action = this.wrapWithRandomDelay(action, chaosLevel);
      }
      
      if (injectFailures && Math.random() < this.getFailureRate(chaosLevel)) {
        action = this.wrapWithRandomFailure(action);
      }
      
      actions.push(action);
    }
    
    // Execute with chaos timing
    return await this.executeWithChaos(actions, chaosLevel);
  }

  // Private utility methods
  private updateExecutionTime(executionTime: number): void {
    const totalTime = this.metrics.averageExecutionTime * (this.metrics.successfulActions + this.metrics.failedActions - 1);
    this.metrics.averageExecutionTime = (totalTime + executionTime) / (this.metrics.successfulActions + this.metrics.failedActions);
  }

  private assessResourceContention(concurrencyLevel: number, totalTime: number): void {
    // Simple heuristic: if execution took much longer than expected, there was likely contention
    const expectedTime = 1000; // Assume 1 second per action
    const actualTimePerAction = totalTime / concurrencyLevel;
    
    if (actualTimePerAction > expectedTime * 2) {
      this.metrics.resourceContention++;
    }
  }

  private cancelPendingActions(): void {
    // In a real implementation, you might want to maintain references to cancelable promises
    this.pendingActions.clear();
  }

  private wrapWithRandomDelay(action: ConcurrentAction, chaosLevel: 'low' | 'medium' | 'high'): ConcurrentAction {
    const delayRange = {
      low: { min: 0, max: 100 },
      medium: { min: 0, max: 500 },
      high: { min: 0, max: 2000 }
    };
    
    const range = delayRange[chaosLevel];
    
    return {
      id: action.id,
      action: async () => {
        const delay = Math.random() * (range.max - range.min) + range.min;
        await new Promise(resolve => setTimeout(resolve, delay));
        return await action.action();
      }
    };
  }

  private wrapWithRandomFailure(action: ConcurrentAction): ConcurrentAction {
    return {
      id: action.id,
      action: async () => {
        if (Math.random() < 0.1) { // 10% failure rate
          throw new Error(`Chaos failure in action ${action.id}`);
        }
        return await action.action();
      }
    };
  }

  private getFailureRate(chaosLevel: 'low' | 'medium' | 'high'): number {
    switch (chaosLevel) {
      case 'low': return 0.05; // 5%
      case 'medium': return 0.15; // 15%
      case 'high': return 0.30; // 30%
      default: return 0.05;
    }
  }

  private async executeWithChaos(actions: ConcurrentAction[], chaosLevel: 'low' | 'medium' | 'high'): Promise<any[]> {
    const chaosDelay = {
      low: 100,
      medium: 500,
      high: 1000
    };
    
    // Add random delays between action starts
    const results: any[] = [];
    const promises: Promise<any>[] = [];
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      // Add random startup delay
      const startupDelay = Math.random() * chaosDelay[chaosLevel];
      
      const promise = new Promise(async (resolve) => {
        await new Promise(res => setTimeout(res, startupDelay));
        try {
          const result = await action.action();
          resolve(result);
        } catch (error) {
          resolve({ error, actionId: action.id });
        }
      });
      
      promises.push(promise);
    }
    
    return await Promise.all(promises);
  }

  private resetMetrics(): void {
    this.metrics = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      averageExecutionTime: 0,
      concurrencyLevel: 0,
      resourceContention: 0
    };
    
    this.pendingActions.clear();
    this.completedActions.clear();
    this.failedActions.clear();
  }

  // Utility method for creating common test patterns
  createButtonClickAction(claudePage: ClaudeTerminalPage, id: string): ConcurrentAction {
    return {
      id,
      action: async () => {
        await claudePage.clickSpawnButton();
        return { success: true, timestamp: Date.now() };
      }
    };
  }

  createTerminalCommandAction(claudePage: ClaudeTerminalPage, command: string, id: string): ConcurrentAction {
    return {
      id,
      action: async () => {
        await claudePage.sendTerminalCommand(command);
        await claudePage.waitForCommandCompletion();
        return { success: true, command, timestamp: Date.now() };
      }
    };
  }

  createProcessManagementAction(claudePage: ClaudeTerminalPage, action: 'spawn' | 'terminate', id: string): ConcurrentAction {
    return {
      id,
      action: async () => {
        if (action === 'spawn') {
          await claudePage.clickSpawnButton();
          await claudePage.waitForProcessSpawn();
        } else {
          await claudePage.terminateProcess();
          await claudePage.waitForProcessTermination();
        }
        return { success: true, action, timestamp: Date.now() };
      }
    };
  }
}

export default ConcurrentTestOrchestrator;