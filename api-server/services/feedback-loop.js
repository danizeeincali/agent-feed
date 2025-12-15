import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FeedbackDatabase from './feedback-loop-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database wrapper will be injected
let db = null;

/**
 * PageBuilderFeedbackSystem
 *
 * Automated feedback loop that:
 * 1. Records all validation failures
 * 2. Detects patterns (3+ occurrences)
 * 3. Auto-updates agent instructions
 * 4. Generates performance metrics
 */
class PageBuilderFeedbackSystem {
  constructor() {
    this.PATTERN_THRESHOLD = 3; // Failures needed to trigger pattern
    this.AGENT_WORKSPACE = path.join(__dirname, '../../prod/agent_workspace');
    this.MEMORY_DIR = path.join(this.AGENT_WORKSPACE, 'memories');
  }

  /**
   * Initialize with database connection
   */
  setDatabase(database) {
    db = new FeedbackDatabase(database);
  }

  /**
   * Record a validation failure
   */
  async recordFailure(pageId, agentId, error) {
    if (!db) {
      console.error('[FeedbackLoop] Database not initialized');
      return null;
    }

    const {
      type,
      message,
      details,
      componentType,
      validationRule,
      pageConfig,
      stackTrace
    } = error;

    // Insert failure record
    const result = db.run(
      `INSERT INTO validation_failures (
        page_id, agent_id, error_type, error_message, error_details,
        component_type, validation_rule, page_config, stack_trace
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pageId,
        agentId,
        type,
        message,
        JSON.stringify(details || {}),
        componentType,
        validationRule,
        JSON.stringify(pageConfig || {}),
        stackTrace
      ]
    );

    const failureId = result.lastID;

    // Update performance metrics
    await this.updatePerformanceMetrics(agentId, 'failure');

    // Check for patterns
    const pattern = await this.checkForPattern(agentId, type, message);

    if (pattern) {
      console.log(`[FeedbackLoop] Pattern detected for ${agentId}: ${type}`);

      // Auto-update agent instructions if pattern threshold reached
      if (pattern.occurrence_count >= this.PATTERN_THRESHOLD && !pattern.auto_fix_applied) {
        await this.updateAgentInstructions(pattern);
      }
    }

    return {
      failureId,
      pattern: pattern || null
    };
  }

  /**
   * Check if this failure represents a pattern
   */
  async checkForPattern(agentId, errorType, errorMessage) {
    // Create error signature (normalized identifier)
    const errorSignature = this.createErrorSignature(errorType, errorMessage);

    // Check if pattern exists
    const existing = db.get(
      `SELECT * FROM failure_patterns
       WHERE agent_id = ? AND error_signature = ?`,
      [agentId, errorSignature]
    );

    if (existing) {
      // Update existing pattern
      db.run(
        `UPDATE failure_patterns
         SET occurrence_count = occurrence_count + 1,
             last_seen = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [existing.id]
      );

      return db.get(
        `SELECT * FROM failure_patterns WHERE id = ?`,
        [existing.id]
      );
    } else {
      // Create new pattern
      const result = db.run(
        `INSERT INTO failure_patterns (
          agent_id, pattern_type, error_signature, occurrence_count
        ) VALUES (?, ?, ?, 1)`,
        [agentId, errorType, errorSignature]
      );

      return db.get(
        `SELECT * FROM failure_patterns WHERE id = ?`,
        [result.lastID]
      );
    }
  }

  /**
   * Create normalized error signature
   */
  createErrorSignature(errorType, errorMessage) {
    // Normalize error message (remove specific values)
    const normalized = errorMessage
      .replace(/["'].*?["']/g, '<string>')
      .replace(/\d+/g, '<num>')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return `${errorType}::${normalized}`;
  }

  /**
   * Get all failure patterns with analysis
   */
  async getFailurePatterns(agentId = null) {
    let query = `
      SELECT
        fp.*,
        COUNT(DISTINCT vf.id) as total_failures,
        GROUP_CONCAT(DISTINCT vf.component_type) as affected_components
      FROM failure_patterns fp
      LEFT JOIN validation_failures vf ON vf.agent_id = fp.agent_id
        AND vf.error_type = fp.pattern_type
      WHERE 1=1
    `;

    const params = [];
    if (agentId) {
      query += ` AND fp.agent_id = ?`;
      params.push(agentId);
    }

    query += `
      GROUP BY fp.id
      ORDER BY fp.occurrence_count DESC, fp.last_seen DESC
    `;

    return db.all(query, params);
  }

  /**
   * Automatically update agent instructions based on pattern
   */
  async updateAgentInstructions(pattern) {
    const agentId = pattern.agent_id;

    // Generate feedback warning
    const warning = this.generateWarningFromPattern(pattern);

    // Append to agent instruction file
    const agentFile = path.join(
      this.AGENT_WORKSPACE,
      'instructions',
      `${agentId}.md`
    );

    try {
      // Check if file exists
      let content = '';
      try {
        content = await fs.readFile(agentFile, 'utf-8');
      } catch (err) {
        // File doesn't exist, create base content
        content = `# ${agentId} Instructions\n\n`;
      }

      // Check if warning already exists
      if (content.includes(warning.content)) {
        console.log(`[FeedbackLoop] Warning already exists in ${agentId} instructions`);
        return null;
      }

      // Append warning to file
      const updatedContent = this.appendWarningToInstructions(content, warning);
      await fs.writeFile(agentFile, updatedContent, 'utf-8');

      // Update memory file
      await this.updateMemoryFile(agentId, pattern, warning);

      // Record feedback
      const result = db.run(
        `INSERT INTO agent_feedback (
          agent_id, pattern_id, feedback_type, feedback_content, applied_to_agent
        ) VALUES (?, ?, ?, ?, 1)`,
        [agentId, pattern.id, 'instruction_update', JSON.stringify(warning)]
      );

      // Mark pattern as having auto-fix applied
      db.run(
        `UPDATE failure_patterns
         SET auto_fix_applied = 1, fix_applied_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [pattern.id]
      );

      console.log(`[FeedbackLoop] Updated ${agentId} instructions with pattern fix`);

      return {
        feedbackId: result.lastID,
        warning,
        filePath: agentFile
      };
    } catch (error) {
      console.error(`[FeedbackLoop] Error updating agent instructions:`, error);
      throw error;
    }
  }

  /**
   * Generate warning content from pattern
   */
  generateWarningFromPattern(pattern) {
    const { pattern_type, error_signature, occurrence_count } = pattern;

    let title = '';
    let content = '';
    let suggestion = '';

    // Pattern-specific warnings
    if (error_signature.includes('sidebar') || error_signature.includes('navigation')) {
      title = 'Sidebar Navigation Pattern';
      content = `**CRITICAL**: Detected ${occurrence_count} failures related to sidebar navigation. ` +
                `Always use SidebarLayout with correct navigation structure.`;
      suggestion = `
**Correct Pattern**:
\`\`\`javascript
{
  "type": "SidebarLayout",
  "props": {
    "navigation": [
      { "id": "nav1", "label": "Section 1", "icon": "Home" }
    ]
  },
  "children": [/* main content */]
}
\`\`\`
`;
    } else if (error_signature.includes('component') && error_signature.includes('missing')) {
      title = 'Missing Component Type';
      content = `**WARNING**: Detected ${occurrence_count} failures from missing component types. ` +
                `Always specify valid component types from the whitelist.`;
      suggestion = `
**Available Components**: SidebarLayout, Header, Card, List, Button, Text, Flex, Grid, etc.
**Always verify** component type exists before using.
`;
    } else if (error_signature.includes('props') || error_signature.includes('required')) {
      title = 'Required Props Validation';
      content = `**WARNING**: Detected ${occurrence_count} failures from missing required props. ` +
                `Review component schemas before generating configs.`;
      suggestion = `
**Check schema** for required props in /api-server/utils/component-schema.js
**Validate locally** before sending to validation endpoint.
`;
    } else {
      title = `Pattern: ${pattern_type}`;
      content = `**DETECTED**: ${occurrence_count} occurrences of this error pattern. ` +
                `Review validation rules and adjust generation logic.`;
      suggestion = `
**Error Signature**: ${error_signature}
**Action**: Update generation logic to prevent this pattern.
`;
    }

    return {
      title,
      content,
      suggestion,
      severity: occurrence_count >= 5 ? 'critical' : 'warning',
      occurrences: occurrence_count,
      patternId: pattern.id
    };
  }

  /**
   * Append warning to instruction file
   */
  appendWarningToInstructions(content, warning) {
    const warningSection = `

---

## Automated Feedback (${new Date().toISOString().split('T')[0]})

### ${warning.title}

${warning.content}

${warning.suggestion}

**Severity**: ${warning.severity.toUpperCase()}
**Occurrences**: ${warning.occurrences}
**Auto-generated**: This warning was automatically added by the feedback loop system.

`;

    return content + warningSection;
  }

  /**
   * Update memory file with failure context
   */
  async updateMemoryFile(agentId, pattern, warning) {
    // Ensure memory directory exists
    await fs.mkdir(this.MEMORY_DIR, { recursive: true });

    const memoryFile = path.join(this.MEMORY_DIR, 'page-builder-failures.md');

    let content = '';
    try {
      content = await fs.readFile(memoryFile, 'utf-8');
    } catch (err) {
      // Create new memory file
      content = `# Page Builder Failures - Learning Memory

This file accumulates patterns detected by the automated feedback loop.
Agents should review this before generating new pages.

---

`;
    }

    const memoryEntry = `
## ${warning.title} (Updated: ${new Date().toISOString()})

**Pattern ID**: ${pattern.id}
**Agent**: ${agentId}
**Occurrences**: ${warning.occurrences}
**Status**: ${pattern.status}

${warning.content}

${warning.suggestion}

**Historical Context**:
- First seen: ${pattern.first_seen}
- Last seen: ${pattern.last_seen}
- Auto-fix applied: ${pattern.auto_fix_applied ? 'Yes' : 'No'}

---
`;

    content += memoryEntry;
    await fs.writeFile(memoryFile, content, 'utf-8');

    console.log(`[FeedbackLoop] Updated memory file with pattern ${pattern.id}`);
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(agentId = null, days = 7) {
    const dateFilter = `datetime('now', '-${days} days')`;

    // Get failure statistics
    const stats = db.get(
      `SELECT
        COUNT(*) as total_failures,
        COUNT(DISTINCT error_type) as unique_error_types,
        COUNT(DISTINCT page_id) as affected_pages
       FROM validation_failures
       WHERE agent_id ${agentId ? '= ?' : 'IS NOT NULL'}
         AND created_at >= ${dateFilter}`,
      agentId ? [agentId] : []
    );

    // Get top errors
    const topErrors = db.all(
      `SELECT error_type, COUNT(*) as count
       FROM validation_failures
       WHERE agent_id ${agentId ? '= ?' : 'IS NOT NULL'}
         AND created_at >= ${dateFilter}
       GROUP BY error_type
       ORDER BY count DESC
       LIMIT 10`,
      agentId ? [agentId] : []
    );

    // Get patterns
    const patterns = await this.getFailurePatterns(agentId);

    // Get performance metrics
    const performance = db.all(
      `SELECT *
       FROM agent_performance_metrics
       WHERE agent_id ${agentId ? '= ?' : 'IS NOT NULL'}
         AND date >= date('now', '-${days} days')
       ORDER BY date DESC`,
      agentId ? [agentId] : []
    );

    // Get feedback items
    const feedback = db.all(
      `SELECT *
       FROM agent_feedback
       WHERE agent_id ${agentId ? '= ?' : 'IS NOT NULL'}
         AND created_at >= ${dateFilter}
       ORDER BY created_at DESC`,
      agentId ? [agentId] : []
    );

    return {
      summary: stats,
      topErrors,
      patterns: patterns.filter(p => p.occurrence_count >= this.PATTERN_THRESHOLD),
      performance,
      feedback,
      period: {
        days,
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };
  }

  /**
   * Update performance metrics
   */
  async updatePerformanceMetrics(agentId, result) {
    const today = new Date().toISOString().split('T')[0];

    // Get or create today's metrics
    const existing = db.get(
      `SELECT * FROM agent_performance_metrics
       WHERE agent_id = ? AND date = ?`,
      [agentId, today]
    );

    if (existing) {
      // Update existing
      const updates = {
        total_attempts: existing.total_attempts + 1,
        successful_attempts: result === 'success' ? existing.successful_attempts + 1 : existing.successful_attempts,
        failed_attempts: result === 'failure' ? existing.failed_attempts + 1 : existing.failed_attempts,
        validation_failures: result === 'failure' ? existing.validation_failures + 1 : existing.validation_failures
      };
      updates.success_rate = updates.total_attempts > 0
        ? updates.successful_attempts / updates.total_attempts
        : 0;

      db.run(
        `UPDATE agent_performance_metrics
         SET total_attempts = ?,
             successful_attempts = ?,
             failed_attempts = ?,
             validation_failures = ?,
             success_rate = ?
         WHERE id = ?`,
        [
          updates.total_attempts,
          updates.successful_attempts,
          updates.failed_attempts,
          updates.validation_failures,
          updates.success_rate,
          existing.id
        ]
      );
    } else {
      // Create new
      db.run(
        `INSERT INTO agent_performance_metrics (
          agent_id, date, total_attempts, successful_attempts,
          failed_attempts, validation_failures, success_rate
        ) VALUES (?, ?, 1, ?, ?, ?, ?)`,
        [
          agentId,
          today,
          result === 'success' ? 1 : 0,
          result === 'failure' ? 1 : 0,
          result === 'failure' ? 1 : 0,
          result === 'success' ? 1.0 : 0.0
        ]
      );
    }
  }

  /**
   * Record successful page creation (for learning)
   */
  async recordSuccess(pageId, agentId, config) {
    await this.updatePerformanceMetrics(agentId, 'success');

    // Optionally record success patterns for future learning
    // This could be used to reinforce good patterns
  }

  /**
   * Reset learning for an agent (clear patterns and feedback)
   */
  async resetAgent(agentId) {
    db.run(
      `UPDATE failure_patterns
       SET status = 'resolved'
       WHERE agent_id = ?`,
      [agentId]
    );

    console.log(`[FeedbackLoop] Reset patterns for ${agentId}`);

    return {
      message: 'Agent learning reset',
      agentId
    };
  }

  /**
   * Get agent metrics for dashboard
   */
  async getAgentMetrics(agentId) {
    const report = await this.generateReport(agentId, 30);

    const recentFailures = db.all(
      `SELECT * FROM validation_failures
       WHERE agent_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [agentId]
    );

    const activePatterns = report.patterns.filter(p => p.status === 'active');

    return {
      agent_id: agentId,
      metrics: report.summary,
      success_rate: report.performance[0]?.success_rate || 0,
      active_patterns: activePatterns.length,
      recent_failures: recentFailures,
      patterns: activePatterns,
      feedback_applied: report.feedback.filter(f => f.applied_to_agent).length,
      health_score: this.calculateHealthScore(report)
    };
  }

  /**
   * Calculate agent health score (0-100)
   */
  calculateHealthScore(report) {
    const recentPerf = report.performance[0];
    if (!recentPerf) return 100;

    const successRate = recentPerf.success_rate * 100;
    const activePatterns = report.patterns.filter(p => p.status === 'active').length;
    const patternPenalty = Math.min(activePatterns * 10, 30);

    return Math.max(0, Math.min(100, successRate - patternPenalty));
  }
}

export default new PageBuilderFeedbackSystem();
