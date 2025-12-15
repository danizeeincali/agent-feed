import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = '/workspaces/agent-feed/data/agent-pages.db';
const db = new Database(dbPath);

// Ensure page-builder-agent exists
const agentId = 'page-builder-agent';
const existingAgent = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId);

if (!existingAgent) {
  db.prepare(`
    INSERT INTO agents (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    agentId,
    'Page Builder Agent',
    'Agent for building dynamic pages',
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log('✅ Created page-builder-agent');
}

// Import demo pages
const demoPages = [
  {
    file: '/workspaces/agent-feed/data/agent-pages/charts-demo.json',
    id: 'charts-demo',
    title: 'Charts Demo - LineChart, BarChart, PieChart'
  },
  {
    file: '/workspaces/agent-feed/data/agent-pages/mermaid-demo.json',
    id: 'mermaid-demo',
    title: 'Mermaid Diagrams Demo - Flowcharts and More'
  },
  {
    file: '/workspaces/agent-feed/data/agent-pages/charts-and-diagrams-showcase.json',
    id: 'charts-and-diagrams-showcase',
    title: 'Charts and Diagrams Showcase - Complete Demo'
  }
];

for (const page of demoPages) {
  try {
    const content = fs.readFileSync(page.file, 'utf-8');
    const now = new Date().toISOString();
    
    // Check if page already exists
    const existing = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(page.id);
    
    if (existing) {
      // Update existing page
      db.prepare(`
        UPDATE agent_pages 
        SET content_value = ?, updated_at = ?
        WHERE id = ?
      `).run(content, now, page.id);
      console.log(`✅ Updated page: ${page.id}`);
    } else {
      // Insert new page
      db.prepare(`
        INSERT INTO agent_pages (
          id, agent_id, title, content_type, content_value,
          status, created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        page.id,
        agentId,
        page.title,
        'json',
        content,
        'published',
        now,
        now,
        1
      );
      console.log(`✅ Inserted page: ${page.id}`);
    }
  } catch (error) {
    console.error(`❌ Error importing ${page.id}:`, error.message);
  }
}

db.close();
console.log('✅ Demo pages import complete');
