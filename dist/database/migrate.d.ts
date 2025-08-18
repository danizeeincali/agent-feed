declare class MigrationRunner {
    private migrationsTable;
    constructor();
    private ensureMigrationsTable;
    private getExecutedMigrations;
    private getMigrationFiles;
    private executeMigration;
    runMigrations(): Promise<void>;
    createSchema(): Promise<void>;
    rollback(migrationId?: string): Promise<void>;
    status(): Promise<void>;
}
export { MigrationRunner };
declare const _default: MigrationRunner;
export default _default;
//# sourceMappingURL=migrate.d.ts.map