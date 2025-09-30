# Option A Implementation Research Document

## Executive Summary

This research document provides comprehensive technical analysis and implementation patterns for Option A: converting the current agent-pages system from JSON-based storage to an SQLite database with Markdown frontmatter files. The research covers gray-matter library usage, better-sqlite3 best practices, existing PageController patterns, JSON schema documentation, migration strategies, and security recommendations.

---

## 1. Gray-Matter Library Usage for YAML Frontmatter Parsing

### Overview
- **Package**: gray-matter v4.0.3
- **Purpose**: Parse front-matter from a string or file. Fast, reliable and easy to use.
- **Supported Formats**: YAML (default), JSON, TOML, Coffee Front-Matter
- **Used By**: Gatsby, Netlify, Assemble, vuejs vitepress, TinaCMS, Shopify Polaris, Ant Design, Astro, and many others

### Installation
```bash
npm install gray-matter
npm install --save-dev @types/gray-matter  # TypeScript types
```

### Basic TypeScript Usage Examples

#### 1. Basic Parsing Pattern
```typescript
import matter from 'gray-matter';
import fs from 'fs';

// Read and parse markdown file
const fileContent = fs.readFileSync('./page.md', 'utf-8');
const { data: frontMatter, content } = matter(fileContent);

console.log(frontMatter);  // { title: "Page Title", version: 1, ... }
console.log(content);       // "# Markdown content here..."
```

#### 2. Complete File Processing Function
```typescript
import matter from 'gray-matter';
import { readFile } from 'fs/promises';

interface PageFrontMatter {
  id: string;
  agent_id: string;
  title: string;
  version: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

async function parseAgentPage(filepath: string) {
  const fileContent = await readFile(filepath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    frontMatter: data as PageFrontMatter,
    markdownBody: content,
  };
}
```

#### 3. Writing Frontmatter Back to Files
```typescript
import matter from 'gray-matter';
import { writeFile, readFile } from 'fs/promises';
import { stringify } from 'yaml';

async function updatePageFrontMatter(filepath: string, updates: Partial<PageFrontMatter>) {
  // Read existing file
  const fileContent = await readFile(filepath, 'utf-8');
  const { data: frontMatter, content } = matter(fileContent);

  // Update frontmatter
  const updatedFrontMatter = {
    ...frontMatter,
    ...updates,
    updated_at: new Date().toISOString()
  };

  // Reconstruct file with updated frontmatter
  const newContent = `---\n${stringify(updatedFrontMatter)}---\n${content}`;

  await writeFile(filepath, newContent);
}
```

#### 4. Excerpt Extraction
```typescript
const str = '---\nfoo: bar\n---\nThis is an excerpt.\n---\nThis is content';
const file = matter(str, { excerpt: true });

// Returns:
// {
//   content: 'This is content',
//   data: { foo: 'bar' },
//   excerpt: 'This is an excerpt.\n'
// }
```

### Integration Pattern for Agent Pages

```typescript
import matter from 'gray-matter';
import path from 'path';
import { readFile } from 'fs/promises';

class PageFileService {
  private pagesDirectory: string;

  constructor(pagesDir: string) {
    this.pagesDirectory = pagesDir;
  }

  async loadPage(pageId: string) {
    const filepath = path.join(this.pagesDirectory, `${pageId}.md`);
    const fileContent = await readFile(filepath, 'utf-8');

    const { data, content } = matter(fileContent);

    return {
      id: data.id,
      agent_id: data.agent_id,
      title: data.title,
      specification: content.trim(), // Markdown content is the specification
      version: data.version,
      created_at: data.created_at,
      updated_at: data.updated_at,
      metadata: data.metadata || {}
    };
  }

  async savePage(page: any) {
    const frontMatter = {
      id: page.id,
      agent_id: page.agent_id,
      title: page.title,
      version: page.version,
      created_at: page.created_at,
      updated_at: new Date().toISOString(),
      metadata: page.metadata
    };

    const fileContent = matter.stringify(
      page.specification, // Content body
      frontMatter          // Frontmatter data
    );

    const filepath = path.join(this.pagesDirectory, `${page.id}.md`);
    await writeFile(filepath, fileContent);
  }
}
```

---

## 2. Better-SQLite3 vs sqlite3: Performance & API Analysis

### Comparison Summary

| Feature | better-sqlite3 | sqlite3 |
|---------|---------------|---------|
| **API Style** | Synchronous | Asynchronous (callbacks) |
| **Performance** | Much faster for most cases | Slower due to async overhead |
| **Node.js Version** | Native C++ addon | Native C++ addon |
| **TypeScript Support** | @types/better-sqlite3 | @types/node-sqlite3 |
| **Latest Version** | 12.4.1 | 5.1.7 |
| **Active Development** | Very active | Active |

### Why better-sqlite3 is Faster

1. **No Mutex Thrashing**: node-sqlite3 uses asynchronous APIs for tasks that are CPU-bound or serialized, causing mutex thrashing with devastating performance effects
2. **Synchronous Execution**: better-sqlite3 is optimized for synchronous operations, making it faster for small to medium applications
3. **JavaScript-First Design**: Allows garbage collector to manage memory automatically, whereas node-sqlite3 exposes low-level C memory management

### Real-World Performance

- With proper indexing, better-sqlite3 achieves **upward of 2000 queries per second** with 5-way-joins in a 60 GB database
- Each query can handle 5–50 kilobytes of real data efficiently

### Installation & Setup

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

### TypeScript Setup Examples

