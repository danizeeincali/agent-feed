#!/usr/bin/env node

/**
 * Example: Using Agent Slugs in Your Application
 *
 * This file demonstrates how to query agents by slug after running the migration.
 */

import postgresManager from '../config/postgres.js';

async function exampleUsage() {
  try {
    console.log('🔍 Example: Querying Agents by Slug\n');

    // Example 1: Get agent by slug
    console.log('📋 Example 1: Get single agent by slug');
    const slug = 'backenddeveloper';
    const agentQuery = `
      SELECT name, slug, version, model, default_personality
      FROM system_agent_templates
      WHERE slug = $1
    `;

    const agentResult = await postgresManager.query(agentQuery, [slug]);

    if (agentResult.rows.length > 0) {
      const agent = agentResult.rows[0];
      console.log(`✅ Found agent: ${agent.name}`);
      console.log(`   Slug: ${agent.slug}`);
      console.log(`   Model: ${agent.model}`);
      console.log(`   Version: ${agent.version}`);
      console.log(`   Description: ${agent.default_personality?.substring(0, 80)}...\n`);
    } else {
      console.log(`❌ No agent found with slug: ${slug}\n`);
    }

    // Example 2: Get user customization with slug
    console.log('📋 Example 2: Get user customization with slug');
    const userId = 'anonymous';
    const customizationQuery = `
      SELECT
        sat.name,
        sat.slug,
        uac.custom_name,
        uac.personality,
        uac.enabled
      FROM system_agent_templates sat
      LEFT JOIN user_agent_customizations uac
        ON sat.name = uac.agent_template AND uac.user_id = $1
      WHERE sat.slug = $2
    `;

    const customResult = await postgresManager.query(customizationQuery, [userId, slug]);

    if (customResult.rows.length > 0) {
      const custom = customResult.rows[0];
      console.log(`✅ Agent customization:`);
      console.log(`   Base Name: ${custom.name}`);
      console.log(`   Slug: ${custom.slug}`);
      console.log(`   Custom Name: ${custom.custom_name || '(not customized)'}`);
      console.log(`   Enabled: ${custom.enabled ?? true}\n`);
    }

    // Example 3: List all agents with slugs
    console.log('📋 Example 3: List all agents with their slugs');
    const listQuery = `
      SELECT name, slug, version
      FROM system_agent_templates
      ORDER BY name
      LIMIT 10
    `;

    const listResult = await postgresManager.query(listQuery);
    console.log(`✅ Found ${listResult.rows.length} agents:\n`);

    listResult.rows.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name.padEnd(30)} → ${agent.slug}`);
    });

    // Example 4: Build URL-friendly routes
    console.log('\n📋 Example 4: URL-friendly routes using slugs\n');
    const routes = listResult.rows.map(agent => ({
      name: agent.name,
      url: `/api/agents/${agent.slug}`,
      profileUrl: `/agents/${agent.slug}/profile`,
      feedUrl: `/agents/${agent.slug}/feed`
    }));

    routes.slice(0, 5).forEach(route => {
      console.log(`   ${route.name}:`);
      console.log(`     API: ${route.url}`);
      console.log(`     Profile: ${route.profileUrl}`);
      console.log(`     Feed: ${route.feedUrl}\n`);
    });

    // Example 5: Search agents by partial slug match
    console.log('📋 Example 5: Search agents by partial slug match');
    const searchTerm = 'agent';
    const searchQuery = `
      SELECT name, slug
      FROM system_agent_templates
      WHERE slug LIKE $1
      ORDER BY slug
      LIMIT 5
    `;

    const searchResult = await postgresManager.query(searchQuery, [`%${searchTerm}%`]);
    console.log(`✅ Found ${searchResult.rows.length} agents matching "${searchTerm}":\n`);

    searchResult.rows.forEach(agent => {
      console.log(`   • ${agent.name} (${agent.slug})`);
    });

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await postgresManager.close();
  }
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage();
}

export { exampleUsage };
