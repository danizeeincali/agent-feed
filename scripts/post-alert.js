#!/usr/bin/env node
/**
 * Post alerts to agent feed instead of GitHub issues
 * Part of AVI code standards enforcement - NO GITHUB REQUIRED
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function postAlert(options) {
  const {
    severity = 'medium',      // 'low', 'medium', 'high', 'critical'
    title,
    message,
    category = 'code-standards-violation',
    actionRequired = false,
    suggestedActions = []
  } = options;

  // Determine alert styling based on severity
  const severityConfig = {
    low: { emoji: 'ℹ️', color: 'blue' },
    medium: { emoji: '⚠️', color: 'yellow' },
    high: { emoji: '🔴', color: 'orange' },
    critical: { emoji: '🚨', color: 'red' }
  };

  const config = severityConfig[severity] || severityConfig.medium;

  // Format alert content for agent feed
  const alertContent = {
    agentName: 'Λvi',
    title: `${config.emoji} ${title}`,
    hook: `Automated code standards check detected an issue`,
    contentBody: `
## ${title}

**Severity**: ${severity.toUpperCase()}
**Category**: ${category}

${message}

${actionRequired ? '### Action Required\n' + suggestedActions.map(a => `- ${a}`).join('\n') : ''}

---

*This is an automated alert from AVI's code standards enforcement system.*
*Alert generated at: ${new Date().toISOString()}*
    `,
    metadata: {
      alertType: 'code-standards-violation',
      severity: severity,
      category: category,
      automated: true,
      timestamp: new Date().toISOString()
    }
  };

  try {
    // Post to agent feed API
    const response = await axios.post(
      'http://localhost:3001/api/v1/agent-posts',
      alertContent
    );

    console.log(`✅ Alert posted to agent feed: ${title}`);

    // Also log to violation log for pattern analysis
    const logPath = '/workspaces/agent-feed/logs/violations.jsonl';
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      severity,
      category,
      title,
      message,
      actionRequired,
      ...options
    }) + '\n';

    fs.appendFileSync(logPath, logEntry);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to post alert:', error.message);

    // Fallback: Write to local alert file
    const alertPath = '/workspaces/agent-feed/logs/pending-alerts.json';
    let alerts = [];

    if (fs.existsSync(alertPath)) {
      alerts = JSON.parse(fs.readFileSync(alertPath, 'utf-8'));
    }

    alerts.push({
      ...alertContent,
      failedToPost: true,
      error: error.message
    });

    fs.writeFileSync(alertPath, JSON.stringify(alerts, null, 2));
    console.log('📝 Alert saved to pending-alerts.json for manual review');
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: {
      severity: { type: 'string', default: 'medium' },
      title: { type: 'string' },
      message: { type: 'string' },
      category: { type: 'string', default: 'code-standards-violation' }
    }
  });

  if (!values.title || !values.message) {
    console.error('Usage: node post-alert.js --title="..." --message="..." [--severity=medium] [--category=...]');
    process.exit(1);
  }

  postAlert(values).catch(console.error);
}

export { postAlert };