#### 1. Basic Initialization
```typescript
import Database from 'better-sqlite3';

// Initialize database
const db = new Database('agent-pages.db', {
  verbose: console.log // Optional: log SQL queries
});

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');
```

#### 2. Type-Safe Database Manager Class
```typescript
import Database from 'better-sqlite3';

class AgentPagesDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, {
      fileMustExist: false,
      timeout: 5000
    });

    // Configure for optimal performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');

    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_pages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        version INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);
    `);
  }

  close(): void {
    this.db.close();
  }
}
```

#### 3. Using Prepared Statements (Recommended)
```typescript
// INSERT with prepared statement
insertPage(page: AgentPage): void {
  const stmt = this.db.prepare(`
    INSERT INTO agent_pages (
      id, agent_id, title, file_path, version, metadata
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    page.id,
    page.agent_id,
    page.title,
    page.file_path,
    page.version,
    JSON.stringify(page.metadata)
  );
}

// SELECT with prepared statement
getPage(pageId: string): AgentPage | undefined {
  const stmt = this.db.prepare('SELECT * FROM agent_pages WHERE id = ?');
  return stmt.get(pageId) as AgentPage | undefined;
}

// UPDATE with prepared statement
updatePage(pageId: string, updates: Partial<AgentPage>): void {
  const stmt = this.db.prepare(`
    UPDATE agent_pages
    SET title = ?, version = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(updates.title, updates.version, pageId);
}

// DELETE with prepared statement
deletePage(pageId: string): void {
  const stmt = this.db.prepare('DELETE FROM agent_pages WHERE id = ?');
  stmt.run(pageId);
}
```

#### 4. Transaction Support
```typescript
// Transaction wrapper
createPageWithVersioning(page: AgentPage): void {
  const transaction = this.db.transaction(() => {
    // Insert main page record
    const insertStmt = this.db.prepare(`
      INSERT INTO agent_pages (id, agent_id, title, file_path, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(page.id, page.agent_id, page.title, page.file_path, page.version);

    // Insert version history
    const versionStmt = this.db.prepare(`
      INSERT INTO page_versions (page_id, version, file_path, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    versionStmt.run(page.id, page.version, page.file_path);
  });

  transaction(); // Execute transaction
}
```

---

## 3. TypeScript PageController Implementation Analysis

### Current Route Structure
**Location**: `/workspaces/agent-feed/backend/api/agent-workspaces/routes/pageRoutes.ts`

The existing PageController routes include:

#### CRUD Operations
- `GET /` - Get all pages for a workspace
- `POST /` - Create new page
- `GET /:pageId` - Get single page
- `PUT /:pageId` - Update page
- `DELETE /:pageId` - Delete page

#### Publishing & Sharing
- `POST /:pageId/publish` - Publish page
- `POST /:pageId/unpublish` - Unpublish page

#### Versioning
- `GET /:pageId/versions` - Get all versions
- `GET /:pageId/versions/:versionNumber` - Get specific version
- `POST /:pageId/versions/:versionNumber/restore` - Restore version

#### Rendering & Preview
- `GET /:pageId/render` - Render page
- `POST /:pageId/preview` - Preview page with changes

#### Validation & Security
- `POST /:pageId/validate` - Validate page structure

### Middleware Pattern
```typescript
// Rate limiting
const pageRateLimit = createRateLimiter(15 * 60 * 1000, 100); // 100 req/15min

// Security & validation chain
router.post(
  '/',
  pageRateLimit,
  validateWorkspaceAccess('write'),
  validateInput(pageValidators.createPage),
  async (req, res) => pageController.createPage(req, res)
);
```

### PageController Logic to Port

Based on the route structure, the PageController should implement:

```typescript
class PageController {
  private db: AgentPagesDatabase;
  private fileService: PageFileService;

  constructor(db: AgentPagesDatabase, fileService: PageFileService) {
    this.db = db;
    this.fileService = fileService;
  }

  // CRUD Operations
  async getPages(req: Request, res: Response): Promise<void> {
    // Query database for page metadata
    // Return list of pages with metadata
  }

  async createPage(req: Request, res: Response): Promise<void> {
    // 1. Generate unique page ID
    // 2. Write markdown file with gray-matter
    // 3. Insert metadata into SQLite
    // 4. Return created page
  }

  async getPage(req: Request, res: Response): Promise<void> {
    // 1. Query database for metadata
    // 2. Read markdown file with gray-matter
    // 3. Combine and return
  }

  async updatePage(req: Request, res: Response): Promise<void> {
    // 1. Update database metadata
    // 2. Update markdown file
    // 3. Increment version
    // 4. Create version snapshot
  }

  async deletePage(req: Request, res: Response): Promise<void> {
    // 1. Delete database record
    // 2. Delete markdown file
    // 3. Archive version history
  }

  // Publishing
  async publishPage(req: Request, res: Response): Promise<void> {
    // Set published_at timestamp
    // Update database status
  }

  async unpublishPage(req: Request, res: Response): Promise<void> {
    // Clear published_at timestamp
    // Update database status
  }

  // Versioning
  async getPageVersions(req: Request, res: Response): Promise<void> {
    // Query version history from database
  }

  async getPageVersion(req: Request, res: Response): Promise<void> {
    // Retrieve specific version from archive
  }

  async restorePageVersion(req: Request, res: Response): Promise<void> {
    // Copy archived version to current
    // Increment version number
  }

  // Rendering
  async renderPage(req: Request, res: Response): Promise<void> {
    // Parse specification JSON
    // Apply component renderer
    // Return HTML/React
  }

  async previewPage(req: Request, res: Response): Promise<void> {
    // Render without saving
    // Return preview data
  }

  // Validation
  async validatePage(req: Request, res: Response): Promise<void> {
    // Validate JSON specification
    // Check component structure
    // Return validation results
  }
}
```

---

## 4. JSON Page Structure Documentation

### Current JSON Schema
**Location**: `/workspaces/agent-feed/data/agent-pages/`

#### Example 1: Complex Dashboard (personal-todos-agent-dashboard-v3.json)

```typescript
interface AgentPage {
  // Metadata Fields
  id: string;                          // Unique page identifier
  agent_id: string;                    // Agent that created/owns the page
  title: string;                       // Human-readable title
  specification: string;               // JSON string containing page spec
  version: number;                     // Version number
  created_at: string;                  // ISO 8601 timestamp
  updated_at: string;                  // ISO 8601 timestamp
  metadata?: {                         // Optional metadata object
    template: string;                  // Template type (dashboard, grid, single)
    layout: string;                    // Layout type
    components_count: number;          // Number of components
    security_score: number;            // Security audit score
    accessibility_score: number;       // A11y score
    performance_score: number;         // Performance score
    build_agent: string;               // Agent that built the page
    data_source: string;               // Data source identifier
    features: string[];                // Feature flags
  };
}
```

#### Page Specification Schema (Parsed from `specification` field)

```typescript
interface PageSpecification {
  id: string;
  version?: number;
  title: string;
  description?: string;
  template: 'dashboard' | 'grid' | 'single' | 'custom';
  layout: 'grid' | 'flex' | 'single';

  // Theme Configuration
  theme?: {
    primaryColor: string;              // Hex color
    secondaryColor: string;            // Hex color
    accentColor: string;               // Hex color
    backgroundColor: string;           // Hex color
    textColor: string;                 // Hex color
    priorityColors?: Record<string, string>;  // Custom color mappings
  };

  // Component Tree
  components: ComponentDefinition[];

  // Grid Configuration (if layout === 'grid')
  gridConfig?: {
    columns: number;
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
    responsive?: Record<string, { columns: number; breakpoint: number }>;
  };

  // Data Bindings (expressions for dynamic data)
  dataBindings?: Record<string, string>;

  // Event Handlers
  interactionHandlers?: Record<string, string>;

  // Real-time Configuration
  refreshInterval?: number;            // Milliseconds
  autoSave?: boolean;
  realTimeUpdates?: boolean;
  webSocketEnabled?: boolean;
}
```

#### Component Definition Schema

```typescript
interface ComponentDefinition {
  id?: string;                         // Unique component ID
  type: string;                        // Component type (Card, Grid, Button, etc)
  position?: {                         // Grid position (for grid layout)
    row: number;
    col: number;
    rowSpan?: number;
    colSpan?: number;
  };
  props?: Record<string, any>;        // Component properties
  children?: (ComponentDefinition | string)[];  // Nested components or text
}
```

#### Example 2: Simple Page (simple-demo.json)

```json
{
  "id": "simple-demo",
  "agent_id": "personal-todos-agent",
  "title": "Simple Demo Page",
  "specification": "{\"id\":\"simple-demo\",\"version\":1,\"title\":\"Simple Demo Page\",\"layout\":\"single\",\"components\":[{\"type\":\"Card\",\"props\":{\"title\":\"Welcome to Agent Dynamic Pages!\",\"description\":\"This page was created by an AI agent using JSON specifications.\"},\"children\":[{\"type\":\"Container\",\"children\":[{\"type\":\"Badge\",\"props\":{\"children\":\"AI Generated\",\"variant\":\"secondary\"}}]}]},{\"type\":\"Grid\",\"props\":{\"cols\":2,\"gap\":4},\"children\":[{\"type\":\"Button\",\"props\":{\"children\":\"Primary Action\",\"variant\":\"default\"}},{\"type\":\"Button\",\"props\":{\"children\":\"Secondary Action\",\"variant\":\"outline\"}}]}]}",
  "version": 1,
  "created_at": "2025-09-12T15:02:29.639Z",
  "updated_at": "2025-09-12T15:02:29.639Z"
}
```

### Migration Strategy for Specification Field

**Current**: Specification is stored as a JSON string inside a JSON file
**Target**: Specification should be stored as markdown content with YAML frontmatter

#### Conversion Pattern

```typescript
interface ConversionService {
  // Convert existing JSON to Markdown with frontmatter
  convertJsonToMarkdown(jsonPage: AgentPage): string {
    const frontMatter = {
      id: jsonPage.id,
      agent_id: jsonPage.agent_id,
      title: jsonPage.title,
      version: jsonPage.version,
      created_at: jsonPage.created_at,
      updated_at: jsonPage.updated_at,
      metadata: jsonPage.metadata
    };

    // Parse the specification JSON string
    const specification = JSON.parse(jsonPage.specification);

    // Convert specification to formatted markdown
    const markdownBody = JSON.stringify(specification, null, 2);

    return matter.stringify(markdownBody, frontMatter);
  }

  // Read markdown and convert back to AgentPage format
  async parseMarkdownToPage(markdownContent: string): Promise<AgentPage> {
    const { data, content } = matter(markdownContent);

    return {
      id: data.id,
      agent_id: data.agent_id,
      title: data.title,
      specification: content.trim(), // Markdown body becomes specification
      version: data.version,
      created_at: data.created_at,
      updated_at: data.updated_at,
      metadata: data.metadata
    };
  }
}
```

---

## 5. SQLite Migration Best Practices (2025)

### Schema Version Tracking

#### Method 1: SQLite Built-in user_version
```typescript
// Set version
db.pragma('user_version = 1');

// Get version
const version = db.pragma('user_version', { simple: true });

// Migration pattern
function migrateDatabase(db: Database.Database) {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;

  if (currentVersion < 1) {
    // Apply migration 1
    db.exec(`
      CREATE TABLE agent_pages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL
      );
    `);
    db.pragma('user_version = 1');
  }

  if (currentVersion < 2) {
    // Apply migration 2
    db.exec(`
      ALTER TABLE agent_pages ADD COLUMN metadata TEXT;
    `);
    db.pragma('user_version = 2');
  }
}
```

#### Method 2: Dedicated Version Table
```typescript
class MigrationManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeVersionTable();
  }

  private initializeVersionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  getCurrentVersion(): number {
    const stmt = this.db.prepare('SELECT MAX(version) as version FROM schema_versions');
    const result = stmt.get() as { version: number | null };
    return result.version || 0;
  }

  applyMigration(version: number, description: string, sql: string): void {
    const transaction = this.db.transaction(() => {
      this.db.exec(sql);

      const stmt = this.db.prepare(`
        INSERT INTO schema_versions (version, description)
        VALUES (?, ?)
      `);
      stmt.run(version, description);
    });

    transaction();
  }

  runMigrations(): void {
    const currentVersion = this.getCurrentVersion();

    if (currentVersion < 1) {
      this.applyMigration(1, 'Initial schema', `
        CREATE TABLE agent_pages (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          file_path TEXT NOT NULL UNIQUE,
          version INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_agent_pages_agent_id ON agent_pages(agent_id);
      `);
    }

    if (currentVersion < 2) {
      this.applyMigration(2, 'Add metadata column', `
        ALTER TABLE agent_pages ADD COLUMN metadata TEXT;
      `);
    }

    if (currentVersion < 3) {
      this.applyMigration(3, 'Add page versions table', `
        CREATE TABLE page_versions (
          id TEXT PRIMARY KEY,
          page_id TEXT NOT NULL,
          version INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (page_id) REFERENCES agent_pages(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_page_versions_page_id ON page_versions(page_id);
      `);
    }
  }
}
```

### Migration Strategies

#### Adding Columns (Safe)
```typescript
// Adding columns is backward-compatible
db.exec(`
  ALTER TABLE agent_pages
  ADD COLUMN published_at DATETIME DEFAULT NULL;
`);

// Always add with default value or allow NULL
db.exec(`
  ALTER TABLE agent_pages
  ADD COLUMN is_published BOOLEAN DEFAULT 0;
`);
```

#### Modifying Tables (Requires Rebuild)
SQLite doesn't support direct column modifications. Use this pattern:

```typescript
function modifyTableColumn(db: Database.Database) {
  const transaction = db.transaction(() => {
    // 1. Create new table with desired schema
    db.exec(`
      CREATE TABLE agent_pages_new (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        version INTEGER NOT NULL DEFAULT 1,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Copy data from old table to new table
    db.exec(`
      INSERT INTO agent_pages_new (id, agent_id, title, file_path, version, created_at, updated_at)
      SELECT id, agent_id, title, file_path, version, created_at, updated_at
      FROM agent_pages
    `);

    // 3. Drop old table
    db.exec('DROP TABLE agent_pages');

    // 4. Rename new table to original name
    db.exec('ALTER TABLE agent_pages_new RENAME TO agent_pages');

    // 5. Recreate indexes
    db.exec('CREATE INDEX idx_agent_pages_agent_id ON agent_pages(agent_id)');
  });

  transaction();
}
```

### Backward Compatibility Guidelines

1. **Add, don't remove**: Always add new columns rather than removing old ones
2. **Default values**: Always provide default values for new columns
3. **Nullable columns**: Make new columns nullable when possible
4. **Version checks**: Always check schema version before running code
5. **Gradual deprecation**: Mark old columns as deprecated before removing

### Testing and Safety

```typescript
class DatabaseTester {
  static testMigration(migrationFn: (db: Database.Database) => void): boolean {
    try {
      // Create temporary in-memory database
      const testDb = new Database(':memory:');

      // Run migration
      migrationFn(testDb);

      // Verify tables exist
      const tables = testDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      console.log('Migration successful. Tables:', tables);

      testDb.close();
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  static backupDatabase(sourcePath: string, backupPath: string): void {
    const sourceDb = new Database(sourcePath, { readonly: true });
    const backupDb = new Database(backupPath);

    sourceDb.backup(backupDb);

    sourceDb.close();
    backupDb.close();

    console.log(`Database backed up to ${backupPath}`);
  }
}
```

---

## 6. SQL Injection Prevention Patterns for better-sqlite3

### Overview of SQL Injection Risk

SQL injection occurs when user input is directly embedded into SQL queries without proper sanitization. The **ONLY** reliable defense is using prepared statements with parameter binding.

### Prepared Statements: The Correct Way

#### ✅ SAFE: Using Parameterized Queries

```typescript
// SAFE: Using ? placeholders
const stmt = db.prepare('SELECT * FROM agent_pages WHERE id = ?');
const page = stmt.get(userProvidedId);

// SAFE: Multiple parameters
const stmt = db.prepare(`
  INSERT INTO agent_pages (id, agent_id, title, version)
  VALUES (?, ?, ?, ?)
`);
stmt.run(id, agentId, title, version);

// SAFE: Named parameters
const stmt = db.prepare(`
  UPDATE agent_pages
  SET title = @title, version = @version
  WHERE id = @id
`);
stmt.run({
  id: userProvidedId,
  title: userProvidedTitle,
  version: userProvidedVersion
});
```

#### ❌ UNSAFE: String Concatenation (Never Do This!)

```typescript
// DANGER: Vulnerable to SQL injection
const query = `SELECT * FROM agent_pages WHERE id = '${userInput}'`;
db.prepare(query).get();  // ❌ NEVER DO THIS

// DANGER: Template literals
const query = `SELECT * FROM agent_pages WHERE title = '${req.body.title}'`;
db.exec(query);  // ❌ NEVER DO THIS
```

### SQL Injection Prevention Best Practices

#### 1. Always Use Prepared Statements

```typescript
class SafePageRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // ✅ SAFE: Prepared statement for SELECT
  findById(id: string): AgentPage | undefined {
    const stmt = this.db.prepare('SELECT * FROM agent_pages WHERE id = ?');
    return stmt.get(id) as AgentPage | undefined;
  }

  // ✅ SAFE: Prepared statement for INSERT
  create(page: AgentPage): void {
    const stmt = this.db.prepare(`
      INSERT INTO agent_pages (id, agent_id, title, file_path, version, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      page.id,
      page.agent_id,
      page.title,
      page.file_path,
      page.version,
      JSON.stringify(page.metadata)
    );
  }

  // ✅ SAFE: Prepared statement for UPDATE
  update(id: string, updates: Partial<AgentPage>): void {
    const stmt = this.db.prepare(`
      UPDATE agent_pages
      SET title = ?, version = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(updates.title, updates.version, id);
  }

  // ✅ SAFE: Prepared statement for DELETE
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM agent_pages WHERE id = ?');
    stmt.run(id);
  }
}
```

#### 2. Dynamic WHERE Clauses (Safe Pattern)

```typescript
class SafeQueryBuilder {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // ✅ SAFE: Building dynamic queries safely
  findPages(filters: {
    agent_id?: string;
    status?: string;
    created_after?: string;
  }): AgentPage[] {
    const conditions: string[] = [];
    const params: any[] = [];

    // Build WHERE clause safely
    if (filters.agent_id) {
      conditions.push('agent_id = ?');
      params.push(filters.agent_id);
    }

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.created_after) {
      conditions.push('created_at > ?');
      params.push(filters.created_after);
    }

    // Construct query with safe placeholders
    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const query = `SELECT * FROM agent_pages ${whereClause} ORDER BY created_at DESC`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as AgentPage[];
  }
}
```

#### 3. Input Validation Layer

```typescript
import { z } from 'zod';

// Define validation schemas
const PageIdSchema = z.string().uuid();
const PageTitleSchema = z.string().min(1).max(255);
const PageVersionSchema = z.number().int().positive();

class ValidatedPageRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // ✅ SAFE: Validation + prepared statement
  findById(id: string): AgentPage | undefined {
    // Validate input
    const validatedId = PageIdSchema.parse(id);

    // Use prepared statement
    const stmt = this.db.prepare('SELECT * FROM agent_pages WHERE id = ?');
    return stmt.get(validatedId) as AgentPage | undefined;
  }

  // ✅ SAFE: Validation before insertion
  create(page: Partial<AgentPage>): void {
    // Validate all inputs
    const validatedPage = {
      id: PageIdSchema.parse(page.id),
      agent_id: z.string().parse(page.agent_id),
      title: PageTitleSchema.parse(page.title),
      version: PageVersionSchema.parse(page.version)
    };

    // Use prepared statement
    const stmt = this.db.prepare(`
      INSERT INTO agent_pages (id, agent_id, title, version)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      validatedPage.id,
      validatedPage.agent_id,
      validatedPage.title,
      validatedPage.version
    );
  }
}
```

#### 4. Whitelist Pattern for Dynamic Column Names

```typescript
class SafeSortingRepository {
  private db: Database.Database;

  // Define allowed sort columns (whitelist)
  private readonly ALLOWED_SORT_COLUMNS = ['id', 'title', 'created_at', 'updated_at'];
  private readonly ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];

  constructor(db: Database.Database) {
    this.db = db;
  }

  // ✅ SAFE: Whitelist validation for dynamic SQL parts
  findAll(sortBy: string = 'created_at', sortOrder: string = 'DESC'): AgentPage[] {
    // Validate against whitelist (not parameterized)
    if (!this.ALLOWED_SORT_COLUMNS.includes(sortBy)) {
      throw new Error('Invalid sort column');
    }

    if (!this.ALLOWED_SORT_ORDERS.includes(sortOrder.toUpperCase())) {
      throw new Error('Invalid sort order');
    }

    // Safe to use in query since it's from whitelist
    const query = `SELECT * FROM agent_pages ORDER BY ${sortBy} ${sortOrder}`;
    const stmt = this.db.prepare(query);

    return stmt.all() as AgentPage[];
  }
}
```

### Security Recommendations Summary

1. **ALWAYS use prepared statements** with `?` placeholders or named parameters
2. **NEVER concatenate user input** directly into SQL strings
3. **Validate all inputs** using schemas (zod, joi, etc.)
4. **Use whitelists** for dynamic SQL parts like column names and sort orders
5. **Escape special characters** only when absolutely necessary (very rare)
6. **Log security events** for attempted SQL injection
7. **Run security audits** regularly with tools like SQLMap (in test environments)

### Example: Existing CostModel.ts Analysis

The existing `/workspaces/agent-feed/backend/database/models/CostModel.ts` demonstrates proper better-sqlite3 usage:

✅ **Good practices found:**
- Uses prepared statements consistently
- Parameters bound with `?` placeholders
- Transactions used for atomic operations
- Indexes created for performance
- Foreign keys enforced
- Triggers for automatic updates

Example from CostModel.ts:
```typescript
public insertSession(session: Omit<CostSessionModel, 'created_at' | 'updated_at'>): void {
  const stmt = this.db.prepare(`
    INSERT INTO cost_sessions (
      session_id, user_id, start_time, end_time, total_cost,
      input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
      step_count, status, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    session.session_id,
    session.user_id,
    session.start_time,
    session.end_time || null,
    session.total_cost,
    session.input_tokens,
    session.output_tokens,
    session.cache_creation_tokens,
    session.cache_read_tokens,
    session.step_count,
    session.status,
    session.metadata || null
  );
}
```

This pattern should be replicated for the agent-pages implementation.

---

## 7. Complete Integration Example

### Proposed Database Schema

```sql
-- Main pages table
CREATE TABLE agent_pages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE INDEX idx_agent_pages_agent_id ON agent_pages(agent_id);
CREATE INDEX idx_agent_pages_status ON agent_pages(status);
CREATE INDEX idx_agent_pages_created_at ON agent_pages(created_at);
CREATE INDEX idx_agent_pages_published_at ON agent_pages(published_at);

-- Version history table
CREATE TABLE page_versions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (page_id) REFERENCES agent_pages(id) ON DELETE CASCADE
);

CREATE INDEX idx_page_versions_page_id ON page_versions(page_id);
CREATE UNIQUE INDEX idx_page_versions_page_version ON page_versions(page_id, version);

-- Schema versioning
CREATE TABLE schema_versions (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Proposed File Structure

```
/workspaces/agent-feed/
├── backend/
│   ├── database/
│   │   ├── agent-pages.db            # SQLite database
│   │   └── models/
│   │       └── AgentPageModel.ts     # Database model
│   ├── services/
│   │   ├── PageFileService.ts        # Markdown file operations
│   │   └── PageService.ts            # Business logic
│   └── api/
│       └── agent-workspaces/
│           ├── controllers/
│           │   └── PageController.ts  # HTTP controller
│           └── routes/
│               └── pageRoutes.ts      # Express routes
└── data/
    └── agent-pages/                   # Markdown files
        ├── page-001.md
        ├── page-002.md
        └── versions/                  # Version archives
            ├── page-001-v1.md
            └── page-001-v2.md
```

### Complete Implementation Skeleton

```typescript
// backend/database/models/AgentPageModel.ts
import Database from 'better-sqlite3';

export interface AgentPage {
  id: string;
  agent_id: string;
  title: string;
  file_path: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export class AgentPageModel {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Schema creation code here
  }

  // CRUD operations using prepared statements
  create(page: Omit<AgentPage, 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO agent_pages (
        id, agent_id, title, file_path, version, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      page.id,
      page.agent_id,
      page.title,
      page.file_path,
      page.version,
      page.status,
      page.metadata ? JSON.stringify(page.metadata) : null
    );
  }

  findById(id: string): AgentPage | undefined {
    const stmt = this.db.prepare('SELECT * FROM agent_pages WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.parseMetadata(row) : undefined;
  }

  findByAgentId(agentId: string): AgentPage[] {
    const stmt = this.db.prepare('SELECT * FROM agent_pages WHERE agent_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(agentId);
    return rows.map(row => this.parseMetadata(row));
  }

  update(id: string, updates: Partial<AgentPage>): void {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      const val = updates[f as keyof AgentPage];
      return f === 'metadata' && typeof val === 'object' ? JSON.stringify(val) : val;
    });

    const stmt = this.db.prepare(`
      UPDATE agent_pages
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(...values, id);
  }

  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM agent_pages WHERE id = ?');
    stmt.run(id);
  }

  private parseMetadata(row: any): AgentPage {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  close(): void {
    this.db.close();
  }
}
```

```typescript
// backend/services/PageFileService.ts
import matter from 'gray-matter';
import { readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';

export class PageFileService {
  private pagesDirectory: string;
  private versionsDirectory: string;

  constructor(pagesDir: string) {
    this.pagesDirectory = pagesDir;
    this.versionsDirectory = path.join(pagesDir, 'versions');
  }

  async readPage(pageId: string) {
    const filepath = path.join(this.pagesDirectory, `${pageId}.md`);
    const fileContent = await readFile(filepath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      frontMatter: data,
      specification: content.trim()
    };
  }

  async writePage(pageId: string, frontMatter: any, specification: string): Promise<void> {
    const fileContent = matter.stringify(specification, frontMatter);
    const filepath = path.join(this.pagesDirectory, `${pageId}.md`);
    await writeFile(filepath, fileContent, 'utf-8');
  }

  async deletePage(pageId: string): Promise<void> {
    const filepath = path.join(this.pagesDirectory, `${pageId}.md`);
    await unlink(filepath);
  }

  async createVersion(pageId: string, version: number, frontMatter: any, specification: string): Promise<void> {
    const fileContent = matter.stringify(specification, frontMatter);
    const versionPath = path.join(this.versionsDirectory, `${pageId}-v${version}.md`);
    await writeFile(versionPath, fileContent, 'utf-8');
  }

  async readVersion(pageId: string, version: number) {
    const versionPath = path.join(this.versionsDirectory, `${pageId}-v${version}.md`);
    const fileContent = await readFile(versionPath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      frontMatter: data,
      specification: content.trim()
    };
  }
}
```

```typescript
// backend/services/PageService.ts
import { AgentPageModel, AgentPage } from '../database/models/AgentPageModel';
import { PageFileService } from './PageFileService';
import { randomUUID } from 'crypto';

export class PageService {
  private model: AgentPageModel;
  private fileService: PageFileService;

  constructor(model: AgentPageModel, fileService: PageFileService) {
    this.model = model;
    this.fileService = fileService;
  }

  async createPage(data: {
    agent_id: string;
    title: string;
    specification: string;
    metadata?: Record<string, any>;
  }): Promise<AgentPage> {
    const id = randomUUID();
    const filePath = `${id}.md`;

    // Prepare frontmatter
    const frontMatter = {
      id,
      agent_id: data.agent_id,
      title: data.title,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: data.metadata
    };

    // Write markdown file
    await this.fileService.writePage(id, frontMatter, data.specification);

    // Insert into database
    this.model.create({
      id,
      agent_id: data.agent_id,
      title: data.title,
      file_path: filePath,
      version: 1,
      status: 'draft',
      metadata: data.metadata
    });

    return this.getPage(id) as Promise<AgentPage>;
  }

  async getPage(pageId: string): Promise<AgentPage | null> {
    // Get metadata from database
    const page = this.model.findById(pageId);
    if (!page) return null;

    // Read specification from file
    const { specification } = await this.fileService.readPage(pageId);

    return {
      ...page,
      specification
    } as any;
  }

  async updatePage(pageId: string, updates: {
    title?: string;
    specification?: string;
    metadata?: Record<string, any>;
  }): Promise<AgentPage> {
    const page = this.model.findById(pageId);
    if (!page) throw new Error('Page not found');

    // Increment version
    const newVersion = page.version + 1;

    // Read current file for versioning
    const { frontMatter, specification } = await this.fileService.readPage(pageId);

    // Create version snapshot
    await this.fileService.createVersion(pageId, page.version, frontMatter, specification);

    // Update frontmatter
    const updatedFrontMatter = {
      ...frontMatter,
      title: updates.title || frontMatter.title,
      version: newVersion,
      updated_at: new Date().toISOString(),
      metadata: updates.metadata || frontMatter.metadata
    };

    // Write updated file
    await this.fileService.writePage(
      pageId,
      updatedFrontMatter,
      updates.specification || specification
    );

    // Update database
    this.model.update(pageId, {
      title: updates.title,
      version: newVersion,
      metadata: updates.metadata
    });

    return this.getPage(pageId) as Promise<AgentPage>;
  }

  async deletePage(pageId: string): Promise<void> {
    // Delete from database
    this.model.delete(pageId);

    // Delete markdown file
    await this.fileService.deletePage(pageId);
  }

  async publishPage(pageId: string): Promise<void> {
    this.model.update(pageId, {
      status: 'published',
      published_at: new Date().toISOString()
    });
  }

  async unpublishPage(pageId: string): Promise<void> {
    this.model.update(pageId, {
      status: 'draft',
      published_at: undefined
    });
  }
}
```

---

## 8. Code Examples for Each Integration Point

### Integration Point 1: Database Initialization

```typescript
// backend/database/init.ts
import { AgentPageModel } from './models/AgentPageModel';
import path from 'path';

export function initializeDatabase(dbPath?: string): AgentPageModel {
  const resolvedPath = dbPath || path.join(__dirname, '../../data/agent-pages.db');
  return new AgentPageModel(resolvedPath);
}
```

### Integration Point 2: Service Layer Setup

```typescript
// backend/services/index.ts
import { initializeDatabase } from '../database/init';
import { PageFileService } from './PageFileService';
import { PageService } from './PageService';
import path from 'path';

export function initializeServices() {
  const pagesDir = path.join(__dirname, '../../data/agent-pages');

  const db = initializeDatabase();
  const fileService = new PageFileService(pagesDir);
  const pageService = new PageService(db, fileService);

  return {
    db,
    fileService,
    pageService
  };
}
```

### Integration Point 3: Controller Implementation

```typescript
// backend/api/agent-workspaces/controllers/PageController.ts
import { Request, Response } from 'express';
import { PageService } from '../../../services/PageService';

export class PageController {
  private pageService: PageService;

  constructor(pageService: PageService) {
    this.pageService = pageService;
  }

  async getPages(req: Request, res: Response): Promise<void> {
    try {
      const { agent_id } = req.query;

      // Implementation depends on whether filtering by agent
      res.json({
        success: true,
        data: [] // pages array
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createPage(req: Request, res: Response): Promise<void> {
    try {
      const { agent_id, title, specification, metadata } = req.body;

      const page = await this.pageService.createPage({
        agent_id,
        title,
        specification,
        metadata
      });

      res.status(201).json({
        success: true,
        data: page
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getPage(req: Request, res: Response): Promise<void> {
    try {
      const { pageId } = req.params;

      const page = await this.pageService.getPage(pageId);

      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found'
        });
        return;
      }

      res.json({
        success: true,
        data: page
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updatePage(req: Request, res: Response): Promise<void> {
    try {
      const { pageId } = req.params;
      const updates = req.body;

      const page = await this.pageService.updatePage(pageId, updates);

      res.json({
        success: true,
        data: page
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deletePage(req: Request, res: Response): Promise<void> {
    try {
      const { pageId } = req.params;

      await this.pageService.deletePage(pageId);

      res.json({
        success: true,
        message: 'Page deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async publishPage(req: Request, res: Response): Promise<void> {
    try {
      const { pageId } = req.params;

      await this.pageService.publishPage(pageId);

      res.json({
        success: true,
        message: 'Page published successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async unpublishPage(req: Request, res: Response): Promise<void> {
    try {
      const { pageId } = req.params;

      await this.pageService.unpublishPage(pageId);

      res.json({
        success: true,
        message: 'Page unpublished successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

### Integration Point 4: Route Setup

```typescript
// backend/api/agent-workspaces/routes/pageRoutes.ts
import { Router } from 'express';
import { PageController } from '../controllers/PageController';

export function createPageRoutes(pageController: PageController): Router {
  const router = Router({ mergeParams: true });

  // CRUD routes
  router.get('/', (req, res) => pageController.getPages(req, res));
  router.post('/', (req, res) => pageController.createPage(req, res));
  router.get('/:pageId', (req, res) => pageController.getPage(req, res));
  router.put('/:pageId', (req, res) => pageController.updatePage(req, res));
  router.delete('/:pageId', (req, res) => pageController.deletePage(req, res));

  // Publishing
  router.post('/:pageId/publish', (req, res) => pageController.publishPage(req, res));
  router.post('/:pageId/unpublish', (req, res) => pageController.unpublishPage(req, res));

  return router;
}
```

### Integration Point 5: Migration Script

```typescript
// backend/scripts/migrate-json-to-markdown.ts
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { initializeServices } from '../services';

interface LegacyPage {
  id: string;
  agent_id: string;
  title: string;
  specification: string;
  version: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

async function migrateJsonToMarkdown() {
  const { pageService } = initializeServices();

  const jsonDir = path.join(__dirname, '../../data/agent-pages');
  const files = await readdir(jsonDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} JSON files to migrate`);

  for (const file of jsonFiles) {
    try {
      const filePath = path.join(jsonDir, file);
      const content = await readFile(filePath, 'utf-8');
      const legacyPage: LegacyPage = JSON.parse(content);

      console.log(`Migrating ${legacyPage.id}: ${legacyPage.title}`);

      // Create new markdown-based page
      await pageService.createPage({
        agent_id: legacyPage.agent_id,
        title: legacyPage.title,
        specification: legacyPage.specification,
        metadata: legacyPage.metadata
      });

      console.log(`✓ Migrated ${legacyPage.id}`);
    } catch (error) {
      console.error(`✗ Failed to migrate ${file}:`, error.message);
    }
  }

  console.log('Migration complete!');
}

// Run migration
migrateJsonToMarkdown()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

---

## 9. Summary & Recommendations

### Key Findings

1. **gray-matter** is a battle-tested, widely-used library perfect for YAML frontmatter parsing
2. **better-sqlite3** significantly outperforms sqlite3 and provides a cleaner synchronous API
3. Existing codebase already uses better-sqlite3 (see `CostModel.ts`), so patterns are established
4. Current PageController routes provide clear API contract to implement
5. JSON page structure is well-documented and can be easily migrated

### Implementation Recommendations

#### Phase 1: Foundation (Week 1)
1. Create database schema with migration system
2. Implement `AgentPageModel` using better-sqlite3
3. Implement `PageFileService` using gray-matter
4. Set up proper indexes and foreign keys

#### Phase 2: Service Layer (Week 2)
1. Implement `PageService` with business logic
2. Add validation using zod or joi
3. Implement versioning system
4. Add comprehensive error handling

#### Phase 3: API Layer (Week 3)
1. Implement `PageController` with all endpoints
2. Add authentication and authorization
3. Implement rate limiting
4. Add comprehensive logging

#### Phase 4: Migration (Week 4)
1. Write migration script from JSON to Markdown
2. Test migration with sample data
3. Run full migration on production data
4. Verify data integrity

#### Phase 5: Testing & Documentation (Week 5)
1. Unit tests for all layers
2. Integration tests for API endpoints
3. API documentation
4. Developer documentation

### Security Checklist

- [ ] All database queries use prepared statements
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] Rate limiting implemented
- [ ] Authentication/authorization in place
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] File path validation to prevent directory traversal
- [ ] Maximum file size limits enforced
- [ ] Proper CORS configuration

### Performance Checklist

- [ ] Database indexes on all foreign keys
- [ ] WAL mode enabled for SQLite
- [ ] Connection pooling (if needed)
- [ ] Caching strategy defined
- [ ] Pagination implemented
- [ ] Query optimization verified
- [ ] File I/O minimized
- [ ] Async operations where beneficial

---

## 10. Additional Resources

### Documentation Links
- gray-matter: https://github.com/jonschlinkert/gray-matter
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- better-sqlite3 API docs: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- SQLite WAL mode: https://www.sqlite.org/wal.html
- SQL Injection Prevention (OWASP): https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html

### Example Repositories
- Existing CostModel implementation: `/workspaces/agent-feed/backend/database/models/CostModel.ts`
- Current server implementation: `/workspaces/agent-feed/api-server/server.js`
- Page routes stub: `/workspaces/agent-feed/backend/api/agent-workspaces/routes/pageRoutes.ts`

### Tools
- TypeScript: Type safety
- Zod: Runtime validation
- Express: Web framework
- Better-SQLite3: Database
- Gray-Matter: Frontmatter parsing

---

**Document Version**: 1.0
**Last Updated**: 2025-09-30
**Author**: Research Agent
**Status**: Complete - Ready for Implementation