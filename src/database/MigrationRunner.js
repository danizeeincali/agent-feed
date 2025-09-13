/**
 * Database Migration Runner
 * Handles running and rolling back database migrations
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MigrationRunner {
  constructor(databaseService) {
    this.db = databaseService;
    this.migrationsDir = path.join(__dirname, 'migrations');
    this.migrations = new Map();
  }

  async initialize() {
    await this.loadMigrations();
    console.log(`📁 Loaded ${this.migrations.size} migration(s)`);
  }

  async loadMigrations() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.js') && /^\d{3}-/.test(file))
        .sort();

      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsDir, file);
        const module = await import(filePath);
        
        const MigrationClass = module.default || module[Object.keys(module)[0]];
        const migration = new MigrationClass(this.db);
        
        this.migrations.set(migration.version, migration);
        console.log(`  Loaded migration ${migration.version}: ${migration.name}`);
      }
    } catch (error) {
      console.error('❌ Error loading migrations:', error);
      throw error;
    }
  }

  async runMigrations(targetVersion = null) {
    console.log('🚀 Running database migrations...');

    try {
      const sortedVersions = Array.from(this.migrations.keys()).sort();
      
      for (const version of sortedVersions) {
        if (targetVersion && version > targetVersion) {
          break;
        }

        const migration = this.migrations.get(version);
        const hasRun = await migration.hasRun();

        if (!hasRun) {
          console.log(`🔄 Running migration ${version}...`);
          await migration.up();
          console.log(`✅ Migration ${version} completed`);
        } else {
          console.log(`⏭️  Migration ${version} already applied`);
        }
      }

      console.log('🎉 All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async rollbackMigrations(targetVersion) {
    console.log(`🔄 Rolling back migrations to version ${targetVersion}...`);

    try {
      const sortedVersions = Array.from(this.migrations.keys()).sort().reverse();
      
      for (const version of sortedVersions) {
        if (version <= targetVersion) {
          break;
        }

        const migration = this.migrations.get(version);
        const hasRun = await migration.hasRun();

        if (hasRun) {
          console.log(`🔄 Rolling back migration ${version}...`);
          await migration.down();
          console.log(`✅ Migration ${version} rolled back`);
        } else {
          console.log(`⏭️  Migration ${version} was not applied`);
        }
      }

      console.log('🎉 Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  async getMigrationStatus() {
    const status = [];

    try {
      const sortedVersions = Array.from(this.migrations.keys()).sort();
      
      for (const version of sortedVersions) {
        const migration = this.migrations.get(version);
        const hasRun = await migration.hasRun();
        
        status.push({
          version: version,
          name: migration.name,
          applied: hasRun,
          appliedAt: hasRun ? await this.getMigrationTimestamp(version) : null
        });
      }
    } catch (error) {
      console.error('❌ Error getting migration status:', error);
    }

    return status;
  }

  async getMigrationTimestamp(version) {
    try {
      const query = `
        SELECT executed_at 
        FROM migration_log 
        WHERE version = ? AND direction = 'up' AND success = ? 
        ORDER BY executed_at DESC 
        LIMIT 1
      `;

      if (this.db.dbType === 'SQLite') {
        const result = this.db.db.db.prepare(query).get(version, 1);
        return result ? result.executed_at : null;
      } else {
        const result = await this.db.db.query(
          `SELECT executed_at 
           FROM migration_log 
           WHERE version = $1 AND direction = 'up' AND success = true 
           ORDER BY executed_at DESC 
           LIMIT 1`,
          [version]
        );
        return result.rows.length > 0 ? result.rows[0].executed_at : null;
      }
    } catch (error) {
      return null;
    }
  }

  async createMigration(name) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, '');
    const version = String(this.migrations.size + 1).padStart(3, '0');
    const filename = `${version}-${name.toLowerCase().replace(/\s+/g, '-')}.js`;
    const filepath = path.join(this.migrationsDir, filename);

    const template = `/**
 * Migration: ${name}
 * Version: ${version}
 * Created: ${new Date().toISOString()}
 */

export class ${name.replace(/\s+/g, '')}Migration {
  constructor(databaseService) {
    this.db = databaseService;
    this.version = '${version}';
    this.name = '${name}';
  }

