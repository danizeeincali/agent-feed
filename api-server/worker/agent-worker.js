/**
 * Agent Worker - Stub Implementation for Phase 2
 * TODO: Implement full worker logic
 */

class AgentWorker {
  constructor(config = {}) {
    this.id = config.id || Date.now();
    this.status = 'idle';
  }

  async start() {
    this.status = 'running';
    console.log(`✅ Worker ${this.id} started`);
  }

  async stop() {
    this.status = 'stopped';
    console.log(`🛑 Worker ${this.id} stopped`);
  }

  getStatus() {
    return {
      id: this.id,
      status: this.status
    };
  }
}

export default AgentWorker;
