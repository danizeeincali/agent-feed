/**
 * AviDatabaseAdapter - Implements IAviDatabase interface
 * Wraps avi-state.repository.js for orchestrator state persistence
 *
 * Phase 2: AVI Orchestrator Integration
 */

import type { IAviDatabase, AviState } from '../types/avi';
import { validateStatus } from '../utils/validation';
import { logger } from '../utils/logger';

/**
 * AviDatabaseAdapter implementation
 * Manages orchestrator state persistence using PostgreSQL repository
 */
export class AviDatabaseAdapter implements IAviDatabase {
  private repository: any;
  private repositoryPromise?: Promise<void>;

  constructor(repository?: any) {
    if (repository) {
      this.repository = repository;
    }
  }

  /**
   * Initialize repository with dynamic import
   * Uses promise caching to prevent race conditions
   */
  private async initRepository(): Promise<void> {
    if (!this.repositoryPromise) {
      this.repositoryPromise = (async () => {
        if (!this.repository) {
          const module = await import('../../api-server/repositories/postgres/avi-state.repository.js');
          this.repository = module.default;
        }
      })();
    }
    await this.repositoryPromise;
  }

  /**
   * Save orchestrator state
   * @param state - Current orchestrator state
   */
  async saveState(state: AviState): Promise<void> {
    await this.initRepository();

    try {
      const updates = {
        status: state.status,
        start_time: state.startTime,
        tickets_processed: state.ticketsProcessed,
        workers_spawned: state.workersSpawned,
        active_workers: state.activeWorkers,
        last_health_check: state.lastHealthCheck || null,
        last_error: state.lastError || null,
      };

      await this.repository.updateState(updates);
    } catch (error) {
      logger.error('Failed to save orchestrator state', { error, state, context: 'AviDatabaseAdapter' });
      throw new Error(`Failed to save state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load orchestrator state
   * @returns Promise resolving to state or null if not found
   */
  async loadState(): Promise<AviState | null> {
    await this.initRepository();

    try {
      const row = await this.repository.getState();

      if (!row) {
        return null;
      }

      // Validate status field against allowed values
      const validStatuses = ['initializing', 'running', 'restarting', 'stopped'] as const;
      const status = validateStatus(row.status, validStatuses, 'initializing');

      return {
        status,
        startTime: row.start_time ? new Date(row.start_time) : new Date(),
        ticketsProcessed: row.tickets_processed || 0,
        workersSpawned: row.workers_spawned || 0,
        activeWorkers: row.active_workers || 0,
        lastHealthCheck: row.last_health_check ? new Date(row.last_health_check) : undefined,
        lastError: row.last_error || undefined,
      };
    } catch (error) {
      logger.error('Failed to load orchestrator state', { error, context: 'AviDatabaseAdapter' });
      throw new Error(`Failed to load state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update metrics
   * @param metrics - Metrics to update
   */
  async updateMetrics(metrics: {
    ticketsProcessed?: number;
    workersSpawned?: number;
  }): Promise<void> {
    await this.initRepository();

    try {
      const updates: any = {};

      if (metrics.ticketsProcessed !== undefined) {
        updates.tickets_processed = metrics.ticketsProcessed;
      }

      if (metrics.workersSpawned !== undefined) {
        updates.workers_spawned = metrics.workersSpawned;
      }

      if (Object.keys(updates).length > 0) {
        await this.repository.updateState(updates);
      }
    } catch (error) {
      logger.error('Failed to update orchestrator metrics', { error, metrics, context: 'AviDatabaseAdapter' });
      throw new Error(`Failed to update metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
