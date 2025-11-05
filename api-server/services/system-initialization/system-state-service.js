/**
 * System State Service
 * Tracks and reports on system initialization state
 * Implements system monitoring for SPARC-SYSTEM-INITIALIZATION.md
 * Agent 1: Infrastructure & Database
 */

/**
 * System State Service Class
 * Provides detailed system state information and health checks
 */
class SystemStateService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for SystemStateService');
    }
    this.db = database;
  }

  /**
   * Get comprehensive system state
   * @returns {Object} Complete system state information
   */
  getSystemState() {
    try {
      return {
        database: this.getDatabaseState(),
        users: this.getUserState(),
        onboarding: this.getOnboardingState(),
        bridges: this.getBridgeState(),
        agents: this.getAgentState(),
        health: this.getHealthStatus(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system state:', error);
      throw error;
    }
  }

  /**
   * Get database state
   * @returns {Object} Database information
   */
  getDatabaseState() {
    try {
      // Get database file size and table counts
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      const tableStats = {};
      for (const table of tables) {
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        tableStats[table.name] = count.count;
      }

      return {
        tables: tables.map(t => t.name),
        tableCounts: tableStats,
        totalTables: tables.length
      };
    } catch (error) {
      console.error('Error getting database state:', error);
      return { error: error.message };
    }
  }

  /**
   * Get user state
   * @returns {Object} User statistics
   */
  getUserState() {
    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_users,
          SUM(CASE WHEN display_name IS NOT NULL AND display_name != 'User' THEN 1 ELSE 0 END) as named_users,
          SUM(CASE WHEN onboarding_completed = 1 THEN 1 ELSE 0 END) as onboarded_users,
          MAX(created_at) as newest_user_timestamp
        FROM user_settings
      `).get();

      return {
        totalUsers: stats.total_users || 0,
        namedUsers: stats.named_users || 0,
        onboardedUsers: stats.onboarded_users || 0,
        newestUser: stats.newest_user_timestamp
      };
    } catch (error) {
      console.error('Error getting user state:', error);
      return { error: error.message };
    }
  }

  /**
   * Get onboarding state
   * @returns {Object} Onboarding statistics
   */
  getOnboardingState() {
    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_states,
          SUM(CASE WHEN phase = 1 THEN 1 ELSE 0 END) as phase1_users,
          SUM(CASE WHEN phase = 2 THEN 1 ELSE 0 END) as phase2_users,
          SUM(CASE WHEN phase1_completed = 1 THEN 1 ELSE 0 END) as phase1_completed,
          SUM(CASE WHEN phase2_completed = 1 THEN 1 ELSE 0 END) as phase2_completed
        FROM onboarding_state
      `).get();

      return {
        totalStates: stats.total_states || 0,
        inPhase1: stats.phase1_users || 0,
        inPhase2: stats.phase2_users || 0,
        phase1Completed: stats.phase1_completed || 0,
        phase2Completed: stats.phase2_completed || 0
      };
    } catch (error) {
      console.error('Error getting onboarding state:', error);
      return { error: error.message };
    }
  }

  /**
   * Get Hemingway bridge state
   * @returns {Object} Bridge statistics
   */
  getBridgeState() {
    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_bridges,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_bridges,
          COUNT(DISTINCT user_id) as users_with_bridges
        FROM hemingway_bridges
      `).get();

      const byType = this.db.prepare(`
        SELECT bridge_type, COUNT(*) as count
        FROM hemingway_bridges
        WHERE active = 1
        GROUP BY bridge_type
        ORDER BY count DESC
      `).all();

      return {
        totalBridges: stats.total_bridges || 0,
        activeBridges: stats.active_bridges || 0,
        usersWithBridges: stats.users_with_bridges || 0,
        byType: byType.reduce((acc, row) => {
          acc[row.bridge_type] = row.count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error getting bridge state:', error);
      return { error: error.message };
    }
  }

  /**
   * Get agent introduction state
   * @returns {Object} Agent introduction statistics
   */
  getAgentState() {
    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_introductions,
          COUNT(DISTINCT user_id) as users_with_intros,
          COUNT(DISTINCT agent_id) as unique_agents
        FROM agent_introductions
      `).get();

      const topAgents = this.db.prepare(`
        SELECT agent_id, COUNT(*) as introduction_count
        FROM agent_introductions
        GROUP BY agent_id
        ORDER BY introduction_count DESC
        LIMIT 5
      `).all();

      return {
        totalIntroductions: stats.total_introductions || 0,
        usersWithIntros: stats.users_with_intros || 0,
        uniqueAgents: stats.unique_agents || 0,
        topAgents: topAgents.map(a => ({
          agentId: a.agent_id,
          introductions: a.introduction_count
        }))
      };
    } catch (error) {
      console.error('Error getting agent state:', error);
      return { error: error.message };
    }
  }

  /**
   * Get health status
   * @returns {Object} System health information
   */
  getHealthStatus() {
    try {
      // Check if critical tables exist
      const requiredTables = ['user_settings', 'onboarding_state', 'hemingway_bridges', 'agent_introductions'];
      const existingTables = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN (${requiredTables.map(() => '?').join(',')})
      `).all(...requiredTables);

      const missingTables = requiredTables.filter(
        table => !existingTables.find(t => t.name === table)
      );

      // Check if demo user exists
      const demoUser = this.db.prepare(`
        SELECT user_id FROM user_settings WHERE user_id = 'demo-user-123'
      `).get();

      return {
        healthy: missingTables.length === 0 && demoUser !== undefined,
        requiredTables: requiredTables.length,
        existingTables: existingTables.length,
        missingTables,
        demoUserExists: demoUser !== undefined
      };
    } catch (error) {
      console.error('Error getting health status:', error);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check if system is ready for first-time user
   * @returns {Object} Readiness status
   */
  isSystemReady() {
    try {
      const health = this.getHealthStatus();

      return {
        ready: health.healthy,
        reason: health.healthy
          ? 'System is ready for users'
          : `Missing tables: ${health.missingTables.join(', ')}`,
        health
      };
    } catch (error) {
      console.error('Error checking system readiness:', error);
      return {
        ready: false,
        reason: error.message,
        error: error.message
      };
    }
  }

  /**
   * Get quick system summary
   * @returns {Object} Concise system summary
   */
  getSummary() {
    try {
      const state = this.getSystemState();

      return {
        initialized: state.health.healthy,
        users: state.users.totalUsers,
        onboarding: {
          phase1: state.onboarding.inPhase1,
          phase2: state.onboarding.inPhase2,
          completed: state.users.onboardedUsers
        },
        activeBridges: state.bridges.activeBridges,
        agentIntros: state.agents.totalIntroductions,
        healthy: state.health.healthy,
        timestamp: state.timestamp
      };
    } catch (error) {
      console.error('Error getting system summary:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {SystemStateService} Service instance
 */
export function createSystemStateService(db) {
  return new SystemStateService(db);
}

export default SystemStateService;
