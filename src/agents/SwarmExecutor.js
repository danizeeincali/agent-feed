/**
 * Swarm Executor - Main entry point for running the comprehensive testing swarm
 */

const ComprehensiveTestingSwarm = require('./ComprehensiveTestingSwarm');

class SwarmExecutor {
  constructor() {
    this.swarm = null;
    this.executionResults = null;
    this.hooks = {
      preTask: [],
      postTask: [],
      onError: [],
      onComplete: []
    };
  }

  /**
   * Initialize and execute the comprehensive testing swarm
   */
  async execute() {
    console.log('🚀 Starting Comprehensive Testing Swarm Execution');
    
    try {
      // Initialize the swarm
      this.swarm = new ComprehensiveTestingSwarm();
      await this.swarm.initialize();
      
      // Execute pre-task hooks
      await this.executeHooks('preTask');
      
      // Run the comprehensive testing workflow
      this.executionResults = await this.swarm.executeTestingWorkflow();
      
      // Execute post-task hooks
      await this.executeHooks('postTask');
      
      // Handle completion
      await this.executeHooks('onComplete');
      
      console.log('✅ Comprehensive Testing Swarm Execution Completed');
      
      return {
        success: true,
        swarm: this.swarm.getStatusReport(),
        results: this.executionResults,
        executionTime: this.getExecutionTime()
      };
      
    } catch (error) {
      console.error('❌ Swarm execution failed:', error.message);
      
      // Execute error hooks
      await this.executeHooks('onError', error);
      
      return {
        success: false,
        error: error.message,
        swarm: this.swarm ? this.swarm.getStatusReport() : null,
        results: this.executionResults,
        executionTime: this.getExecutionTime()
      };
    }
  }

  /**
   * Add execution hooks
   */
  addHook(type, handler) {
    if (this.hooks[type]) {
      this.hooks[type].push(handler);
    }
  }

  /**
   * Execute hooks of specified type
   */
  async executeHooks(type, data = null) {
    if (this.hooks[type]) {
      for (const handler of this.hooks[type]) {
        try {
          await handler(data);
        } catch (error) {
          console.warn(`Hook execution failed for ${type}:`, error.message);
        }
      }
    }
  }

  /**
   * Get execution time metrics
   */
  getExecutionTime() {
    if (this.executionResults) {
      const start = new Date(this.executionResults.startTime);
      const end = this.executionResults.endTime ? new Date(this.executionResults.endTime) : new Date();
      return {
        duration: end - start,
        start: this.executionResults.startTime,
        end: this.executionResults.endTime || new Date().toISOString()
      };
    }
    return null;
  }

  /**
   * Get comprehensive status report
   */
  getStatusReport() {
    return {
      executor: {
        status: this.executionResults ? this.executionResults.overallStatus : 'not_started',
        hasSwarm: !!this.swarm,
        hasResults: !!this.executionResults
      },
      swarm: this.swarm ? this.swarm.getStatusReport() : null,
      execution: this.executionResults,
      timing: this.getExecutionTime()
    };
  }
}

/**
 * Factory function to create and run the swarm
 */
async function runComprehensiveTestingSwarm() {
  const executor = new SwarmExecutor();
  
  // Add default hooks
  executor.addHook('preTask', async () => {
    console.log('🔧 Pre-task: Preparing comprehensive testing environment...');
  });
  
  executor.addHook('postTask', async () => {
    console.log('📊 Post-task: Collecting and analyzing results...');
  });
  
  executor.addHook('onError', async (error) => {
    console.error('⚠️ Error hook: Handling execution error:', error.message);
  });
  
  executor.addHook('onComplete', async () => {
    console.log('🎉 Completion hook: Comprehensive testing swarm execution finished');
  });
  
  return await executor.execute();
}

module.exports = {
  SwarmExecutor,
  runComprehensiveTestingSwarm
};