  async up() {
    console.log(\`🔄 Running migration \${this.version}: \${this.name}\`);

    try {
      if (this.db.dbType === 'SQLite') {
        await this.runSQLiteUp();
      } else {
        await this.runPostgreSQLUp();
      }

      await this.recordMigration('up');
      console.log(\`✅ Migration \${this.version} completed successfully\`);
    } catch (error) {
      console.error(\`❌ Migration \${this.version} failed:\`, error);
      throw error;
    }
  }

  async down() {
    console.log(\`🔄 Rolling back migration \${this.version}: \${this.name}\`);

    try {
      if (this.db.dbType === 'SQLite') {
        await this.runSQLiteDown();
      } else {
        await this.runPostgreSQLDown();
      }

      await this.recordMigration('down');
      console.log(\`✅ Migration \${this.version} rolled back successfully\`);
    } catch (error) {
      console.error(\`❌ Migration \${this.version} rollback failed:\`, error);
      throw error;
    }
  }

  async runSQLiteUp() {
    // SQLite migration logic here
    // Example:
    // this.db.db.db.exec(\`CREATE TABLE example (id INTEGER PRIMARY KEY)\`);
  }

  async runPostgreSQLUp() {
    // PostgreSQL migration logic here  
    // Example:
    // await this.db.db.query(\`CREATE TABLE example (id SERIAL PRIMARY KEY)\`);
  }

  async runSQLiteDown() {
    // SQLite rollback logic here
    // Example:
    // this.db.db.db.exec(\`DROP TABLE IF EXISTS example\`);
  }

  async runPostgreSQLDown() {
    // PostgreSQL rollback logic here
    // Example:
    // await this.db.db.query(\`DROP TABLE IF EXISTS example CASCADE\`);
  }

  async recordMigration(direction) {
    const record = {
      version: this.version,
      name: this.name,
      direction: direction,
      success: true,
      error_message: null
    };

    try {
      if (this.db.dbType === 'SQLite') {
        const stmt = this.db.db.db.prepare(\`
          INSERT INTO migration_log (id, version, name, direction, success, error_message)
          VALUES (?, ?, ?, ?, ?, ?)
        \`);
        stmt.run(\`\${direction}-\${this.version}-\${Date.now()}\`, ...Object.values(record));
      } else {
        await this.db.db.query(\`
          INSERT INTO migration_log (version, name, direction, success, error_message)
          VALUES ($1, $2, $3, $4, $5)
        \`, Object.values(record));
      }
    } catch (error) {
      console.warn('Could not record migration:', error.message);
    }
  }

  async hasRun() {
    try {
      const query = \`SELECT 1 FROM migration_log WHERE version = ? AND name = ? AND direction = 'up' AND success = 1 LIMIT 1\`;
      
      if (this.db.dbType === 'SQLite') {
        const result = this.db.db.db.prepare(query).get(this.version, this.name);
        return !!result;
      } else {
        const result = await this.db.db.query(
          \`SELECT 1 FROM migration_log WHERE version = $1 AND name = $2 AND direction = 'up' AND success = true LIMIT 1\`,
          [this.version, this.name]
        );
        return result.rows.length > 0;
      }
    } catch (error) {
      return false;
    }
  }
}

export default ${name.replace(/\s+/g, '')}Migration;
`;

    try {
      await fs.writeFile(filepath, template);
      console.log(`✅ Created migration file: ${filename}`);
      
      // Reload migrations to include the new one
      await this.loadMigrations();
      
      return {
        version,
        filename,
        filepath
      };
    } catch (error) {
      console.error('❌ Error creating migration:', error);
      throw error;
    }
  }

  async reset() {
    console.log('🔄 Resetting database (rolling back all migrations)...');

    try {
      const sortedVersions = Array.from(this.migrations.keys()).sort().reverse();
      
      for (const version of sortedVersions) {
        const migration = this.migrations.get(version);
        const hasRun = await migration.hasRun();

        if (hasRun) {
          console.log(`🔄 Rolling back migration ${version}...`);
          await migration.down();
          console.log(`✅ Migration ${version} rolled back`);
        }
      }

      console.log('🎉 Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  async seed() {
    console.log('🌱 Seeding database with test data...');

    try {
      // Run any seeding logic
      for (const migration of this.migrations.values()) {
        if (migration.seed && typeof migration.seed === 'function') {
          await migration.seed();
        }
      }

      console.log('🎉 Database seeding completed');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
}

export default MigrationRunner;