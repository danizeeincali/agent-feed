/**
 * System Agent Templates Seeding Function
 *
 * Seeds TIER 1 system agent templates from JSON files in config/system/agent-templates/
 * These templates are immutable and define the base behavior for all agents.
 *
 * Features:
 * - Idempotent (safe to run multiple times)
 * - Upsert logic (updates existing templates)
 * - Validates template structure before insertion
 * - ES modules compatible
 * - PostgreSQL connection via existing postgres manager
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgresManager from '../../api-server/config/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template validation schema
 */
interface AgentTemplate {
  template_id: string;
  name: string;
  description: string;
  version: string;
  model: string;
  system_prompt: string;
  config: {
    temperature: number;
    max_tokens: number;
    posting_rules: {
      max_posts_per_hour: number;
      min_interval_seconds: number;
      max_length: number;
      content_filters: string[];
    };
  };
  capabilities: string[];
  metadata: {
    category: string;
    tags: string[];
    author: string;
    created_at: string;
  };
}

/**
 * Validate template structure
 */
function validateTemplate(template: any): void {
  const requiredFields = [
    'template_id',
    'name',
    'description',
    'version',
    'model',
    'system_prompt',
    'config',
    'capabilities',
    'metadata'
  ];

  for (const field of requiredFields) {
    if (!template[field]) {
      throw new Error(`Missing required field: ${field} in template ${template.template_id || 'unknown'}`);
    }
  }

  // Validate config structure
  if (!template.config.temperature || typeof template.config.temperature !== 'number') {
    throw new Error(`Invalid temperature in template ${template.template_id}`);
  }

  if (!template.config.posting_rules) {
    throw new Error(`Missing posting_rules in template ${template.template_id}`);
  }

  // Validate version format (semver)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(template.version)) {
    throw new Error(`Invalid version format in template ${template.template_id}. Expected semver (e.g., 1.0.0)`);
  }

  console.log(`✅ Template validation passed: ${template.template_id}`);
}

/**
 * Convert template to database format
 */
function templateToDbFormat(template: AgentTemplate) {
  // Extract version number (convert "1.0.0" to 1)
  const versionNumber = parseInt(template.version.split('.')[0]);

  return {
    name: template.template_id,
    version: versionNumber,
    model: template.model,
    posting_rules: template.config.posting_rules,
    api_schema: {
      platform: 'generic',
      endpoints: {},
      auth_type: 'api_key'
    },
    safety_constraints: {
      content_filters: template.config.posting_rules.content_filters,
      max_mentions_per_post: 5,
      requires_human_review: []
    },
    default_personality: template.system_prompt,
    default_response_style: {
      temperature: template.config.temperature,
      max_tokens: template.config.max_tokens,
      capabilities: template.capabilities
    }
  };
}

/**
 * Insert or update a single template
 */
async function upsertTemplate(pool: any, template: AgentTemplate): Promise<void> {
  const dbTemplate = templateToDbFormat(template);

  const query = `
    INSERT INTO system_agent_templates (
      name,
      version,
      model,
      posting_rules,
      api_schema,
      safety_constraints,
      default_personality,
      default_response_style,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    ON CONFLICT (name) DO UPDATE SET
      version = EXCLUDED.version,
      model = EXCLUDED.model,
      posting_rules = EXCLUDED.posting_rules,
      api_schema = EXCLUDED.api_schema,
      safety_constraints = EXCLUDED.safety_constraints,
      default_personality = EXCLUDED.default_personality,
      default_response_style = EXCLUDED.default_response_style,
      updated_at = NOW()
    RETURNING name, version;
  `;

  const values = [
    dbTemplate.name,
    dbTemplate.version,
    dbTemplate.model,
    JSON.stringify(dbTemplate.posting_rules),
    JSON.stringify(dbTemplate.api_schema),
    JSON.stringify(dbTemplate.safety_constraints),
    dbTemplate.default_personality,
    JSON.stringify(dbTemplate.default_response_style)
  ];

  try {
    const result = await pool.query(query, values);
    console.log(`✅ Seeded template: ${result.rows[0].name} (version ${result.rows[0].version})`);
  } catch (error: any) {
    console.error(`❌ Failed to seed template ${template.template_id}:`, error.message);
    throw error;
  }
}

/**
 * Main seeding function
 * Reads all JSON files from config/system/agent-templates/ and seeds them into the database
 */
export async function seedTemplates(): Promise<void> {
  console.log('\n🌱 Starting system agent templates seeding...');

  try {
    // Get PostgreSQL connection pool
    const pool = postgresManager.getPool();

    // Verify database connection
    const healthCheck = await postgresManager.healthCheck();
    if (!healthCheck) {
      throw new Error('PostgreSQL connection failed - cannot seed templates');
    }

    // Path to templates directory
    const templatesDir = join(__dirname, '../../config/system/agent-templates');
    console.log(`📂 Templates directory: ${templatesDir}`);

    // Read all JSON files in the templates directory
    let files: string[];
    try {
      files = await fs.readdir(templatesDir);
      files = files.filter(file => file.endsWith('.json'));
    } catch (error: any) {
      console.error(`❌ Failed to read templates directory: ${error.message}`);
      throw new Error(`Templates directory not found or not readable: ${templatesDir}`);
    }

    if (files.length === 0) {
      console.warn('⚠️  No template JSON files found in', templatesDir);
      return;
    }

    console.log(`📋 Found ${files.length} template file(s): ${files.join(', ')}`);

    // Process each template file
    let successCount = 0;
    let failureCount = 0;

    for (const file of files) {
      try {
        const filePath = join(templatesDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const template = JSON.parse(fileContent);

        // Validate template structure
        validateTemplate(template);

        // Insert/update template
        await upsertTemplate(pool, template);

        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to process ${file}:`, error.message);
        failureCount++;
      }
    }

    // Summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Success: ${successCount} template(s)`);
    console.log(`   ❌ Failed:  ${failureCount} template(s)`);
    console.log(`   📝 Total:   ${files.length} template(s)`);

    if (failureCount > 0) {
      throw new Error(`Failed to seed ${failureCount} template(s)`);
    }

    console.log('\n🎉 System agent templates seeding completed successfully!\n');
  } catch (error: any) {
    console.error('\n❌ Template seeding failed:', error.message);
    throw error;
  }
}

/**
 * Verify seeded templates
 * Useful for testing and validation
 */
export async function verifyTemplates(): Promise<void> {
  console.log('\n🔍 Verifying seeded templates...');

  try {
    const pool = postgresManager.getPool();

    const result = await pool.query(`
      SELECT name, version, model, created_at, updated_at
      FROM system_agent_templates
      ORDER BY name
    `);

    console.log(`\n📊 Found ${result.rows.length} template(s) in database:`);
    result.rows.forEach((row: any) => {
      console.log(`   - ${row.name} (v${row.version}) [${row.model}]`);
    });

    console.log('\n✅ Template verification complete\n');
  } catch (error: any) {
    console.error('❌ Template verification failed:', error.message);
    throw error;
  }
}

// Default export for direct execution (if needed)
export default seedTemplates;
