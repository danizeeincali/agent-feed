import fs from 'fs/promises';
import path from 'path';
import { db } from './connection';
import { logger } from '@/utils/logger';

interface Migration {
  id: string;
  name: string;
  sql: string;
  timestamp: Date;
}

class MigrationRunner {
  private migrationsTable = 'schema_migrations';

  constructor() {
    // Don't call async methods in constructor
  }

  private async ensureMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      await db.query(createTableSQL);
      logger.info('Migrations table ensured');
    } catch (error) {
      logger.error('Failed to create migrations table:', error);
      throw error;
    }
  }

  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await db.query(
        `SELECT id FROM ${this.migrationsTable} ORDER BY executed_at`
      );
      return result.rows.map(row => row.id);
    } catch (error) {
      logger.error('Failed to get executed migrations:', error);
      throw error;
    }
  }

  private async getMigrationFiles(): Promise<Migration[]> {
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrations: Migration[] = [];

    try {
      // Check if migrations directory exists
      try {
        await fs.access(migrationsDir);
      } catch {
        logger.info('Migrations directory does not exist, creating...');
        await fs.mkdir(migrationsDir, { recursive: true });
        return migrations;
      }

      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();

      for (const file of sqlFiles) {
        const filePath = path.join(migrationsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const id = file.replace('.sql', '');
        
        migrations.push({
          id,
          name: id,
          sql: content,
          timestamp: new Date()
        });
      }

      return migrations;
    } catch (error) {
      logger.error('Failed to read migration files:', error);
      throw error;
    }
  }

  private async executeMigration(migration: Migration): Promise<void> {
    logger.info(`Executing migration: ${migration.name}`);

    try {
      await db.transaction(async (client) => {
        // Execute the migration SQL
        await client.query(migration.sql);
        
        // Record the migration as executed
        await client.query(
          `INSERT INTO ${this.migrationsTable} (id, name) VALUES ($1, $2)`,
          [migration.id, migration.name]
        );
      });

      logger.info(`Migration completed: ${migration.name}`);
    } catch (error) {
      logger.error(`Migration failed: ${migration.name}`, error);
      throw error;
    }
  }

  public async runMigrations(): Promise<void> {
    logger.info('Starting database migrations...');

    try {
      // Ensure migrations table exists first
      await this.ensureMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      // Filter out already executed migrations
      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.id)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      // Execute migrations in order
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    }
  }

  public async createSchema(): Promise<void> {
    logger.info('Creating initial database schema...');

    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSQL = await fs.readFile(schemaPath, 'utf-8');

      await db.transaction(async (client) => {
        await client.query(schemaSQL);
      });

      // Mark schema as executed
      await db.query(
        `INSERT INTO ${this.migrationsTable} (id, name) VALUES ($1, $2) 
         ON CONFLICT (id) DO NOTHING`,
        ['001_initial_schema', 'Initial Schema']
      );

      logger.info('Initial schema created successfully');
    } catch (error) {
      logger.error('Failed to create initial schema:', error);
      throw error;
    }
  }

  public async rollback(migrationId?: string): Promise<void> {
    logger.info(`Rolling back migration: ${migrationId || 'latest'}`);
    
    // Note: Rollback implementation would require down migrations
    // For now, this is a placeholder for future implementation
    logger.warn('Rollback functionality not yet implemented');
    throw new Error('Rollback functionality not yet implemented');
  }

  public async status(): Promise<void> {
    try {
      // Ensure migrations table exists first
      await this.ensureMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      logger.info('Migration Status:');
      logger.info(`Total migrations: ${migrationFiles.length}`);
      logger.info(`Executed migrations: ${executedMigrations.length}`);

      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.id)
      );

      if (pendingMigrations.length > 0) {
        logger.info('Pending migrations:');
        pendingMigrations.forEach(migration => {
          logger.info(`  - ${migration.name}`);
        });
      } else {
        logger.info('All migrations up to date');
      }
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const migrationRunner = new MigrationRunner();
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'create-schema':
          await migrationRunner.createSchema();
          break;
        case 'migrate':
          await migrationRunner.runMigrations();
          break;
        case 'status':
          await migrationRunner.status();
          break;
        case 'rollback':
          await migrationRunner.rollback(process.argv[3]);
          break;
        default:
          logger.info('Available commands:');
          logger.info('  create-schema - Create initial database schema');
          logger.info('  migrate       - Run pending migrations');
          logger.info('  status        - Show migration status');
          logger.info('  rollback [id] - Rollback migration (not implemented)');
      }
    } catch (error) {
      logger.error('Migration command failed:', error);
      process.exit(1);
    } finally {
      await db.close();
      process.exit(0);
    }
  })();
}

export { MigrationRunner };
export default new MigrationRunner();