"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationRunner = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("./connection");
const logger_1 = require("@/utils/logger");
class MigrationRunner {
    migrationsTable = 'schema_migrations';
    constructor() {
        // Don't call async methods in constructor
    }
    async ensureMigrationsTable() {
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
        try {
            await connection_1.db.query(createTableSQL);
            logger_1.logger.info('Migrations table ensured');
        }
        catch (error) {
            logger_1.logger.error('Failed to create migrations table:', error);
            throw error;
        }
    }
    async getExecutedMigrations() {
        try {
            const result = await connection_1.db.query(`SELECT id FROM ${this.migrationsTable} ORDER BY executed_at`);
            return result.rows.map(row => row.id);
        }
        catch (error) {
            logger_1.logger.error('Failed to get executed migrations:', error);
            throw error;
        }
    }
    async getMigrationFiles() {
        const migrationsDir = path_1.default.join(__dirname, 'migrations');
        const migrations = [];
        try {
            // Check if migrations directory exists
            try {
                await promises_1.default.access(migrationsDir);
            }
            catch {
                logger_1.logger.info('Migrations directory does not exist, creating...');
                await promises_1.default.mkdir(migrationsDir, { recursive: true });
                return migrations;
            }
            const files = await promises_1.default.readdir(migrationsDir);
            const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
            for (const file of sqlFiles) {
                const filePath = path_1.default.join(migrationsDir, file);
                const content = await promises_1.default.readFile(filePath, 'utf-8');
                const id = file.replace('.sql', '');
                migrations.push({
                    id,
                    name: id,
                    sql: content,
                    timestamp: new Date()
                });
            }
            return migrations;
        }
        catch (error) {
            logger_1.logger.error('Failed to read migration files:', error);
            throw error;
        }
    }
    async executeMigration(migration) {
        logger_1.logger.info(`Executing migration: ${migration.name}`);
        try {
            await connection_1.db.transaction(async (client) => {
                // Execute the migration SQL
                await client.query(migration.sql);
                // Record the migration as executed
                await client.query(`INSERT INTO ${this.migrationsTable} (id, name) VALUES ($1, $2)`, [migration.id, migration.name]);
            });
            logger_1.logger.info(`Migration completed: ${migration.name}`);
        }
        catch (error) {
            logger_1.logger.error(`Migration failed: ${migration.name}`, error);
            throw error;
        }
    }
    async runMigrations() {
        logger_1.logger.info('Starting database migrations...');
        try {
            // Ensure migrations table exists first
            await this.ensureMigrationsTable();
            const executedMigrations = await this.getExecutedMigrations();
            const migrationFiles = await this.getMigrationFiles();
            // Filter out already executed migrations
            const pendingMigrations = migrationFiles.filter(migration => !executedMigrations.includes(migration.id));
            if (pendingMigrations.length === 0) {
                logger_1.logger.info('No pending migrations');
                return;
            }
            logger_1.logger.info(`Found ${pendingMigrations.length} pending migrations`);
            // Execute migrations in order
            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }
            logger_1.logger.info('All migrations completed successfully');
        }
        catch (error) {
            logger_1.logger.error('Migration process failed:', error);
            throw error;
        }
    }
    async createSchema() {
        logger_1.logger.info('Creating initial database schema...');
        try {
            const schemaPath = path_1.default.join(__dirname, 'schema.sql');
            const schemaSQL = await promises_1.default.readFile(schemaPath, 'utf-8');
            await connection_1.db.transaction(async (client) => {
                await client.query(schemaSQL);
            });
            // Mark schema as executed
            await connection_1.db.query(`INSERT INTO ${this.migrationsTable} (id, name) VALUES ($1, $2) 
         ON CONFLICT (id) DO NOTHING`, ['001_initial_schema', 'Initial Schema']);
            logger_1.logger.info('Initial schema created successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to create initial schema:', error);
            throw error;
        }
    }
    async rollback(migrationId) {
        logger_1.logger.info(`Rolling back migration: ${migrationId || 'latest'}`);
        // Note: Rollback implementation would require down migrations
        // For now, this is a placeholder for future implementation
        logger_1.logger.warn('Rollback functionality not yet implemented');
        throw new Error('Rollback functionality not yet implemented');
    }
    async status() {
        try {
            // Ensure migrations table exists first
            await this.ensureMigrationsTable();
            const executedMigrations = await this.getExecutedMigrations();
            const migrationFiles = await this.getMigrationFiles();
            logger_1.logger.info('Migration Status:');
            logger_1.logger.info(`Total migrations: ${migrationFiles.length}`);
            logger_1.logger.info(`Executed migrations: ${executedMigrations.length}`);
            const pendingMigrations = migrationFiles.filter(migration => !executedMigrations.includes(migration.id));
            if (pendingMigrations.length > 0) {
                logger_1.logger.info('Pending migrations:');
                pendingMigrations.forEach(migration => {
                    logger_1.logger.info(`  - ${migration.name}`);
                });
            }
            else {
                logger_1.logger.info('All migrations up to date');
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to get migration status:', error);
            throw error;
        }
    }
}
exports.MigrationRunner = MigrationRunner;
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
                    logger_1.logger.info('Available commands:');
                    logger_1.logger.info('  create-schema - Create initial database schema');
                    logger_1.logger.info('  migrate       - Run pending migrations');
                    logger_1.logger.info('  status        - Show migration status');
                    logger_1.logger.info('  rollback [id] - Rollback migration (not implemented)');
            }
        }
        catch (error) {
            logger_1.logger.error('Migration command failed:', error);
            process.exit(1);
        }
        finally {
            await connection_1.db.close();
            process.exit(0);
        }
    })();
}
exports.default = new MigrationRunner();
//# sourceMappingURL=migrate.js.map