/**
 * Auto-Registration Middleware
 * Watches for new page files and automatically registers them in the database
 */

import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default watch directory for agent pages
const DEFAULT_PAGES_DIR = path.join(__dirname, '../../data/agent-pages');

/**
 * Prepare page data for database insertion while preserving original format
 * Stores pages exactly as page-builder-agent creates them
 * @param {Object} pageData - Raw page data from file
 * @returns {Object} Page data ready for database insertion
 */
export function preparePageData(pageData) {
  const now = new Date().toISOString();

  // Determine content fields based on what the page has
  let contentType;
  let contentValue;
  let contentMetadata = null;

  if (pageData.specification !== undefined) {
    // Page-builder format: store specification as-is in content_value
    // This preserves the original format without transformation
    contentType = 'json';
    contentValue = typeof pageData.specification === 'string'
      ? pageData.specification
      : JSON.stringify(pageData.specification);

    // Preserve metadata if present
    if (pageData.metadata) {
      contentMetadata = typeof pageData.metadata === 'string'
        ? pageData.metadata
        : JSON.stringify(pageData.metadata);
    }
  } else if (pageData.content_value !== undefined) {
    // Already in database format: use as-is
    contentType = pageData.content_type || 'text';
    contentValue = pageData.content_value;

    if (pageData.content_metadata) {
      contentMetadata = typeof pageData.content_metadata === 'string'
        ? pageData.content_metadata
        : JSON.stringify(pageData.content_metadata);
    }
  } else {
    // Fallback: serialize entire object as JSON
    contentType = 'json';
    contentValue = JSON.stringify(pageData);
  }

  // Validate content_type against schema constraints
  if (!['text', 'markdown', 'json', 'component'].includes(contentType)) {
    contentType = 'text';
  }

  return {
    id: pageData.id,
    agent_id: pageData.agent_id,
    title: pageData.title,
    content_type: contentType,
    content_value: contentValue,
    content_metadata: contentMetadata,
    status: pageData.status || 'published',
    version: pageData.version || 1,
    created_at: pageData.created_at || now,
    updated_at: pageData.updated_at || now
  };
}

/**
 * Initialize auto-registration watcher
 * @param {Database} db - Better-sqlite3 database instance
 * @param {string} pagesDir - Directory to watch for new pages (optional)
 * @returns {FSWatcher} Chokidar watcher instance
 */
export function initializeAutoRegistration(db, pagesDir = DEFAULT_PAGES_DIR) {
  const watchDir = pagesDir || DEFAULT_PAGES_DIR;

  console.log('📡 Auto-registration middleware initialized');
  console.log(`   Watching: ${watchDir}`);

  // Ensure directory exists
  if (!fs.existsSync(watchDir)) {
    console.warn(`   ⚠️  Watch directory does not exist: ${watchDir}`);
    fs.mkdirSync(watchDir, { recursive: true });
    console.log(`   ✅ Created watch directory: ${watchDir}`);
  }

  // Watch directory for new JSON files
  const watcher = chokidar.watch(watchDir, {
    persistent: true,
    ignoreInitial: true,
    depth: 0, // Don't watch subdirectories
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  // Log when ready
  watcher.on('ready', () => {
    console.log('   ✅ Watcher ready');
  });

  watcher.on('add', async (filePath) => {
    // Wrap entire handler in try-catch to prevent crashes
    try {
      // Only process JSON files
      if (!filePath.endsWith('.json')) {
        return;
      }

      console.log(`📄 New page file detected: ${path.basename(filePath)}`);

      // Read page data with error handling
      let fileContent;
      let pageData;

      try {
        fileContent = fs.readFileSync(filePath, 'utf8');
      } catch (readError) {
        console.error(`   ❌ Failed to read file: ${readError.message}`);
        return;
      }

      try {
        pageData = JSON.parse(fileContent);
      } catch (parseError) {
        console.error(`   ❌ Failed to parse JSON: ${parseError.message}`);
        return;
      }

      // Validate required fields
      if (!pageData || typeof pageData !== 'object') {
        console.error(`   ❌ Invalid page data structure: ${path.basename(filePath)}`);
        return;
      }

      if (!pageData.id || !pageData.agent_id || !pageData.title) {
        console.error(`   ❌ Missing required fields (id, agent_id, title): ${path.basename(filePath)}`);
        return;
      }

      // Ensure agent exists (auto-create if needed)
      try {
        const existingAgent = db.prepare(
          'SELECT id FROM agents WHERE id = ?'
        ).get(pageData.agent_id);

        if (!existingAgent) {
          // Auto-create agent
          const agentName = pageData.agent_id
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          db.prepare(`
            INSERT INTO agents (id, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            pageData.agent_id,
            agentName,
            `Auto-created agent for ${pageData.agent_id}`,
            new Date().toISOString(),
            new Date().toISOString()
          );

          console.log(`   ✅ Auto-created agent: ${pageData.agent_id}`);
        }
      } catch (agentError) {
        console.error(`   ❌ Failed to ensure agent exists: ${agentError.message}`);
        console.error(`   Stack: ${agentError.stack}`);
        return;
      }

      // Check if already registered
      try {
        const existing = db.prepare(
          'SELECT id FROM agent_pages WHERE id = ? AND agent_id = ?'
        ).get(pageData.id, pageData.agent_id);

        if (existing) {
          console.log(`   ⏭️  Already registered, updating: ${pageData.id}`);
        }
      } catch (checkError) {
        console.error(`   ❌ Failed to check existing page: ${checkError.message}`);
        // Continue with insert, might be first time
      }

      // Auto-register with INSERT OR REPLACE
      // Prepare page data for insertion, preserving original format
      // Supports both formats:
      // 1. Page-builder format: {specification, ...}
      // 2. Database format: {content_type, content_value, ...}
      const insertData = preparePageData(pageData);

      try {
        db.prepare(`
          INSERT OR REPLACE INTO agent_pages (
            id,
            agent_id,
            title,
            content_type,
            content_value,
            content_metadata,
            status,
            version,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          insertData.id,
          insertData.agent_id,
          insertData.title,
          insertData.content_type,
          insertData.content_value,
          insertData.content_metadata,
          insertData.status,
          insertData.version,
          insertData.created_at,
          insertData.updated_at
        );

        console.log(`   ✅ Auto-registered: ${pageData.id} for ${pageData.agent_id}`);
      } catch (insertError) {
        console.error(`   ❌ Failed to insert page: ${insertError.message}`);
        console.error(`   Stack: ${insertError.stack}`);
      }

    } catch (error) {
      // Catch-all error handler to prevent watcher crashes
      console.error(`   ❌ Auto-registration failed with unexpected error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      console.error(`   File: ${filePath}`);
    }
  });

  // Handle watcher errors
  watcher.on('error', (error) => {
    console.error('   ❌ Watcher error:', error);
  });

  return watcher;
}

/**
 * Express middleware factory
 * @param {Database} db - Better-sqlite3 database instance
 * @param {string} pagesDir - Directory to watch (optional)
 * @returns {Function} Express middleware function
 */
export default function autoRegisterMiddleware(db, pagesDir) {
  // Initialize watcher on middleware setup
  initializeAutoRegistration(db, pagesDir);

  // Return pass-through middleware (actual work happens in background)
  return (req, res, next) => {
    next();
  };
}
