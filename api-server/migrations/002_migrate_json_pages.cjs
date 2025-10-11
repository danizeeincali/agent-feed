const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { generateAgentUUID, generatePageId } = require('../utils/db-utils');

module.exports = {
  version: 2,
  description: 'Migrate JSON pages to SQLite + Markdown',

  async up(db) {
    const jsonDir = path.join(__dirname, '../../data/agent-pages');
    const markdownDir = jsonDir; // Same directory for now

    try {
      // Get all JSON files
      const files = await fs.readdir(jsonDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      console.log(`Found ${jsonFiles.length} JSON files to migrate`);

      let migrated = 0;
      let errors = 0;

      const insertStmt = db.prepare(`
        INSERT INTO agent_pages (
          id, agent_id, title, content_type, content_value,
          content_metadata, status, tags, file_path, version,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(jsonDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const page = JSON.parse(content);

          // Determine agent ID
          const agentName = this.extractAgentName(file, page);
          const agentId = generateAgentUUID(agentName);

          // Generate page ID if missing
          const pageId = page.id || generatePageId();

          // Determine content type
          const contentType = page.specification ? 'json' : 'text';
          const contentValue = page.specification || page.content || '';

          // Create markdown file with frontmatter
          const frontMatter = {
            id: pageId,
            agent_id: agentId,
            title: page.title || 'Untitled Page',
            content_type: contentType,
            version: page.version || 1,
            created_at: page.created_at || new Date().toISOString(),
            updated_at: page.updated_at || new Date().toISOString(),
            metadata: page.metadata || {}
          };

          const markdownContent = matter.stringify(contentValue, frontMatter);
          const markdownFile = `${pageId}.md`;
          const markdownPath = path.join(markdownDir, markdownFile);

          await fs.writeFile(markdownPath, markdownContent, 'utf-8');

          // Insert into database
          insertStmt.run(
            pageId,
            agentId,
            page.title || 'Untitled Page',
            contentType,
            contentValue,
            JSON.stringify(page.metadata || {}),
            page.status || 'published',
            JSON.stringify(page.tags || []),
            markdownFile,
            page.version || 1,
            page.created_at || new Date().toISOString(),
            page.updated_at || new Date().toISOString()
          );

          migrated++;
          console.log(`✓ Migrated: ${file} → ${markdownFile}`);
        } catch (error) {
          errors++;
          console.error(`✗ Error migrating ${file}:`, error.message);
        }
      }

      console.log(`\nMigration complete: ${migrated} success, ${errors} errors`);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  extractAgentName(filename, page) {
    // Try to extract from page data
    if (page.agent_id) {
      return page.agent_id;
    }

    // Try to extract from filename pattern
    const match = filename.match(/^([a-z-]+)-agent/);
    if (match) {
      return match[1] + '-agent';
    }

    // Default
    return 'personal-todos-agent';
  },

  down(db) {
    db.prepare('DELETE FROM agent_pages').run();
  }
};